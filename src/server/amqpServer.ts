import amqp from "amqplib/callback_api";
import { prismaPostgres } from "./db";

amqp.connect("amqp://localhost", (err, conn) => {
  if (err) throw err;

  conn.createChannel((err, ch) => {
    if (err) throw err;

    // Start with clean slate for dev
    void Promise.resolve(prismaPostgres.matchRequest.deleteMany({}));

    // https://amqp-node.github.io/amqplib/channel_api.html#channel_prefetch
    ch.prefetch(1);

    console.log("[*] Waiting for requests.");

    const broadcast = "broadcast";
    ch.assertExchange(broadcast, "fanout", { durable: false });

    const addRequestQueue = "add_request_queue";
    ch.assertQueue(addRequestQueue, { durable: true });
    ch.consume(addRequestQueue, (msg) => {
      if (!msg) return;

      const id = msg.properties.headers.id as string;
      const difficulty = parseInt(msg.properties.headers.difficulty as string);
      const category = msg.properties.headers.category as string;

      void Promise.resolve(
        prismaPostgres.matchRequest
          .findFirst({
            where: {
              id,
            },
          })
          .then((res) => {
            if (!res) {
              void Promise.resolve(
                prismaPostgres.matchRequest
                  .create({
                    data: {
                      id,
                      difficulty,
                      category,
                    },
                  })
                  .catch((err) => {
                    console.log(err);
                  }),
              );
            } else {
              ch.publish(broadcast, "", Buffer.from("Request already exists"), {
                headers: {
                  id,
                  isSuccess: false,
                },
              });
            }
          }),
      );

      void Promise.resolve(
        prismaPostgres.matchRequest.create({
          data: {
            id,
            difficulty,
            category,
          },
        }),
      );

      ch.ack(msg);
    });

    const cancelRequestQueue = "cancel_request_queue";
    ch.assertQueue(cancelRequestQueue, { durable: true });
    ch.consume(cancelRequestQueue, (msg) => {
      if (!msg) return;

      const id = msg.properties.headers.id as string;

      void Promise.resolve(
        prismaPostgres.matchRequest
          .findFirst({
            where: {
              id,
            },
          })
          .then((res) => {
            console.log("deleting");
            if (res) {
              console.log("confirming delete");
              void Promise.resolve(
                prismaPostgres.matchRequest.delete({
                  where: {
                    id,
                  },
                }),
              );
            }
          }),
      );

      ch.ack(msg);
    });

    const status_queue = "check_status";
    ch.assertQueue(status_queue, { durable: true });
    ch.consume(status_queue, (msg) => {
      if (!msg) return;

      ch.ack(msg);
    });
  });
});
