import { PrismaClient as PrismaClientMongo } from "@prisma-db-mongo/client";
import { PrismaClient as PrismaClientPostgres } from "@prisma-db-psql/client";
import { type LogLevel } from "@prisma/client/runtime/library";

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
