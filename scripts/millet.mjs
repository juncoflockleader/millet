import { readFileSync, writeFileSync } from "node:fs";
import { buildRulesetBundle, validateRulesetDir } from "../packages/content-build/src/build.ts";
import { createRulesetDependencyReport } from "../packages/content-build/src/dependencies.ts";
import { FileBundleStore } from "../packages/content-build/src/store.ts";
import { generateDefaultSchemaTypes } from "../packages/content-schema/src/typegen.ts";
import { projectState } from "../packages/engine-core/src/visibility.ts";
import { renderMatchDebugHtml } from "../packages/server/src/debug-ui.ts";
import { FileMatchStore } from "../packages/server/src/file-store.ts";
import { createDebugReport, createMetricsSnapshot, formatMetricsText } from "../packages/server/src/metrics.ts";
import { createMatchStateDiff } from "../packages/replay-tools/src/diff.ts";
import { replayEvents, replayFixture } from "../packages/replay-tools/src/replay.ts";

const [, , command, ...args] = process.argv;

function usage() {
  console.log("Usage: millet <validate|bundle|deps-ruleset|gen-schema-types|store-bundle|replay|replay-match|debug-match|debug-html|metrics-match|project-fixture|diff-state|diff-ruleset> <path> [path]");
}

if (!command) {
  usage();
  process.exit(1);
}

if (command === "validate") {
  const dir = args[0];
  if (!dir) {
    usage();
    process.exit(1);
  }
  const issues = validateRulesetDir(dir);
  console.log(JSON.stringify({ issues }, null, 2));
  process.exit(issues.some((issue) => issue.severity === "error") ? 1 : 0);
} else if (command === "bundle") {
  const dir = args[0];
  if (!dir) {
    usage();
    process.exit(1);
  }
  const bundle = buildRulesetBundle(dir);
  console.log(JSON.stringify({ id: bundle.id, version: bundle.version, contentHash: bundle.contentHash, issues: bundle.issues }, null, 2));
} else if (command === "deps-ruleset") {
  const dir = args[0];
  if (!dir) {
    usage();
    process.exit(1);
  }
  const bundle = buildRulesetBundle(dir);
  console.log(JSON.stringify(createRulesetDependencyReport(bundle), null, 2));
} else if (command === "gen-schema-types") {
  const outputPath = args[0];
  const declarations = generateDefaultSchemaTypes();
  if (outputPath) {
    writeFileSync(outputPath, declarations);
    console.log(JSON.stringify({ outputPath }, null, 2));
  } else {
    console.log(declarations.trimEnd());
  }
} else if (command === "store-bundle") {
  const rulesetDir = args[0];
  const storeDir = args[1];
  if (!rulesetDir || !storeDir) {
    usage();
    process.exit(1);
  }
  const bundle = buildRulesetBundle(rulesetDir);
  const errors = bundle.issues.filter((issue) => issue.severity === "error");
  if (errors.length > 0) {
    console.error(JSON.stringify({ errors }, null, 2));
    process.exit(1);
  }
  new FileBundleStore(storeDir).put(bundle);
  console.log(JSON.stringify({ id: bundle.id, version: bundle.version, contentHash: bundle.contentHash, storedIn: storeDir }, null, 2));
} else if (command === "replay") {
  const file = args[0];
  if (!file) {
    usage();
    process.exit(1);
  }
  const fixture = JSON.parse(readFileSync(file, "utf8"));
  const result = replayFixture(fixture);
  console.log(JSON.stringify({ finalStateHash: result.finalStateHash, lastSequence: result.state.lastSequence }, null, 2));
} else if (command === "replay-match") {
  const storeDir = args[0];
  const matchId = args[1];
  const bundleStoreDir = args[2];
  if (!storeDir || !matchId) {
    usage();
    process.exit(1);
  }
  const matchStore = bundleStoreDir
    ? new FileMatchStore(storeDir, { bundleStore: new FileBundleStore(bundleStoreDir) })
    : new FileMatchStore(storeDir);
  const match = matchStore.load(matchId);
  console.log(JSON.stringify({ matchId, status: match.state.status, lastSequence: match.state.lastSequence }, null, 2));
} else if (command === "debug-match") {
  const storeDir = args[0];
  const matchId = args[1];
  const bundleStoreDir = args[2];
  if (!storeDir || !matchId) {
    usage();
    process.exit(1);
  }
  const matchStore = bundleStoreDir
    ? new FileMatchStore(storeDir, { bundleStore: new FileBundleStore(bundleStoreDir) })
    : new FileMatchStore(storeDir);
  const match = matchStore.load(matchId);
  console.log(JSON.stringify(createDebugReport(match.state, match.events), null, 2));
} else if (command === "debug-html") {
  const storeDir = args[0];
  const matchId = args[1];
  const outputPath = args[2];
  const bundleStoreDir = args[3];
  if (!storeDir || !matchId || !outputPath) {
    usage();
    process.exit(1);
  }
  const matchStore = bundleStoreDir
    ? new FileMatchStore(storeDir, { bundleStore: new FileBundleStore(bundleStoreDir) })
    : new FileMatchStore(storeDir);
  const match = matchStore.load(matchId);
  writeFileSync(outputPath, renderMatchDebugHtml(match.state, match.events));
  console.log(JSON.stringify({ matchId, outputPath }, null, 2));
} else if (command === "metrics-match") {
  const storeDir = args[0];
  const matchId = args[1];
  const bundleStoreDir = args[2] === "--text" ? undefined : args[2];
  const outputMode = args.includes("--text") ? "text" : "json";
  if (!storeDir || !matchId) {
    usage();
    process.exit(1);
  }
  const matchStore = bundleStoreDir
    ? new FileMatchStore(storeDir, { bundleStore: new FileBundleStore(bundleStoreDir) })
    : new FileMatchStore(storeDir);
  const match = matchStore.load(matchId);
  const snapshot = createMetricsSnapshot(match.state, match.events);
  console.log(outputMode === "text" ? formatMetricsText(snapshot).trimEnd() : JSON.stringify(snapshot, null, 2));
} else if (command === "project-fixture") {
  const file = args[0];
  const playerId = args[1];
  const sequenceArg = args[2];
  if (!file || !playerId) {
    usage();
    process.exit(1);
  }
  const sequence = sequenceArg === undefined ? undefined : Number(sequenceArg);
  if (sequenceArg !== undefined && (!Number.isInteger(sequence) || sequence < 0)) {
    console.error(JSON.stringify({ error: "invalid_sequence", message: "project-fixture sequence must be a non-negative integer" }, null, 2));
    process.exit(1);
  }
  const fixture = JSON.parse(readFileSync(file, "utf8"));
  const result =
    sequence === undefined
      ? replayFixture(fixture)
      : replayEvents(fixture.events.filter((event) => event.sequence <= sequence));
  console.log(JSON.stringify(projectState(result.state, { playerId }), null, 2));
} else if (command === "diff-state") {
  const leftPath = args[0];
  const rightPath = args[1];
  if (!leftPath || !rightPath) {
    usage();
    process.exit(1);
  }
  const left = JSON.parse(readFileSync(leftPath, "utf8"));
  const right = JSON.parse(readFileSync(rightPath, "utf8"));
  console.log(JSON.stringify(createMatchStateDiff(left, right), null, 2));
} else if (command === "diff-ruleset") {
  const leftPath = args[0];
  const rightPath = args[1];
  if (!leftPath || !rightPath) {
    usage();
    process.exit(1);
  }
  const left = buildRulesetBundle(leftPath);
  const right = buildRulesetBundle(rightPath);
  console.log(JSON.stringify({ equal: left.contentHash === right.contentHash, left: left.contentHash, right: right.contentHash }, null, 2));
} else {
  usage();
  process.exit(1);
}
