import {
  activities,
  type ActivityId,
  type Progress,
  type Subject,
} from "./game";

/**
 * Progress-chart data, derived only from what a save actually records.
 *
 * The measure everywhere is CORRECT ANSWERS: `Progress.mastery[activity]`
 * is increased by the number of correct answers in each finished round
 * (see completeRound in game.ts), so it is the app's true per-activity
 * volume counter. Spelling-bee championship rounds and Word Battle wins
 * deliberately do not feed it (they track their own bests/mastery), so
 * these charts describe lesson practice, which is what "progress" means
 * on the results screen: "Skills grow with correct answers, not points."
 */

export interface ProgressBar {
  id: string;
  label: string;
  value: number;
  subject?: Subject;
  /** Fill color, matching the English Forest / Math Mountain world cards. */
  color: string;
}

export const SUBJECT_BAR_COLORS: Record<Subject, string> = {
  english: "#7650d9",
  math: "#3d7760",
};

const SUBJECT_LABELS: Record<Subject, string> = {
  english: "English",
  math: "Math",
};

/** Fraction of the fullest bar, clamped to [0, 1]; 0 when there is nothing to scale by. */
export function barFraction(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max)) return 0;
  if (max <= 0 || value <= 0) return 0;
  return Math.min(1, value / max);
}

/** Lifetime correct answers recorded for one activity (0 when untouched). */
export function activityCorrect(progress: Progress, id: ActivityId): number {
  return progress.mastery[id] ?? 0;
}

/** Total charted correct answers across every catalog activity. */
export function totalChartedCorrect(progress: Progress): number {
  return activities.reduce(
    (sum, activity) => sum + activityCorrect(progress, activity.id),
    0,
  );
}

/**
 * One bar per subject: the subject's total correct answers, summed over
 * its catalog activities (subject mapping comes from the catalog itself,
 * so new activities chart under their subject automatically).
 */
export function subjectBars(progress: Progress): ProgressBar[] {
  const subjects: Subject[] = ["english", "math"];
  return subjects.map((subject) => ({
    id: subject,
    label: SUBJECT_LABELS[subject],
    subject,
    color: SUBJECT_BAR_COLORS[subject],
    value: activities
      .filter((activity) => activity.subject === subject)
      .reduce((sum, activity) => sum + activityCorrect(progress, activity.id), 0),
  }));
}

/**
 * Bars for the activities the child has actually practiced (at least one
 * recorded correct answer), strongest first, capped at `limit`. Untouched
 * activities are omitted so the chart only shows real practice.
 */
export function activityBars(
  progress: Progress,
  limit = 6,
): ProgressBar[] {
  return activities
    .map((activity) => ({
      id: activity.id,
      label: activity.title,
      subject: activity.subject,
      color: SUBJECT_BAR_COLORS[activity.subject],
      value: activityCorrect(progress, activity.id),
    }))
    .filter((bar) => bar.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
    .slice(0, Math.max(0, limit));
}
