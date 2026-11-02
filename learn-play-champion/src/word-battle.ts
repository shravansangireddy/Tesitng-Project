import type { GradeId } from "./content-schema";
import type { Question } from "./content";
import type { ActivityId } from "./game";

// Word Battle is an original monster-battling game for Learn & Play Champion.
// Answering vocabulary or spelling questions powers attacks; words a child
// has mastered hit harder, and winning a battle captures the monster.

export type BattleActivity = Extract<ActivityId, "vocabulary" | "spelling">;
export const battleActivities: BattleActivity[] = ["vocabulary", "spelling"];

export interface Monster {
  id: string;
  name: string;
  emoji: string;
  element: string;
  blurb: string;
  baseHp: number;
}
export const monsters: Monster[] = [
  { id: "sproutle", name: "Sproutle", emoji: "🌱", element: "Leaf", blurb: "A tiny sprout turtle who naps in sunbeams.", baseHp: 34 },
  { id: "pebblepup", name: "Pebblepup", emoji: "🐶", element: "Stone", blurb: "A puppy built from smooth river pebbles.", baseHp: 36 },
  { id: "bubblefin", name: "Bubblefin", emoji: "🐠", element: "Bubble", blurb: "A fish whose bubbles pop with a giggle.", baseHp: 38 },
  { id: "nimblet", name: "Nimblet", emoji: "🐑", element: "Cloud", blurb: "A lamb so fluffy it floats a little when it hops.", baseHp: 39 },
  { id: "bramblehog", name: "Bramblehog", emoji: "🦔", element: "Thicket", blurb: "A hedgehog who carries berries in its brambles.", baseHp: 40 },
  { id: "frostfox", name: "Frostfox", emoji: "🦊", element: "Frost", blurb: "A fox whose tail tips sparkle with snowflakes.", baseHp: 42 },
  { id: "lunamoth", name: "Lunamoth", emoji: "🦋", element: "Moon", blurb: "A moth that follows moonbeams and dreams.", baseHp: 44 },
  { id: "cindercub", name: "Cindercub", emoji: "🦁", element: "Ember", blurb: "A lion cub with a warm, toasty mane.", baseHp: 46 },
  { id: "gemclaw", name: "Gemclaw", emoji: "🦀", element: "Gem", blurb: "A crab who polishes one very shiny claw.", baseHp: 47 },
  { id: "splashopus", name: "Splashopus", emoji: "🐙", element: "Splash", blurb: "An octopus who high-fives with all eight arms.", baseHp: 48 },
  { id: "thunderpanda", name: "Thunderpanda", emoji: "🐼", element: "Storm", blurb: "A panda whose happy tummy rumbles sound like thunder.", baseHp: 50 },
  { id: "drakefruit", name: "Drakefruit", emoji: "🐉", element: "Grove", blurb: "A gentle dragon who grows fruit along its back.", baseHp: 54 },
];
export const monsterIds: string[] = monsters.map((monster) => monster.id);
export function monsterById(id: string): Monster {
  const monster = monsters.find((entry) => entry.id === id);
  if (!monster) throw new Error(`Unknown Word Battle monster: ${id}`);
  return monster;
}

export const PLAYER_HP = 40;
export const ATTACK_DAMAGE = 12;
export const MASTERED_BONUS = 6;
export const MASTERY_TARGET = 3;
export const BATTLE_QUESTIONS = 5;

const monsterHpScale: Record<GradeId, number> = {
  prek: 0.6, k: 0.7, "1": 0.8, "2": 0.9, "3": 1, "4": 1.05, "5": 1.1,
};
const counterByGrade: Record<GradeId, number> = {
  prek: 8, k: 8, "1": 9, "2": 9, "3": 10, "4": 10, "5": 11,
};
export function monsterMaxHp(monster: Monster, grade: GradeId): number {
  return Math.max(10, Math.round(monster.baseHp * monsterHpScale[grade]));
}
export function counterDamage(grade: GradeId): number {
  return counterByGrade[grade];
}

// The word a question is teaching. Spelling questions teach their answer;
// vocabulary questions usually name the word in the prompt. Returns null when
// no single word can be identified, so nothing is tracked for that question.
const wordPattern = /^[a-z]+(?:['-][a-z]+)*$/;
function cleanWord(raw: string | undefined): string | null {
  if (!raw) return null;
  const word = raw.trim().toLowerCase().replace(/^["'“”]+|["'“”.,?]+$/g, "");
  return wordPattern.test(word) && word.length <= 24 ? word : null;
}
export function keyWordFor(question: Question, activity: BattleActivity): string | null {
  if (activity === "spelling") return cleanWord(question.answer);
  const prompt = question.prompt;
  const patterns = [
    /what does (?:the word )?["'“”]?([a-z][a-z'-]*)/i,
    /same as ["'“”]?([a-z][a-z'-]*)/i,
    /closest to ["'“”]?([a-z][a-z'-]*)/i,
    /["'“”]([a-z][a-z'-]*)["'“”]\s+means?\b/i,
    /\b([a-z][a-z'-]*)\s+means?\b/i,
  ];
  for (const pattern of patterns) {
    const word = cleanWord(prompt.match(pattern)?.[1]);
    if (word && word !== "word") return word;
  }
  return cleanWord(question.answer);
}
export function isMastered(mastery: Record<string, number>, word: string): boolean {
  return (mastery[word] ?? 0) >= MASTERY_TARGET;
}
export function masteredWords(mastery: Record<string, number>): string[] {
  return Object.keys(mastery).filter((word) => isMastered(mastery, word));
}

// Prefer a monster the player has not captured yet; once the shelf is full,
// any monster can be battled again for practice.
export function pickMonster(collection: string[], random: () => number = Math.random): Monster {
  const fresh = monsters.filter((monster) => !collection.includes(monster.id));
  const pool = fresh.length ? fresh : monsters;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export type BattleStatus = "fighting" | "won" | "fainted" | "escaped";
export interface BattleState {
  monsterId: string;
  grade: GradeId;
  monsterHp: number;
  monsterMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  answered: number;
  correct: number;
  status: BattleStatus;
}
export function startBattle(monster: Monster, grade: GradeId): BattleState {
  const max = monsterMaxHp(monster, grade);
  return {
    monsterId: monster.id,
    grade,
    monsterHp: max,
    monsterMaxHp: max,
    playerHp: PLAYER_HP,
    playerMaxHp: PLAYER_HP,
    answered: 0,
    correct: 0,
    status: "fighting",
  };
}
export interface AnswerOutcome {
  state: BattleState;
  damage: number;
  counter: number;
  masteredHit: boolean;
}
export function applyAnswer(
  state: BattleState,
  question: Question,
  activity: BattleActivity,
  correct: boolean,
  masteryAtStart: Record<string, number>,
): AnswerOutcome {
  if (state.status !== "fighting")
    throw new Error("This battle is already over.");
  const word = keyWordFor(question, activity);
  const masteredHit = correct && !!word && isMastered(masteryAtStart, word);
  const damage = correct ? ATTACK_DAMAGE + (masteredHit ? MASTERED_BONUS : 0) : 0;
  const counter = correct ? 0 : counterDamage(state.grade);
  const monsterHp = Math.max(0, state.monsterHp - damage);
  const playerHp = Math.max(0, state.playerHp - counter);
  const answered = state.answered + 1;
  const status: BattleStatus =
    monsterHp <= 0 ? "won"
      : playerHp <= 0 ? "fainted"
        : answered >= BATTLE_QUESTIONS ? "escaped"
          : "fighting";
  return {
    damage,
    counter,
    masteredHit,
    state: {
      ...state,
      monsterHp,
      playerHp,
      answered,
      correct: state.correct + (correct ? 1 : 0),
      status,
    },
  };
}
