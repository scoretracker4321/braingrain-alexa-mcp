// Question bank access.
//
// Two backends, chosen by environment:
//   - BRAINGRAIN_API_URL set  → read-only HTTP API on the live Brain Grain bank
//   - otherwise               → data/sample-bank.json shipped with this repo
//
// Both return the same normalised shape so the tools never care which one is live.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = path.join(here, "..", "data", "sample-bank.json");

let cache = null;

async function loadSample() {
  if (cache) return cache;
  const raw = JSON.parse(await readFile(SAMPLE_PATH, "utf8"));
  cache = raw.questions.map((q) => ({
    id: q.id,
    exam: raw.exam,
    subject: raw.subject,
    topic: q.topic,
    answer: q.answer,
    en: q.en,
    ta: q.ta,
  }));
  return cache;
}

async function loadRemote(exam, subject) {
  const base = process.env.BRAINGRAIN_API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/bank?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`);
  if (!res.ok) throw new Error(`bank API ${res.status}`);
  return res.json();
}

/** All questions for an exam/subject. Unknown exam/subject → empty list, never a throw. */
export async function questions({ exam = "tnpsc", subject = "polity" } = {}) {
  const all = process.env.BRAINGRAIN_API_URL ? await loadRemote(exam, subject) : await loadSample();
  return all.filter((q) => q.exam === exam && q.subject === subject);
}

export async function byId(id) {
  const all = process.env.BRAINGRAIN_API_URL ? [] : await loadSample();
  return all.find((q) => q.id === id) || null;
}

export async function topics({ exam, subject } = {}) {
  const qs = await questions({ exam, subject });
  return [...new Set(qs.map((q) => q.topic))].sort();
}

/** Render one question in the requested language, without the answer. */
export function present(q, language = "en") {
  const side = q[language] || q.en;
  return {
    id: q.id,
    topic: q.topic,
    question: side.q,
    options: side.options.map((o, i) => `${"ABCD"[i]}. ${o}`),
  };
}

export function explanation(q, language = "en") {
  const side = q[language] || q.en;
  return {
    correct: `${"ABCD"[q.answer]}. ${side.options[q.answer]}`,
    explanation: side.explanation,
  };
}
