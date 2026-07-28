import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the MySQL schema preserves ownership and session constraints", async () => {
  const schema = await readFile(
    new URL("sql/schema.mysql.sql", root),
    "utf8",
  );

  assert.match(schema, /CREATE TABLE IF NOT EXISTS `users`/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `sessions`/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `categories`/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS `tasks`/);
  assert.match(schema, /UNIQUE KEY `users_email_unique`/);
  assert.match(schema, /UNIQUE KEY `sessions_token_hash_unique`/);
  assert.match(schema, /FOREIGN KEY \(`user_id`\) REFERENCES `users`/);
});

test("task mutations are scoped to the authenticated user", async () => {
  const collection = await readFile(
    new URL("app/api/tasks/route.ts", root),
    "utf8",
  );
  const item = await readFile(
    new URL("app/api/tasks/[id]/route.ts", root),
    "utf8",
  );

  assert.match(collection, /getCurrentUser/);
  assert.match(collection, /t\.user_id = \?/);
  assert.match(collection, /VALUES \(\?, \?, \?, \?, \?, \?\)/);
  assert.match(item, /WHERE id = \? AND user_id = \?/);
});

test("registration hashes passwords and creates a session", async () => {
  const registration = await readFile(
    new URL("app/api/auth/register/route.ts", root),
    "utf8",
  );
  const auth = await readFile(new URL("lib/auth.ts", root), "utf8");

  assert.match(registration, /hashPassword/);
  assert.match(registration, /createSession/);
  assert.match(auth, /scrypt/);
  assert.match(auth, /httpOnly: true/);
  assert.match(auth, /sameSite: "lax"/);
});
