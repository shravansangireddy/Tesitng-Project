import { useEffect, useRef, useState } from "react";
import { gradeLabels, type GradeId, type LessonId } from "./content-schema";
import { answerMatches, type ActivityId, type Progress } from "./game";
import { makePathCheck, pathRecommendations } from "./learning-path";
import LearningChart from "./LearningChart";
import QuestionShape from "./QuestionShape";
import "./learning-path.css";

export default function LearningPath({ grade, progress, onComplete, onPractice, onDirty }: {
  grade: GradeId; progress: Progress;
  onComplete: (answers: { id: LessonId; correct: boolean }[]) => void;
  onPractice: (id: ActivityId) => void; onDirty: (dirty: boolean) => void;
}) {
  const [check, setCheck] = useState<ReturnType<typeof makePathCheck> | null>(null);
  const [answers, setAnswers] = useState<{ id: LessonId; correct: boolean }[]>([]);
  const [value, setValue] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [saved, setSaved] = useState(false);
  const questionHeading = useRef<HTMLHeadingElement>(null);
  const dirtyCallback = useRef(onDirty); dirtyCallback.current = onDirty;
  useEffect(() => {
    dirtyCallback.current(!!check);
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    if (check) window.addEventListener("beforeunload", warn);
    return () => { dirtyCallback.current(false); window.removeEventListener("beforeunload", warn); };
  }, [check]);
  useEffect(() => { questionHeading.current?.focus(); }, [check, answers.length, saved]);
  const current = check?.[answers.length];
  function answer(input: string) {
    if (!current || correct !== null || !input.trim()) return;
    setValue(input);
    setCorrect(current.question.options ? input === current.question.answer : answerMatches(input, current.question.answer));
  }
  const recommendations = pathRecommendations(progress, grade);
  const checked = Object.values(progress.pathChecks?.[grade]?.results ?? {});
  return <section className="learning-path panel" aria-label="My learning path">
    <h2>My learning path · {gradeLabels[grade]}</h2>
    <p>A little check can help you choose what to try next. No timer, points, prizes, or grade changes.
      Grown-ups can read the words and help you use the controls. Change your level on the dashboard.</p>
    <p>This is a practice snapshot, not a validated diagnostic, placement decision, or mastery assessment.
      It samples eight skills using existing practice questions. Recommendations are simple rules, not an AI tutor.</p>
    {current ? <section aria-label="Practice check question">
      <p>Question {answers.length + 1} of {check!.length} · {current.title}</p>
      <h3 ref={questionHeading} tabIndex={-1}>{current.question.prompt}</h3>
      {current.question.passage && <p className="path-passage">{current.question.passage}</p>}
      {current.question.chart && <LearningChart chart={current.question.chart} />}
      {current.question.shape && <QuestionShape shape={current.question.shape} />}
      {current.question.options ? <div className="path-choices">{current.question.options.map(option =>
        <button type="button" className="button secondary" disabled={correct !== null} key={option}
          aria-pressed={value === option} onClick={() => answer(option)}>{option}</button>)}</div> :
        <form onSubmit={event => { event.preventDefault(); answer(value); }}>
          <label>Your answer<input autoComplete="off" maxLength={200} disabled={correct !== null}
            value={value} onChange={event => setValue(event.target.value)} /></label>
          <button className="button primary" disabled={correct !== null || !value.trim()}>Check answer</button>
        </form>}
      {correct !== null && <div role="status">
        <p>{correct ? "You found it!" : "This is something we can practice together."} {current.question.explanation}</p>
        <button className="button primary" onClick={() => {
          const next = [...answers, { id: current.id, correct }];
          if (next.length === check!.length) {
            onComplete(next); setCheck(null); setSaved(true);
          } else setAnswers(next);
          setValue(""); setCorrect(null);
        }}>{answers.length === check!.length - 1 ? "Finish practice check" : "Next question"}</button>
      </div>}
      <button className="button secondary" onClick={() => {
        if (window.confirm("Stop this check? Unfinished answers will not be saved.")) {
          setCheck(null); setAnswers([]); setValue(""); setCorrect(null);
        }
      }}>Stop practice check</button>
    </section> : <>
      {saved && <h3 role="status" ref={questionHeading} tabIndex={-1}>Check complete! Your next-step suggestions are ready.</h3>}
      <button className="button primary" onClick={() => {
        setCheck(makePathCheck(grade, progress.pathChecks?.[grade]?.rounds ?? 0));
        setAnswers([]); setValue(""); setCorrect(null); setSaved(false);
      }}>{checked.length ? "Take another eight-question check" : "Start eight-question practice check"}</button>
      <h3>Suggested next steps</h3>
      <p>Start with any of the first three suggestions, or choose another skill below.
        A missed check question comes first, then unexplored skills, then practice and review.</p>
      <ol className="path-suggestions">{recommendations.slice(0, 3).map(item =>
        <li key={item.id}><strong>{item.title}</strong><p>{item.reason}</p>
          <button className="button primary" onClick={() => onPractice(item.id)}>Practice {item.title}</button></li>)}</ol>
      <details>
        <summary>For learners &amp; grown-ups: all {recommendations.length} skills and progress</summary>
        <p>{checked.length} skills sampled · {checked.filter(result => result.correct).length} latest sampled answers correct.
          Dates show each skill's last check, which may be from different sessions. Best adventure rounds can hide later mistakes.
          Repeated questions and adult help affect these results; use them for conversation, not grading.</p>
        <ul className="path-skills">{recommendations.map(item => <li key={item.id}>
          <strong>{item.title}</strong><p>{item.skill}</p><p>{item.reason}</p>
          <p>Last check: {item.check ? `${item.check.correct ? "correct" : "try together"} (${item.check.date})` : "not sampled"}.
            {" "}Best adventure: {item.best === undefined ? "not played" : `${item.best}/5`}.</p>
          <button className="button secondary" onClick={() => onPractice(item.id)}>Practice {item.title}</button>
        </li>)}</ul>
      </details>
      <p>Completed checks save only per-skill results and dates, not typed answers. They follow your existing
        device/account save, export, and erasure controls. Unfinished checks are not saved.
        The small question bank rotates and eventually repeats; there is no automatic difficulty adjustment.</p>
    </>}
  </section>;
}
