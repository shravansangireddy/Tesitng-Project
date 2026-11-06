import type { GradeId } from "./content-schema";

/**
 * Tiny Habits with Pip is a points-free companion to the Pack 4 stories.
 * The data is intentionally small and self-contained: a learner tracks up
 * to three preset habits, and each habit owns a list of local calendar
 * dates (YYYY-MM-DD) on which it was checked in. Keeping this shape inside
 * the normal learner Progress blob lets it ride the same local-storage and
 * cloud sync paths as every other part of a learner's progress.
 */

export const MAX_TINY_HABITS = 3;
export const TINY_HABIT_GRADES: GradeId[] = ["2", "3", "4", "5"];

export interface TinyHabitPreset {
  id: string;
  label: string;
  emoji: string;
}

export interface TinyHabitsProgress {
  /** Preset ids, in the order the learner added them. */
  habits: string[];
  /** Check-in dates by habit/preset id. Dates are local YYYY-MM-DD. */
  checkIns: Record<string, string[]>;
}

export const tinyHabitPresets: TinyHabitPreset[] = [
  { id: "read-5-minutes", label: "Read for 5 minutes", emoji: "📖" },
  { id: "math-10-questions", label: "Answer 10 math questions", emoji: "🔢" },
  { id: "make-my-bed", label: "Make my bed", emoji: "🛏️" },
  { id: "music-5-minutes", label: "Practice music for 5 minutes", emoji: "🎵" },
  { id: "draw-one-picture", label: "Draw one picture", emoji: "🎨" },
  { id: "write-one-sentence", label: "Write one sentence", emoji: "✏️" },
  { id: "tidy-my-desk", label: "Tidy my desk", emoji: "🧺" },
  { id: "drink-water", label: "Drink a glass of water", emoji: "💧" },
  { id: "read-one-page", label: "Read one page of my book", emoji: "📚" },
  { id: "say-thank-you", label: "Say thank you to someone", emoji: "💛" },
];

export const tinyHabitPresetIds = tinyHabitPresets.map((preset) => preset.id);

export function isTinyHabitGrade(grade: GradeId): boolean {
  return TINY_HABIT_GRADES.includes(grade);
}

export function tinyHabitPresetById(id: string): TinyHabitPreset {
  const preset = tinyHabitPresets.find((entry) => entry.id === id);
  if (!preset) throw new Error("Unknown tiny habit.");
  return preset;
}

export function emptyTinyHabits(): TinyHabitsProgress {
  return { habits: [], checkIns: {} };
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function tinyHabitDateString(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isTinyHabitDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  parsed.setUTCFullYear(year);
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function shiftTinyHabitDate(date: string, days: number): string {
  if (!isTinyHabitDate(date)) throw new Error("Invalid tiny habit date.");
  if (!Number.isSafeInteger(days)) throw new Error("Invalid tiny habit day shift.");
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day);
  shifted.setDate(shifted.getDate() + days);
  return tinyHabitDateString(shifted);
}

export function lastSevenTinyHabitDays(today: string): string[] {
  if (!isTinyHabitDate(today)) throw new Error("Invalid tiny habit date.");
  return Array.from({ length: 7 }, (_, index) =>
    shiftTinyHabitDate(today, index - 6),
  );
}

function cleanCheckIns(checkIns: readonly string[] | undefined): string[] {
  return [...new Set((checkIns ?? []).filter(isTinyHabitDate))].sort();
}

export function addTinyHabit(
  state: TinyHabitsProgress | undefined,
  presetId: string,
): TinyHabitsProgress {
  tinyHabitPresetById(presetId);
  const current = state ?? emptyTinyHabits();
  if (current.habits.includes(presetId)) return current;
  if (current.habits.length >= MAX_TINY_HABITS) {
    throw new Error(`You can track up to ${MAX_TINY_HABITS} tiny habits.`);
  }
  return {
    habits: [...current.habits, presetId],
    checkIns: { ...current.checkIns },
  };
}

export function removeTinyHabit(
  state: TinyHabitsProgress | undefined,
  habitId: string,
): TinyHabitsProgress {
  const current = state ?? emptyTinyHabits();
  if (!current.habits.includes(habitId)) return current;
  const checkIns = { ...current.checkIns };
  delete checkIns[habitId];
  return {
    habits: current.habits.filter((id) => id !== habitId),
    checkIns,
  };
}

export function toggleTinyHabitCheckIn(
  state: TinyHabitsProgress | undefined,
  habitId: string,
  today: string,
): TinyHabitsProgress {
  const current = state ?? emptyTinyHabits();
  if (!current.habits.includes(habitId)) throw new Error("Unknown tiny habit.");
  if (!isTinyHabitDate(today)) throw new Error("Invalid tiny habit date.");
  const dates = cleanCheckIns(current.checkIns[habitId]);
  const nextDates = dates.includes(today)
    ? dates.filter((date) => date !== today)
    : [...dates, today].sort();
  return {
    habits: [...current.habits],
    checkIns: { ...current.checkIns, [habitId]: nextDates },
  };
}

export function tinyHabitStreak(
  checkIns: readonly string[] | undefined,
  today: string,
): number {
  if (!isTinyHabitDate(today)) throw new Error("Invalid tiny habit date.");
  const checked = new Set(cleanCheckIns(checkIns));
  const anchor = checked.has(today)
    ? today
    : checked.has(shiftTinyHabitDate(today, -1))
      ? shiftTinyHabitDate(today, -1)
      : undefined;
  if (!anchor) return 0;

  let streak = 0;
  let cursor = anchor;
  while (checked.has(cursor)) {
    streak += 1;
    cursor = shiftTinyHabitDate(cursor, -1);
  }
  return streak;
}

export function totalTinyHabitCheckIns(
  state: TinyHabitsProgress | undefined,
): number {
  if (!state) return 0;
  return state.habits.reduce(
    (total, habitId) => total + cleanCheckIns(state.checkIns[habitId]).length,
    0,
  );
}

export interface PipLevel {
  level: number;
  name: string;
  minimum: number;
  leaf: string;
}

export const pipLevels: PipLevel[] = [
  { level: 1, name: "Tiny Ant", minimum: 0, leaf: "🍃" },
  { level: 2, name: "Steady Walker", minimum: 5, leaf: "🌿" },
  { level: 3, name: "Leaf Carrier", minimum: 15, leaf: "🍀" },
  { level: 4, name: "Hill Climber", minimum: 30, leaf: "🌳" },
  { level: 5, name: "Mountain Ant", minimum: 50, leaf: "🏔️" },
];

export interface PipLevelProgress {
  current: PipLevel;
  next?: PipLevel;
  total: number;
  remainingToNext: number;
  /** 0 at the start of the current level; 1 when there is no next level. */
  fraction: number;
}

export function pipLevelProgress(totalCheckIns: number): PipLevelProgress {
  const total = Math.max(0, Math.floor(totalCheckIns));
  let current = pipLevels[0];
  for (const level of pipLevels) {
    if (total >= level.minimum) current = level;
  }
  const next = pipLevels.find((level) => level.level === current.level + 1);
  if (!next) {
    return { current, total, remainingToNext: 0, fraction: 1 };
  }
  const span = next.minimum - current.minimum;
  return {
    current,
    next,
    total,
    remainingToNext: next.minimum - total,
    fraction: Math.min(1, Math.max(0, (total - current.minimum) / span)),
  };
}

export function pipEncouragement(
  state: TinyHabitsProgress | undefined,
  today: string,
): string {
  const current = state ?? emptyTinyHabits();
  if (current.habits.length === 0) {
    return "Choose one tiny habit, and we will take the first step together.";
  }

  const checkedToday = current.habits.filter((habitId) =>
    cleanCheckIns(current.checkIns[habitId]).includes(today),
  ).length;
  if (checkedToday === current.habits.length) {
    return "Every tiny habit is done today. Pip is doing a happy little march!";
  }
  if (checkedToday > 0) {
    return "You already took a tiny step today. Pip says one more check-in is plenty.";
  }

  const hasLiveStreak = current.habits.some(
    (habitId) => tinyHabitStreak(current.checkIns[habitId], today) > 0,
  );
  if (hasLiveStreak) {
    return "A streak is still shining. One tiny check-in today will keep it growing.";
  }
  if (totalTinyHabitCheckIns(current) > 0) {
    return "A missed day is just a pause. Pip is ready when you are — begin again with the tiniest step.";
  }
  return "Today is a fresh page. Do your tiny habit, then tap the big button.";
}
