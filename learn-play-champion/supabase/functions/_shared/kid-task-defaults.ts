// Default starter tasks for a brand-new kid login.
//
// When a grown-up creates a kid login, the kid-accounts Edge Function seeds
// the kid's task list with the set below so their home screen starts with
// every skill the app offers. This module is the ONE place the default set
// is defined — tweak the list here and every new kid gets the new set.
//
// Owner's decision (2026-11-05, "Add all skills"): EVERY new kid login gets
// ALL skills, whatever their grade — every activity in the app catalog
// (src/game.ts `activities`), plus the Word Battle world and Motivation
// Books. Every catalog activity has grade-level content at every grade
// (the content schema requires each grade file to carry every lesson), so
// no seeded deep-link ever opens an empty activity. This supersedes the
// original 4-task grade-banded starter sets.
//
// A task's `activity` is the deep-link stored in public.kid_tasks: either a
// lesson activity id from the app catalog, or one of the special ids the
// task system also accepts ("word-battle", "motivation-books"). Titles
// follow the format parents already use by hand: "Play " + the activity's
// name (books get "Read a Motivation Book").

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

/** One task per skill, in the app catalog's order: English, then Math,
 * then Guitar Quest, then the Word Battle world and Motivation Books. */
const ALL_SKILL_TASKS: DefaultKidTask[] = [
  { title: "Play Word Safari", activity: "sight" },
  { title: "Play Meaning Match", activity: "vocabulary" },
  { title: "Play Word Power", activity: "wordpower" },
  { title: "Play Spelling Spark", activity: "spelling" },
  { title: "Play Story Explorer", activity: "reading" },
  { title: "Play Sentence Builder", activity: "sentence" },
  { title: "Play Fact Finder", activity: "informational" },
  { title: "Play Writer's Workshop", activity: "writing" },
  { title: "Play Number Sprint", activity: "arithmetic" },
  { title: "Play Times Adventure", activity: "multiply" },
  { title: "Play Pattern Detective", activity: "patterns" },
  { title: "Play Math in the Wild", activity: "problems" },
  { title: "Play Shape Quest", activity: "geometry" },
  { title: "Play Place Value Lab", activity: "place" },
  { title: "Play Parts & Wholes", activity: "fractions" },
  { title: "Play Measurement Mission", activity: "measurement" },
  { title: "Play Data Detective", activity: "data" },
  { title: "Play Guitar Quest", activity: "guitar" },
  { title: "Play Word Battle", activity: "word-battle" },
  { title: "Read a Motivation Book", activity: "motivation-books" },
];

/**
 * The default set for a new kid login: ALL skills, the same at every
 * grade (a fresh copy each call). The grade parameter stays so callers
 * and the seeding flow keep their shape.
 */
export function defaultTasksForGrade(_grade: string): DefaultKidTask[] {
  return ALL_SKILL_TASKS.map((task) => ({ ...task }));
}

/**
 * Seeding guard: defaults are only ever seeded into an EMPTY task list, so
 * re-running creation (or a parent who already added tasks by hand) never
 * duplicates or overwrites anything.
 */
export function shouldSeedDefaultTasks(existingTaskCount: number): boolean {
  return existingTaskCount === 0;
}
