import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prismaMongo, prismaPostgres } from "~/server/db";
import type { AnswerResult } from "@prisma-db-psql/client";
import type { Answer } from "@prisma-db-mongo/client";
import { TRPCError } from "@trpc/server";

const createAnswerInput = z.object({
    body: z.string(),
    questionId: z.string(),
    userId: z.string()
});

function runAnswer(answer: Answer): AnswerResult {
    // todo: implement this
    return "ACCEPTED";
}

const answerRouter = createTRPCRouter({
    /**
     * Route used to submit answers
     */
    submitAnswer: protectedProcedure
        .input(createAnswerInput)
        .mutation(async ({ ctx, input }) => {
            const { body, questionId } = input;
            const user = ctx.session.user;
            const answer = await prismaMongo.answer.create({
                data: {
                    body,
                    questionId
                }
            });
            // todo: generate the result from using some kind of code execution
            const result: AnswerResult = runAnswer(answer);
            const userAnswer = await prismaPostgres.questionAttempt.create({
                data: {
                    answerId: answer.id,
                    questionId,
                    userId: user.id,
                    result
                }
            })
            return userAnswer;
        }),
    getUserAnswers: protectedProcedure
        .query(async ({ ctx }) => {
            const user = ctx.session.user;
            return await prismaPostgres.questionAttempt.findMany({
                where: {
                    userId: user.id
                }
            })
        }),

    getAnswerBody: protectedProcedure
        .input(z.object({ answerId: z.string(), questionId: z.string() }))
        .query(async ({ ctx, input }) => {
            const user = ctx.session.user;
            const attempt = await prismaPostgres.questionAttempt.findUnique({
                where: {
                    userId_questionId_answerId: {
                        userId: user.id,
                        questionId: input.questionId,
                        answerId: input.answerId,
                    }
                }
            })
            if (!attempt) {
                throw new TRPCError({
                    code: "UNAUTHORIZED",
                    message: "Not authorised for this answer"
                })
            }
            const result = await prismaMongo.answer.findUnique({
                where: {
                    id: input.answerId
                }
            });
            if (!result) throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Failed to find answer"
            })
            return result
        })
});

export default answerRouter;










