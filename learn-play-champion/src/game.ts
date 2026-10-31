import { coreLessonIds, gradeIds, type GradeId, type LessonId } from "./content-schema";
import { codingPuzzleIds } from "./coding";
import { aiLessonIds } from "./ai-learning";
import { themes, type ThemeId } from "./themes";
import { validPathChecks, type PathChecks } from "./learning-path";
export type Subject = "english" | "math";
export type ActivityId = LessonId;
export type Avatar = "owl" | "fox" | "cat" | "unicorn";
export interface Activity {
  id: ActivityId;
  subject: Subject;
  title: string;
  description: string;
  symbol: string;
}
export const activities: Activity[] = [
  {
    id: "sight",
    subject: "english",
    title: "Word Safari",
    description: "Spot familiar sight words.",
    symbol: "Aa",
  },
  {
    id: "vocabulary",
    subject: "english",
    title: "Meaning Match",
    description: "Find words that belong together.",
    symbol: "Ab",
  },
  {
    id: "spelling",
    subject: "english",
    title: "Spelling Spark",
    description: "Type a word, make some magic.",
    symbol: "abc",
  },
  {
    id: "reading",
    subject: "english",
    title: "Story Explorer",
    description: "Little stories. Big discoveries.",
    symbol: "“ ”",
  },
  {
    id: "sentence",
    subject: "english",
    title: "Sentence Builder",
    description: "Put words in a happy order.",
    symbol: "A→Z",
  },
  {
    id: "informational",
    subject: "english",
    title: "Fact Finder",
    description: "Read nonfiction and find evidence.",
    symbol: "Facts",
  },
  {
    id: "writing",
    subject: "english",
    title: "Writer's Workshop",
    description: "Plan ideas, then write with a grown-up.",
    symbol: "Write",
  },
  {
    id: "arithmetic",
    subject: "math",
    title: "Number Sprint",
    description: "Add, subtract, and find your stride.",
    symbol: "+ −",
  },
  {
    id: "multiply",
    subject: "math",
    title: "Times Adventure",
    description: "Explore multiplication and division.",
    symbol: "× ÷",
  },
  {
    id: "patterns",
    subject: "math",
    title: "Pattern Detective",
    description: "Discover the missing number.",
    symbol: "1 2 ?",
  },
  {
    id: "problems",
    subject: "math",
    title: "Math in the Wild",
    description: "Solve everyday little mysteries.",
    symbol: "=?",
  },
  {
    id: "geometry",
    subject: "math",
    title: "Shape Quest",
    description: "Meet shapes and their superpowers.",
    symbol: "△ ○",
  },
  {
    id: "place",
    subject: "math",
    title: "Place Value Lab",
    description: "Build numbers and explain their value.",
    symbol: "123",
  },
  {
    id: "fractions",
    subject: "math",
    title: "Parts & Wholes",
    description: "Explore parts, equal shares, and fractions.",
    symbol: "1/2",
  },
  {
    id: "measurement",
    subject: "math",
    title: "Measurement Mission",
    description: "Measure, compare, and use units.",
    symbol: "cm",
  },
  {
    id: "data",
    subject: "math",
    title: "Data Detective",
    description: "Organize observations and read data.",
    symbol: "Data",
  },
];
export { makeRound } from "./questions";
export type { Question } from "./content";

export interface Attempt {
  correct: boolean;
  speed: boolean;
}
export interface RoundResult {
  activity: ActivityId;
  correct: number;
  points: number;
  speedPoints: number;
  perfect: boolean;
  dailyBonus: boolean;
  grade?: GradeId;
  championship?: boolean;
}
export interface LearnerProfile {
  id: string;
  name: string;
  grade: GradeId;
}
export const MAX_PROFILES = 6;
export interface Progress {
  version: 1;
  points: number;
  rounds: number;
  correct: number;
  answered: number;
  avatar: Avatar;
  loginDate: string;
  missionDate: string;
  helpDate: string;
  lastPlayedDate: string;
  streak: number;
  chestCount: number;
  mastery: Partial<Record<ActivityId, number>>;
  bestRounds: Partial<Record<ActivityId, number>>;
  gradeBestRounds?: Partial<Record<`${GradeId}:${ActivityId}`, number>>;
  beeBestRounds?: Partial<Record<GradeId, number>>;
  codingCompleted?: string[];
  aiCompleted?: string[];
  selectedGrade?: GradeId;
  theme?: ThemeId;
  pathChecks?: PathChecks;
  profiles?: LearnerProfile[];
  activeProfileId?: string;
  profileStates?: Record<string, Progress>;
}
export const initialProgress: Progress = {
  version: 1,
  points: 0,
  rounds: 0,
  correct: 0,
  answered: 0,
  avatar: "owl",
  loginDate: "",
  missionDate: "",
  helpDate: "",
  lastPlayedDate: "",
  streak: 0,
  chestCount: 0,
  mastery: {},
  bestRounds: {},
};
export const STORAGE_KEY = "learn-play-champion-v1";
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function yesterday(date = new Date()): string {
  const previous = new Date(date);
  previous.setDate(previous.getDate() - 1);
  return localDate(previous);
}
export function answerMatches(input: string, answer: string): boolean {
  return input.trim().toLowerCase() === answer.trim().toLowerCase();
}
export function completeRound(
  progress: Progress,
  activity: ActivityId,
  attempts: Attempt[],
  date = new Date(),
  grade?: GradeId,
  championship = false,
): { progress: Progress; result: RoundResult } {
  if (attempts.length !== 5)
    throw new Error("A round must contain five answers.");
  if (championship && (activity !== "spelling" || !grade))
    throw new Error("A spelling bee needs a selected grade and spelling activity.");
  const correct = attempts.filter((attempt) => attempt.correct).length;
  const speedPoints = championship ? 0 :
    attempts.filter((attempt) => attempt.correct && attempt.speed).length * 5;
  const perfect = correct === 5;
  const today = localDate(date);
  const dailyBonus = progress.missionDate !== today;
  const points =
    correct * 10 + speedPoints + (perfect ? 50 : 0) + (dailyBonus ? 100 : 0);
  const streak =
    progress.lastPlayedDate === today
      ? progress.streak
      : progress.lastPlayedDate === yesterday(date)
        ? progress.streak + 1
        : 1;
  return {
    result: {
      grade,
      ...(championship ? { championship: true } : {}),
      activity,
      correct,
      speedPoints,
      perfect,
      dailyBonus,
      points,
    },
    progress: {
      ...progress,
      points: progress.points + points,
      rounds: progress.rounds + 1,
      correct: progress.correct + correct,
      answered: progress.answered + 5,
      mastery: championship ? progress.mastery : {
        ...progress.mastery,
        [activity]: (progress.mastery[activity] || 0) + correct,
      },
      bestRounds: championship ? progress.bestRounds : {
        ...progress.bestRounds,
        [activity]: Math.max(progress.bestRounds[activity] || 0, correct),
      },
      ...(grade && !championship
        ? {
            gradeBestRounds: {
              ...progress.gradeBestRounds,
              [`${grade}:${activity}`]: Math.max(
                progress.gradeBestRounds?.[`${grade}:${activity}`] || 0,
                correct,
              ),
            },
          }
        : {}),
      ...(grade && championship
        ? { beeBestRounds: {
            ...progress.beeBestRounds,
            [grade]: Math.max(progress.beeBestRounds?.[grade] || 0, correct),
          } }
        : {}),
      missionDate: today,
      lastPlayedDate: today,
      streak,
    },
  };
}
export function claimLogin(progress: Progress, today = localDate()): Progress {
  return progress.loginDate === today
    ? progress
    : { ...progress, points: progress.points + 20, loginDate: today };
}
export function completeCodingPuzzle(progress: Progress, id: string): Progress {
  if (!codingPuzzleIds.includes(id)) throw new Error("Unknown coding puzzle.");
  if (progress.codingCompleted?.includes(id)) return progress;
  return {
    ...progress,
    points: progress.points + 10,
    codingCompleted: [...(progress.codingCompleted ?? []), id],
  };
}
export function completeAILesson(progress: Progress, id: string): Progress {
  if (!aiLessonIds.includes(id)) throw new Error("Unknown AI lesson.");
  if (progress.aiCompleted?.includes(id)) return progress;
  return {
    ...progress,
    points: progress.points + 10,
    aiCompleted: [...(progress.aiCompleted ?? []), id],
  };
}
export function claimHelp(progress: Progress, today = localDate()): Progress {
  return progress.helpDate === today
    ? progress
    : { ...progress, points: progress.points + 25, helpDate: today };
}
export function avatarUnlocked(avatar: Avatar, points: number): boolean {
  return points >= { owl: 0, cat: 0, fox: 100, unicorn: 250 }[avatar];
}
const profileIdPattern = /^[A-Za-z0-9_-]{1,48}$/;
export function cleanProfileName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}
function validProfileName(name: unknown): boolean {
  return (
    typeof name === "string" &&
    name === cleanProfileName(name) &&
    name.length >= 1 &&
    name.length <= 20
  );
}
function parseProgressObject(value: unknown, nested: boolean): Progress {
  if (!value || typeof value !== "object")
    throw new Error("Saved progress is not an object.");
  const p = value as Record<string, unknown>;
  const countKeys = [
    "points",
    "rounds",
    "correct",
    "answered",
    "streak",
    "chestCount",
  ];
  const dateKeys = ["loginDate", "missionDate", "helpDate", "lastPlayedDate"];
  const validCounts = countKeys.every(
    (key) =>
      typeof p[key] === "number" &&
      Number.isSafeInteger(p[key]) &&
      (p[key] as number) >= 0,
  );
  const validDates = dateKeys.every(
    (key) =>
      typeof p[key] === "string" &&
      (p[key] === "" || /^\d{4}-\d{2}-\d{2}$/.test(p[key] as string)),
  );
  const validMap = (map: unknown, max?: number): boolean =>
    !!map &&
    typeof map === "object" &&
    !Array.isArray(map) &&
    Object.entries(map).every(
      ([key, n]) =>
        activities.some((activity) => activity.id === key) &&
        typeof n === "number" &&
        Number.isSafeInteger(n) &&
        n >= 0 &&
        (max === undefined || n <= max),
    );
  const validGradeScores =
    p.gradeBestRounds === undefined ||
    (!!p.gradeBestRounds &&
      typeof p.gradeBestRounds === "object" &&
      !Array.isArray(p.gradeBestRounds) &&
      Object.entries(p.gradeBestRounds).every(
        ([key, n]) =>
          gradeIds.some((grade) =>
            activities.some((activity) => key === `${grade}:${activity.id}`),
          ) &&
          typeof n === "number" &&
          Number.isInteger(n) &&
          n >= 0 &&
          n <= 5,
      ));
  const validBeeScores = p.beeBestRounds === undefined ||
    (!!p.beeBestRounds && typeof p.beeBestRounds === "object" &&
      !Array.isArray(p.beeBestRounds) &&
      Object.entries(p.beeBestRounds).every(([key, n]) =>
        gradeIds.some((id) => id === key) && typeof n === "number" &&
        Number.isInteger(n) && n >= 0 && n <= 5,
      ));
  const validCoding = p.codingCompleted === undefined ||
    (Array.isArray(p.codingCompleted) &&
      new Set(p.codingCompleted).size === p.codingCompleted.length &&
      p.codingCompleted.every((id) => typeof id === "string" && codingPuzzleIds.includes(id)));
  const validAI = p.aiCompleted === undefined ||
    (Array.isArray(p.aiCompleted) && new Set(p.aiCompleted).size === p.aiCompleted.length &&
      p.aiCompleted.every((id) => typeof id === "string" && aiLessonIds.includes(id)));
  if (
    p.version !== 1 ||
    !validCounts ||
    !validDates ||
    !["owl", "fox", "cat", "unicorn"].includes(String(p.avatar)) ||
    !validMap(p.mastery) ||
    !validMap(p.bestRounds, 5) ||
    !validGradeScores ||
    !validBeeScores ||
    !validCoding ||
    !validAI ||
    !validPathChecks(p.pathChecks) ||
    (p.selectedGrade !== undefined && !gradeIds.some((id) => id === p.selectedGrade)) ||
    (p.theme !== undefined && !themes.some((theme) => theme.id === p.theme)) ||
    (p.correct as number) > (p.answered as number) ||
    (p.answered as number) !== (p.rounds as number) * 5 ||
    (p.chestCount as number) > Math.floor((p.rounds as number) / 3) ||
    !avatarUnlocked(p.avatar as Avatar, p.points as number)
  ) {
    throw new Error("Saved progress has invalid or unsupported fields.");
  }
  if (nested) {
    if (
      p.profiles !== undefined ||
      p.activeProfileId !== undefined ||
      p.profileStates !== undefined
    )
      throw new Error("Saved profile progress has unsupported fields.");
  } else {
    validateProfiles(p);
  }
  return value as Progress;
}
function validateProfiles(p: Record<string, unknown>): void {
  const invalid = (): never => {
    throw new Error("Saved progress has invalid learner profiles.");
  };
  if (p.profiles === undefined) {
    if (p.activeProfileId !== undefined || p.profileStates !== undefined)
      invalid();
    return;
  }
  if (
    !Array.isArray(p.profiles) ||
    p.profiles.length < 1 ||
    p.profiles.length > MAX_PROFILES
  )
    invalid();
  const ids = new Set<string>();
  for (const entry of p.profiles as unknown[]) {
    if (!entry || typeof entry !== "object") invalid();
    const profile = entry as Record<string, unknown>;
    if (
      typeof profile.id !== "string" ||
      !profileIdPattern.test(profile.id) ||
      ids.has(profile.id) ||
      !validProfileName(profile.name) ||
      !gradeIds.some((id) => id === profile.grade)
    )
      invalid();
    ids.add(profile.id as string);
  }
  if (typeof p.activeProfileId !== "string" || !ids.has(p.activeProfileId))
    invalid();
  if (p.profileStates !== undefined) {
    if (
      !p.profileStates ||
      typeof p.profileStates !== "object" ||
      Array.isArray(p.profileStates)
    )
      invalid();
    for (const [id, state] of Object.entries(
      p.profileStates as Record<string, unknown>,
    )) {
      if (!ids.has(id) || id === p.activeProfileId) invalid();
      parseProgressObject(state, true);
    }
  }
}
export function parseProgress(raw: string): Progress {
  return parseProgressObject(JSON.parse(raw), false);
}
function coreProgress(progress: Progress): Progress {
  const core = { ...progress };
  delete core.profiles;
  delete core.activeProfileId;
  delete core.profileStates;
  return core;
}
function composeProgress(
  core: Progress,
  profiles: LearnerProfile[],
  activeProfileId: string,
  states: Record<string, Progress>,
): Progress {
  return {
    ...core,
    profiles,
    activeProfileId,
    ...(Object.keys(states).length ? { profileStates: states } : {}),
  };
}
function checkedProfileName(name: string): string {
  const cleaned = cleanProfileName(name);
  if (!cleaned || cleaned.length > 20)
    throw new Error("Give the child a name of 1 to 20 characters.");
  return cleaned;
}
export function addProfile(
  progress: Progress,
  id: string,
  name: string,
  grade: GradeId,
): Progress {
  const cleaned = checkedProfileName(name);
  if (!profileIdPattern.test(id)) throw new Error("Invalid profile id.");
  if (!gradeIds.some((g) => g === grade)) throw new Error("Unknown grade.");
  const profiles = progress.profiles ?? [];
  if (profiles.some((profile) => profile.id === id))
    throw new Error("That child is already added.");
  if (profiles.length >= MAX_PROFILES)
    throw new Error(`You can add up to ${MAX_PROFILES} children.`);
  const profile: LearnerProfile = { id, name: cleaned, grade };
  if (!progress.profiles || !progress.activeProfileId) {
    // The first child added keeps the progress already saved on this device.
    return {
      ...progress,
      selectedGrade: grade,
      profiles: [profile],
      activeProfileId: id,
    };
  }
  const states = { ...(progress.profileStates ?? {}) };
  states[progress.activeProfileId] = coreProgress(progress);
  return composeProgress(
    { ...initialProgress, selectedGrade: grade },
    [...profiles, profile],
    id,
    states,
  );
}
export function switchProfile(progress: Progress, id: string): Progress {
  const profiles = progress.profiles;
  const active = progress.activeProfileId;
  if (!profiles || !active || id === active) return progress;
  const target = profiles.find((profile) => profile.id === id);
  if (!target) return progress;
  const states = { ...(progress.profileStates ?? {}) };
  states[active] = coreProgress(progress);
  const nextCore = states[id] ?? { ...initialProgress, selectedGrade: target.grade };
  delete states[id];
  return composeProgress(
    { ...nextCore, selectedGrade: target.grade },
    profiles,
    id,
    states,
  );
}
export function updateProfile(
  progress: Progress,
  id: string,
  patch: { name?: string; grade?: GradeId },
): Progress {
  const profiles = progress.profiles;
  if (!profiles) return progress;
  const current = profiles.find((profile) => profile.id === id);
  if (!current) return progress;
  const name =
    patch.name === undefined ? current.name : checkedProfileName(patch.name);
  const grade = patch.grade ?? current.grade;
  if (!gradeIds.some((g) => g === grade)) throw new Error("Unknown grade.");
  const nextProfiles = profiles.map((profile) =>
    profile.id === id ? { ...profile, name, grade } : profile,
  );
  if (id === progress.activeProfileId)
    return { ...progress, profiles: nextProfiles, selectedGrade: grade };
  const states = { ...(progress.profileStates ?? {}) };
  states[id] = states[id]
    ? { ...states[id], selectedGrade: grade }
    : { ...initialProgress, selectedGrade: grade };
  return { ...progress, profiles: nextProfiles, profileStates: states };
}
export function removeProfile(progress: Progress, id: string): Progress {
  const profiles = progress.profiles;
  if (!profiles || !profiles.some((profile) => profile.id === id))
    return progress;
  const remaining = profiles.filter((profile) => profile.id !== id);
  const states = { ...(progress.profileStates ?? {}) };
  delete states[id];
  if (remaining.length === 0) return coreProgress(progress);
  if (id !== progress.activeProfileId)
    return composeProgress(
      coreProgress(progress),
      remaining,
      progress.activeProfileId as string,
      states,
    );
  const next = remaining[0];
  const nextCore =
    states[next.id] ?? { ...initialProgress, selectedGrade: next.grade };
  delete states[next.id];
  return composeProgress(
    { ...nextCore, selectedGrade: next.grade },
    remaining,
    next.id,
    states,
  );
}
export const badges = [
  {
    name: "First Steps",
    description: "Finish your first adventure.",
    symbol: "🌱",
    earned: (p: Progress) => p.rounds >= 1,
  },
  {
    name: "English Star",
    description: "Get 5/5 in an English activity.",
    symbol: "🌟",
    earned: (p: Progress) =>
      activities.some(
        (a) => a.subject === "english" && p.bestRounds[a.id] === 5,
      ),
  },
  {
    name: "Math Master",
    description: "Get 5/5 in a Math activity.",
    symbol: "🧮",
    earned: (p: Progress) =>
      activities.some((a) => a.subject === "math" && p.bestRounds[a.id] === 5),
  },
  {
    name: "Team Spirit",
    description: "Complete a teammate practice tip.",
    symbol: "🤝",
    earned: (p: Progress) => !!p.helpDate,
  },
  {
    name: "Treasure Hunter",
    description: "Open your first treasure chest.",
    symbol: "💎",
    earned: (p: Progress) => p.chestCount >= 1,
  },
  {
    name: "Curious Explorer",
    description: "Practice all 10 original activities.",
    symbol: "🧭",
    earned: (p: Progress) =>
      coreLessonIds.every((id) => p.bestRounds[id] !== undefined),
  },
];
