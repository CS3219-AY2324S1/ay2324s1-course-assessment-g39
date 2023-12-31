import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { prismaMongo, prismaPostgres } from "~/server/db";
import { appRouter } from "../root";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const answerRouter = createTRPCRouter({
  getUserSubmissions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.session.user;
    // update all the remaining submissions
    const temporarySubmissions = await prismaPostgres.submission.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });
    const caller = appRouter.createCaller(ctx);
    for (const tmpSubmssion of temporarySubmissions) {
      await caller.judge.checkAnswer({
        submissionId: tmpSubmssion.id,
      });
    }
    const submissions = await prismaPostgres.questionAttempt.findMany({
      where: {
        userId: user.id,
      },
    });

    const submissionsWithTitle = Promise.all(
      submissions.map(async (submission) => {
        const question = await prismaMongo.question.findUnique({
          where: { id: submission.questionId },
        });
        if (!question) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Failed to find question",
          });
        }

        const { questionId, userId, ...filteredSubmission } = submission;
        return {
          ...filteredSubmission,
          questionTitle: question.title,
        };
      }),
    );

    return await submissionsWithTitle;
  }),

  getUserSubmissionsOfQuestion: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      return await prismaPostgres.questionAttempt.findMany({
        where: {
          userId: user.id,
          questionId: input.questionId,
        },
      });
    }),

  getAnswerBody: protectedProcedure
    .input(z.object({ answerId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await prismaMongo.answer.findUnique({
        where: { id: input.answerId },
      });
      if (!result)
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to find answer",
        });
      return result;
    }),
});

export default answerRouter;
