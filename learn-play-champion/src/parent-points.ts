import { gradeLabels, type GradeId } from "./content-schema";

// Parent Points: grown-ups earn points for staying involved in their
// children's learning — a daily check-in, reviewing each kid's grade-level
// English and Math skills, and checking each kid's tasks. Points are
// tracked per skill (English / Math / General) and every assignment can
// be earned once per day (the per-kid ones once per kid per day).
// Two event awards sit alongside the assignments (bottom of this file):
// a flat thank-you for a completed donation, and +1 per kid per day a
// kid finishes an assignment, observed from the kids' task lists.
//
// Storage: Parent Points live in a dedicated localStorage store, the
// same pattern Teacher Studio uses for teacher content (a small,
// versioned, sanitized device store rather than the learner Progress
// blob — parent data is not learner data, and Progress syncs per child
// and is wiped by "Erase learning data"). Unlike the Teacher Store,
// this store is keyed by the signed-in grown-up's user id, so two
// grown-ups sharing one device never see or add to each other's
// points. The trade-off, same as Teacher Studio v1: points live on the
// browser where they were earned and do not yet follow the account to
// other devices (there is no account-level key/value table to hold
// them; learner_progress is per-learner and revision-locked).

export const PARENT_POINTS_STORAGE_KEY =
  "learn-play-champion-parent-points-v1";

/** The skills points are bucketed into, matching the progress charts. */
export type ParentPointSkill = "english" | "math" | "general";

export type ParentPointAction =
  | "check-in"
  | "review-english"
  | "review-math"
  | "check-tasks"
  | "donation"
  | "kid-assignment";

/** Point value of every parent assignment — the single source of truth. */
export const PARENT_POINT_VALUES: Record<ParentPointAction, number> = {
  "check-in": 5,
  "review-english": 5,
  "review-math": 5,
  "check-tasks": 5,
  donation: 20,
  "kid-assignment": 1,
};

/** Which skill bucket each assignment pays into. */
export const PARENT_POINT_SKILLS: Record<ParentPointAction, ParentPointSkill> = {
  "check-in": "general",
  "review-english": "english",
  "review-math": "math",
  "check-tasks": "general",
  donation: "general",
  "kid-assignment": "general",
};

export const PARENT_POINT_SKILL_LABELS: Record<ParentPointSkill, string> = {
  english: "English",
  math: "Math",
  general: "General",
};

const PARENT_POINT_ACTIONS: ParentPointAction[] = [
  "check-in",
  "review-english",
  "review-math",
  "check-tasks",
  "donation",
  "kid-assignment",
];

const PARENT_POINT_SKILL_IDS: ParentPointSkill[] = [
  "english",
  "math",
  "general",
];

/** Award records older than this are pruned; guards only ever need today. */
const AWARD_RETENTION_DAYS = 35;
/** The recent-activity list shown in the panel is capped. */
const RECENT_ACTIVITY_LIMIT = 10;

export interface ParentPointAward {
  action: ParentPointAction;
  /** Kid the award is scoped to; "" for the account-wide daily check-in. */
  kidUserId: string;
  /** Local calendar day of the award, YYYY-MM-DD. */
  date: string;
}

export interface ParentPointActivity extends ParentPointAward {
  /** Assignment title as shown to the parent when it was earned. */
  label: string;
  skill: ParentPointSkill;
  points: number;
  /** ISO timestamp of the award. */
  at: string;
}

export interface ParentPointsAccount {
  totals: Record<ParentPointSkill, number>;
  awards: ParentPointAward[];
  recent: ParentPointActivity[];
  /**
   * Keys of one-time event awards already granted, oldest first.
   * Event points (a completed donation, a kid finishing an assignment)
   * are idempotent per event rather than per day, so their keys are
   * kept apart from the daily-guard awards. Key formats:
   * "donation:<requestId>" and "kid-assignment:<kidUserId>:<YYYY-MM-DD>".
   */
  eventKeys: string[];
}

export interface ParentPointsStore {
  accounts: Record<string, ParentPointsAccount>;
}

export function emptyParentPointsAccount(): ParentPointsAccount {
  return {
    totals: { english: 0, math: 0, general: 0 },
    awards: [],
    recent: [],
    eventKeys: [],
  };
}

export function emptyParentPointsStore(): ParentPointsStore {
  return { accounts: {} };
}

/** Total points across every skill bucket. */
export function totalParentPoints(account: ParentPointsAccount): number {
  return (
    account.totals.english + account.totals.math + account.totals.general
  );
}

/** Local calendar day as YYYY-MM-DD (the day points reset). */
export function localDateString(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function shiftDateString(date: string, days: number): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  parsed.setDate(parsed.getDate() + days);
  return localDateString(parsed);
}

/** The kid scope an action is guarded on; check-in and donation are account-wide. */
function awardKidScope(action: ParentPointAction, kidUserId: string): string {
  return action === "check-in" || action === "donation" ? "" : kidUserId;
}

/** True when this action was already earned for this scope on this day. */
export function hasAwardedOn(
  account: ParentPointsAccount,
  action: ParentPointAction,
  kidUserId: string,
  date: string,
): boolean {
  const scope = awardKidScope(action, kidUserId);
  return account.awards.some(
    (award) =>
      award.action === action &&
      award.kidUserId === scope &&
      award.date === date,
  );
}

export interface AwardParentPointsInput {
  action: ParentPointAction;
  /** Kid the assignment belongs to; ignored for the daily check-in. */
  kidUserId: string;
  /** Assignment title, stored in the recent-activity list. */
  label: string;
  /** Defaults to the current moment; injectable for tests. */
  now?: Date;
}

export interface AwardParentPointsResult {
  /** The account after the attempt (unchanged when not awarded). */
  account: ParentPointsAccount;
  awarded: boolean;
  /** Points granted (0 when the once-per-day guard blocked the award). */
  points: number;
  skill: ParentPointSkill;
}

/**
 * Award points for one completed parent assignment. The once-per-day
 * guard (per kid for the per-kid actions, account-wide for the daily
 * check-in) is enforced here, in the awarding logic — a second attempt
 * on the same local day returns the account untouched.
 */
export function awardParentPoints(
  account: ParentPointsAccount,
  input: AwardParentPointsInput,
): AwardParentPointsResult {
  const now = input.now ?? new Date();
  const date = localDateString(now);
  const skill = PARENT_POINT_SKILLS[input.action];
  const scope = awardKidScope(input.action, input.kidUserId);
  if (hasAwardedOn(account, input.action, scope, date)) {
    return { account, awarded: false, points: 0, skill };
  }
  const points = PARENT_POINT_VALUES[input.action];
  const cutoff = shiftDateString(date, -AWARD_RETENTION_DAYS);
  const awards = [
    ...account.awards.filter((award) => award.date >= cutoff),
    { action: input.action, kidUserId: scope, date },
  ];
  const activity: ParentPointActivity = {
    action: input.action,
    kidUserId: scope,
    date,
    label: input.label,
    skill,
    points,
    at: now.toISOString(),
  };
  return {
    account: {
      totals: { ...account.totals, [skill]: account.totals[skill] + points },
      awards,
      recent: [activity, ...account.recent].slice(0, RECENT_ACTIVITY_LIMIT),
      eventKeys: account.eventKeys,
    },
    awarded: true,
    points,
    skill,
  };
}

// ---------------------------------------------------------------------------
// Daily assignments
// ---------------------------------------------------------------------------

export interface ParentKidRef {
  kidUserId: string;
  displayName: string;
  /** The kid login's grade — assignments and skills are scoped to it. */
  grade: GradeId;
}

export interface ParentAssignment {
  action: ParentPointAction;
  /** Kid the assignment belongs to; "" for the daily check-in. */
  kidUserId: string;
  kidName: string;
  /** The kid's grade for per-kid assignments; null for the check-in. */
  grade: GradeId | null;
  title: string;
  points: number;
  skill: ParentPointSkill;
  done: boolean;
}

/**
 * Today's assignment list for a grown-up: one account-wide daily
 * check-in, then, for each managed kid, a review of that kid's
 * English skills and Math skills at the kid's own grade level (the
 * grade on the kid's login, the same grade the Family Leaderboard and
 * the kid's progress charts use) plus a check of that kid's tasks.
 * `done` reflects the same once-per-day guard the awarding enforces.
 */
export function dailyParentAssignments(
  kids: ParentKidRef[],
  account: ParentPointsAccount,
  date: string,
): ParentAssignment[] {
  const assignments: ParentAssignment[] = [];
  if (kids.length > 0) {
    assignments.push({
      action: "check-in",
      kidUserId: "",
      kidName: "",
      grade: null,
      title: "Daily check-in — open a kid's progress",
      points: PARENT_POINT_VALUES["check-in"],
      skill: PARENT_POINT_SKILLS["check-in"],
      done: hasAwardedOn(account, "check-in", "", date),
    });
  }
  for (const kid of kids) {
    const grade = gradeLabels[kid.grade];
    const perKid: Array<{
      action: ParentPointAction;
      title: string;
    }> = [
      {
        action: "review-english",
        title: `Review ${kid.displayName}'s ${grade} English skills`,
      },
      {
        action: "review-math",
        title: `Review ${kid.displayName}'s ${grade} Math skills`,
      },
      {
        action: "check-tasks",
        title: `Check ${kid.displayName}'s tasks`,
      },
    ];
    for (const entry of perKid) {
      assignments.push({
        action: entry.action,
        kidUserId: kid.kidUserId,
        kidName: kid.displayName,
        grade: kid.grade,
        title: entry.title,
        points: PARENT_POINT_VALUES[entry.action],
        skill: PARENT_POINT_SKILLS[entry.action],
        done: hasAwardedOn(account, entry.action, kid.kidUserId, date),
      });
    }
  }
  return assignments;
}

// ---------------------------------------------------------------------------
// Navigation to the existing kid views
// ---------------------------------------------------------------------------

/**
 * The Parent Points panel and the Kid logins list live in the same
 * Privacy & data section but are separate components. Clicking an
 * assignment dispatches this window event; the matching kid row opens
 * the requested existing view (progress charts or the tasks manager)
 * and scrolls into sight. Points are recorded by the panel either way.
 */
export const PARENT_REVIEW_EVENT = "learn-play-parent-review";

export interface ParentReviewRequest {
  kidUserId: string;
  view: "progress" | "tasks";
  /** Set for the per-skill reviews, so the request names the skill. */
  subject?: ParentPointSkill;
}

export function requestParentReview(request: ParentReviewRequest): void {
  window.dispatchEvent(
    new CustomEvent<ParentReviewRequest>(PARENT_REVIEW_EVENT, {
      detail: request,
    }),
  );
}

/** Validate a review event's detail before a kid row acts on it. */
export function parseParentReviewRequest(
  event: Event,
): ParentReviewRequest | null {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!detail || typeof detail !== "object" || Array.isArray(detail))
    return null;
  const value = detail as Record<string, unknown>;
  if (typeof value.kidUserId !== "string" || !value.kidUserId) return null;
  if (value.view !== "progress" && value.view !== "tasks") return null;
  const subject = PARENT_POINT_SKILL_IDS.find((id) => id === value.subject);
  return {
    kidUserId: value.kidUserId,
    view: value.view,
    ...(subject ? { subject } : {}),
  };
}

// ---------------------------------------------------------------------------
// Store persistence (device-local, keyed by grown-up user id)
// ---------------------------------------------------------------------------

function cleanCount(value: unknown): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : 0;
}

/** Cap on stored event-award keys; the oldest fall off first. */
const EVENT_KEY_LIMIT = 100;
const EVENT_KEY_PATTERN = /^\S{3,160}$/;

function sanitizeEventKey(value: unknown): string | null {
  return typeof value === "string" && EVENT_KEY_PATTERN.test(value)
    ? value
    : null;
}

function sanitizeAward(value: unknown): ParentPointAward | null {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return null;
  const raw = value as Record<string, unknown>;
  const action = PARENT_POINT_ACTIONS.find((id) => id === raw.action);
  if (!action) return null;
  if (typeof raw.kidUserId !== "string" || raw.kidUserId.length > 128)
    return null;
  if (typeof raw.date !== "string" || !DATE_PATTERN.test(raw.date))
    return null;
  return {
    action,
    kidUserId: awardKidScope(action, raw.kidUserId),
    date: raw.date,
  };
}

function sanitizeActivity(value: unknown): ParentPointActivity | null {
  const award = sanitizeAward(value);
  if (!award) return null;
  const raw = value as Record<string, unknown>;
  const skill = PARENT_POINT_SKILL_IDS.find((id) => id === raw.skill);
  if (!skill || skill !== PARENT_POINT_SKILLS[award.action]) return null;
  if (
    typeof raw.label !== "string" ||
    !raw.label.trim() ||
    raw.label.length > 160
  )
    return null;
  if (typeof raw.at !== "string" || !raw.at) return null;
  return {
    ...award,
    label: raw.label.trim(),
    skill,
    points: PARENT_POINT_VALUES[award.action],
    at: raw.at,
  };
}

export function sanitizeParentPointsAccount(
  value: unknown,
): ParentPointsAccount {
  const account = emptyParentPointsAccount();
  if (!value || typeof value !== "object" || Array.isArray(value))
    return account;
  const raw = value as Record<string, unknown>;
  if (raw.totals && typeof raw.totals === "object" && !Array.isArray(raw.totals)) {
    const totals = raw.totals as Record<string, unknown>;
    for (const skill of PARENT_POINT_SKILL_IDS) {
      account.totals[skill] = cleanCount(totals[skill]);
    }
  }
  if (Array.isArray(raw.awards)) {
    const seen = new Set<string>();
    for (const entry of raw.awards) {
      const award = sanitizeAward(entry);
      if (!award) continue;
      const key = `${award.action}:${award.kidUserId}:${award.date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      account.awards.push(award);
    }
  }
  if (Array.isArray(raw.recent)) {
    for (const entry of raw.recent) {
      const activity = sanitizeActivity(entry);
      if (activity) account.recent.push(activity);
      if (account.recent.length >= RECENT_ACTIVITY_LIMIT) break;
    }
  }
  if (Array.isArray(raw.eventKeys)) {
    const seen = new Set<string>();
    for (const entry of raw.eventKeys) {
      const key = sanitizeEventKey(entry);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      account.eventKeys.push(key);
    }
    if (account.eventKeys.length > EVENT_KEY_LIMIT) {
      account.eventKeys = account.eventKeys.slice(-EVENT_KEY_LIMIT);
    }
  }
  return account;
}

export function loadParentPointsStore(): ParentPointsStore {
  try {
    const raw = localStorage.getItem(PARENT_POINTS_STORAGE_KEY);
    if (!raw) return emptyParentPointsStore();
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return emptyParentPointsStore();
    const record = parsed as Record<string, unknown>;
    if (
      !record.accounts ||
      typeof record.accounts !== "object" ||
      Array.isArray(record.accounts)
    )
      return emptyParentPointsStore();
    const accounts: Record<string, ParentPointsAccount> = {};
    for (const [userId, value] of Object.entries(
      record.accounts as Record<string, unknown>,
    )) {
      if (userId) accounts[userId] = sanitizeParentPointsAccount(value);
    }
    return { accounts };
  } catch {
    return emptyParentPointsStore();
  }
}

export function saveParentPointsStore(store: ParentPointsStore): void {
  try {
    localStorage.setItem(PARENT_POINTS_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or blocked: the panel still works for this session;
    // the component keeps the store in React state either way.
  }
}

/** One grown-up's points account inside the shared device store. */
export function parentPointsAccountFor(
  store: ParentPointsStore,
  userId: string,
): ParentPointsAccount {
  return store.accounts[userId] ?? emptyParentPointsAccount();
}

/** A copy of the store with one grown-up's account replaced. */
export function withParentPointsAccount(
  store: ParentPointsStore,
  userId: string,
  account: ParentPointsAccount,
): ParentPointsStore {
  return { accounts: { ...store.accounts, [userId]: account } };
}

// ---------------------------------------------------------------------------
// Event awards: donations and kid assignment completions
// ---------------------------------------------------------------------------
//
// Alongside the daily assignments, a grown-up earns points for one-time
// events: completing a donation, and each day one of their kids finishes
// an assignment. Event awards are not daily assignments (they never
// appear in the assignment list) and are not guarded per day — each is
// idempotent per event via the account's eventKeys, so replays of the
// same event (a refreshed return page, a repeated panel load) can never
// pay twice, while a genuinely new event always pays again.

/**
 * Dispatched on window after an out-of-panel award (a donation) writes
 * the store, so a mounted Parent Points panel can reload its copy
 * instead of going stale — the two live in the same Privacy & data
 * view. Mirrors the PARENT_REVIEW_EVENT pattern above.
 */
export const PARENT_POINTS_UPDATED_EVENT = "learn-play-parent-points-updated";

/** Recent-activity label for the donation award. */
export const PARENT_DONATION_AWARD_LABEL = "Donation — thank you";

/** Event key for one donation, from its checkout request id. */
export function donationAwardKey(donationKey: string): string {
  return `donation:${donationKey}`;
}

const DONATION_KEY_PATTERN = /^[A-Za-z0-9_-]{3,100}$/;

export interface AwardDonationPointsInput {
  /**
   * The donation's stable checkout request id — the id threaded through
   * create, the PayPal return link, and capture, and reused verbatim on
   * retries of the same donation, so one donation always maps to one key.
   */
  donationKey: string;
  /** Defaults to the current moment; injectable for tests. */
  now?: Date;
}

export interface EventAwardResult {
  /** The account after the attempt (unchanged when not awarded). */
  account: ParentPointsAccount;
  awarded: boolean;
  /** Points granted (0 when the event was already awarded). */
  points: number;
  skill: ParentPointSkill;
}

/**
 * Award the donation points for one completed donation. Idempotent per
 * donation key: a second call for the same donation returns the account
 * untouched; a different donation awards again. Callers must only call
 * this once a capture is known to have completed — never on checkout
 * start, cancel, or a pending/failed capture.
 */
export function awardDonationPoints(
  account: ParentPointsAccount,
  input: AwardDonationPointsInput,
): EventAwardResult {
  const skill = PARENT_POINT_SKILLS.donation;
  const points = PARENT_POINT_VALUES.donation;
  if (!DONATION_KEY_PATTERN.test(input.donationKey)) {
    return { account, awarded: false, points: 0, skill };
  }
  const key = donationAwardKey(input.donationKey);
  if (account.eventKeys.includes(key)) {
    return { account, awarded: false, points: 0, skill };
  }
  const now = input.now ?? new Date();
  const activity: ParentPointActivity = {
    action: "donation",
    kidUserId: "",
    date: localDateString(now),
    label: PARENT_DONATION_AWARD_LABEL,
    skill,
    points,
    at: now.toISOString(),
  };
  return {
    account: {
      totals: { ...account.totals, [skill]: account.totals[skill] + points },
      awards: account.awards,
      recent: [activity, ...account.recent].slice(0, RECENT_ACTIVITY_LIMIT),
      eventKeys: [...account.eventKeys, key].slice(-EVENT_KEY_LIMIT),
    },
    awarded: true,
    points,
    skill,
  };
}

/**
 * Record a completed donation in the signed-in grown-up's own points
 * account: fresh load → award → save, then notify any mounted panel.
 * Returns true when points were newly awarded. A blank user id (no
 * signed-in grown-up) or an already-awarded donation quietly returns
 * false — points are a thank-you extra and must never interfere with
 * the donation itself.
 */
export function recordDonationAward(
  userId: string,
  donationKey: string,
  now: Date = new Date(),
): boolean {
  if (!userId) return false;
  const store = loadParentPointsStore();
  const result = awardDonationPoints(parentPointsAccountFor(store, userId), {
    donationKey,
    now,
  });
  if (!result.awarded) return false;
  saveParentPointsStore(
    withParentPointsAccount(store, userId, result.account),
  );
  window.dispatchEvent(
    new CustomEvent(PARENT_POINTS_UPDATED_EVENT, { detail: { userId } }),
  );
  return true;
}

/** Days back (including today) a kid completion can still earn points. */
export const KID_ASSIGNMENT_WINDOW_DAYS = 7;

/** Event key for one kid's assignment-completion day. */
export function kidAssignmentAwardKey(kidUserId: string, date: string): string {
  return `kid-assignment:${kidUserId}:${date}`;
}

/** One kid task completion, as observed from the kid's task list. */
export interface KidTaskCompletion {
  kidUserId: string;
  /** The kid's display name, used in the activity label. */
  kidName: string;
  /** The day the task was marked done, YYYY-MM-DD. */
  date: string;
}

export interface ObserveKidCompletionsResult {
  /** The account after the attempt (unchanged when nothing awarded). */
  account: ParentPointsAccount;
  /** How many (kid, day) pairs were newly awarded. */
  awardedCount: number;
  /** Total points granted. */
  points: number;
}

/**
 * Observe-and-award for kid assignment completions: +1 per kid per day
 * for each completion whose done date falls in the last
 * KID_ASSIGNMENT_WINDOW_DAYS days (today included). Several tasks done
 * by one kid on one day still pay once; two kids or two days pay per
 * pair. Completions outside the window never pay — including on first
 * observation, so old completions do not backfill — and awarded pairs
 * are remembered in eventKeys, so repeat observations never re-pay.
 */
export function observeKidCompletions(
  account: ParentPointsAccount,
  completions: KidTaskCompletion[],
  now: Date = new Date(),
): ObserveKidCompletionsResult {
  const today = localDateString(now);
  const earliest = shiftDateString(today, -(KID_ASSIGNMENT_WINDOW_DAYS - 1));
  const pairs = new Map<string, KidTaskCompletion>();
  for (const completion of completions) {
    if (!completion.kidUserId || !DATE_PATTERN.test(completion.date))
      continue;
    if (completion.date < earliest || completion.date > today) continue;
    const key = kidAssignmentAwardKey(completion.kidUserId, completion.date);
    if (!pairs.has(key)) pairs.set(key, completion);
  }
  const fresh = [...pairs.entries()]
    .filter(([key]) => !account.eventKeys.includes(key))
    .sort((a, b) => a[1].date.localeCompare(b[1].date));
  if (fresh.length === 0) return { account, awardedCount: 0, points: 0 };
  const pointsEach = PARENT_POINT_VALUES["kid-assignment"];
  const skill = PARENT_POINT_SKILLS["kid-assignment"];
  let totals = account.totals;
  let recent = account.recent;
  let eventKeys = account.eventKeys;
  for (const [key, completion] of fresh) {
    const name = completion.kidName.trim() || "Your child";
    const activity: ParentPointActivity = {
      action: "kid-assignment",
      kidUserId: completion.kidUserId,
      date: completion.date,
      label: `${name} finished an assignment`,
      skill,
      points: pointsEach,
      at: now.toISOString(),
    };
    totals = { ...totals, [skill]: totals[skill] + pointsEach };
    recent = [activity, ...recent].slice(0, RECENT_ACTIVITY_LIMIT);
    eventKeys = [...eventKeys, key];
  }
  return {
    account: {
      totals,
      awards: account.awards,
      recent,
      eventKeys: eventKeys.slice(-EVENT_KEY_LIMIT),
    },
    awardedCount: fresh.length,
    points: fresh.length * pointsEach,
  };
}
