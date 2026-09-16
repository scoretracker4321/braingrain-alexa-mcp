// Streamable HTTP MCP server (spec 2025-11-25). One endpoint: POST/GET/DELETE /mcp.
// Stateless mode — every request carries what it needs, so it can sit behind any
// plain HTTPS proxy and restart freely.

import { pathToFileURL } from "node:url";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { register } from "./tools.js";

export function build() {
  const server = new McpServer({ name: "braingrain-quiz-coach", version: "0.1.0" });
  register(server);
  return server;
}

export function app() {
  const a = express();
  a.use(express.json({ limit: "1mb" }));

  a.get("/", (_req, res) => {
    res.json({ name: "braingrain-quiz-coach", mcp: "/mcp", docs: "https://github.com/scoretracker4321/braingrain-alexa-mcp" });
  });

  a.all("/mcp", async (req, res) => {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => transport.close());
    const server = build();
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  return a;
}

// Only listen when run directly (`npm start`); tests import build() without a port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT || 3333);
  app().listen(port, () => console.log(`braingrain-quiz-coach MCP on http://localhost:${port}/mcp`));
}
