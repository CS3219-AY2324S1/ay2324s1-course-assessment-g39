import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { prismaPostgres } from "~/server/db";
import { EventEmitter } from "stream";
import { Update } from '@codemirror/collab'
import { ChangeSet, Text } from '@codemirror/state'
import { observable } from "@trpc/server/observable";


const createSessionObject = z.object({
  codeSpaceId: z.string(),
});


const deleteCodeSpaceObject = z.object({
  codeSpaceId: z.string(),
});

const getCodeSessionObject = z.object({
  codeSessionId: z.string(),
});

const updateCodeSessionObject = z.object({
  update: z.object({
    changes: z.string(), // json changeset
    clientId: z.string()
  }),
  codeSessionId: z.string(),
});

const createCodeSpaceObject = z.object({
  name: z.string(),
});

const eventEmittors: Map<string, EventEmitter> = new Map<
  string,
  EventEmitter
>();

// temporary storage for modification -> deleted when code session ends + applied
const codeSessionsCode: Map<string, Text> = new Map<string, Text>();
const clientIDs: Set<string> = new Set<string>();

function makeid(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}


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
      const codeSession = await prismaPostgres.codeSession.findUnique({
        where: {
          codeSpaceId_userId: {
            userId,
            codeSpaceId
          }
        }
      });
      if (codeSession) {
        await deleteCodeSession(codeSession.id);
      }
      
      await prismaPostgres.codeSpace.delete({
        where: {
          id_userId: {
            id: codeSpaceId,
            userId,
          }
        }
      });

      return {
        message: "Success"
      }
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
        eventEmittors.set(input.codeSessionId, new EventEmitter());
      }
      
      const emiter2 = eventEmittors.get(input.codeSessionId);
      return observable<{ clientId: string, changes: unknown }>((emit) => {
        const onAdd = (data: { clientId: string, changes: unknown }) => {
          emit.next(data);
        };
        
        
        emiter2!.on("onUpdate", onAdd);
        return () => {
          emiter2!.off("onUpdate", onAdd);
        };
      });
    }),
    getClientId: protectedProcedure
      .query(() => {
        let val = makeid(15);
        while (clientIDs.has(val)) {
          val = makeid(15);
        }
        return {
          clientId: val,
        }
      }),
    deleteClientId: protectedProcedure
      .input(z.object({ clientId: z.string() }))
      .query(({ input }) => {
        clientIDs.has(input.clientId) && clientIDs.delete(input.clientId);
      }),
  /**
   * Endpoint called to create a session.
   */
  createSession: protectedProcedure
    .input(createSessionObject)
    .mutation(async ({ ctx, input }) => {
      const values = {
        codeSpaceId: input.codeSpaceId,
        userId: ctx.session.user.id,
      };
      const codeSpace = await prismaPostgres.codeSpace.findUnique({
        where: {
          id_userId: {
            id: values.codeSpaceId,
            userId: values.userId,
          }
        }
      })
      if (!codeSpace) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No such code space exists" });
      }
      const existingSession = await prismaPostgres.codeSession.findUnique({
        where: {
          codeSpaceId_userId: values
        }
      })
      if (existingSession) {
        codeSessionsCode.set(existingSession?.id, Text.of(codeSpace.code.split("\n")));
        return existingSession;
      }
      const codeSession = await prismaPostgres.codeSession.create({
        data: values
      });
      codeSessionsCode.set(codeSession?.id, Text.of(codeSpace.code.split("\n")));
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
      if (codeSessionsCode.has(input.codeSession)) {
        return {
          code: codeSessionsCode.get(input.codeSession)?.toString() ?? '',
        };
      }

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
      
      codeSessionsCode.set(input.codeSession, Text.of(codeSpace.code.split("\n")))
      return {
        code: codeSpace.code
      };
    }),
  // todo: protect this route from other users without using a db query
  updateSession: protectedProcedure
    .input(updateCodeSessionObject)
    .mutation(async ({ ctx, input }) => {

      // don't really want to use temporary storage though, it can really explode
      // await authoriseCodeSession({ codeSessionId: input.codeSessionId, currentUserId: ctx.session.user.id });

      // no polling raises the question of when should saving be done?
      const ee = eventEmittors.get(input.codeSessionId);
      const change = ChangeSet.fromJSON(JSON.parse(input.update.changes));
      ee?.emit("onUpdate", {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        changes: change.toJSON(),
        clientId: input.update.clientId
      });
      let currCode = codeSessionsCode.get(input.codeSessionId);
      if (!currCode) {
        const codeSession = await prismaPostgres.codeSession.findUnique({
          where: {
            id: input.codeSessionId
          }
        });
        if (!codeSession) throw new TRPCError({ message:  "No such session exists", code: "BAD_REQUEST" });
        const values = await prismaPostgres.codeSpace.findUnique({
          where: {
            id_userId: {
              id: codeSession?.id,
              userId: codeSession?.userId
            }
          }
        });
        if (!values) throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to fetch code" });
        codeSessionsCode.set(input.codeSessionId, Text.of(values.code.split("\n")));
        currCode = codeSessionsCode.get(input.codeSessionId);
      }
      codeSessionsCode.set(input.codeSessionId, change.apply(currCode!));
      return {
        message: "Success"
      }
    }),
  saveSession: protectedProcedure
    .input(getCodeSessionObject)
    .query(async ({ ctx, input }) => {
      await authoriseCodeSession({ codeSessionId: input.codeSessionId, currentUserId: ctx.session.user.id });
      // find unique should work though -> its supposed to be a one-to-one mapping -> tho there is a chance of none
      const codeSession = await prismaPostgres.codeSession.findUnique({
        where: {
          id: input.codeSessionId,
        }
      })
      
      if (!codeSession) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Code space does not exist" });

      await prismaPostgres.codeSpace.update({
        where: {
          id_userId: {
            id: codeSession.codeSpaceId,
            userId: ctx.session.user.id
          }
        },
        data: {
          code: codeSessionsCode.get(input.codeSessionId)?.toString(),
        }

      })
      return {
        message: "Success",
      };
    }),
  deleteSession: protectedProcedure
    .input(getCodeSessionObject)
    .query(async ({ ctx, input }) => {
      await deleteCodeSession(input.codeSessionId);
    }),
});
