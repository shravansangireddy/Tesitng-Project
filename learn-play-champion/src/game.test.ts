import { describe, expect, it } from "vitest";
import { coreLessonIds } from "./content-schema";
import {
  activities,
  answerMatches,
  avatarUnlocked,
  badges,
  claimHelp,
  claimLogin,
  completeRound,
  initialProgress,
  localDate,
  makeRound,
  parseProgress,
  yesterday,
  type Attempt,
} from "./game";

const date = new Date(2026, 9, 29, 12);
const perfect: Attempt[] = Array.from({ length: 5 }, () => ({
  correct: true,
  speed: false,
}));

describe("playable activities", () => {
  for (const activity of activities.filter((activity) =>
    coreLessonIds.some((id) => id === activity.id),
  )) {
    it(`${activity.title} has five complete, answerable questions`, () => {
      for (let seed = 0; seed < 20; seed++) {
        let value = seed + 1;
        const random = () => {
          value = (value * 16807) % 2147483647;
          return value / 2147483647;
        };
        const questions = makeRound(activity.id, random);
        expect(questions).toHaveLength(5);
        for (const question of questions) {
          expect(question.prompt.length).toBeGreaterThan(0);
          expect(question.hint.length).toBeGreaterThan(0);
          expect(question.explanation.length).toBeGreaterThan(0);
          if (question.options) {
            expect(question.options).toContain(question.answer);
            expect(new Set(question.options).size).toBe(
              question.options.length,
            );
            expect(question.options.length).toBeGreaterThanOrEqual(3);
          } else expect(activity.id).toBe("spelling");
        }
      }
    });
  }
  it("accepts trimmed, case-insensitive spelling but not a different word", () => {
    expect(answerMatches("  CAT ", "cat")).toBe(true);
    expect(answerMatches("cats", "cat")).toBe(false);
    expect(answerMatches("", "cat")).toBe(false);
  });
  it("generates accurate arithmetic, multiplication and pattern answers", () => {
    for (let iteration = 0; iteration < 100; iteration++) {
      const value = iteration / 100;
      const a = 4 + Math.floor(value * 15);
      const b = 1 + Math.floor(value * a);
      expect(
        makeRound("arithmetic", () => value).map((question) =>
          Number(question.answer),
        ),
      ).toEqual([a + b, a - b, a + b, a - b, a + b]);
      const factor = 2 + Math.floor(value * 8);
      expect(
        makeRound("multiply", () => value).map((question) =>
          Number(question.answer),
        ),
      ).toEqual([
        factor * factor,
        factor,
        factor * factor,
        factor,
        factor * factor,
      ]);
      const start = 1 + Math.floor(value * 8);
      const step = 2 + Math.floor(value * 5);
      expect(
        makeRound("patterns", () => value).map((question) =>
          Number(question.answer),
        ),
      ).toEqual(Array(5).fill(start + step * 4));
    }
  });
});
describe("points and progress", () => {
  it("awards answers, perfect bonus and daily challenge exactly", () => {
    const completed = completeRound(initialProgress, "sight", perfect, date);
    expect(completed.result.points).toBe(200);
    expect(completed.progress.points).toBe(200);
    expect(completed.progress.correct).toBe(5);
    expect(completed.progress.answered).toBe(5);
    expect(completed.progress.rounds).toBe(1);
    expect(completed.progress.bestRounds.sight).toBe(5);
    expect(completed.progress.mastery.sight).toBe(5);
    expect(initialProgress.points).toBe(0);
  });
  it("awards daily challenge once per local calendar day", () => {
    const first = completeRound(initialProgress, "sight", perfect, date);
    const second = completeRound(first.progress, "sight", perfect, date);
    expect(second.result.points).toBe(100);
    expect(second.result.dailyBonus).toBe(false);
    const nextDay = completeRound(
      second.progress,
      "sight",
      perfect,
      new Date(2026, 9, 30, 12),
    );
    expect(nextDay.result.dailyBonus).toBe(true);
    expect(nextDay.result.points).toBe(200);
  });
  it("only adds speed points for correct speedy answers", () => {
    const attempts = [
      { correct: true, speed: true },
      { correct: true, speed: false },
      { correct: false, speed: true },
      { correct: false, speed: false },
      { correct: true, speed: true },
    ];
    const completed = completeRound(
      { ...initialProgress, missionDate: localDate(date) },
      "sight",
      attempts,
      date,
    );
    expect(completed.result.points).toBe(40);
    expect(completed.result.speedPoints).toBe(10);
    expect(completed.result.perfect).toBe(false);
  });
  it("rewards effort on an all-incorrect round without inventing mastery", () => {
    const completed = completeRound(
      initialProgress,
      "arithmetic",
      perfect.map(() => ({ correct: false, speed: false })),
      date,
    );
    expect(completed.result.points).toBe(100);
    expect(completed.progress.mastery.arithmetic).toBe(0);
    expect(completed.progress.bestRounds.arithmetic).toBe(0);
    expect(
      badges.find((b) => b.name === "Math Master")!.earned(completed.progress),
    ).toBe(false);
  });
  it("retains the best score while accumulating skill practice", () => {
    const first = completeRound(
      initialProgress,
      "arithmetic",
      perfect,
      date,
    ).progress;
    const next = completeRound(
      first,
      "arithmetic",
      perfect.map((_, i) => ({ correct: i < 2, speed: false })),
      date,
    ).progress;
    expect(next.bestRounds.arithmetic).toBe(5);
    expect(next.mastery.arithmetic).toBe(7);
    expect(badges.find((b) => b.name === "Math Master")!.earned(next)).toBe(
      true,
    );
  });
  it("requires exactly five attempts for a completed round", () => {
    expect(() => completeRound(initialProgress, "sight", [], date)).toThrow(
      "five",
    );
    expect(() =>
      completeRound(initialProgress, "sight", [...perfect, perfect[0]], date),
    ).toThrow("five");
  });
  it("celebrates trying every activity without requiring perfect scores", () => {
    let progress = initialProgress;
    const attempts = perfect.map(() => ({ correct: false, speed: false }));
    const explorerBadge = badges.find(
      (badge) => badge.name === "Curious Explorer",
    )!;
    expect(explorerBadge.earned(progress)).toBe(false);
    for (const id of coreLessonIds) {
      progress = completeRound(progress, id, attempts, date).progress;
    }
    expect(explorerBadge.earned(progress)).toBe(true);
    expect(progress.correct).toBe(0);
    expect(progress.rounds).toBe(10);
  });
  it("claims daily login and help once per day without changing mastery", () => {
    const today = localDate(date);
    const login = claimLogin(initialProgress, today);
    expect(login.points).toBe(20);
    expect(claimLogin(login, today)).toBe(login);
    const help = claimHelp(login, today);
    expect(help.points).toBe(45);
    expect(claimHelp(help, today)).toBe(help);
    expect(help.correct).toBe(0);
    expect(claimLogin(help, "2026-10-30").points).toBe(65);
    expect(claimHelp(help, "2026-10-30").points).toBe(70);
  });
  it("tracks consecutive practice days, not number of rounds", () => {
    const first = completeRound(
      initialProgress,
      "sight",
      perfect,
      date,
    ).progress;
    expect(first.streak).toBe(1);
    expect(completeRound(first, "sight", perfect, date).progress.streak).toBe(
      1,
    );
    const next = completeRound(
      first,
      "sight",
      perfect,
      new Date(2026, 9, 30, 12),
    ).progress;
    expect(next.streak).toBe(2);
    expect(
      completeRound(next, "sight", perfect, new Date(2026, 10, 2, 12)).progress
        .streak,
    ).toBe(1);
  });
  it("uses local calendar dates across month and year boundaries", () => {
    expect(localDate(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
    expect(yesterday(new Date(2026, 0, 1, 0, 1))).toBe("2025-12-31");
  });
  it("unlocks avatars only at exact point thresholds", () => {
    expect(avatarUnlocked("cat", 0)).toBe(true);
    expect(avatarUnlocked("fox", 99)).toBe(false);
    expect(avatarUnlocked("fox", 100)).toBe(true);
    expect(avatarUnlocked("unicorn", 249)).toBe(false);
    expect(avatarUnlocked("unicorn", 250)).toBe(true);
  });
});
describe("safe saved progress", () => {
  it("round-trips completed progress and its rewards", () => {
    let progress = initialProgress;
    for (let i = 0; i < 3; i++)
      progress = completeRound(progress, "sight", perfect, date).progress;
    progress = { ...progress, chestCount: 1, avatar: "fox" };
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(
      initialProgress,
    );
  });
  it("rejects malformed, outdated and impossible saves explicitly", () => {
    for (const invalid of [
      null,
      [],
      {},
      { ...initialProgress, version: 2 },
      { ...initialProgress, points: -1 },
      { ...initialProgress, points: 2.5 },
      { ...initialProgress, correct: 1 },
      { ...initialProgress, avatar: "dragon" },
      { ...initialProgress, avatar: "unicorn" },
      { ...initialProgress, mastery: { unknown: 5 } },
      { ...initialProgress, mastery: [] },
      { ...initialProgress, bestRounds: { sight: 6 } },
      { ...initialProgress, chestCount: 1 },
      { ...initialProgress, rounds: 1 },
      { ...initialProgress, loginDate: "tomorrow" },
    ])
      expect(() => parseProgress(JSON.stringify(invalid))).toThrow();
    expect(() => parseProgress("{bad json")).toThrow();
  });
});
