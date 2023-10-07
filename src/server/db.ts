import { PrismaClient as PrismaClientMongo } from "@prisma-db-mongo/client";
import { PrismaClient as PrismaClientPostgres } from "@prisma-db-psql/client";
import { type LogLevel } from "@prisma/client/runtime/library";
import { z } from "zod";

import { env } from "~/env.mjs";

const { NODE_ENV } = env;

const globalForPrisma = globalThis as unknown as {
  prismaMongo?: PrismaClientMongo;
  prismaPostgres?: PrismaClientPostgres;
};

const logLevels = (
  NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"]
) as LogLevel[];

export const prismaPostgres =
  globalForPrisma.prismaPostgres ??
  new PrismaClientPostgres({
    log: logLevels,
  });

export const prismaMongo =
  globalForPrisma.prismaMongo ??
  new PrismaClientMongo({
    log: logLevels,
  });

if (NODE_ENV !== "production") {
  globalForPrisma.prismaPostgres = prismaPostgres;
  globalForPrisma.prismaMongo = prismaMongo;
}

const id_z = z.string().min(1); // can add error message
const name_z = z.string().min(1);
const email_z = z.string().email().min(1);
const emailVerified_z = z.date().nullable();
const image_z = z.string().nullable();
const password_z = z.string().min(6);

export { id_z, name_z, email_z, emailVerified_z, image_z, password_z };
