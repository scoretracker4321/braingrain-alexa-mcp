import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { build } from "../src/server.js";

async function connect() {
  const [a, b] = InMemoryTransport.createLinkedPair();
  const server = build();
  await server.connect(a);
  const client = new Client({ name: "test", version: "0" });
  await client.connect(b);
  return client;
}

test("lists the five tools", async () => {
  const c = await connect();
  const { tools } = await c.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), ["answer", "explain", "get_streak", "list_topics", "start_quiz"]);
});

test("start → answer runs a Tamil quiz and scores it", async () => {
  const c = await connect();
  const start = await c.callTool({ name: "start_quiz", arguments: { learner: "t1", language: "ta", count: 2 } });
  assert.match(start.content[0].text, /கேள்வி/);
  assert.equal(start.structuredContent.remaining, 1);

  const a1 = await c.callTool({ name: "answer", arguments: { learner: "t1", choice: "A" } });
  assert.equal(typeof a1.structuredContent.correct, "boolean");
  assert.ok(a1.structuredContent.next, "second question should follow");

  const a2 = await c.callTool({ name: "answer", arguments: { learner: "t1", choice: "2" } });
  const s = await c.callTool({ name: "get_streak", arguments: { learner: "t1" } });
  assert.ok(s.structuredContent.asked >= 2);
});

test("explain finds a verified explanation", async () => {
  const c = await connect();
  const r = await c.callTool({ name: "explain", arguments: { concept: "Preamble" } });
  assert.ok(r.structuredContent.matches > 0);
});
