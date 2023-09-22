import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { prismaPostgres } from "~/server/db";
import { EventEmitter } from "stream";
import { observable } from "@trpc/server/observable";


const createSessionObject = z.object({
  codeSpaceId: z.string(),
});

type CodePost = {
  userId: string;
  changes: string;
  location: number;
};

const deleteCodeSpaceObject = z.object({
  codeSpaceId: z.string(),
});

const getCodeSessionObject = z.object({
  codeSessionId: z.string(),
});

const updateCodeSessionObject = z.object({
  code: z.string(),
  codeSpaceId: z.string(),
});

const createCodeSpaceObject = z.object({
  name: z.string(),
});

const eventEmittors: Map<string, EventEmitter> = new Map<
  string,
  EventEmitter
>();

// temporary storage for modification -> deleted when code session ends
const codeSessionsCode: Map<string, string> = new Map<string, string>();

// todo: add RabbitMQ to send updates to code || add model storing the updates to code -> will process the changes periodically -> changes will be delivered to users
// the two share the same codebase and the same changes applied with their id's, so should not have any synchronisation issues
// will post in bulk
async function authoriseCodeSession({
  codeSessionId,
  currentUserId,
}: {
  codeSessionId: string;
  currentUserId: string;
}) {
  const codeSession = await prismaPostgres.codeSession.findUnique({
    where: {
      id: codeSessionId,
    },
  });
  if (!codeSession) {
    // the code session doesn't exist.
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Session does not exist",
    });
  }
  // check for auth
  const auth = await prismaPostgres.codeSessionUserAuth.findUnique({
    where: {
      codeSessionId_authorisedUserId: {
        codeSessionId,
        authorisedUserId: currentUserId,
      },
    },
  });
  if (!auth && currentUserId != codeSession.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Unauthorised user",
    });
  }
  return codeSession;
}

async function deleteCodeSession(codeSessionId: string) {
  codeSessionsCode.has(codeSessionId) && codeSessionsCode.delete(codeSessionId);
  return await prismaPostgres.codeSession.delete({
    where: {
      id: codeSessionId,
    },
  });
}

export const codeSessionRouter = createTRPCRouter({
  deleteCodeSpace: protectedProcedure
    .input(deleteCodeSpaceObject)
    .mutation(async ({ ctx, input: { codeSpaceId } }) => {
      const userId = ctx.session.user.id;
      const codeSpace = await prismaPostgres.codeSpace.findUnique({
        where: {
          id_userId: {
            id: codeSpaceId,
            userId,
          }
        }
      });
      if (!codeSpace) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Code space does not exist"
        })
      }
      await prismaPostgres.codeSpace.delete({
        where: {
          id_userId: {
            id: codeSpaceId,
            userId,
          }
        }
      });
      const codeSession = await prismaPostgres.codeSession.findUnique({
        where: {
          codeSpaceId_userId: {
            userId,
            codeSpaceId
          }
        }
      });
      if (!codeSession) {
        return {
          message: "Success"
        };
      }
      void deleteCodeSession(codeSession.id);
    }),
  createCodeSpace: protectedProcedure
    .input(createCodeSpaceObject)
    .mutation(async ({ ctx, input }) => {
      return await prismaPostgres.codeSpace.create({
        data: {
          code: "",
          userId: ctx.session.user.id,
          name: input.name,
        },
      });
    }),
  getAllSpaces: protectedProcedure.query(async ({ ctx }) => {
    const codeSpaces = await prismaPostgres.codeSpace.findMany({
      where: {
        userId: ctx.session.user.id,
      },
    });
    return codeSpaces;
  }),
  suscribeToSession: protectedProcedure
    .input(getCodeSessionObject)
    .subscription(async ({ ctx, input }) => {
      await authoriseCodeSession({
        ...input,
        currentUserId: ctx.session.user.id,
      });
      const emitter = eventEmittors.get(input.codeSessionId);
      if (!emitter) {
        // session not created -> cannot subscribe
        throw new TRPCError({
          message: "Failed to subscribe",
          code: "BAD_REQUEST",
        });
      }
      return observable<CodePost>((emit) => {
        const onAdd = (data: CodePost) => {
          emit.next(data);
        };
        emitter.on("add", onAdd);
        return () => {
          emitter.off("add", onAdd);
        };
      });
    }),
  createSession: protectedProcedure
    .input(createSessionObject)
    .mutation(async ({ ctx, input }) => {
      const values = {
        codeSpaceId: input.codeSpaceId,
        userId: ctx.session.user.id,
      };
      const existingSession = await prismaPostgres.codeSession.findUnique({
        where: {
          codeSpaceId_userId: values
        }
      })
      if (existingSession) {
        return existingSession;
      }
      const codeSession = await prismaPostgres.codeSession.create({
        data: values
      });
      // return session identifier
      return codeSession;
    }),
  getSession: protectedProcedure
    .input(z.object({ codeSession: z.string() }))
    .query(async ({ ctx, input }) => {
      const codeSession = await authoriseCodeSession({
        codeSessionId: input.codeSession,
        currentUserId: ctx.session.user.id,
      });

      const codeSpace = await prismaPostgres.codeSpace.findUnique({
        where: {
          id_userId: {
            id: codeSession.codeSpaceId,
            userId: codeSession.userId,
          },
        },
      });
      if (!codeSpace) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Code space does not exist",
        });
      }
      return {
        code: codeSpace.code,
        codeSpaceId: codeSpace.id,
      };
    }),
  updateSession: protectedProcedure
    .input(updateCodeSessionObject)
    .mutation(async ({ ctx, input }) => {
      await prismaPostgres.codeSpace.update({
        where: {
          id_userId: {
            id: input.codeSpaceId,
            userId: ctx.session.user.id,
          },
        },
        data: {
          code: input.code,
        },
      });
    }),
  deleteSession: protectedProcedure
    .input(getCodeSessionObject)
    .query(async ({ ctx, input }) => {
      await deleteCodeSession(input.codeSessionId);
    }),
});
