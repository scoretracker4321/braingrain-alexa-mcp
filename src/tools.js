// The five tools Alexa+ (or any MCP client) can call. Everything the assistant
// needs to run a quiz is in the returned text; structured fields ride along
// in `structuredContent` for clients that prefer them.

import { z } from "zod";
import * as bank from "./bank.js";
import { get as session, reset, touch, shuffle } from "./session.js";

const Language = z.enum(["en", "ta"]).describe('"en" for English, "ta" for Tamil');
const Learner = z.string().default("default").describe("Stable id for the person being quizzed");

function reply(text, structured) {
  return { content: [{ type: "text", text }], structuredContent: structured };
}

function askText(p, language) {
  const lead = language === "ta" ? "கேள்வி" : "Question";
  return `${lead} (${p.topic}):\n${p.question}\n${p.options.join("\n")}`;
}

async function nextQuestion(s) {
  while (s.queue.length) {
    const id = s.queue.shift();
    const q = await bank.byId(id);
    if (q) return q;
  }
  return null;
}

export function register(server) {
  server.registerTool(
    "start_quiz",
    {
      title: "Start a quiz",
      description:
        "Start a new quiz for a learner. Returns the first question. Use exam 'tnpsc' and subject 'polity' unless the learner asks for something else; call list_topics to see what is available.",
      inputSchema: {
        learner: Learner,
        exam: z.string().default("tnpsc"),
        subject: z.string().default("polity"),
        topic: z.string().optional().describe("Restrict to one topic name from list_topics"),
        language: Language.default("en"),
        count: z.number().int().min(1).max(20).default(5),
      },
    },
    async ({ learner, exam, subject, topic, language, count }) => {
      const s = reset(learner);
      Object.assign(s, { exam, subject, language });
      let pool = await bank.questions({ exam, subject });
      if (topic) pool = pool.filter((q) => q.topic.toLowerCase() === topic.toLowerCase());
      if (!pool.length) {
        return reply(`No questions found for ${exam} / ${subject}${topic ? " / " + topic : ""}. Call list_topics to see what exists.`);
      }
      s.queue = shuffle(pool).slice(0, count).map((q) => q.id);
      const q = await nextQuestion(s);
      s.current = q.id;
      touch(s);
      const p = bank.present(q, language);
      return reply(askText(p, language), { ...p, remaining: s.queue.length });
    },
  );

  server.registerTool(
    "answer",
    {
      title: "Answer the current question",
      description:
        "Submit the learner's answer to the question last returned by start_quiz or answer. Accepts A/B/C/D or the option number 1–4. Returns whether it was correct, the explanation, and the next question if any.",
      inputSchema: {
        learner: Learner,
        choice: z.string().describe("A, B, C, D or 1–4"),
      },
    },
    async ({ learner, choice }) => {
      const s = session(learner);
      if (!s.current) return reply("No question is waiting for an answer. Call start_quiz first.");
      const q = await bank.byId(s.current);
      const c = choice.trim().toUpperCase();
      const idx = /^[1-4]$/.test(c) ? Number(c) - 1 : "ABCD".indexOf(c);
      if (idx < 0) return reply("Please answer with A, B, C, D or 1–4.");

      const correct = idx === q.answer;
      s.asked++;
      if (correct) {
        s.correct++;
        s.streak++;
        s.bestStreak = Math.max(s.bestStreak, s.streak);
      } else {
        s.streak = 0;
        s.weak.set(q.topic, (s.weak.get(q.topic) || 0) + 1);
        // Adaptive follow-up: queue one more question from the same topic.
        const siblings = (await bank.questions({ exam: s.exam, subject: s.subject })).filter(
          (x) => x.topic === q.topic && x.id !== q.id && !s.queue.includes(x.id),
        );
        if (siblings.length) s.queue.push(shuffle(siblings)[0].id);
      }

      const ex = bank.explanation(q, s.language);
      const verdict = s.language === "ta" ? (correct ? "சரி!" : "தவறு.") : correct ? "Correct!" : "Not quite.";
      let text = `${verdict} ${ex.correct}\n${ex.explanation}`;

      const next = await nextQuestion(s);
      let nextPresented = null;
      if (next) {
        s.current = next.id;
        nextPresented = bank.present(next, s.language);
        text += `\n\n${askText(nextPresented, s.language)}`;
      } else {
        s.current = null;
        text += `\n\nQuiz over: ${s.correct}/${s.asked} correct. Streak best: ${s.bestStreak}.`;
      }
      return reply(text, { correct, correctOption: ex.correct, explanation: ex.explanation, score: { correct: s.correct, asked: s.asked }, next: nextPresented });
    },
  );

  server.registerTool(
    "get_streak",
    {
      title: "Get streak and weak topics",
      description: "Progress for a learner in this session: score, current and best streak, days active, and the topics they got wrong most.",
      inputSchema: { learner: Learner },
    },
    async ({ learner }) => {
      const s = session(learner);
      const weak = [...s.weak.entries()].sort((a, b) => b[1] - a[1]).map(([topic, wrong]) => ({ topic, wrong }));
      const text =
        `Score ${s.correct}/${s.asked}. Streak ${s.streak} (best ${s.bestStreak}). Days active: ${s.daysActive.size}.` +
        (weak.length ? ` Weakest: ${weak.slice(0, 3).map((w) => w.topic).join(", ")}.` : " No weak topics yet.");
      return reply(text, { correct: s.correct, asked: s.asked, streak: s.streak, bestStreak: s.bestStreak, daysActive: s.daysActive.size, weak });
    },
  );

  server.registerTool(
    "list_topics",
    {
      title: "List topics",
      description: "Topics available for an exam/subject, so the learner can pick one.",
      inputSchema: { exam: z.string().default("tnpsc"), subject: z.string().default("polity") },
    },
    async ({ exam, subject }) => {
      const t = await bank.topics({ exam, subject });
      return reply(t.length ? t.join("\n") : `Nothing for ${exam} / ${subject}.`, { topics: t });
    },
  );

  server.registerTool(
    "explain",
    {
      title: "Explain a concept",
      description:
        "Short explanation of a constitutional / exam concept, drawn from the verified explanations in the bank (not generated). Pass a keyword such as 'Article 17', 'Preamble', 'Panchayati Raj'.",
      inputSchema: {
        concept: z.string().min(2),
        language: Language.default("en"),
        exam: z.string().default("tnpsc"),
        subject: z.string().default("polity"),
      },
    },
    async ({ concept, language, exam, subject }) => {
      const needle = concept.toLowerCase();
      const hits = (await bank.questions({ exam, subject })).filter((q) => {
        const side = q[language] || q.en;
        return `${side.q} ${side.explanation} ${q.en.q} ${q.en.explanation}`.toLowerCase().includes(needle);
      });
      if (!hits.length) return reply(`I don't have a verified explanation for "${concept}" yet.`);
      const lines = hits.slice(0, 3).map((q) => `• ${(q[language] || q.en).explanation}`);
      return reply(lines.join("\n"), { matches: hits.length, explanations: lines });
    },
  );
}
