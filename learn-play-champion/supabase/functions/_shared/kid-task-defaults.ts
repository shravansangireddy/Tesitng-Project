// Default starter tasks for a brand-new kid login.
//
// When a grown-up creates a kid login, the kid-accounts Edge Function seeds
// the kid's task list with the small set below so their home screen is
// never empty on day one. This module is the ONE place the default set is
// defined — tweak the lists here and every new kid gets the new set.
//
// A task's `activity` is the deep-link stored in public.kid_tasks: either a
// lesson activity id from the app catalog (src/game.ts `activities`) or the
// special "word-battle" id that opens the Word Battle world, or null for a
// plain title-only task. Titles follow the format parents already use by
// hand: "Play " + the activity's name.

export interface DefaultKidTask {
  title: string;
  activity: string | null;
}

export type KidGradeBand = "early" | "primary" | "upper";

/** Grade ids match GRADE_IDS in the kid-accounts function / the app. */
export function gradeBandForGrade(grade: string): KidGradeBand {
  if (grade === "prek" || grade === "k") return "early";
  if (grade === "3" || grade === "4" || grade === "5") return "upper";
  // "1", "2", and anything unexpected get the middle set.
  return "primary";
}

const READING_TASK: DefaultKidTask = {
  title: "Play Story Explorer",
  activity: "reading",
};
const MATH_TASK: DefaultKidTask = {
  title: "Play Number Sprint",
  activity: "arithmetic",
};
const WORD_SAFARI_TASK: DefaultKidTask = {
  title: "Play Word Safari",
  activity: "sight",
};
const SPELLING_TASK: DefaultKidTask = {
  title: "Play Spelling Spark",
  activity: "spelling",
};
const WORD_BATTLE_TASK: DefaultKidTask = {
  title: "Play Word Battle",
  activity: "word-battle",
};
const PICTURE_BOOK_TASK: DefaultKidTask = {
  title: "Read a picture book",
  activity: null,
};

const DEFAULT_TASKS_BY_BAND: Record<KidGradeBand, DefaultKidTask[]> = {
  // Pre-K / Kindergarten: no typing games and no Word Battle yet (its
  // spelling mode is typed, and battles run long for this age). The fourth
  // slot is a picture-book task instead — BookShelf reading is the gentle
  // on-ramp, and title-only is the format the app already uses for it.
  early: [READING_TASK, MATH_TASK, WORD_SAFARI_TASK, PICTURE_BOOK_TASK],
  // Grades 1–2: Word Safari (spot-the-word, no typing) is the word game —
  // the same pick parents chose by hand for a Grade 2 login. Word Battle
  // joins here: its vocabulary mode is multiple-choice.
  primary: [READING_TASK, MATH_TASK, WORD_SAFARI_TASK, WORD_BATTLE_TASK],
  // Grades 3–5: typing is comfortable, so the word game is Spelling Spark,
  // alongside Word Battle.
  upper: [READING_TASK, MATH_TASK, SPELLING_TASK, WORD_BATTLE_TASK],
};

/** The starter set for a kid in the given grade (a fresh copy each call). */
export function defaultTasksForGrade(grade: string): DefaultKidTask[] {
  return DEFAULT_TASKS_BY_BAND[gradeBandForGrade(grade)].map((task) => ({
    ...task,
  }));
}

/**
 * Seeding guard: defaults are only ever seeded into an EMPTY task list, so
 * re-running creation (or a parent who already added tasks by hand) never
 * duplicates or overwrites anything.
 */
export function shouldSeedDefaultTasks(existingTaskCount: number): boolean {
  return existingTaskCount === 0;
}
