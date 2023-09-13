import amqp from "amqplib/callback_api";

const MAX_DIFFICULTY = 5;

const pendingRequests = new Map<number, Array<Request>>();

const removeRequest = (
  difficulty: number,
  category: string,
  correlationId: string,
) => {
  const requests = pendingRequests.get(difficulty);
  if (requests) {
    const index = requests.findIndex(
      (request) =>
        request.category === category &&
        request.correlationId === correlationId,
    );
    if (index !== -1) {
      return requests.splice(index, 1)[0];
    }
  }

  return undefined;
};

const sendToClients = (
  difficulty: number,
  ch: amqp.Channel,
  categorizedRequests: Map<string, Array<string>>,
) => {
  for (const [category, correlationIds] of categorizedRequests) {
    console.log(correlationIds);
    if (correlationIds.length < 2) continue;

    const index1 = Math.floor(Math.random() * correlationIds.length);
    const correlationId1 = correlationIds.splice(index1, 1)[0];
    const request1 = correlationId1
      ? removeRequest(difficulty, category, correlationId1)
      : undefined;

    const index2 = Math.floor(Math.random() * correlationIds.length);
    const correlationId2 = correlationIds.splice(index2, 1)[0];
    const request2 = correlationId2
      ? removeRequest(difficulty, category, correlationId2)
      : undefined;

    if (request1 && request2) {
      const replyTo1 = request1.replyTo;
      const replyTo2 = request2.replyTo;

      const msg1 = Buffer.from(
        `You have been matched with another player: ${correlationId2}`,
      );
      const msg2 = Buffer.from(
        `You have been matched with another player: ${correlationId1}`,
      );

      ch.sendToQueue(replyTo1, msg1, {
        correlationId: correlationId1,
        headers: {
          partner: correlationId2,
          isSuccess: true,
        },
      });
      ch.sendToQueue(replyTo2, msg2, {
        correlationId: correlationId2,
        headers: {
          partner: correlationId1,
          isSuccess: true,
        },
      });
    }
  }
};

const matchRequests = (ch: amqp.Channel) => {
  for (let i = 0; i <= MAX_DIFFICULTY; i++) {
    const requests = pendingRequests.get(i);

    if (requests && requests.length >= 2) {
      const categorizedRequests = requests.reduce((acc, request) => {
        if (!acc.has(request.category)) {
          acc.set(request.category, []);
        }

        const correlationIds = acc.get(request.category);
        if (correlationIds) correlationIds.push(request.correlationId);

        return acc;
      }, new Map<string, Array<string>>());

      sendToClients(i, ch, categorizedRequests);
    }
  }
};

amqp.connect("amqp://localhost", (err, conn) => {
  if (err) throw err;

  conn.createChannel((err, ch) => {
    if (err) throw err;

    ch.prefetch(1);

    console.log("[*] Waiting for requests.");

    const request_queue = "request_queue";

    ch.assertQueue(request_queue, { durable: true });

    ch.consume(request_queue, (msg) => {
      if (!msg) return;

      const difficulty = msg.properties.headers.difficulty as number;
      const category = msg.properties.headers.category as string;
      const id = msg.properties.headers.id as string;
      const replyTo = msg.properties.replyTo as string;

      if (!pendingRequests.has(difficulty)) {
        pendingRequests.set(difficulty, []);
      }

      const requests = pendingRequests.get(difficulty);
      if (requests !== undefined)
        requests.push({ replyTo, category, correlationId: id });

      console.log("[x] Received request: '%s'", id.toString());

      // Very important to acknowledge the message, otherwise it will be sent again
      ch.ack(msg);

      setTimeout(() => {
        const requests = pendingRequests.get(difficulty);
        if (requests) {
          const index = requests.findIndex(
            (request) =>
              request.category === category && request.correlationId === id,
          );
          if (index !== -1) {
            const request = requests.splice(index, 1)[0];
            if (request) {
              ch.sendToQueue(replyTo, Buffer.from("Connection timed out"), {
                correlationId: id,
                headers: {
                  isSuccess: false,
                },
              });
            }
          }
        }
      }, 30000);
    });

    const cancel_queue = "cancel_queue";

    ch.assertQueue(cancel_queue, { durable: true });

    ch.consume(cancel_queue, (msg) => {
      const difficulty = msg!.properties.headers.difficulty as number;
      const category = msg!.properties.headers.category as string;
      const id = msg!.properties.headers.id as string;
      const replyTo = msg!.properties.replyTo as string;

      removeRequest(difficulty, category, id);
      console.log("[x] Cancelled request: '%s'", id.toString());
      ch.sendToQueue(replyTo, Buffer.from("Cancelled request"), {
        correlationId: id,
        headers: {
          isSuccess: false,
        },
      });

      // Very important to acknowledge the message, otherwise it will be sent again
      ch.ack(msg!);
    });

    setInterval(() => matchRequests(ch), 1000);
  });
});

type Request = {
  replyTo: string;
  category: string;
  correlationId: string;
  isCancel?: boolean;
};
