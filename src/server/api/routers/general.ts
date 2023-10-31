import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const generalRouter = createTRPCRouter({
  isDBConnected: publicProcedure.query(async ({ ctx }) => {
    try {
      await ctx.prismaPostgres.$queryRaw`SELECT 1`;
      await ctx.prismaMongo.$runCommandRaw({ ping: 1 });
      return true;
    } catch {
      return false;
    }
  }),
});
