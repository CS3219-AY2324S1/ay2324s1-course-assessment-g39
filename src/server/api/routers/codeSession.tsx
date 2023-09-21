import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from 'zod';
import { prismaPostgres } from '~/server/db';

// https://stackoverflow.com/questions/70409219/get-user-id-from-session-in-next-auth-client
// todo: update auth to add session id to useSession object
const createSessionObject = z.object({
  sessionId: z.string()
});


const deleteCodeSessionObject = z.object({
  codeSpaceId: z.string()
})

const updateCodeSessionObject = z.object({
  code: z.string(),
  codeSpaceId: z.string()
});

export const codeSessionRouter = createTRPCRouter({
  createSession: protectedProcedure
    .input(createSessionObject)
    .query(async ({ ctx, input }) => {
      // create session + create codeSpace
      const result = await prismaPostgres.codeSpace.create({
        data: {
          code: "",
          userId: ctx.session.user.id,
        }
      });
      
      const codeSession = await prismaPostgres.codeSession.create({
        data: {
          codeSpaceId: result.id,
          userId: ctx.session.user.id,
        }
      });
      // return session identifier
      return codeSession;
    }),
  updateSession: protectedProcedure
    .input(updateCodeSessionObject)
    .mutation(({ ctx, input }) => {
      prismaPostgres.codeSpace.update({
        where: {
          id_userId: {
            id: input.codeSpaceId,
            userId: ctx.session.user.id
          }
        },
        data: {
          code: input.code
        }
      })
    }),
  deleteSession: protectedProcedure
    .input(deleteCodeSessionObject)
    .query(({ ctx, input }) => {
      prismaPostgres.codeSession.delete({
        where: {
          codeSpaceId_userId: {
            ...input,
            userId: ctx.session.user.id
          }
        }
      });
    })
});