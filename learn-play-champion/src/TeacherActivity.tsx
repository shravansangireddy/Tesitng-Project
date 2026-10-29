import { useState } from "react";
import type { TeacherPayload } from "./teacher-content";
import { gradeLabels } from "./content-schema";

export default function TeacherActivity({ content }: { content: TeacherPayload }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  return <article className="teacher-activity">
    <span className="eyebrow">{gradeLabels[content.grade]} · {content.subject === "english" ? "English" : "Math"} · {content.kind === "passage" ? "Reading passage" : "Practice quiz"}</span>
    <h2>{content.title}</h2>
    {content.passage && <p className="teacher-passage">{content.passage}</p>}
    {content.questions.map((q, index) => <section key={index} className="teacher-question" aria-label={`Question ${index + 1}`}>
      <h3>{index + 1}. {q.prompt}</h3>
      <div className="teacher-answer-choices">{q.choices.map((choice, option) =>
        <button type="button" key={option} className="button secondary" aria-pressed={answers[index] === option}
          onClick={() => setAnswers(current => ({ ...current, [index]: option }))}>{choice}</button>)}</div>
      {answers[index] !== undefined && <p role="status">
        {answers[index] === q.answer ? "You found it! " : "Let's think again. "}
        {q.explanation} {answers[index] !== q.answer && "You can try another answer."}
      </p>}
    </section>)}
    {!!content.questions.length && <button type="button" className="text-button" onClick={() => setAnswers({})}>Try these questions again</button>}
  </article>;
}
