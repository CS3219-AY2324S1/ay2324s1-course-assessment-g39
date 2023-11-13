import { questionRouter } from "~/server/api/routers/question";
import { userRouter } from "~/server/api/routers/user";
import { createTRPCRouter } from "~/server/api/trpc";
import { matchRequestRouter } from "./routers/matchRequest";
import { formRouter } from "~/server/api/routers/form";
import answerRouter from "./routers/answer";
import { codeSessionRouter } from "./routers/codeSession";
import { judgeRouter } from "~/server/api/routers/judge";
import { userAndUserMessagesRouter } from "./routers/userAndUserComm";
import { sharedCodeSessionRouter } from "./routers/sharedCodeSession";
import { userAndAIMessagesRouter } from "./routers/userAndAIComm";
import { generalRouter } from "~/server/api/routers/general";
import { environmentRouter } from "./routers/environment";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  general: generalRouter,
  matchRequest: matchRequestRouter,
  question: questionRouter,
  form: formRouter,
  user: userRouter,
  answer: answerRouter,
  codeSession: codeSessionRouter,
  judge: judgeRouter,
  userAndUserMessages: userAndUserMessagesRouter,
  userAndAIMessages: userAndAIMessagesRouter,
  sharedSession: sharedCodeSessionRouter,
  environment: environmentRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;
