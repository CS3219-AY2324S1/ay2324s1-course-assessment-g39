import { AppRouter, appRouter } from "./api/root";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import ws, { WebSocketServer } from "ws";
import { createWSTRPCContext } from "./api/trpc";

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
const wss: WebSocketServer = new ws.Server({
  port: 3002,
});
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const handler = applyWSSHandler<AppRouter>({
  wss,
  router: appRouter,
  createContext: createWSTRPCContext,
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
export const wssEE = wss.on("connection", (ws) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`➕➕ Connection (${wss.clients.size})`);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  ws.once("close", () => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.log(`➖➖ Connection (${wss.clients.size})`);
  });
});
console.log("✅ WebSocket Server listening on ws://localhost:3002");

process.on("SIGTERM", () => {
  console.log("SIGTERM");
  handler.broadcastReconnectNotification();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  wss.close();
});
