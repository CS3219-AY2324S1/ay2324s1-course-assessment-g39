import { appRouter } from "./api/root";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createServer } from "node:http";
import next from "next";
import { parse } from "url";
import ws, { WebSocketServer } from "ws";
import { createWSTRPCContext } from "./api/trpc";
import { env } from "~/env.mjs";

const port = parseInt(process.env.PORT ?? "3000", 10);
console.log(port);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

void app
  .prepare()
  .then(() => {
    console.log("Preparing server");
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    const server = createServer(async (req, res) => {
      if (!req.url) return;
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl).catch((e) => {
        console.log(e);
      });
    });
    console.log("Created http server");
    // todo: Can't quite get a http server to pass through to the ws server
    /// const wss = new ws.Server({ server });
    const wss = new WebSocketServer({
      server,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const handler = applyWSSHandler({
      wss,
      router: appRouter,
      createContext: createWSTRPCContext,
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM');
      handler.broadcastReconnectNotification();
    });
  
    server.on('upgrade', (req, socket, head) => {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    });
    
    server.listen(port);

    console.log(
      `> Server listening at http://localhost:${port} as ${
        dev ? "development" : process.env.NODE_ENV
      }`,
    );
  })
  .catch((e) => {
    console.log(e);
  });
