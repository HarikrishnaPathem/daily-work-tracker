import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

type Interval = { start: number; end: number };
export type RequestTiming = {
  id: string;
  prismaIntervals: Interval[];
  prismaOperations: Map<string, { count: number; totalMs: number }>;
  queryEventCount: number;
  queryEventTotalMs: number;
};

const globalForTiming = globalThis as typeof globalThis & { dwtRequestTiming?: AsyncLocalStorage<RequestTiming> };
const requestTiming = globalForTiming.dwtRequestTiming ?? new AsyncLocalStorage<RequestTiming>();
globalForTiming.dwtRequestTiming = requestTiming;

export function requestTimingId(requestId?: string | null) {
  return requestId && /^[\da-f-]{36}$/i.test(requestId) ? requestId : randomUUID();
}

export function runWithRequestTiming<T>(id: string, fn: (timing: RequestTiming) => Promise<T>) {
  const timing: RequestTiming = { id, prismaIntervals: [], prismaOperations: new Map(), queryEventCount: 0, queryEventTotalMs: 0 };
  return requestTiming.run(timing, () => fn(timing));
}

export function recordPrismaOperation(operation: string, durationMs: number) {
  const timing = requestTiming.getStore();
  if (!timing) return;
  const end = performance.now();
  timing.prismaIntervals.push({ start: end - durationMs, end });
  const entry = timing.prismaOperations.get(operation) ?? { count: 0, totalMs: 0 };
  entry.count += 1;
  entry.totalMs += durationMs;
  timing.prismaOperations.set(operation, entry);
}

// Prisma's query event duration is its reported query duration, not a server-side
// PostgreSQL execution measurement. Do not log the event's SQL or parameters.
export function recordPrismaQueryEvent(durationMs: number) {
  const timing = requestTiming.getStore();
  if (!timing) return;
  timing.queryEventCount += 1;
  timing.queryEventTotalMs += durationMs;
}

function unionDuration(intervals: Interval[], start: number, end: number) {
  const sorted = intervals
    .map((interval) => ({ start: Math.max(start, interval.start), end: Math.min(end, interval.end) }))
    .filter((interval) => interval.end > interval.start)
    .sort((a, b) => a.start - b.start);
  let total = 0;
  let active: Interval | undefined;
  for (const interval of sorted) {
    if (!active || interval.start > active.end) {
      if (active) total += active.end - active.start;
      active = interval;
    } else active.end = Math.max(active.end, interval.end);
  }
  return total + (active ? active.end - active.start : 0);
}

export function requestTimingSummary(timing: RequestTiming, start: number, end: number) {
  return {
    prismaWallMs: unionDuration(timing.prismaIntervals, start, end),
    prismaOperations: [...timing.prismaOperations.entries()].map(([name, value]) => ({ name, ...value })),
    queryEventCount: timing.queryEventCount,
    queryEventTotalMs: timing.queryEventTotalMs,
  };
}
