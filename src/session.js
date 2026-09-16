// Per-learner quiz state. In-memory on purpose: the server is stateless across
// restarts and a learner is identified by whatever id the client passes
// (Alexa+ passes a stable one per household/profile).

const sessions = new Map();

function fresh() {
  return {
    queue: [],        // question ids still to ask
    current: null,    // question id awaiting an answer
    language: "en",
    exam: "tnpsc",
    subject: "polity",
    asked: 0,
    correct: 0,
    weak: new Map(),  // topic → wrong count, drives adaptive follow-ups
    streak: 0,        // consecutive correct answers
    bestStreak: 0,
    daysActive: new Set(),
  };
}

export function get(learner = "default") {
  if (!sessions.has(learner)) sessions.set(learner, fresh());
  return sessions.get(learner);
}

export function reset(learner = "default") {
  sessions.set(learner, fresh());
  return sessions.get(learner);
}

export function touch(s) {
  s.daysActive.add(new Date().toISOString().slice(0, 10));
}

/** Fisher–Yates on a copy. */
export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
