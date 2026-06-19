import { join } from "node:path";
import { createMilletHttpServer } from "../packages/server/src/http-server.ts";

const port = Number(process.env.PORT ?? "8787");
const host = process.env.HOST ?? "127.0.0.1";
const staticRoot = join(process.cwd(), "packages", "demo-basic-duel", "public");

const server = createMilletHttpServer(undefined, { staticRoot });

server.listen(port, host, () => {
  console.log(`Ember Duel demo: http://${host}:${port}/`);
});
