import { describe, expect, it } from "vitest";
import {
  addProfile,
  completeWordBattle,
  initialProgress,
  parseProgress,
  type Progress,
} from "./game";
import type { Question } from "./content";
import {
  applyAnswer,
  counterDamage,
  isMastered,
  keyWordFor,
  masteredWords,
  monsterById,
  monsterIds,
  monsterMaxHp,
  monsters,
  pickMonster,
  startBattle,
  ATTACK_DAMAGE,
  MASTERED_BONUS,
  MASTERY_TARGET,
  PLAYER_HP,
} from "./word-battle";

const q = (prompt: string, answer: string, options?: string[]): Question => ({
  prompt,
  answer,
  options,
  hint: "hint",
  explanation: "explanation",
});
const vocabQ = q("What does unhappy mean?", "not happy", ["very happy", "not happy"]);
const spellingQ = q("Type the word: a vehicle on tracks.", "train");

describe("monster roster", () => {
  it("has 12 original monsters with unique ids and names", () => {
    expect(monsters).toHaveLength(12);
    expect(new Set(monsterIds).size).toBe(12);
    expect(new Set(monsters.map((m) => m.name)).size).toBe(12);
    for (const monster of monsters) {
      expect(monster.emoji.length).toBeGreaterThan(0);
      expect(monster.blurb.length).toBeGreaterThan(10);
      expect(monster.baseHp).toBeGreaterThanOrEqual(34);
      expect(monster.baseHp).toBeLessThanOrEqual(54);
    }
    expect(monsterById("sproutle").name).toBe("Sproutle");
    expect(() => monsterById("pikachu")).toThrow();
  });
  it("prefers uncollected monsters and still battles when the shelf is full", () => {
    expect(pickMonster([], () => 0).id).toBe(monsters[0].id);
    expect(pickMonster(monsterIds.slice(1), () => 0).id).toBe(monsters[0].id);
    expect(pickMonster(monsterIds, () => 0).id).toBe(monsters[0].id);
    expect(pickMonster([], () => 0.999).id).toBe(monsters[monsters.length - 1].id);
  });
});

describe("key words and mastery", () => {
  it("takes the spelling answer as the key word", () => {
    expect(keyWordFor(spellingQ, "spelling")).toBe("train");
    expect(keyWordFor(q("Copy the letter b.", "b"), "spelling")).toBe("b");
  });
  it("finds the studied word in vocabulary prompts", () => {
    expect(keyWordFor(vocabQ, "vocabulary")).toBe("unhappy");
    expect(keyWordFor(q("Which word means the same as quick?", "fast"), "vocabulary")).toBe("quick");
    expect(keyWordFor(q("Which word is closest to observe?", "watch carefully"), "vocabulary")).toBe("observe");
    expect(keyWordFor(q("In 'The fragile cup broke when it fell,' fragile means...", "easily broken"), "vocabulary")).toBe("fragile");
  });
  it("falls back to a single-word answer, else nothing", () => {
    expect(keyWordFor(q("Which animal says meow?", "cat", ["cat", "dog"]), "vocabulary")).toBe("cat");
    expect(keyWordFor(q("Pick the best ending.", "the end of the story"), "vocabulary")).toBeNull();
  });
  it("masters a word at three correct answers", () => {
    expect(MASTERY_TARGET).toBe(3);
    expect(isMastered({ train: 2 }, "train")).toBe(false);
    expect(isMastered({ train: 3 }, "train")).toBe(true);
    expect(masteredWords({ train: 3, bus: 1, cat: 5 })).toEqual(["train", "cat"]);
  });
});

describe("battle state machine", () => {
  it("scales monster hearts by grade and floors all hearts at zero", () => {
    const sproutle = monsterById("sproutle");
    expect(monsterMaxHp(sproutle, "prek")).toBeLessThan(monsterMaxHp(sproutle, "5"));
    const battle = startBattle(monsterById("drakefruit"), "5");
    expect(battle.playerHp).toBe(PLAYER_HP);
    let state = battle;
    let guard = 0;
    while (state.status === "fighting" && guard++ < 5) {
      const outcome = applyAnswer(state, spellingQ, "spelling", false, {});
      expect(outcome.state.playerHp).toBeGreaterThanOrEqual(0);
      state = outcome.state;
    }
    expect(state.playerHp).toBe(0);
    expect(state.status).toBe("fainted");
  });
  it("deals base damage for a correct answer and bonus damage for a mastered word", () => {
    const battle = startBattle(monsterById("sproutle"), "3");
    const plain = applyAnswer(battle, spellingQ, "spelling", true, {});
    expect(plain.damage).toBe(ATTACK_DAMAGE);
    expect(plain.masteredHit).toBe(false);
    expect(plain.state.monsterHp).toBe(battle.monsterHp - ATTACK_DAMAGE);
    const boosted = applyAnswer(battle, spellingQ, "spelling", true, { train: 3 });
    expect(boosted.masteredHit).toBe(true);
    expect(boosted.damage).toBe(ATTACK_DAMAGE + MASTERED_BONUS);
    // Mastery reached during this battle does not count until the next one.
    const almost = applyAnswer(battle, spellingQ, "spelling", true, { train: 2 });
    expect(almost.masteredHit).toBe(false);
  });
  it("counterattacks on a wrong answer and never damages on a correct one", () => {
    const battle = startBattle(monsterById("pebblepup"), "2");
    const wrong = applyAnswer(battle, vocabQ, "vocabulary", false, {});
    expect(wrong.counter).toBe(counterDamage("2"));
    expect(wrong.state.playerHp).toBe(PLAYER_HP - counterDamage("2"));
    expect(wrong.state.monsterHp).toBe(battle.monsterHp);
    const right = applyAnswer(battle, vocabQ, "vocabulary", true, {});
    expect(right.counter).toBe(0);
    expect(right.state.playerHp).toBe(PLAYER_HP);
  });
  it("is won exactly when monster hearts reach zero, even mid-round", () => {
    let state = startBattle(monsterById("sproutle"), "prek");
    let guard = 0;
    while (state.status === "fighting" && guard++ < 5) {
      state = applyAnswer(state, spellingQ, "spelling", true, {}).state;
    }
    expect(state.status).toBe("won");
    expect(state.monsterHp).toBe(0);
    expect(state.answered).toBeLessThanOrEqual(5);
    expect(() => applyAnswer(state, spellingQ, "spelling", true, {})).toThrow();
  });
  it("ends as escaped when five questions pass with both sides standing", () => {
    let state = startBattle(monsterById("drakefruit"), "prek");
    // Wrong, right, wrong, right, wrong: monster survives, player survives.
    for (const correct of [false, true, false, true, false]) {
      state = applyAnswer(state, spellingQ, "spelling", correct, {}).state;
    }
    expect(state.status).toBe("escaped");
    expect(state.monsterHp).toBeGreaterThan(0);
    expect(state.playerHp).toBeGreaterThan(0);
    expect(state.correct).toBe(2);
  });
});

describe("word battle progress", () => {
  const win = {
    monsterId: "sproutle",
    won: true,
    correct: 4,
    words: [
      { word: "train", correct: true },
      { word: "bus", correct: false },
      { word: "train", correct: true },
    ],
  };
  it("captures on a win, pays +10 per correct answer, and counts word practice", () => {
    const next = completeWordBattle(initialProgress, win);
    expect(next.points).toBe(40);
    expect(next.wordBattle?.collection).toEqual(["sproutle"]);
    expect(next.wordBattle?.wordMastery).toEqual({ train: 2 });
    expect(next.rounds).toBe(initialProgress.rounds);
    expect(next.answered).toBe(initialProgress.answered);
    const again = completeWordBattle(next, win);
    expect(again.wordBattle?.collection).toEqual(["sproutle"]);
    expect(again.wordBattle?.wordMastery.train).toBe(4);
    expect(isMastered(again.wordBattle!.wordMastery, "train")).toBe(true);
    expect(again.points).toBe(80);
  });
  it("captures nothing and pays nothing on a loss, but keeps word practice", () => {
    const next = completeWordBattle(initialProgress, { ...win, won: false });
    expect(next.points).toBe(0);
    expect(next.wordBattle?.collection).toEqual([]);
    expect(next.wordBattle?.wordMastery).toEqual({ train: 2 });
  });
  it("rejects unknown monsters", () => {
    expect(() => completeWordBattle(initialProgress, { ...win, monsterId: "missingno" })).toThrow();
  });
  it("round-trips through save and load, including inside profile states", () => {
    const played = completeWordBattle(initialProgress, win);
    expect(parseProgress(JSON.stringify(played))).toEqual(played);
    const withProfiles = addProfile(played, "kid-1", "Kid One", "2");
    const switched = parseProgress(JSON.stringify(withProfiles));
    expect(switched.wordBattle).toEqual(played.wordBattle);
  });
  it("parses old saves that predate Word Battle", () => {
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
    const legacy = { ...initialProgress, points: 50 };
    expect(parseProgress(JSON.stringify(legacy)).wordBattle).toBeUndefined();
  });
  it("falls back to defaults for junk word battle values", () => {
    const junkValues: unknown[] = [
      "nope",
      42,
      [],
      null,
      { collection: "sproutle", wordMastery: "train" },
    ];
    for (const wordBattle of junkValues) {
      const parsed = parseProgress(JSON.stringify({ ...initialProgress, wordBattle }));
      if (wordBattle === null || typeof wordBattle !== "object" || Array.isArray(wordBattle)) {
        expect(parsed.wordBattle).toBeUndefined();
      } else {
        expect(parsed.wordBattle).toEqual({ collection: [], wordMastery: {} });
      }
    }
    const mixed = parseProgress(JSON.stringify({
      ...initialProgress,
      wordBattle: {
        collection: ["sproutle", "sproutle", "pikachu", 7, "frostfox"],
        wordMastery: { train: 3, bus: -1, car: 1.5, boat: "2", "Bad Word": 2, ship: 4 },
      },
    }));
    expect(mixed.wordBattle).toEqual({
      collection: ["sproutle", "frostfox"],
      wordMastery: { train: 3, ship: 4 },
    });
    const reparsed: Progress = parseProgress(JSON.stringify(mixed));
    expect(reparsed).toEqual(mixed);
  });
});
