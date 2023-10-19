import express, { Express, NextFunction, Request, Response } from 'express';
import { AnyZodObject, z } from 'zod';  
import dotenv from 'dotenv';
import { authenticationMiddleware, getSession } from './auth';
import { RequestHandler } from 'express'
import expressAsyncHandler from 'express-async-handler';
import { prismaPostgres } from './db';
import amqplib from 'amqplib';

const matchRouter = (app: express.Express) => {
let channel: amqplib.Channel | undefined = undefined;

// the json object that is sent through the queue
type MatchingMessage = {
  requestId?: string,
  matchedId?: string | undefined,
  joinRequestId?: number | undefined,
  requestingUser?: string,
  matchedUser?: string | undefined,
  matchType: "AUTO" | "MANUAL" | "REQUEST" | "AUTO_MATCHED" | "DELETE_REQUEST" | "DELETE_JOIN_REQUEST"
}

// the exchabge
const matchingEvents = "matchingEvents";
// the queuue used to  perform processing
const processingQueue = "processingQueue";
const amqp = amqplib.connect('amqp://localhost:5672')
  .then(async (conn) => {
    channel = await conn.createChannel();
    // the event channel
    await channel.assertExchange(matchingEvents, "fanout", {});
    console.log('Channel created');
    const { queue } = await channel.assertQueue(processingQueue, { exclusive: true });
    await channel.consume(queue, (msg) => {
      if (!msg) return;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const message: MatchingMessage | null = JSON.parse(msg.content.toString());
      if (!message) return;
      if (message.matchType !== "AUTO") return;
      // find a user to match with and delete their request
      void prismaPostgres.$transaction(async (tx) => {
        const req = await tx.matchRequest.findFirst({
          where: {
            AND: {
              matchType: "AUTO",
              id: {
                not: message.requestId
              },
              userId: {
                not: message.requestingUser
              }
            }
          }
        });
        if (!req) return null;
        const deleted = await tx.matchRequest.delete({
          where: {
            id: req.id
          }
        });
        publishMessage({
          ...message,
          matchedUser: deleted.userId,
          matchedId: deleted.id,
          matchType: "AUTO_MATCHED"
        })
      });
    });
  });

function publishMessage(message: MatchingMessage) {
  channel?.publish(matchingEvents, '', Buffer.from(JSON.stringify(message)));
  
  
  
  
}

process.on('exit', () => {
  void channel?.close();
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
      await schema.parseAsync(req.body);
      next();
    } catch (error) {
      res.status(400).json(error);
    }
};

// creates a match request with the given user id
app.post('/match/create', authenticationMiddleware, expressAsyncHandler(validate(userObject)), authenticationMiddleware, expressAsyncHandler(async (req: Request, res: Response) => {
  const input = userObject.parse(req.body);
  const { id, name, difficulty, category, matchType } = input;
  const session = await getSession(req);
  // delete aft an hour
  const deleteB4 = new Date().getTime() - 600000;
  const deletedB4Date = new Date(deleteB4);
  await prismaPostgres.matchRequest.deleteMany({
    where: {
        createdAt: {
            lte: deletedB4Date
        }
    }
  });
  if (!session) {
    return;
  }

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
    res.status(200).json({
      msg: "Request already exists",
      partner: "",
      isSuccess: false,
      difficulty,
      category,
      requestId: existingRequest.id,
    });
    return;
  }

  const request = await prismaPostgres.matchRequest
    .create({
      data: {
        id,
        userId: session?.id  ?? "",
        name,
        difficulty,
        category,
        matchType,
      },
    })
    .then((req) => {
      return req;
    });

  // send message to rmq channel 
  // only needed if request is auto
  publishMessage({
    requestId: request.id,
    matchedId: undefined,
    requestingUser: session.id!,
    matchedUser: undefined,
    matchType: request.matchType,
  });


  res.json({
    msg:
      request.matchType == "MANUAL"
        ? "Room created"
        : "Searching for partner...",
    partner: "",
    isSuccess: true,
    difficulty,
    category,
    requestId: request.id,
  });
  res.end();
}));

const deleteMatchReqObject = z.object({
    id: z.string()
})
app.delete('/match/delete', authenticationMiddleware, expressAsyncHandler(validate(deleteMatchReqObject)), 
    expressAsyncHandler(async (req: Request, res: Response) => {
    const data = deleteMatchReqObject.parse(req.body);
    const result = await prismaPostgres.matchRequest.delete({
        where: {
            id: data.id
        }
    });
    publishMessage({
        requestId: result.id,
        matchType: "DELETE_REQUEST"
    })

    res.json({
        message: "success"
    });

}));


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
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE with client
  const { queue } = await channel.assertQueue('', { exclusive: true });
  await channel.bindQueue(queue, matchingEvents, '');
  await channel.consume(queue, (message) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const data: MatchingMessage | undefined =  JSON.parse(message?.content.toString() ?? "");
    if (!data) {
      return;
    }
    // write for all changes
    res.write(JSON.stringify(data) + "\n");
    
  });
  
  res.on('closes', () => {
    void channel?.deleteQueue(queue);
  });
}));


const requestCreate = z.object({
  userId: z.string(),
  requestId: z.string(),
  userName: z.string()
});

app.get('match/join', authenticationMiddleware, expressAsyncHandler(async (_req, res) => {
  res.json(await prismaPostgres.joinRequest.findMany({}));
  res.end();
}))

app.post('match/join', authenticationMiddleware, expressAsyncHandler(validate(requestCreate)),

expressAsyncHandler(async (
  req, res
) => {
  const session = await getSession(req);
  const input = requestCreate.parse(req.body);
  const jr = prismaPostgres.joinRequest.create({
    data: {
      fromName: session!.name ?? "",
      fromId: session!.id ?? "",
      toId: input.requestId,
    }
  });
  res.json(jr);
  res.end();
}));

app.delete('match/join', authenticationMiddleware, expressAsyncHandler(validate(z.object({
  id: z.number()
}))), expressAsyncHandler(async (
  req: Request, res: Response
) => {
  const { id } = z.object({ id: z.number() }).parse(req.body);
  const session = await getSession(req);
  const request = await prismaPostgres.joinRequest.delete({
    where: {
      id
    }
  });
  
  publishMessage({
    matchType: "DELETE_JOIN_REQUEST",
    joinRequestId: id,
  })
  res.json({
    msg: "Request cancelled",
    partner: "",
  });
  res.end();
}))
}

export default matchRouter;