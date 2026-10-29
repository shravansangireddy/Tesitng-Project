import { getLearningContent } from "./content";
import { gradeIds, lessonIds, type GradeId, type LessonId } from "./content-schema";
import type { ActivityId, Progress } from "./game";
import { makeRound } from "./questions";

export interface PathCheck {
  rounds: number;
  results: Partial<Record<LessonId, { correct: boolean; date: string }>>;
}
export type PathChecks = Partial<Record<GradeId, PathCheck>>;
const groups: readonly (readonly LessonId[])[] = [
  ["sight", "vocabulary", "reading", "sentence", "arithmetic", "patterns", "geometry", "place"],
  ["spelling", "informational", "writing", "sight", "multiply", "problems", "fractions", "measurement"],
  ["vocabulary", "spelling", "reading", "informational", "data", "arithmetic", "fractions", "measurement"],
];
export function makePathCheck(grade: GradeId, rounds: number) {
  const lessons = getLearningContent().grades[grade].lessons;
  return groups[rounds % groups.length].map(id => ({
    id, title: lessons[id].title,
    question: makeRound(id, Math.random, grade)[Math.floor(rounds / groups.length) % lessons[id].questions.length],
  }));
}
export function validPathChecks(value: unknown): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([grade, check]) => {
    if (!gradeIds.some(id => id === grade) || !check || typeof check !== "object" ||
      Array.isArray(check) || Object.keys(check).some(key => !["rounds", "results"].includes(key))) return false;
    const c = check as Record<string, unknown>;
    if (!Number.isSafeInteger(c.rounds) || Number(c.rounds) < 1 ||
      !c.results || typeof c.results !== "object" || Array.isArray(c.results)) return false;
    const entries = Object.entries(c.results);
    return entries.length >= 8 && entries.length <= lessonIds.length && entries.every(([id, result]) => {
      if (!lessonIds.some(key => key === id) || !result || typeof result !== "object" || Array.isArray(result)) return false;
      const r = result as Record<string, unknown>;
      return Object.keys(r).length === 2 && typeof r.correct === "boolean" &&
        typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        Number.isFinite(Date.parse(`${r.date}T12:00:00Z`)) &&
        new Date(`${r.date}T12:00:00Z`).toISOString().slice(0, 10) === r.date;
    });
  });
}
export function finishPathCheck(progress: Progress, grade: GradeId, answers: readonly { id: LessonId; correct: boolean }[], date: string): Progress {
  const previous = progress.pathChecks?.[grade];
  const expected = groups[(previous?.rounds ?? 0) % groups.length];
  if (answers.length !== expected.length || answers.some((answer, i) =>
    answer.id !== expected[i] || typeof answer.correct !== "boolean")) throw new Error("Complete all eight practice check questions in order.");
  const next = {
    ...progress.pathChecks,
    [grade]: {
      rounds: (previous?.rounds ?? 0) + 1,
      results: { ...previous?.results, ...Object.fromEntries(answers.map(answer =>
        [answer.id, { correct: answer.correct, date }])) },
    },
  };
  if (!validPathChecks(next)) throw new Error("Practice check results are invalid.");
  return { ...progress, pathChecks: next };
}
export function pathRecommendations(progress: Progress, grade: GradeId) {
  const lessons = getLearningContent().grades[grade].lessons;
  return lessonIds.map((id, order) => {
    const check = progress.pathChecks?.[grade]?.results[id];
    const best = progress.gradeBestRounds?.[`${grade}:${id}`];
    const priority = check?.correct === false ? 0 : best === undefined && !check ? 1 :
      best === undefined || best < 4 ? 2 : 3;
    const reason = priority === 0 ? "Try together: the last check showed a question to revisit." :
      priority === 1 ? "Explore: no check or adventure result for this skill yet." :
      priority === 2 ? "Keep practicing: build confidence with another adventure." :
      "Revisit: a strong best round is a reason to review, not proof of mastery.";
    return { id: id as ActivityId, title: lessons[id].title, skill: lessons[id].skill, check, best, priority, order, reason };
  }).sort((a, b) => a.priority - b.priority || a.order - b.order);
}
