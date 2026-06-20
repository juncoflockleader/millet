import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, relative } from "node:path";
import { CommandRejectedError, projectEvent, projectState } from "../../engine-core/src/index.ts";
import { attachMatchEventSseStream, SSE_HEADERS } from "./event-stream.ts";
import { AuthorizationError, InMemoryMatchService, type UserSession } from "./match-service.ts";
import { handleMilletWebSocketUpgrade } from "./websocket.ts";

export interface MilletHttpServerOptions {
  staticRoot?: string;
  rulesetRoot?: string;
}

const PROMOTABLE_RULESET_IDS = new Set(["sample-duel", "sample-identity"]);
const PROMOTABLE_MEDIA_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);
const MAX_PROMOTED_ASSET_BYTES = 5 * 1024 * 1024;

class BadRequestError extends Error {}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(payload));
}

function sendBytes(res: ServerResponse, status: number, bytes: Buffer | string, contentType: string): void {
  res.writeHead(status, { "content-type": contentType });
  res.end(bytes);
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function sessionFromRequest(req: IncomingMessage): UserSession {
  return {
    userId: headerValue(req.headers["x-millet-user-id"]),
    admin: headerValue(req.headers["x-millet-admin"]) === "true"
  };
}

function errorResponse(error: unknown): { status: number; payload: { error: string; message: string } } {
  if (error instanceof AuthorizationError) {
    return {
      status: 403,
      payload: {
        error: "authorization_error",
        message: error.message
      }
    };
  }

  if (error instanceof CommandRejectedError) {
    return {
      status: 400,
      payload: {
        error: error.code,
        message: error.message
      }
    };
  }

  if (error instanceof SyntaxError) {
    return {
      status: 400,
      payload: {
        error: "invalid_json",
        message: error.message
      }
    };
  }

  if (error instanceof BadRequestError) {
    return {
      status: 400,
      payload: {
        error: "bad_request",
        message: error.message
      }
    };
  }

  return {
    status: 500,
    payload: {
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    }
  };
}

export function createMilletHttpServer(service = new InMemoryMatchService(), options: MilletHttpServerOptions = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");

      if (req.method === "POST" && url.pathname === "/matches") {
        const body = (await readJson(req)) as { rulesetId?: "sample-duel" | "sample-identity"; playerCount?: 6 | 8; demoDuel?: boolean };
        const match = service.createMatch(body.rulesetId ?? "sample-duel", {
          playerCount: body.playerCount,
          demoDuel: body.demoDuel
        });
        send(res, 201, { matchId: match.id, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchCommand = url.pathname.match(/^\/matches\/([^/]+)\/commands$/);
      if (req.method === "POST" && matchCommand) {
        const matchId = decodeURIComponent(matchCommand[1]!);
        const body = (await readJson(req)) as { command?: Parameters<InMemoryMatchService["submitCommand"]>[1] };
        if (!body.command) {
          send(res, 400, { error: "missing_command" });
          return;
        }
        const match = service.submitCommandForSession(matchId, body.command, sessionFromRequest(req));
        send(res, 200, { matchId, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchGet = url.pathname.match(/^\/matches\/([^/]+)$/);
      if (req.method === "GET" && matchGet) {
        const matchId = decodeURIComponent(matchGet[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }
        send(res, 200, { matchId, status: match.state.status, lastSequence: match.state.lastSequence });
        return;
      }

      const matchState = url.pathname.match(/^\/matches\/([^/]+)\/state$/);
      if (req.method === "GET" && matchState) {
        const matchId = decodeURIComponent(matchState[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }

        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        send(res, 200, {
          matchId,
          state: projectState(match.state, viewer)
        });
        return;
      }

      const matchReplay = url.pathname.match(/^\/matches\/([^/]+)\/replay$/);
      if (req.method === "GET" && matchReplay) {
        const matchId = decodeURIComponent(matchReplay[1]!);
        const match = service.getMatch(matchId);
        if (!match) {
          send(res, 404, { error: "not_found" });
          return;
        }

        const fromSequence = Number(url.searchParams.get("fromSequence") ?? "0") || 0;
        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        send(res, 200, {
          matchId,
          events: match.events
            .filter((event) => event.sequence > fromSequence)
            .map((event) => projectEvent(event, match.state, viewer))
            .filter((event) => event !== null),
          lastSequence: match.state.lastSequence
        });
        return;
      }

      const matchEvents = url.pathname.match(/^\/matches\/([^/]+)\/events$/);
      if (req.method === "GET" && matchEvents) {
        const matchId = decodeURIComponent(matchEvents[1]!);
        const lastEventId = req.headers["last-event-id"];
        const lastSequence =
          Number(url.searchParams.get("lastSequence") ?? (Array.isArray(lastEventId) ? lastEventId[0] : lastEventId) ?? "0") || 0;
        const viewer = service.viewerForSession(matchId, sessionFromRequest(req), {
          playerId: url.searchParams.get("playerId") ?? undefined,
          seatId: url.searchParams.get("seatId") ?? undefined,
          admin: url.searchParams.get("admin") === "true"
        });
        res.writeHead(200, SSE_HEADERS);
        attachMatchEventSseStream(
          service,
          matchId,
          viewer,
          res,
          { lastSequence }
        );
        return;
      }

      const rulesetContent = url.pathname.match(/^\/content\/rulesets\/([^/]+)\/(.+)$/);
      if (req.method === "GET" && options.rulesetRoot && rulesetContent) {
        const rulesetId = decodeURIComponent(rulesetContent[1]!);
        const contentPath = decodeURIComponent(rulesetContent[2]!);
        if (tryServeRulesetContent(options.rulesetRoot, rulesetId, contentPath, res)) {
          return;
        }
      }

      if (req.method === "POST" && url.pathname === "/authoring/assets/promote") {
        if (!options.staticRoot || !options.rulesetRoot) {
          send(res, 400, { error: "authoring_unavailable", message: "Asset promotion requires staticRoot and rulesetRoot." });
          return;
        }
        const body = (await readJson(req)) as { rulesetId?: string; entry?: Record<string, unknown> };
        const result = promoteAssetDraft(options.staticRoot, options.rulesetRoot, body);
        send(res, 200, result);
        return;
      }

      if (req.method === "GET" && options.staticRoot && tryServeStatic(options.staticRoot, url.pathname, res)) {
        return;
      }

      send(res, 404, { error: "not_found" });
    } catch (error) {
      const response = errorResponse(error);
      send(res, response.status, response.payload);
    }
  });

  server.on("upgrade", (req, socket, head) => {
    try {
      if (!handleMilletWebSocketUpgrade(service, req, socket, head)) {
        socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
        socket.destroy();
      }
    } catch (error) {
      socket.write(`HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n${error instanceof Error ? error.message : String(error)}`);
      socket.destroy();
    }
  });

  return server;
}

function promoteAssetDraft(
  staticRoot: string,
  rulesetRoot: string,
  body: { rulesetId?: string; entry?: Record<string, unknown> }
): { asset: Record<string, unknown>; manifest: Record<string, unknown>; publicPath: string } {
  const rulesetId = body.rulesetId;
  if (typeof rulesetId !== "string" || !PROMOTABLE_RULESET_IDS.has(rulesetId)) {
    throw new BadRequestError("Unsupported ruleset for asset promotion.");
  }
  const entry = body.entry;
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    throw new BadRequestError("Asset promotion requires an entry object.");
  }
  const assetId = entry.assetId;
  if (typeof assetId !== "string" || !/^[A-Za-z0-9_.-]+$/.test(assetId)) {
    throw new BadRequestError("Asset promotion requires a safe assetId.");
  }
  const dataUrl = entry.publicPath;
  if (typeof dataUrl !== "string") {
    throw new BadRequestError("Asset promotion requires a data URL publicPath.");
  }

  const decoded = decodePromotedAssetDataUrl(dataUrl);
  const extension = PROMOTABLE_MEDIA_TYPES.get(decoded.mediaType);
  if (!extension) {
    throw new BadRequestError(`Unsupported promoted asset media type ${decoded.mediaType}.`);
  }
  if (decoded.bytes.length > MAX_PROMOTED_ASSET_BYTES) {
    throw new BadRequestError("Promoted asset is too large.");
  }

  const width = entry.width;
  const height = entry.height;
  if (!Number.isInteger(width) || (width as number) < 1 || !Number.isInteger(height) || (height as number) < 1) {
    throw new BadRequestError("Promoted image assets must include positive integer width and height.");
  }

  const manifestPath = join(rulesetRoot, rulesetId, "asset-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  const assets = Array.isArray(manifest.assets) ? manifest.assets as Record<string, unknown>[] : [];
  const index = assets.findIndex((asset) => asset?.assetId === assetId);
  if (index === -1) {
    throw new BadRequestError(`Unknown asset ${assetId}.`);
  }

  const publicPath = `/assets/imported/${rulesetId}/${assetId}.${extension}`;
  const outputPath = join(staticRoot, publicPath.replace(/^\/+/, ""));
  const normalizedRoot = normalize(staticRoot);
  const normalizedOutput = normalize(outputPath);
  const relativeOutput = relative(normalizedRoot, normalizedOutput);
  if (relativeOutput.startsWith("..") || relativeOutput.includes("..")) {
    throw new BadRequestError("Promoted asset path escaped static root.");
  }

  mkdirSync(join(staticRoot, "assets", "imported", rulesetId), { recursive: true });
  writeFileSync(normalizedOutput, decoded.bytes);

  const promotedAsset = {
    ...assets[index],
    ...entry,
    assetId,
    contentHash: `sha256:${createHash("sha256").update(decoded.bytes).digest("hex")}`,
    sourceUri: `file://${publicPath}`,
    publicPath,
    mediaType: decoded.mediaType,
    width,
    height
  };
  assets[index] = promotedAsset;
  manifest.assets = assets;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { asset: promotedAsset, manifest, publicPath };
}

function decodePromotedAssetDataUrl(dataUrl: string): { mediaType: string; bytes: Buffer } {
  const match = dataUrl.match(/^data:([^;,]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) {
    throw new BadRequestError("Promoted asset publicPath must be a base64 data URL.");
  }
  return {
    mediaType: match[1]!,
    bytes: Buffer.from(match[2]!, "base64")
  };
}

function tryServeRulesetContent(rulesetRoot: string, rulesetId: string, contentPath: string, res: ServerResponse): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(rulesetId) || !contentPath.endsWith(".json")) {
    return false;
  }

  return tryServeStatic(rulesetRoot, `/${rulesetId}/${contentPath}`, res);
}

function tryServeStatic(staticRoot: string, pathname: string, res: ServerResponse): boolean {
  const normalizedRoot = normalize(staticRoot);
  const filePath = pathname === "/" || pathname === "/basic-duel"
    ? join(normalizedRoot, "index.html")
    : join(normalizedRoot, decodeURIComponent(pathname).replace(/^\/+/, ""));
  const normalizedFile = normalize(filePath);
  const relativePath = relative(normalizedRoot, normalizedFile);

  if (relativePath.startsWith("..") || relativePath === "" || relativePath.includes("..")) {
    sendBytes(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return true;
  }

  if (!existsSync(normalizedFile)) {
    return false;
  }

  const stat = statSync(normalizedFile);
  if (!stat.isFile()) {
    return false;
  }

  sendBytes(res, 200, readFileSync(normalizedFile), contentTypeForPath(normalizedFile));
  return true;
}

function contentTypeForPath(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
