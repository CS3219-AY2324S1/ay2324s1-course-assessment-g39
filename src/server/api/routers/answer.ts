import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { PrismaMongoT, prismaMongo, prismaPostgres, PrismaPostgresT } from "~/server/db";
import type { AnswerResult } from "@prisma-db-psql/client";
import type { Answer, TestCase } from "@prisma-db-mongo/client";
import { TRPCError } from "@trpc/server";
import { judgeRouter } from "./judge";
import { appRouter } from "../root";
import { Session } from "next-auth";

const createAnswerInput = z.object({
    body: z.string(),
    userId: z.string(),
    environmentId: z.string()
});
async function runAnswer(answer: Answer, ctx: {
    session: Session | null,
    prismaPostgres: PrismaPostgresT,
    prismaMongo: PrismaMongoT
}): Promise<{
    ans: AnswerResult
}> {
    const testCases = await prismaMongo.testCase.findMany({
        where: {
            environmentId: answer.envId
        }
    })
    let allCorrect = true;
    
    const caller = appRouter.createCaller(ctx);
    // todo: create  sumission batch
    for (const testCase of testCases) {
        const result = await caller.judge.runTestCase({
            testCaseId: testCase.id,
            source_code: answer.body
        });
        if (result.status.id !== 3) {
            allCorrect = false;
        }
    }
    // todo: support other fields
    return {
        ans: allCorrect ? "ACCEPTED" : "WRONG_ANSWER"
    }

}

const answerRouter = createTRPCRouter({
    /**
     * Route used to submit answers
     */
    submitAnswer: protectedProcedure
        .input(createAnswerInput)
        .mutation(async ({ ctx, input }) => {
            const { body, environmentId } = input;
            const user = ctx.session.user;
            const env = await prismaMongo.environment.findUnique({
                where: {
                    id: input.environmentId
                }
            });
            if (!env) throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Invalid environment"
            })
            const answer = await prismaMongo.answer.create({
                data: {
                    body,
                    envId: environmentId
                }
            });
            // todo: generate the result from using some kind of code execution
            const result = await runAnswer(answer, ctx);
            const userAnswer = await prismaPostgres.questionAttempt.create({
                data: {
                    answerId: answer.id,
                    questionId: env?.questionId,
                    userId: user.id,
                    result: result.ans
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









