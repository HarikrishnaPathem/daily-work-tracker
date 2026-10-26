import test from "node:test";
import assert from "node:assert/strict";
import { formatWorkspaceDate } from "../src/lib/workspace-date.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

test("workspace date formatting uses an explicit locale and timezone", () => {
  const timestamp = "2026-10-26T00:30:00.000Z";
  assert.equal(formatWorkspaceDate(timestamp, "UTC"), "Mon, 26 Oct");
  assert.equal(formatWorkspaceDate(timestamp, "Asia/Kolkata"), "Mon, 26 Oct");
  assert.equal(formatWorkspaceDate(timestamp, "America/Los_Angeles"), "Sun, 25 Oct");
});

test("DashboardShell hydrates from a shared timestamp then updates to local time", async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const [shell, layout] = await Promise.all([
    readFile(resolve(root, "src/components/dashboard-shell.tsx"), "utf8"),
    readFile(resolve(root, "src/app/(workspace)/layout.tsx"), "utf8"),
  ]);
  assert.match(layout, /initialNow = new Date\(\)\.toISOString\(\)/);
  assert.match(shell, /formatWorkspaceDate\(initialNow, "UTC"\)/);
  assert.match(shell, /Intl\.DateTimeFormat\(\)\.resolvedOptions\(\)\.timeZone/);
  assert.match(shell, /nextMidnight/);
  assert.doesNotMatch(shell, /suppressHydrationWarning/);
});
