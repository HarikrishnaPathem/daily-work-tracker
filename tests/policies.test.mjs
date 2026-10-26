import test from "node:test";
import assert from "node:assert/strict";
import { canReadReport, canManageUsers, canReview, assertEditable, assertReviewable } from "../src/lib/policies.mjs";
import { createManagedUserData } from "../src/lib/user-creation.mjs";
import { managedUserListWhere } from "../src/lib/user-list.mjs";
import bcrypt from "bcryptjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

test("only HEAD sees other users' reports; users remain restricted to their own", () => {
  assert.equal(canReadReport({ id: "a", role: "USER" }, "a"), true);
  assert.equal(canReadReport({ id: "a", role: "USER" }, "b"), false);
  assert.equal(canReadReport({ id: "h", role: "HEAD" }, "b"), true);
});
test("account management and review are HEAD-only", () => {
  assert.equal(canManageUsers({ role: "USER" }), false);
  assert.equal(canManageUsers({ role: "HEAD" }), true);
  assert.equal(canReview({ role: "USER" }), false);
  assert.equal(canReview({ role: "HEAD" }), true);
});
test("HEAD user list omits only the authenticated HEAD and retains other HEADs and USERs", async () => {
  const heads = [
    { id: "head-a", role: "HEAD" },
    { id: "head-b", role: "HEAD" },
  ];
  const users = [
    { id: "user-a", role: "USER" },
    { id: "user-b", role: "USER" },
  ];
  for (const current of heads) {
    const where = managedUserListWhere(current.id);
    assert.deepEqual(where, { id: { not: current.id } });
    const visible = [...heads, ...users].filter((account) => account.id !== where.id.not);
    assert.equal(visible.some((account) => account.id === current.id), false);
    assert.equal(visible.some((account) => account.id === (current.id === "head-a" ? "head-b" : "head-a")), true);
    assert.equal(visible.filter((account) => account.role === "USER").length, 2);
  }
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const route = await readFile(resolve(root, "src/app/api/users/route.ts"), "utf8");
  assert.match(route, /const actor = await requireHead\(\)/);
  assert.match(route, /managedUserListWhere\(actor\.id\)/);
});
test("approved reports lock; only submitted reports are reviewable", () => {
  assert.throws(() => assertEditable("APPROVED"));
  for (const status of ["DRAFT", "SUBMITTED", "REJECTED"]) assert.doesNotThrow(() => assertEditable(status));
  assert.doesNotThrow(() => assertReviewable("SUBMITTED"));
  for (const status of ["DRAFT", "APPROVED", "REJECTED"]) assert.throws(() => assertReviewable(status));
});
test("HEAD account creation accepts USER or HEAD and has no active USER cap", async () => {
  const create = (role, index) => createManagedUserData({ name: `Teammate ${index}`, designation: "Engineer", email: `user${index}@example.com`, role }, "hashed-password");
  const users = Array.from({ length: 8 }, (_, index) => create("USER", index));
  const heads = [create("HEAD", 1), create("HEAD", 2)];
  assert.equal(users.length, 8);
  assert.ok(users.every((account) => account.role === "USER"));
  assert.ok(heads.every((account) => account.role === "HEAD"));
  assert.throws(() => create("ADMIN", 9), /Invalid account role/);
  assert.equal(canManageUsers({ role: "USER" }), false);
  assert.equal(canReadReport({ id: "new-user", role: "USER" }, "another-user"), false);
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const route = await readFile(resolve(root, "src/app/api/users/route.ts"), "utf8");
  const schema = await readFile(resolve(root, "src/lib/schemas.ts"), "utf8");
  assert.match(route, /await requireHead\(\)/);
  assert.match(route, /createManagedUserData\(input, passwordHash\)/);
  assert.doesNotMatch(route, /assertUserCapacity|tx\.user\.count/);
  assert.match(schema, /role: z\.enum\(\["USER", "HEAD"\]\)/);
});
test("Users management and dashboard copy contain no five-seat restriction", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const [usersPage, dashboard] = await Promise.all([
    readFile(resolve(root, "src/components/users-workspace.tsx"), "utf8"),
    readFile(resolve(root, "src/components/dashboard-home.tsx"), "utf8"),
  ]);
  assert.doesNotMatch(usersPage, /five available seats|of 5 available seats|Maximum of five|activeCount/);
  assert.doesNotMatch(dashboard, /of 5 available seats|Maximum of five/);
});
test("user email stays unique and multiple HEADs are permitted by the additive migration", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const initial = await readFile(resolve(root, "prisma/migrations/20261023000000_init/migration.sql"), "utf8");
  const migration = await readFile(resolve(root, "prisma/migrations/20261026120000_allow_multiple_heads/migration.sql"), "utf8");
  assert.match(initial, /CREATE UNIQUE INDEX "DailyReport_userId_workDate_key" ON "DailyReport"\("userId", "workDate"\)/);
  assert.match(initial, /CREATE UNIQUE INDEX "User_email_key" ON "User"\("email"\)/);
  assert.match(initial, /CREATE UNIQUE INDEX "User_single_head_key" ON "User"\("role"\) WHERE "role" = 'HEAD'/);
  const http = await readFile(resolve(root, "src/lib/http.ts"), "utf8");
  assert.match(http, /An account with this email already exists/);
  assert.match(migration, /DROP INDEX IF EXISTS "User_single_head_key"/);
  assert.doesNotMatch(migration, /DELETE|TRUNCATE|DROP TABLE/i);
});
test("all HEAD-only API endpoints enforce HEAD authorization", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const routes = [
    "src/app/api/users/route.ts",
    "src/app/api/users/[id]/route.ts",
    "src/app/api/users/[id]/password/route.ts",
    "src/app/api/dashboard/head/route.ts",
    "src/app/api/updates/[id]/review/route.ts",
  ];
  for (const route of routes) {
    const source = await readFile(resolve(root, route), "utf8");
    assert.match(source, /await requireHead\(\)/, `${route} must require HEAD`);
  }
});
test("password hash verifies without storing the supplied password", async () => {
  const password = "sample-password-123";
  const encoded = await bcrypt.hash(password, 4);
  assert.notEqual(encoded, password);
  assert.equal(await bcrypt.compare(password, encoded), true);
  assert.equal(await bcrypt.compare("wrong-password", encoded), false);
});
