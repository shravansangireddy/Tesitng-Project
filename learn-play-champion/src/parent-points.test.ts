// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  awardParentPoints,
  dailyParentAssignments,
  emptyParentPointsAccount,
  emptyParentPointsStore,
  hasAwardedOn,
  loadParentPointsStore,
  localDateString,
  parentPointsAccountFor,
  saveParentPointsStore,
  totalParentPoints,
  withParentPointsAccount,
  PARENT_POINTS_STORAGE_KEY,
  PARENT_POINT_SKILLS,
  PARENT_POINT_VALUES,
  type ParentKidRef,
} from "./parent-points";

const AVYAN: ParentKidRef = {
  kidUserId: "kid-avyan",
  displayName: "Avyan",
  grade: "4",
};
const ZARA: ParentKidRef = {
  kidUserId: "kid-zara",
  displayName: "Zara",
  grade: "2",
};

const DAY_ONE = new Date("2026-11-04T09:00:00");
const DAY_TWO = new Date("2026-11-05T09:00:00");

afterEach(() => {
  localStorage.removeItem(PARENT_POINTS_STORAGE_KEY);
});

describe("parent point configuration", () => {
  it("pays every assignment from one config constant, bucketed per skill", () => {
    expect(PARENT_POINT_VALUES).toEqual({
      "check-in": 5,
      "review-english": 5,
      "review-math": 5,
      "check-tasks": 5,
    });
    expect(PARENT_POINT_SKILLS).toEqual({
      "check-in": "general",
      "review-english": "english",
      "review-math": "math",
      "check-tasks": "general",
    });
  });
});

describe("awardParentPoints", () => {
  it("awards each action's points into its own skill bucket", () => {
    let account = emptyParentPointsAccount();
    const english = awardParentPoints(account, {
      action: "review-english",
      kidUserId: AVYAN.kidUserId,
      label: "Review Avyan's Grade 4 English skills",
      now: DAY_ONE,
    });
    expect(english.awarded).toBe(true);
    expect(english.points).toBe(5);
    expect(english.skill).toBe("english");
    account = english.account;

    const math = awardParentPoints(account, {
      action: "review-math",
      kidUserId: AVYAN.kidUserId,
      label: "Review Avyan's Grade 4 Math skills",
      now: DAY_ONE,
    });
    account = math.account;
    const tasks = awardParentPoints(account, {
      action: "check-tasks",
      kidUserId: AVYAN.kidUserId,
      label: "Check Avyan's tasks",
      now: DAY_ONE,
    });
    account = tasks.account;
    const checkIn = awardParentPoints(account, {
      action: "check-in",
      kidUserId: "",
      label: "Daily check-in",
      now: DAY_ONE,
    });
    account = checkIn.account;

    expect(account.totals).toEqual({ english: 5, math: 5, general: 10 });
    expect(totalParentPoints(account)).toBe(20);
    // Recent activity is newest first and carries the labels shown.
    expect(account.recent.map((entry) => entry.label)).toEqual([
      "Daily check-in",
      "Check Avyan's tasks",
      "Review Avyan's Grade 4 Math skills",
      "Review Avyan's Grade 4 English skills",
    ]);
  });

  it("blocks a second award for the same kid, action, and day", () => {
    const first = awardParentPoints(emptyParentPointsAccount(), {
      action: "review-english",
      kidUserId: AVYAN.kidUserId,
      label: "Review",
      now: DAY_ONE,
    });
    const second = awardParentPoints(first.account, {
      action: "review-english",
      kidUserId: AVYAN.kidUserId,
      label: "Review",
      now: new Date("2026-11-04T21:30:00"),
    });
    expect(second.awarded).toBe(false);
    expect(second.points).toBe(0);
    expect(second.account).toBe(first.account);
    expect(second.account.totals.english).toBe(5);
  });

  it("awards again on the next local day", () => {
    const first = awardParentPoints(emptyParentPointsAccount(), {
      action: "review-math",
      kidUserId: AVYAN.kidUserId,
      label: "Review",
      now: DAY_ONE,
    });
    const nextDay = awardParentPoints(first.account, {
      action: "review-math",
      kidUserId: AVYAN.kidUserId,
      label: "Review",
      now: DAY_TWO,
    });
    expect(nextDay.awarded).toBe(true);
    expect(nextDay.account.totals.math).toBe(10);
    expect(
      hasAwardedOn(nextDay.account, "review-math", AVYAN.kidUserId, "2026-11-05"),
    ).toBe(true);
    expect(
      hasAwardedOn(nextDay.account, "review-math", AVYAN.kidUserId, "2026-11-06"),
    ).toBe(false);
  });

  it("scopes per-kid awards per kid: two kids can each earn the same review", () => {
    let account = emptyParentPointsAccount();
    for (const kid of [AVYAN, ZARA]) {
      const result = awardParentPoints(account, {
        action: "review-english",
        kidUserId: kid.kidUserId,
        label: "Review",
        now: DAY_ONE,
      });
      expect(result.awarded).toBe(true);
      account = result.account;
    }
    expect(account.totals.english).toBe(10);
  });

  it("scopes the daily check-in to the account, not to a kid", () => {
    const first = awardParentPoints(emptyParentPointsAccount(), {
      action: "check-in",
      kidUserId: AVYAN.kidUserId,
      label: "Daily check-in",
      now: DAY_ONE,
    });
    expect(first.awarded).toBe(true);
    // Even naming a different kid, the check-in cannot be earned twice.
    const second = awardParentPoints(first.account, {
      action: "check-in",
      kidUserId: ZARA.kidUserId,
      label: "Daily check-in",
      now: DAY_ONE,
    });
    expect(second.awarded).toBe(false);
    expect(second.account.awards).toHaveLength(1);
    expect(second.account.awards[0].kidUserId).toBe("");
  });

  it("prunes stale award records while lifetime totals keep counting", () => {
    const january = awardParentPoints(emptyParentPointsAccount(), {
      action: "check-in",
      kidUserId: "",
      label: "Daily check-in",
      now: new Date("2026-01-01T09:00:00"),
    });
    const march = awardParentPoints(january.account, {
      action: "check-in",
      kidUserId: "",
      label: "Daily check-in",
      now: new Date("2026-03-15T09:00:00"),
    });
    expect(march.awarded).toBe(true);
    expect(march.account.totals.general).toBe(10);
    expect(march.account.awards.map((award) => award.date)).toEqual([
      "2026-03-15",
    ]);
    expect(march.account.recent).toHaveLength(2);
  });
});

describe("dailyParentAssignments grade scoping", () => {
  it("matches each kid's review assignments to that kid's own grade", () => {
    const assignments = dailyParentAssignments(
      [AVYAN, ZARA],
      emptyParentPointsAccount(),
      "2026-11-04",
    );
    const titles = assignments.map((assignment) => assignment.title);
    // Grade 4 kid gets Grade 4 skills; Grade 2 kid gets Grade 2 skills.
    expect(titles).toContain("Review Avyan's Grade 4 English skills");
    expect(titles).toContain("Review Avyan's Grade 4 Math skills");
    expect(titles).toContain("Review Zara's Grade 2 English skills");
    expect(titles).toContain("Review Zara's Grade 2 Math skills");
    expect(titles).not.toContain("Review Avyan's Grade 2 English skills");
    expect(titles).not.toContain("Review Zara's Grade 4 Math skills");
    const avyanEnglish = assignments.find(
      (assignment) =>
        assignment.action === "review-english" &&
        assignment.kidUserId === AVYAN.kidUserId,
    );
    expect(avyanEnglish?.grade).toBe("4");
    expect(avyanEnglish?.points).toBe(5);
    expect(avyanEnglish?.skill).toBe("english");
    const zaraMath = assignments.find(
      (assignment) =>
        assignment.action === "review-math" &&
        assignment.kidUserId === ZARA.kidUserId,
    );
    expect(zaraMath?.grade).toBe("2");
    // One account-wide check-in, listed first; 3 assignments per kid.
    expect(assignments[0].action).toBe("check-in");
    expect(assignments).toHaveLength(1 + 2 * 3);
    expect(assignments.every((assignment) => !assignment.done)).toBe(true);
  });

  it("marks assignments done from the same guard the awarding uses", () => {
    const awarded = awardParentPoints(emptyParentPointsAccount(), {
      action: "review-english",
      kidUserId: ZARA.kidUserId,
      label: "Review Zara's Grade 2 English skills",
      now: DAY_ONE,
    });
    const assignments = dailyParentAssignments(
      [AVYAN, ZARA],
      awarded.account,
      "2026-11-04",
    );
    const byKey = new Map(
      assignments.map((assignment) => [
        `${assignment.action}:${assignment.kidUserId}`,
        assignment.done,
      ]),
    );
    expect(byKey.get("review-english:kid-zara")).toBe(true);
    expect(byKey.get("review-english:kid-avyan")).toBe(false);
    expect(byKey.get("check-in:")).toBe(false);
  });

  it("offers no assignments when the grown-up manages no kids", () => {
    expect(
      dailyParentAssignments([], emptyParentPointsAccount(), "2026-11-04"),
    ).toEqual([]);
  });
});

describe("parent points store", () => {
  it("round-trips through localStorage", () => {
    const awarded = awardParentPoints(emptyParentPointsAccount(), {
      action: "review-math",
      kidUserId: AVYAN.kidUserId,
      label: "Review Avyan's Grade 4 Math skills",
      now: DAY_ONE,
    });
    saveParentPointsStore(
      withParentPointsAccount(emptyParentPointsStore(), "adult-one", awarded.account),
    );
    const loaded = loadParentPointsStore();
    const account = parentPointsAccountFor(loaded, "adult-one");
    expect(account.totals.math).toBe(5);
    expect(account.recent[0].label).toBe(
      "Review Avyan's Grade 4 Math skills",
    );
  });

  it("keeps two grown-ups on the same device fully separate", () => {
    let store = emptyParentPointsStore();
    const one = awardParentPoints(parentPointsAccountFor(store, "adult-one"), {
      action: "review-english",
      kidUserId: AVYAN.kidUserId,
      label: "Review",
      now: DAY_ONE,
    });
    store = withParentPointsAccount(store, "adult-one", one.account);
    const two = awardParentPoints(parentPointsAccountFor(store, "adult-two"), {
      action: "check-tasks",
      kidUserId: ZARA.kidUserId,
      label: "Check tasks",
      now: DAY_ONE,
    });
    store = withParentPointsAccount(store, "adult-two", two.account);
    saveParentPointsStore(store);

    const loaded = loadParentPointsStore();
    expect(parentPointsAccountFor(loaded, "adult-one").totals).toEqual({
      english: 5,
      math: 0,
      general: 0,
    });
    expect(parentPointsAccountFor(loaded, "adult-two").totals).toEqual({
      english: 0,
      math: 0,
      general: 5,
    });
    expect(parentPointsAccountFor(loaded, "adult-three").totals).toEqual({
      english: 0,
      math: 0,
      general: 0,
    });
  });

  it("drops malformed stored data instead of throwing or leaking it in", () => {
    localStorage.setItem(PARENT_POINTS_STORAGE_KEY, "{not json");
    expect(loadParentPointsStore()).toEqual({ accounts: {} });
    localStorage.setItem(
      PARENT_POINTS_STORAGE_KEY,
      JSON.stringify({
        accounts: {
          "adult-one": {
            totals: { english: -4, math: "lots", general: 7 },
            awards: [
              { action: "review-english", kidUserId: "kid-avyan", date: "2026-11-04" },
              { action: "hack-the-planet", kidUserId: "kid-avyan", date: "2026-11-04" },
              { action: "check-in", kidUserId: "kid-avyan", date: "not-a-date" },
            ],
            recent: [
              {
                action: "review-english",
                kidUserId: "kid-avyan",
                date: "2026-11-04",
                label: "Review Avyan's Grade 4 English skills",
                skill: "math",
                points: 999,
                at: "2026-11-04T14:00:00.000Z",
              },
            ],
          },
        },
      }),
    );
    const account = parentPointsAccountFor(loadParentPointsStore(), "adult-one");
    expect(account.totals).toEqual({ english: 0, math: 0, general: 7 });
    expect(account.awards).toEqual([
      { action: "review-english", kidUserId: "kid-avyan", date: "2026-11-04" },
    ]);
    // Skill/points that disagree with the config are not trusted.
    expect(account.recent).toEqual([]);
  });

  it("uses the local calendar day for the daily reset", () => {
    expect(localDateString(new Date("2026-01-05T23:59:00"))).toBe("2026-01-05");
    expect(localDateString(new Date("2026-12-25T00:01:00"))).toBe("2026-12-25");
  });
});
