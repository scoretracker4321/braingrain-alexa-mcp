# Friction log

Running notes on what got in the way, for the hackathon friction-log bonus. Dated, honest, one line per item.

## 2026-09-16 — scaffold
- MCP SDK 1.30.0 peer-depends on zod ^3.25 || ^4 — pinned zod 3.25.76 to avoid the v4 import-path split.
- Alexa+ MCP integrations are US-only at the moment; building against the spec + MCP Inspector, demo will be simulated per the rules.
- No Alexa developer console flow for "register an MCP server" found yet — need to locate the docs.

## 2026-09-16 — live bank
- Planned a new read-only API, then found the app-packs are already public static JSON on braingrain.in — adapter reads them directly, zero backend work.
- Group 1/2 packs still carry கட்டுரை (essay) for constitutional Article; adapter rewrites to பிரிவு for polity only. Fix belongs at source.
- Importing server.js from tests started the HTTP listener and hung 
ode --test; guarded listen behind an entrypoint check.
- ESM re-import of bank.js with a different env needed a ?live query to bust the module cache.
