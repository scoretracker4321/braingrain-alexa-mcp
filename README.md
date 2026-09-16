# Brain Grain Quiz Coach — Alexa+ MCP Server

A self-hosted [MCP](https://modelcontextprotocol.io) server that turns Alexa+ (or any MCP client) into a bilingual **Tamil / English** exam coach.

> "Alexa, quiz me on Indian Polity."

Built for the **Build, Ship, Shape: Amazon Developer Hackathon 2026**, Alexa+ track. Content comes from [Brain Grain](https://braingrain.in), a live exam-prep product used by learners in Tamil Nadu preparing for TNPSC, UPSC, CTET and school exams.

- MCP spec **2025-11-25** via `@modelcontextprotocol/sdk` 1.30.0
- Streamable HTTP transport (`/mcp`) and stdio
- Every question is a real previous-year / textbook question with a verified explanation — nothing is generated on the fly
- Wrong answer → the next question is a sibling on the same topic (adaptive follow-up)

## Tools

| Tool | What it does |
|---|---|
| `start_quiz` | Start a quiz — `exam`, `subject`, optional `topic`, `language` (`en`/`ta`), `count` |
| `answer` | Submit A/B/C/D or 1–4; returns verdict, explanation, and the next question |
| `get_streak` | Score, current/best streak, days active, weakest topics |
| `list_topics` | Topics available for an exam/subject |
| `explain` | Verified explanation for a concept keyword ("Article 17", "Preamble") |

## Run it

```bash
npm install
npm start            # Streamable HTTP on http://localhost:3333/mcp
npm run stdio        # stdio transport for Claude Desktop / Cursor / MCP Inspector
npm test
```

Try it in the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node src/stdio.js
```

Claude Desktop config:

```json
{ "mcpServers": { "braingrain": { "command": "node", "args": ["C:/path/to/braingrain-alexa-mcp/src/stdio.js"] } } }
```

## Content

`data/sample-bank.json` ships **65 bilingual TNPSC Polity questions** (5 per topic across 13 topics) so the server runs offline for judging. Set `BRAINGRAIN_API_URL` to point at the live read-only bank API for the full catalogue.

## Alexa+

Register the hosted `/mcp` endpoint as an Alexa+ MCP integration. Session identity: pass the Alexa user/profile id as `learner` so streaks persist across turns.

## Repo layout

```
src/server.js   Streamable HTTP entry (express)
src/stdio.js    stdio entry
src/tools.js    the five tools
src/bank.js     sample-bank / API adapter
src/session.js  per-learner state + adaptive queue
data/           sample bank
friction-log.md what got in the way while building (hackathon friction log)
```

## Licence

MIT — see [LICENSE](LICENSE). Sample content © Brain Grain, included for evaluation.
