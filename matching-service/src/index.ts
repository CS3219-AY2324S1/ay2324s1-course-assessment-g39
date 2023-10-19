import express, { Express, NextFunction, Request, Response, response } from 'express';
import { AnyZodObject, z } from 'zod';  
import dotenv from 'dotenv';
import { authenticationMiddleware } from './auth';
import { RequestHandler } from 'express'
import expressAsyncHandler from 'express-async-handler';
import { prismaPostgres } from './db';
import amqplib from 'amqplib';
dotenv.config();

const app: Express = express();
app.use(express.json());
const port = process.env.MATCHING_PORT ?? 3005;

let channel: amqplib.Channel | undefined = undefined;

const amqp = amqplib.connect('amqp://localhost:5672')
  .then(async (conn) => {
    channel = await conn.createChannel();
    await channel.assertExchange("matching", "fanout", {});
    console.log('Channel created');
  });

const userObject = z.object({
  id: z.string(),
  name: z.string(),
  difficulty: z.number().min(0).max(5),
  category: z.string(),
  matchType: z.enum(["AUTO", "MANUAL"]),
});


const validate = (schema: AnyZodObject) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      return res.status(400).json(error);
    }
};

// creates a match request with the given user id
app.post('/match/create', validate(userObject), (req: Request, res: Response) => {
  const input = req.body;
  const { id, name, difficulty, category, matchType } = input;

  const existingRequest = await ctx.prismaPostgres.matchRequest
    .findFirst({
      where: {
        id: id,
      },
    })
    .then((req) => {
      return req;
    });

  if (existingRequest) {
    response.status(200).json({
      msg: "Request already exists",
      partner: "",
      isSuccess: false,
      difficulty,
      category,
      requestId: existingRequest.id,
    });
  }

  const request = await ctx.prismaPostgres.matchRequest
    .create({
      data: {
        id,
        userId: ctx.session.user.id,
        name,
        difficulty,
        category,
        matchType,
      },
    })
    .then((req) => {
      return req;
    });

  ee.emit("add", request);

  return {
    msg:
      request.matchType == "MANUAL"
        ? "Room created"
        : "Searching for partner...",
    partner: "",
    isSuccess: true,
    difficulty,
    category,
    requestId: request.id,
  };
});


// all the match requests in the db
app.get('/match/all', authenticationMiddleware, expressAsyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    message: 'Success',
    requests: await prismaPostgres.matchRequest.findMany({
      where: {
        matchType: "MANUAL"
      }
    })
  }));
}));

// Http stream for all events in match request
app.get('/match/events', authenticationMiddleware, expressAsyncHandler(async (req: Request, res: Response) => {
  if (!channel) {
    res.status(500).json({
      message: "Internal server not started"
    });
    return;
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE with client
  // stop listening to the amqp subscription
  let ctr = 0;
  const { queue } = await channel.assertQueue('', { exclusive: true, autoDelete: true });
  await channel.bindQueue(queue, "matching", '');
  await channel.consume(queue, (message) => {
    ctr = ctr + 1;
    return JSON.stringify({
      ctr,
      data: message?.content
    })
  });
  
  res.on('closes', () => {
    void channel?.deleteQueue(queue);
  });
}));

app.get('/match/create', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});


