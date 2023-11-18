/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import OpenAI from "openai";
import type { MessageContentText } from "openai/resources/beta/threads/messages/messages";
import { TRPCError } from "@trpc/server";

const ee = new EventEmitter();

const OPENAI_ASSISTANT_ID = "asst_1o7xscIo6R2jPBxVU5Boqmf2";
const openai = new OpenAI();

// Initialization for assistant
/* 
async function main() {
  const assistant = await openai.beta.assistants.create({
    instructions: "You are an assistant that helps to explain code.",
    name: "Code Assistant",
    tools: [{ type: "code_interpreter" }],
    model: "gpt-3.5-turbo-1106",
  });
  console.log(assistant);
} */

export type UserAndAIMessage = {
  id?: string;
  sessionId: string;
  userId: string;
  message: string;
  role: "user" | "assistant";
};

export const userAndAIMessagesRouter = createTRPCRouter({
  getAllSessionUserAndAIMessages: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { sessionId, userId } = input;

      let sessionThread = await ctx.prismaPostgres.sessionAIThread.findFirst({
        where: {
          sessionId,
          userId,
        },
      });

      if (!sessionThread) {
        const newThread = await openai.beta.threads.create({});
        sessionThread = await ctx.prismaPostgres.sessionAIThread.create({
          data: {
            sessionId,
            userId,
            threadId: newThread.id,
          },
        });
      }

      const messages = await openai.beta.threads.messages.list(
        sessionThread.threadId,
      );

      return messages.data
        .map((message) => {
          const role = message.role;
          const text = (message.content[0] as MessageContentText).text.value;
          return {
            message: text,
            role,
          };
        })
        .reverse(); // Messages from OpenAI Assistant are in reverse chronological order
    }),

  addUserAndAIMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.string(),
        message: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { sessionId, userId, message } = input;

      const sessionThread = await ctx.prismaPostgres.sessionAIThread.findFirst({
        where: {
          sessionId,
          userId,
        },
      });

      // Add Message to the session Thread
      await openai.beta.threads.messages.create(sessionThread?.threadId ?? "", {
        role: "user",
        content: message,
      });

      // Retrieve the assistant
      const openaiAssistant =
        await openai.beta.assistants.retrieve(OPENAI_ASSISTANT_ID);

      // Create the run for the assistant
      const run = await openai.beta.threads.runs.create(
        sessionThread?.threadId ?? "",
        {
          assistant_id: openaiAssistant.id,
          instructions: "Please answer clearly and concisely",
        },
      );

      // Wait for the run to complete
      while (true) {
        const response = await openai.beta.threads.runs.retrieve(
          sessionThread?.threadId ?? "",
          run.id,
        );

        if (response.status === "completed") break;
        else if (response.status === "failed")
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: response.last_error?.message,
          });
        else if (response.status === "expired")
          throw new TRPCError({
            code: "TIMEOUT",
            message: "Request timed out",
          });
      }

      const messages = await openai.beta.threads.messages.list(
        sessionThread?.threadId ?? "",
      );

      const aiResponse = messages.data[0];
      const id = aiResponse?.id;
      const role = aiResponse?.role;
      const text = (aiResponse?.content[0] as MessageContentText).text.value;

      ee.emit("aiMessage", {
        id,
        sessionId,
        userId,
        message: text,
        role,
      });

      return {
        message: text,
        role,
      };
    }),

  subscribeToSessionUserAndAIMessages: protectedProcedure
    .input(z.object({ sessionId: z.string(), userId: z.string() }))
    .subscription(({ input }) => {
      return observable<UserAndAIMessage>((emit) => {
        const onMessage = (data: UserAndAIMessage) => {
          if (
            data.sessionId === input.sessionId &&
            data.userId === input.userId
          )
            emit.next(data);
        };
        ee.on("aiMessage", onMessage);
        return () => {
          ee.off("aiMessage", onMessage);
        };
      });
    }),
});
