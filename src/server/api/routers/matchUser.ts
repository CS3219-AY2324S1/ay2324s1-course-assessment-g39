import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import UserRequestHandler, {
  type RequestResponse,
} from "~/components/collaboration/UserRequestHandler";

const userObject = z.object({
  difficulty: z.number().min(0).max(5),
  category: z.string(),
});

let response: RequestResponse;

export const matchUsersRouter = createTRPCRouter({
  sendRequest: publicProcedure.input(userObject).mutation(async ({ input }) => {
    const { difficulty, category } = input;

    const requestHandler = new UserRequestHandler();

    await requestHandler.sendRequest({ difficulty, category }).then((res) => {
      response = res;
    });

    return response;
  }),
});
