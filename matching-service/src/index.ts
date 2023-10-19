import express, { Express, NextFunction, Request, Response, response } from 'express';
import { AnyZodObject, z } from 'zod';  
import dotenv from 'dotenv';
import { authenticationMiddleware, getSession } from './auth';
import { RequestHandler } from 'express'
import expressAsyncHandler from 'express-async-handler';
import { prismaPostgres } from './db';
import amqplib from 'amqplib';
import matchRouter from './matching';
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const cors = require('cors');
dotenv.config();

const app: Express = express();
app.use(express.json());

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
app.use(cors({credentials: true, origin: 'http://localhost:3000'}));
const port = process.env.MATCHING_PORT ?? 3005;

matchRouter(app);

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

