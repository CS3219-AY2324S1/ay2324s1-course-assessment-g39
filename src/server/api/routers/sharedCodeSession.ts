import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { prismaPostgres } from "~/server/db";
import { deleteCodeSession } from "./codeSession";


// rootUser cannot be logged into
// 
const rootUser = {
    email: "rootUser",
    password: undefined
}

/**
 * Creats the root user if it isn't in the db.
 */
export  async function createRootUserIfNotExist() {
    const result = await prismaPostgres.user.upsert({
        create: rootUser,
        update: rootUser,
        where: {
            email: rootUser.email
        }
    });
    return result.id;
}

const createSharedCodeSession_z = z.object({
    user1: z.string().min(1),
    user2: z.string().min(1)
});

const deleteSharedCodeSession_z = z.object({
    sessionId: z.string().min(1),
    user1: z.string().min(1),
    user2: z.string().min(2)
});

/**
 * Map from user id to shared code sessions
 * Will be lost on server restart
 */
const sharedCodeSessions: Map<string, string> = new Map<string, string>();

export const sharedCodeSessionRouter = createTRPCRouter({
    /**
     * Endpoint that creates a code session given two users.
     * Returns the codeSession id to be used with codeSession.ts
     */
    createSharedCodeSession: protectedProcedure
        .input(createSharedCodeSession_z)
        .mutation(async ({ ctx, input }) => {
            return await prismaPostgres.$transaction(async (tx) => {

            const rId = await createRootUserIfNotExist();
            const yest = new Date();
            // 30 days
            yest.setDate(yest.getDate() - 30);

            await tx.codeSpace.deleteMany({
                where: {
                    AND: {
                        userId: rId,
                        createdAt: {
                            lte: yest
                        }
                    }                    
                }
            })
            // do not allow a user to have another session in memory
            // if one already exists
            if (sharedCodeSessions.get(input.user1) !==
            sharedCodeSessions.get(input.user2)) {
                const codesessionIds: string[] = [];
                if (sharedCodeSessions.has(input.user1)) codesessionIds.push(sharedCodeSessions.get(input.user1)!);
                if (sharedCodeSessions.has(input.user2)) codesessionIds.push(sharedCodeSessions.get(input.user2)!);
                const codeSessions = tx.codeSession.findMany({
                    where: {
                        AND: {
                            userId: rId,
                            id: {
                                in: codesessionIds
                            }
                        }
                    }
                })
                await tx.codeSpace.deleteMany({
                    where: {
                        AND: {
                            userId: rId,
                            id: {
                                in: (await codeSessions).map(data => data.codeSpaceId)
                            }
                        }
                    }
                })
                // create new shared code session
                sharedCodeSessions.delete(input.user1);
                sharedCodeSessions.delete(input.user2);
            }
            if (sharedCodeSessions.has(input.user1) 
                && sharedCodeSessions.has(input.user2)) {
                return {
                    sessionId: sharedCodeSessions.get(input.user1),
                }
            }
            const sharedCodeSpace = await tx.codeSpace.create({
                data: {
                    userId: rId,
                    code: ""
                }
            });
            const sharedSession = await tx.codeSession.create({
                data: {
                    userId: rId,
                    codeSpaceId: sharedCodeSpace.id
                }
            });
            sharedCodeSessions.set(input.user1, sharedSession.id);
            sharedCodeSessions.set(input.user2, sharedSession.id);
            await tx.codeSessionUserAuth.createMany({
                data: [
                    {
                        authorisedUserId: input.user1,
                        codeSessionId: sharedSession.id
                    },
                    {
                        authorisedUserId: input.user2,
                        codeSessionId: sharedSession.id
                    }
                ]
            })
            return {
                sessionId: sharedSession.id
            };
            })
        }),
        deleteSharedCodeSession: protectedProcedure
            .input(deleteSharedCodeSession_z)
            .mutation(async ({ input }) => {
                sharedCodeSessions.delete(input.user2);
                sharedCodeSessions.delete(input.user1);
                const session = await prismaPostgres.codeSession.findUnique({
                    where: {
                        id: input.sessionId
                    }
                });
                if (!session) {
                    return {
                        message: "Code session already deleted",
                    }
                }
                await deleteCodeSession(session.id);
                return {
                    message: "Successfully deleted session",
                }
            }),
});

