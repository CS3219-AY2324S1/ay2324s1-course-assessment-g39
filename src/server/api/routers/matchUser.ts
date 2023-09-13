import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import UserRequestHandler, {
  type RequestResponse,
} from "~/components/collab/UserRequestHandler";

const userObject = z.object({
  difficulty: z.number().min(0).max(5),
  category: z.string(),
  id: z.string(),
});

let response: RequestResponse;

export const matchUsersRouter = createTRPCRouter({
  sendRequest: publicProcedure.input(userObject).mutation(async ({ input }) => {
    const { difficulty, category, id } = input;

    const requestHandler = new UserRequestHandler();

    await requestHandler
      .sendRequest({ difficulty, category, id })
      .then((res) => {
        response = res;
      });

    return response;
  }),

  cancelRequest: publicProcedure
    .input(userObject)
    .mutation(async ({ input }) => {
      const { difficulty, category, id } = input;

      const requestHandler = new UserRequestHandler();

      await requestHandler
        .cancelRequest({
          difficulty,
          category,
          id,
        })
        .then((res) => {
          response = res;
        });

      return response;
    }),
});
