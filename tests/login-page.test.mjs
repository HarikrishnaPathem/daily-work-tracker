import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("login layout, global styles, and logo assets are wired into the app", async () => {
  const [layout, page, css] = await Promise.all([
    readFile(resolve(root, "src/app/layout.tsx"), "utf8"),
    readFile(resolve(root, "src/app/login/page.tsx"), "utf8"),
    readFile(resolve(root, "src/app/globals.css"), "utf8"),
  ]);
  assert.match(layout, /import\s+["']\.\/globals\.css["']/);
  assert.match(css, /@import\s+["']tailwindcss["']/);
  assert.match(page, /className="login-layout"/);
  assert.match(css, /\.login-layout\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /@media\s*\(max-width:\s*760px\)[^{]*\{[^}]*\.login-layout\s*\{\s*display:\s*flex/s);
  assert.match(page, /password-visibility/);
  await Promise.all([access(resolve(root, "public/logo-bg.png")), access(resolve(root, "public/logo-sm.png"))]);
});

test("login keeps the existing API payload and dashboard redirect", async () => {
  const page = await readFile(resolve(root, "src/app/login/page.tsx"), "utf8");
  assert.match(page, /timedFetch\("\/api\/auth\/login"/);
  assert.match(page, /JSON\.stringify\(\{ email, password \}\)/);
  assert.match(page, /router\.replace\("\/dashboard"\)/);
});
