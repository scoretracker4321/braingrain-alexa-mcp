#!/usr/bin/env node
// stdio transport — for Claude Desktop, Cursor, MCP Inspector and local judging.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { register } from "./tools.js";

const server = new McpServer({ name: "braingrain-quiz-coach", version: "0.1.0" });
register(server);
await server.connect(new StdioServerTransport());
