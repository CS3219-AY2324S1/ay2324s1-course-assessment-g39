import { exampleRouter } from "~/server/api/routers/example";
import { userRouter } from "~/server/api/routers/user";
import { createTRPCRouter } from "~/server/api/trpc";
import { matchRequestRouter } from "./routers/matchRequest";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  example: exampleRouter,
  matchRequest: matchRequestRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
