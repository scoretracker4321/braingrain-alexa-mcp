// Records the simulated Alexa+ demo against a running server (npm start) to demo/out/demo.webm.
// Usage: node demo/record.mjs [http://localhost:3333]
import { mkdirSync, renameSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";

// playwright is not a dependency of the server; borrow it from wherever it is installed.
const require = createRequire(process.env.PLAYWRIGHT_FROM ? process.env.PLAYWRIGHT_FROM + "/" : import.meta.url);
const { chromium } = require("playwright");

const base = process.argv[2] || "http://localhost:3333";
mkdirSync("demo/out", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: "demo/out", size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
await page.goto(`${base}/demo/`);
await page.waitForFunction(() => document.title === "DONE", null, { timeout: 120000 });
await page.waitForTimeout(1000);
await ctx.close();
await browser.close();
const webm = readdirSync("demo/out").find((f) => f.endsWith(".webm"));
renameSync(`demo/out/${webm}`, "demo/out/demo.webm");
console.log("demo/out/demo.webm");
