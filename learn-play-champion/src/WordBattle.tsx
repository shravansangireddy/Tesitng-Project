import { useEffect, useRef, useState } from "react";
import "./word-battle.css";
import {
  answerMatches,
  type WordBattleOutcome,
  type WordBattleProgress,
} from "./game";
import { makeRound } from "./questions";
import type { Question } from "./content";
import { gradeLabels, type GradeId } from "./content-schema";
import {
  applyAnswer,
  isMastered,
  keyWordFor,
  masteredWords,
  monsterById,
  monsters,
  pickMonster,
  startBattle,
  type BattleActivity,
  type BattleState,
  type Monster,
} from "./word-battle";

const activityCopy: Record<BattleActivity, { title: string; blurb: string }> = {
  vocabulary: {
    title: "Meaning Match words",
    blurb: "Answer meaning questions to power your attacks.",
  },
  spelling: {
    title: "Spelling Spark words",
    blurb: "Type each word you hear in your head to strike.",
  },
};

function HpBar({ label, hp, max, kind }: {
  label: string; hp: number; max: number; kind: "player" | "monster";
}) {
  return (
    <div className="wb-hp">
      <span className="wb-hp-label">{label}: {hp} / {max}</span>
      <div
        className={`wb-hp-track ${kind}`}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={hp}
      >
        <div className="wb-hp-fill" style={{ width: `${Math.round((hp / max) * 100)}%` }} />
      </div>
    </div>
  );
}

interface ActiveBattle {
  monster: Monster;
  activity: BattleActivity;
  questions: Question[];
  state: BattleState;
  masteryAtStart: Record<string, number>;
  ownedAtStart: boolean;
  words: { word: string; correct: boolean }[];
}

export default function WordBattle({ grade, state, onBattleEnd, onBack }: {
  grade: GradeId;
  state: WordBattleProgress | undefined;
  onBattleEnd: (outcome: WordBattleOutcome) => void;
  onBack: () => void;
}) {
  const collection = state?.collection ?? [];
  const mastery = state?.wordMastery ?? {};
  const [monster, setMonster] = useState<Monster>(() => pickMonster(collection));
  const [battle, setBattle] = useState<ActiveBattle | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [typed, setTyped] = useState("");
  const [lastHit, setLastHit] = useState<"player" | "monster" | null>(null);
  const [masteredHit, setMasteredHit] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const reported = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);

  const mastered = masteredWords(mastery);
  // While feedback is showing, state.answered already counts the question
  // just answered, so step back one to keep showing that question.
  const questionIndex = battle
    ? picked !== null
      ? battle.state.answered - 1
      : battle.state.answered
    : -1;
  const question =
    battle && questionIndex >= 0 && questionIndex < battle.questions.length
      ? battle.questions[questionIndex]
      : undefined;

  useEffect(() => {
    if (!battle || battle.state.status === "fighting" || reported.current) return;
    reported.current = true;
    onBattleEnd({
      monsterId: battle.monster.id,
      won: battle.state.status === "won",
      correct: battle.state.correct,
      words: battle.words,
    });
  }, [battle, onBattleEnd]);

  const begin = (activity: BattleActivity) => {
    reported.current = false;
    setBattle({
      monster,
      activity,
      questions: makeRound(activity, Math.random, grade),
      state: startBattle(monster, grade),
      masteryAtStart: mastery,
      ownedAtStart: collection.includes(monster.id),
      words: [],
    });
    setPicked(null);
    setTyped("");
    setLastHit(null);
    setMasteredHit(false);
    setShowHint(false);
  };
  const answer = (value: string) => {
    if (!battle || battle.state.status !== "fighting" || picked !== null) return;
    const current = battle.questions[battle.state.answered];
    if (!current || !value.trim()) return;
    const correct = current.options
      ? value === current.answer
      : answerMatches(value, current.answer);
    const outcome = applyAnswer(battle.state, current, battle.activity, correct, battle.masteryAtStart);
    const word = keyWordFor(current, battle.activity);
    setBattle({
      ...battle,
      state: outcome.state,
      words: word ? [...battle.words, { word, correct }] : battle.words,
    });
    setPicked(value);
    setLastCorrect(correct);
    setLastHit(correct ? "monster" : "player");
    setMasteredHit(outcome.masteredHit);
  };
  const next = () => {
    if (!battle) return;
    if (battle.state.status !== "fighting") {
      setBattle(null);
      setMonster(pickMonster(collection));
    }
    setPicked(null);
    setTyped("");
    setLastHit(null);
    setMasteredHit(false);
    setShowHint(false);
  };

  return (
    <section className="word-battle" aria-label="Word Battle">
      <button className="text-button back" onClick={onBack}>Back to adventures</button>
      <div className="page-heading">
        <div>
          <span className="eyebrow">WORD BATTLE · {gradeLabels[grade].toUpperCase()}</span>
          <h1 ref={heading} tabIndex={-1}>Battle with your words.</h1>
          <p>Answer word questions to battle friendly monsters. Win, and the monster joins your collection.
            Words you have answered right three times become <strong>mastered</strong> and hit harder.</p>
        </div>
      </div>

      {!battle && (
        <>
          <div className="panel wb-choose">
            <div className={`wb-monster-card ${lastHit === "monster" ? "wb-shake" : ""}`}>
              <span className="wb-monster-emoji" aria-hidden="true">{monster.emoji}</span>
              <h2>{monster.name}</h2>
              <p className="wb-element">{monster.element} monster</p>
              <p>{monster.blurb}</p>
              {collection.includes(monster.id)
                ? <p className="wb-owned">Already in your collection — battle again for practice!</p>
                : <p className="wb-owned">Not collected yet. Win to capture {monster.name}!</p>}
            </div>
            <div className="wb-pick">
              <h2>Choose your words</h2>
              {(Object.keys(activityCopy) as BattleActivity[]).map((activity) => (
                <button key={activity} className="button primary wb-start" onClick={() => begin(activity)}>
                  Battle with {activityCopy[activity].title}
                </button>
              ))}
              <p>Five questions per battle. Your champion has 40 hearts.
                A new monster appears after each battle.</p>
              <button className="text-button" onClick={() => setMonster(pickMonster(collection))}>
                Meet a different monster
              </button>
            </div>
          </div>
          <div className="panel wb-shelf" aria-label="Your monster collection">
            <h2>Your collection: {collection.length} / {monsters.length} monsters</h2>
            {collection.length ? (
              <ul className="wb-shelf-grid">
                {collection.map((id) => {
                  const entry = monsterById(id);
                  return (
                    <li key={id} className="wb-shelf-item">
                      <span aria-hidden="true">{entry.emoji}</span>
                      <strong>{entry.name}</strong>
                      <small>{entry.element}</small>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No monsters yet — win your first battle to start the collection.</p>
            )}
            <p className="wb-mastery-count">
              ⭐ Mastered words: {mastered.length}
              {mastered.length ? ` (${mastered.slice(0, 8).join(", ")}${mastered.length > 8 ? "…" : ""})` : ""}
            </p>
          </div>
        </>
      )}

      {battle && question && (
        <div className="panel wb-arena">
          <div className="wb-cards">
            <div className={`wb-fighter ${lastHit === "monster" ? "wb-shake" : ""}`}>
              <span className="wb-monster-emoji" aria-hidden="true">{battle.monster.emoji}</span>
              <strong>{battle.monster.name}</strong>
              <HpBar label={`${battle.monster.name} hearts`} hp={battle.state.monsterHp} max={battle.state.monsterMaxHp} kind="monster" />
            </div>
            <span className="wb-versus" aria-hidden="true">VS</span>
            <div className={`wb-fighter ${lastHit === "player" ? "wb-shake" : ""}`}>
              <span className="wb-monster-emoji" aria-hidden="true">🦸</span>
              <strong>Your champion</strong>
              <HpBar label="Your hearts" hp={battle.state.playerHp} max={battle.state.playerMaxHp} kind="player" />
            </div>
          </div>
          <p className="wb-round-label">
            Question {picked !== null ? battle.state.answered : battle.state.answered + 1} of {battle.questions.length}
            {" "}· {activityCopy[battle.activity].title}
          </p>
          <h2 className="wb-prompt">{question.prompt}</h2>
          {question.options ? (
            <div className="answer-grid">
              {question.options.map((option, i) => (
                <button
                  key={option}
                  data-answer={option}
                  disabled={picked !== null}
                  className={`answer-option ${picked !== null && picked === option ? (option === question.answer ? "right-answer" : "wrong-answer") : ""} ${picked !== null && option === question.answer ? "right-answer" : ""}`}
                  onClick={() => answer(option)}
                >
                  <span className="option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="option-copy">{option}</span>
                </button>
              ))}
            </div>
          ) : (
            <form
              className="spelling-form"
              onSubmit={(event) => { event.preventDefault(); answer(typed); }}
            >
              <label htmlFor="wb-spelling-answer">Your spelling</label>
              <input
                id="wb-spelling-answer"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                disabled={picked !== null}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                maxLength={40}
                placeholder="Type your word here…"
              />
              {picked === null && <button className="button primary" type="submit">Attack!</button>}
            </form>
          )}
          {picked === null && (
            <button className="text-button" onClick={() => setShowHint(!showHint)} aria-expanded={showHint}>
              {showHint ? "Hide hint" : "A little hint, please"}
            </button>
          )}
          {showHint && picked === null && <p className="hint">{question.hint}</p>}
          {picked !== null && (
            <div className="wb-feedback" role="status">
              <p>
                {lastCorrect
                  ? masteredHit
                    ? `⚡ Mastered word power! You hit ${battle.monster.name} extra hard.`
                    : `💥 Great hit! ${battle.monster.name} felt that one.`
                  : `Oof! ${battle.monster.name} bounced back and bonked your champion.`}
              </p>
              <p>{question.explanation}</p>
              {battle.state.status === "won" && (
                <p className="wb-result">🎉 You won! {battle.ownedAtStart
                  ? `${battle.monster.name} is already on your shelf, and proud of you.`
                  : `${battle.monster.name} joins your collection.`}
                  {" "}You earned {battle.state.correct * 10} points.</p>
              )}
              {battle.state.status === "fainted" && (
                <p className="wb-result">💤 Your champion is tuckered out. Rest up and try again — no points lost.</p>
              )}
              {battle.state.status === "escaped" && (
                <p className="wb-result">💨 {battle.monster.name} slipped away this time. So close — try again!</p>
              )}
              <button className="button primary" onClick={next}>
                {battle.state.status === "fighting" ? "Keep battling" : "See your collection"}
              </button>
            </div>
          )}
          <p className="wb-note">Word Battle practice is separate from daily missions.
            Wins earn +10 points per correct answer, just like a regular adventure.</p>
        </div>
      )}
    </section>
  );
}
