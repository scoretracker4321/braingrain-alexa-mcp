# Friction log

Running notes on what got in the way, for the hackathon friction-log bonus. Dated, honest, one line per item.

## 2026-09-16 — scaffold
- MCP SDK 1.30.0 peer-depends on zod ^3.25 || ^4 — pinned zod 3.25.76 to avoid the v4 import-path split.
- Alexa+ MCP integrations are US-only at the moment; building against the spec + MCP Inspector, demo will be simulated per the rules.
- No Alexa developer console flow for "register an MCP server" found yet — need to locate the docs.
