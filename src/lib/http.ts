import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma";
import { requestTimingId, requestTimingSummary, runWithRequestTiming, type RequestTiming } from "@/lib/server-timing";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export function errorResponse(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof Error && "status" in error && error.status === 409) return json({ error: error.message }, 409);
  if (error instanceof ZodError) return json({ error: "Invalid input", details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = error.meta?.target;
    const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
    if (fields.some((field) => field.toLowerCase().includes("email"))) return json({ error: "An account with this email already exists" }, 409);
    return json({ error: "A conflicting record already exists" }, 409);
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") return json({ error: "Conflicting update; please retry" }, 409);
  console.error("API error", error);
  return json({ error: "Internal server error" }, 500);
}
export async function body<T>(request: Request, schema: { parse: (value: unknown) => T }): Promise<T> {
  let value: unknown;
  try { value = await request.json(); } catch { throw new HttpError(400, "Invalid JSON body"); }
  return schema.parse(value);
}
type IdContext = { params: Promise<{ id: string }> };
export function api(fn: (request: Request) => Promise<Response>): (request: Request) => Promise<Response>;
export function api(fn: (request: Request, context: IdContext) => Promise<Response>): (request: Request, context: IdContext) => Promise<Response>;
export function api(fn: ((request: Request) => Promise<Response>) | ((request: Request, context: IdContext) => Promise<Response>)) {
  return async (request: Request, context?: IdContext) => {
    const development = process.env.NODE_ENV === "development";
    const execute = async (timing?: RequestTiming) => {
      const startedAt = development ? performance.now() : 0;
      let response: Response;
      try { response = await Reflect.apply(fn, undefined, context ? [request, context] : [request]) as Response; }
      catch (error) { response = errorResponse(error); }
      if (development && timing) {
        const path = new URL(request.url).pathname.replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "/[id]");
        const endedAt = performance.now();
        const totalMs = endedAt - startedAt;
        const summary = requestTimingSummary(timing, startedAt, endedAt);
        const residualMs = Math.max(0, totalMs - summary.prismaWallMs);
        const operations = summary.prismaOperations
          .sort((a, b) => b.totalMs - a.totalMs)
          .map(({ name, count, totalMs: operationMs }) => `${name}:${count}x${operationMs.toFixed(1)}ms`)
          .join(",") || "none";
        console.info(`[timing ${timing.id}] api ${request.method} ${path} ${response.status} total=${totalMs.toFixed(1)}ms prismaWall=${summary.prismaWallMs.toFixed(1)}ms prismaOpSum=${summary.prismaOperations.reduce((sum, entry) => sum + entry.totalMs, 0).toFixed(1)}ms prismaQueryEvents=${summary.queryEventCount} prismaQueryMs=${summary.queryEventTotalMs.toFixed(1)}ms residual=${residualMs.toFixed(1)}ms ops=${operations}`);
      }
      return response;
    };
    if (!development) return execute();
    const id = requestTimingId(request.headers.get("x-dwt-request-id"));
    return runWithRequestTiming(id, execute);
  };
}
