import { useEffect, useRef, useState } from "react";
import {
  aiLessons, initialExamples, predict, testCards, trainModel,
  type Color, type Example, type Feature, type Group, type Shape, type ShapeCard, type TinyModel,
} from "./ai-learning";
import type { CodingGrade } from "./coding";
import "./ai-learning.css";

function Card({ card }: { card: ShapeCard }) {
  return <span className="ai-shape-card">
    <span aria-hidden="true" className={`ai-shape ai-${card.shape} ai-${card.color}`} />
    {card.color} {card.shape}
  </span>;
}
function ModelLab() {
  const [examples, setExamples] = useState<Example[]>(() => initialExamples.map((e) => ({ ...e })));
  const [feature, setFeature] = useState<Feature>("color");
  const [model, setModel] = useState<TinyModel | null>(null);
  const [checks, setChecks] = useState(false);
  const [shape, setShape] = useState<Shape>("circle");
  const [color, setColor] = useState<Color>("red");
  const [label, setLabel] = useState<Group>("Sun");
  const [notice, setNotice] = useState("");
  const edit = (next: Example[]) => { setExamples(next); setModel(null); setChecks(false); setNotice("Examples changed. Train again to build a new model."); };
  const featureChange = (next: Feature) => { setFeature(next); setModel(null); setChecks(false); setNotice("Feature changed. Train again."); };
  return <section className="panel ai-lab" aria-label="Tiny model lab">
    <span className="eyebrow">TRY IT · NO REAL PHOTOS OR PERSONAL DATA</span>
    <h2>Teach a tiny shape model</h2>
    <p>Our pretend rule: circles belong to Sun group; squares and triangles belong to Moon group.
      The model does not know this rule. It learns counts from the labels you give it.</p>
    <p><strong>Examples → Train → Model → Prediction → Check.</strong> This simple counting classifier
      demonstrates one idea from machine learning. It is not a chatbot or a brain.</p>
    <h3>1. Choose teaching examples</h3>
    <ul className="ai-examples">{examples.map((example, i) => <li key={i}>
      <Card card={example} /><strong>{example.label} group</strong>
      <button className="button secondary" onClick={() => edit(examples.filter((_, n) => n !== i))}
        aria-label={`Remove example ${i + 1}: ${example.color} ${example.shape}, ${example.label}`}>Remove</button>
    </li>)}</ul>
    {!examples.length && <p>No teaching examples. Add some before training.</p>}
    <fieldset className="ai-example-builder"><legend>Add a pretend example (maximum 8)</legend>
      <label>Color<select value={color} onChange={(e) => setColor(e.target.value === "red" ? "red" : "blue")}>
        <option value="red">Red</option><option value="blue">Blue</option>
      </select></label>
      <label>Shape<select value={shape} onChange={(e) => {
        const next = ["circle", "square", "triangle"].find((s) => s === e.target.value);
        if (next === "circle" || next === "square" || next === "triangle") setShape(next);
      }}><option value="circle">Circle</option><option value="square">Square</option><option value="triangle">Triangle</option></select></label>
      <label>Teaching label<select value={label} onChange={(e) => setLabel(e.target.value === "Sun" ? "Sun" : "Moon")}>
        <option value="Sun">Sun group</option><option value="Moon">Moon group</option>
      </select></label>
      <button className="button secondary" disabled={examples.length >= 8}
        onClick={() => edit([...examples, { shape, color, label }])}>Add example</button>
    </fieldset>
    <p>You may try a wrong label or repeated example to see what changes. Repeating a card changes its count,
      not how many different kinds of examples the model has seen.</p>
    <h3>2. Train a model</h3>
    <div className="ai-actions">
      <label>Look only at<select value={feature} onChange={(e) => featureChange(e.target.value === "shape" ? "shape" : "color")}>
        <option value="color">Color</option><option value="shape">Shape</option>
      </select></label>
      <button className="button primary" disabled={!examples.length} onClick={() => {
        setModel(trainModel(examples, feature)); setChecks(false);
        setNotice(`Model trained on ${examples.length} examples using ${feature}. Read its learned counts below.`);
      }}>Train model</button>
      <button className="button secondary" onClick={() => {
        setExamples(initialExamples.map((e) => ({ ...e }))); setFeature("color");
        setModel(null); setChecks(false); setNotice("Lab reset to three starter examples.");
      }}>Reset lab</button>
    </div>
    <p role="status">{notice || "Choose a feature, then train. Nothing is sent to an AI service."}</p>
    {model && <>
      <h3>3. Inspect the model</h3>
      <div className="ai-table-wrap"><table className="ai-model-table"><caption>Learned counts using {model.feature}. Larger count wins. Ties and unseen features mean Not sure.</caption>
        <thead><tr><th>Feature</th><th>Sun examples</th><th>Moon examples</th></tr></thead>
        <tbody>{Object.entries(model.counts).map(([key, counts]) =>
          <tr key={key}><th>{key}</th><td>{counts.Sun}</td><td>{counts.Moon}</td></tr>)}</tbody>
      </table></div>
      <h3>4. Predict, then check</h3>
      <p>The check cards start outside the teaching set. If you add the same card to training,
        it is no longer a new-card test. Two cards are far too few to prove quality or fairness.</p>
      <button className="button primary" onClick={() => setChecks(true)}>Check two new cards</button>
      {checks && <div className="ai-checks" role="status">
        {testCards.map((card) => {
          const guess = predict(model, card);
          const seen = examples.some((e) => e.color === card.color && e.shape === card.shape);
          return <div key={`${card.color}-${card.shape}`} className="ai-check">
            <Card card={card} />
            <p><strong>Model prediction: {guess.label ? `${guess.label} group` : "Not sure"}.</strong> {guess.reason}</p>
            <p>Our pretend rule says: {card.expected} group.
              {" "}{guess.label === null ? "No guess: more useful examples may help."
                : guess.label === card.expected ? "This guess matches the rule." : "This guess is wrong. Check the feature and examples."}</p>
            {seen && <p><strong>Already in training:</strong> this card is no longer an independent test.</p>}
          </div>;
        })}
      </div>}
    </>}
    <p className="ai-note">All examples, models, and test results stay temporarily in this page.
      Only lesson completion and earned points are saved. No microphone, uploads, outside AI service, or personal examples are needed.</p>
  </section>;
}
export default function AIWorld({ initialGrade, completed, onComplete, onBack }: {
  initialGrade: CodingGrade; completed: string[]; onComplete: (id: string) => void; onBack: () => void;
}) {
  const [grade, setGrade] = useState<CodingGrade>(initialGrade);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const lesson = aiLessons[index];
  useEffect(() => { heading.current?.focus(); }, [index]);
  return <section className="ai-world" aria-label="AI discovery">
    <button className="text-button back" onClick={onBack}>Back to adventures</button>
    <div className="page-heading"><div><span className="eyebrow">AI DISCOVERY · GRADE 3 AND UP</span>
      <h1>Small clues. Smart questions.</h1>
      <p>What is AI? Artificial intelligence is a broad name for computer systems that do tasks such as finding patterns,
        making predictions, or creating text. Here we explore machine learning: using examples to build a model.
        AI is made by people, can make mistakes, and is not a person.</p>
    </div></div>
    <section className="panel ai-path">
      <label>Choose a discussion level<select value={grade} onChange={(e) => {
        if (e.target.value === "3" || e.target.value === "4" || e.target.value === "5") setGrade(e.target.value);
      }}><option value="3">Grade 3</option><option value="4">Grade 4</option><option value="5">Grade 5</option></select></label>
      <p>Six shared beginner lessons. The extra discussion prompt grows with your grade.
        {" "}{completed.length}/6 completed. +10 points once per lesson, not again for switching levels.</p>
      <nav className="ai-lessons" aria-label="AI lessons">{aiLessons.map((item, i) =>
        <button key={item.id} aria-current={index === i ? "step" : undefined} onClick={() => { setIndex(i); setAnswer(""); }}>
          {i + 1}. {item.word}{completed.includes(item.id) ? " (complete)" : ""}
        </button>)}</nav>
    </section>
    <article className="panel ai-lesson">
      <span className="eyebrow">LESSON {index + 1} OF 6</span>
      <h2 ref={heading} tabIndex={-1}>{lesson.title}</h2>
      <p className="ai-definition"><strong>{lesson.word}:</strong> {lesson.meaning}</p>
      <p>{lesson.story}</p>
      <h3>Try it together</h3><p>{lesson.tryIt}</p>
      <p><strong>Grade {grade} thinking stretch:</strong> {lesson.extend[Number(grade) - 3]}</p>
      <fieldset className="ai-question"><legend>{lesson.question}</legend>
        {lesson.options.map((option) => <button key={option} className={`button ${answer === option ? "primary" : "secondary"}`}
          aria-pressed={answer === option} onClick={() => {
            setAnswer(option);
            if (option === lesson.answer) onComplete(lesson.id);
          }}>{option}</button>)}
      </fieldset>
      {answer && <p role="status" className="ai-feedback">{answer === lesson.answer
        ? `You got it! ${lesson.explanation} Lesson complete.`
        : "Good thinking to try. Read the simple definition above, then choose again. A mistake does not take away points."}</p>}
      <div className="ai-actions">
        <button className="button secondary" disabled={index === 0} onClick={() => { setIndex(index - 1); setAnswer(""); }}>Previous lesson</button>
        <button className="button primary" disabled={index === aiLessons.length - 1} onClick={() => { setIndex(index + 1); setAnswer(""); }}>Next lesson</button>
      </div>
    </article>
    <ModelLab />
    <p className="ai-note">Original introductory AI literacy practice, not a full AI course or a claim of standards alignment.
      The shared shape lab is a transparent counting model, not a modern neural network. Keep exploring with a trusted adult.</p>
  </section>;
}
