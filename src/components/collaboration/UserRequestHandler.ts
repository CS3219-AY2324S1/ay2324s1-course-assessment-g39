import amqp from "amqplib/callback_api";
import crypto from "crypto";

type UserRequest = {
  difficulty: number;
  category: string;
};

export type RequestResponse = {
  msg: string;
  partner: string;
  isSuccess: boolean;
};

export default class UserRequestHandler {
  async sendRequest(request: UserRequest) {
    return await new Promise<RequestResponse>((resolve, reject) => {
      amqp.connect("amqp://localhost", (err, conn) => {
        if (err) reject(err);

        conn.createChannel((err, ch) => {
          if (err) reject(err);

          ch.assertQueue("", { durable: true }, (err, q) => {
            if (err) reject(err);

            const correlationId = crypto.randomUUID();

            console.log(
              `[x] Sending request: '${correlationId}' with difficulty: ${request.difficulty} and category: ${request.category}`,
            );

            ch.consume(q.queue, (msg) => {
              if (msg && msg.properties.correlationId === correlationId) {
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
                      console.log(err);
                      throw err;
                    }
                  });
                }, 500);
              }
            });

            ch.sendToQueue("request_queue", Buffer.from(""), {
              persistent: true,
              correlationId,
              replyTo: q.queue,
              headers: {
                difficulty: request.difficulty,
                category: request.category,
              },
            });
          });
        });
      });
    });
  }
}
