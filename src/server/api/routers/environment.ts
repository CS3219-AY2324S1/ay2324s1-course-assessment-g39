import { z } from "zod";
import { createTRPCRouter, maintainerProcedure } from "~/server/api/trpc";

export const environmentRouter = createTRPCRouter({
    upsertEnvironment: maintainerProcedure
        .input(z.object({
            id: z.string().optional(),
            template: z.string(),
            append: z.string(),
            prepend: z.string(),
            languageId: z.number(),
            questionId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...withoutId } = input; 
            await ctx.prismaMongo.environment.upsert({
                where: {
                    languageId_questionId: {
                        languageId: input.languageId,
                        questionId: input.questionId
                    }
                },
                create: withoutId,
                update: withoutId
            })
        }),
    deleteEnvironment: maintainerProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.prismaMongo.environment.delete({
                where: {
                    id: input.id
                }
            });
        })
});
