// Question bank access.
//
// Two backends:
//   - BRAINGRAIN_BANK_URL set (default https://braingrain.in/data/app-packs)
//     → the live Brain Grain app-packs, one JSON per exam/subject
//   - BRAINGRAIN_OFFLINE=1  → data/sample-bank.json shipped with this repo
//
// Both are normalised to the same shape so the tools never care which is live.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_PATH = path.join(here, "..", "data", "sample-bank.json");
const BANK_URL = (process.env.BRAINGRAIN_BANK_URL || "https://braingrain.in/data/app-packs").replace(/\/$/, "");
const OFFLINE = process.env.BRAINGRAIN_OFFLINE === "1";

// Friendly exam names → pack folder. Group 4 is the default: broadest syllabus.
const EXAM_ALIAS = { tnpsc: "tnpsc-group4", "tnpsc-group-1": "tnpsc-group1", "tnpsc-group-2": "tnpsc-group2", "tnpsc-group-4": "tnpsc-group4" };

const packs = new Map(); // "exam/subject" → normalised question list
const index = new Map(); // question id → question

function remember(list) {
  for (const q of list) index.set(q.id, q);
  return list;
}

// Constitutional "Article" is பிரிவு in Tamil; some packs still carry the
// machine-translation கட்டுரை (essay). Polity has no essay sense, so the swap is safe there.
function fixArticle(s, subject) {
  return subject === "polity" && typeof s === "string" ? s.replace(/கட்டுரை/g, "பிரிவு") : s;
}

function fromPack(raw, exam, subject) {
  return raw.q.map((x) => ({
    id: `${exam}:${subject}:${x.i}`,
    exam,
    subject,
    topic: x.t || subject,
    answer: x.a,
    hasTa: Boolean(x.q2 && x.o2),
    en: { q: x.q, options: x.o, explanation: x.e || "" },
    ta: {
      q: fixArticle(x.q2 || x.q, subject),
      options: (x.o2 || x.o).map((o) => fixArticle(o, subject)),
      explanation: fixArticle(x.e2 || x.e || "", subject),
    },
  }));
}

async function loadSample() {
  const raw = JSON.parse(await readFile(SAMPLE_PATH, "utf8"));
  return raw.questions.map((q) => ({ id: q.id, exam: raw.exam, subject: raw.subject, topic: q.topic, answer: q.answer, hasTa: true, en: q.en, ta: q.ta }));
}

async function loadRemote(exam, subject) {
  const res = await fetch(`${BANK_URL}/${encodeURIComponent(exam)}/${encodeURIComponent(subject)}.json`);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`bank ${res.status} for ${exam}/${subject}`);
  return fromPack(await res.json(), exam, subject);
}

export function resolveExam(exam = "tnpsc") {
  const e = String(exam).toLowerCase().trim();
  return EXAM_ALIAS[e] || e;
}

/** All questions for an exam/subject. Unknown exam/subject → empty list, never a throw. */
export async function questions({ exam = "tnpsc", subject = "polity" } = {}) {
  const e = resolveExam(exam);
  const s = String(subject).toLowerCase().trim();
  const key = `${e}/${s}`;
  if (!packs.has(key)) {
    let list;
    try {
      list = OFFLINE ? await loadSample() : await loadRemote(e, s);
    } catch {
      list = await loadSample(); // network down → still serve the sample
    }
    if (OFFLINE) list = list.filter((q) => q.exam === e && q.subject === s);
    packs.set(key, remember(list));
  }
  return packs.get(key);
}

export async function byId(id) {
  return index.get(id) || null;
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
