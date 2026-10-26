import { PrismaClient } from "@/generated/prisma";
import { recordPrismaOperation, recordPrismaQueryEvent } from "@/lib/server-timing";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; queryTimingSubscribed?: boolean };
const development = process.env.NODE_ENV === "development";
const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: development ? [{ emit: "event", level: "query" }] : [],
});
if (development && !globalForPrisma.queryTimingSubscribed) {
  const queryEvents = prisma as unknown as { $on: (event: "query", listener: (event: { duration: number }) => void) => void };
  queryEvents.$on("query", (event) => recordPrismaQueryEvent(event.duration));
  globalForPrisma.queryTimingSubscribed = true;
}
const measuredPrisma = process.env.NODE_ENV === "development"
  ? prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = performance.now();
          try { return await query(args); }
          finally {
            const duration = performance.now() - startedAt;
            recordPrismaOperation(`${model}.${operation}`, duration);
          }
        },
      },
    },
  })
  : prisma;
// The extension only adds timing around unchanged model operations; retain the
// base Prisma type so transaction and groupBy overloads remain intact.
export const db = measuredPrisma as PrismaClient;
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
