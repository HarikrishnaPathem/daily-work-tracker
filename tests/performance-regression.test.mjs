import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("HEAD report pages use the focused report API instead of dashboard analytics", async () => {
  const source = await readFile(new URL("../src/components/reports-workspace.tsx", import.meta.url), "utf8");
  assert.match(source, /apiFetch<\{ reports: Report\[\] \}>\("\/api\/updates"\)/);
  assert.doesNotMatch(source, /apiFetch<\{ reports: Report\[\] \}>\("\/api\/dashboard\/head"\)/);
});

test("HEAD dashboard requests only recent report rows and computes draft totals independently", async () => {
  const [route, dashboard] = await Promise.all([
    readFile(new URL("../src/app/api/dashboard/head/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/components/dashboard-home.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(route, /take:\s*6/);
  assert.match(route, /draftReports/);
  assert.match(dashboard, /count:\s*summary\.draftReports/);
});

test("report mutations update local state without refetching every report and dashboard", async () => {
  const source = await readFile(new URL("../src/components/reports-workspace.tsx", import.meta.url), "utf8");
  assert.match(source, /setReports\(\(current\) => \[\.\.\.current\.filter/);
  assert.match(source, /setReports\(\(current\) => current\.map/);
  assert.match(source, /review: Review/);
});

test("session lookup selects only the user fields used by authorization and account flows", async () => {
  const source = await readFile(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(source, /select:\s*\{\s*id:\s*true,\s*expiresAt:\s*true,\s*user:\s*\{\s*select:/s);
  assert.doesNotMatch(source, /include:\s*\{\s*user:\s*true/);
});

test("development timing distinguishes client wait, API total, Prisma operations, and query events", async () => {
  const [server, database, client] = await Promise.all([
    readFile(new URL("../src/lib/http.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/db.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/client-api.ts", import.meta.url), "utf8"),
  ]);
  assert.match(server, /total=\$\{totalMs\.toFixed\(1\)\}ms prismaWall=\$\{summary\.prismaWallMs\.toFixed\(1\)\}ms/);
  assert.match(server, /prismaQueryEvents=\$\{summary\.queryEventCount\}/);
  assert.match(server, /prismaQueryMs=\$\{summary\.queryEventTotalMs\.toFixed\(1\)\}ms/);
  assert.match(server, /x-dwt-request-id/);
  assert.match(database, /recordPrismaOperation\(`\$\{model\}\.\$\{operation\}`/);
  assert.match(database, /queryTimingSubscribed/);
  assert.match(database, /recordPrismaQueryEvent\(event\.duration\)/);
  assert.match(client, /wait=\$\{\(performance\.now\(\) - startedAt\)\.toFixed\(1\)\}ms/);
  assert.match(client, /complete=\$\{\(performance\.now\(\) - startedAt\)\.toFixed\(1\)\}ms/);
  assert.doesNotMatch(client, /console\.(?:log|info)\([^\n]*(?:password|token|body|report)/i);
});

test("user management mutations reuse their responses instead of reloading the list", async () => {
  const [workspace, createRoute, updateRoute] = await Promise.all([
    readFile(new URL("../src/components/users-workspace.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/users/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/app/api/users/[id]/route.ts", import.meta.url), "utf8"),
  ]);
  assert.doesNotMatch(workspace, /await load\(\)/);
  assert.match(workspace, /setUsers\(\(current\) => \[\.\.\.current, created\]/);
  assert.match(workspace, /setUsers\(\(current\) => current\.map/);
  assert.match(createRoute, /createdAt: true, _count: \{ select: \{ reports: true \} \}/);
  assert.match(updateRoute, /createdAt: true, _count: \{ select: \{ reports: true \} \}/);
});

test("server rendering deduplicates repeated session lookups within one render", async () => {
  const auth = await readFile(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /currentUser = cache\(async function currentUser/);
});
