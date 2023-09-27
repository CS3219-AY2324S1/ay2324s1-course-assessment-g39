import { z } from "zod";
import amqp from "amqplib/callback_api";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { prismaPostgres } from "~/server/db";

const MIN_DIFFICULTY = 0;
const MAX_DIFFICULTY = 5;

const userObject = z.object({
  difficulty: z.number().min(0).max(5),
  category: z.string(),
  id: z.string(),
});

type UserRequest = {
  difficulty: number;
  category: string;
  id: string;
};

type RequestResponse = {
  msg: string;
  partner: string;
  isSuccess: boolean;
};

class UserRequestHandler {
  async sendRequest(request: UserRequest) {
    return await new Promise<RequestResponse>((resolve, reject) => {
      amqp.connect("amqp://localhost", (err, conn) => {
        if (err) reject(err);

        conn.createChannel((err, ch) => {
          if (err) reject(err);

          ch.assertQueue("", { durable: true }, (err, q) => {
            if (err) reject(err);

            console.log(
              `[x] Sending match request: '${request.id}' with difficulty: ${request.difficulty} and category: ${request.category}`,
            );

            ch.consume(q.queue, (msg) => {
              if (msg && msg.properties.correlationId === request.id) {
                console.log(
                  `[x] Received partner: ${msg.properties.headers.partner}.`,
                );
                console.log(msg.content.toString());
                resolve({
                  msg: msg.content.toString(),
                  partner: msg.properties.headers.partner as string,
                  isSuccess: msg.properties.headers.isSuccess as boolean,
                } as RequestResponse);
                setTimeout(() => {
                  ch.close((err) => {
                    if (err) {
                      throw err;
                    }
                  });
                }, 500);
              }
            });

            ch.sendToQueue("request_queue", Buffer.from(""), {
              persistent: true,
              replyTo: q.queue,
              headers: {
                difficulty: request.difficulty,
                category: request.category,
                isCancel: false,
                id: request.id,
              },
            });
          });
        });
      });
    });
  }
}

export const matchRequestRouter = createTRPCRouter({
  addRequest: publicProcedure.input(userObject).mutation(async ({ input }) => {
    const { difficulty, category, id } = input;

    const existingRequest = await prismaPostgres.matchRequest
      .findFirst({
        where: {
          id: id,
        },
      })
      .then((req) => {
        return req;
      });

    if (existingRequest) {
      return {
        msg: "Request already exists",
        partner: "",
        isSuccess: false,
      };
    }

    const requestHandler = new UserRequestHandler();

    const response = await requestHandler
      .sendRequest({ difficulty, category, id })
      .then((res) => {
        return res;
      });

    return response;
  }),

  cancelRequest: publicProcedure
    .input(userObject)
    .mutation(async ({ input }) => {
      const { difficulty, category, id } = input;

      await removeRequest(id, difficulty, category);

      return {
        msg: "Request cancelled",
        partner: "",
        isSuccess: false,
      };
    }),
});

const removeRequest = async (
  id: string,
  difficulty: number,
  category: string,
) => {
  const removedRequest = await prismaPostgres.matchRequest
    .delete({
      where: {
        id,
        difficulty,
        category,
      },
    })
    .catch(() => {
      return undefined;
    });

  return removedRequest;
};

const sendToClients = async (
  difficulty: number,
  ch: amqp.Channel,
  categorizedRequests: Map<string, Array<string>>,
) => {
  for (const [category, ids] of categorizedRequests) {
    if (ids.length < 2) continue;

    const index1 = Math.floor(Math.random() * ids.length);
    const id1 = ids.splice(index1, 1)[0];
    const request1 = id1
      ? await Promise.resolve(removeRequest(id1, difficulty, category)).then(
          (res) => {
            return res;
          },
        )
      : undefined;

    const index2 = Math.floor(Math.random() * ids.length);
    const id2 = ids.splice(index2, 1)[0];
    const request2 = id2
      ? await Promise.resolve(removeRequest(id2, difficulty, category))
      : undefined;

    if (request1 && request2) {
      const replyTo1 = request1.replyTo;
      const replyTo2 = request2.replyTo;

      const msg1 = Buffer.from("Found match!");
      const msg2 = Buffer.from("Found match!");

      ch.sendToQueue(replyTo1, msg1, {
        correlationId: id1,
        headers: {
          partner: id2,
          isSuccess: true,
        },
      });
      ch.sendToQueue(replyTo2, msg2, {
        correlationId: id2,
        headers: {
          partner: id1,
          isSuccess: true,
        },
      });
    }
  }
};

const matchRequests = async (ch: amqp.Channel) => {
  for (let i = MIN_DIFFICULTY; i <= MAX_DIFFICULTY; i++) {
    const requests = await prismaPostgres.matchRequest
      .findMany({
        where: {
          difficulty: i,
        },
      })
      .then((res) => {
        return res;
      });

    if (requests && requests.length >= 2) {
      const categorizedRequests = requests.reduce((acc, request) => {
        if (!acc.has(request.category)) {
          acc.set(request.category, []);
        }

        const ids = acc.get(request.category);
        if (ids) ids.push(request.id);

        return acc;
      }, new Map<string, Array<string>>());

      await sendToClients(i, ch, categorizedRequests);
    }
  }
};

void Promise.resolve(
  amqp.connect("amqp://localhost", (err, conn) => {
    if (err) throw err;

    conn.createChannel((err, ch) => {
      if (err) throw err;

      // Start with clean slate for dev
      void Promise.resolve(prismaPostgres.matchRequest.deleteMany({}));

      // https://amqp-node.github.io/amqplib/channel_api.html#channel_prefetch
      ch.prefetch(1);

      console.log("[*] Waiting for requests.");

      const request_queue = "request_queue";

      // https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue
      ch.assertQueue(request_queue, { durable: true });

      // https://amqp-node.github.io/amqplib/channel_api.html#channel_consume
      ch.consume(request_queue, (msg) => {
        if (!msg) return;

        const difficulty = msg.properties.headers.difficulty as number;
        const category = msg.properties.headers.category as string;
        const id = msg.properties.headers.id as string;
        const replyTo = msg.properties.replyTo as string;

        void Promise.resolve(
          prismaPostgres.matchRequest.create({
            data: {
              id,
              replyTo,
              difficulty,
              category,
            },
          }),
        );

        console.log("[x] Received request: '%s'", id.toString());

        // Very important to acknowledge the message, otherwise it will be sent again
        ch.ack(msg);

        setTimeout(() => {
          void Promise.resolve(removeRequest(id, difficulty, category)).then(
            (res) => {
              if (res) {
                // https://amqp-node.github.io/amqplib/channel_api.html#channel_sendToQueue
                ch.sendToQueue(
                  replyTo,
                  Buffer.from("Timeout. No match found."),
                  {
                    correlationId: id,
                    headers: {
                      isSuccess: false,
                    },
                  },
                );
              }
            },
          );
        }, 30000);
      });

      setInterval(() => void matchRequests(ch), 1000);
    });
  }),
);
