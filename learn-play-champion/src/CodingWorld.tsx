import { useEffect, useRef, useState } from "react";
import "./coding.css";
import {
  blockCount, blockLabels, codingGrades, codingPuzzles, runProgram, startingRobot,
  type Block, type BlockKind, type CodingGrade, type Execution, type Program,
} from "./coding";

function BlockEditor({ label, blocks, onChange, allowed, depth = 0, helper = false }: {
  label: string; blocks: Block[]; onChange: (blocks: Block[]) => void;
  allowed: BlockKind[]; depth?: number; helper?: boolean;
}) {
  const [selected, setSelected] = useState<BlockKind>("move");
  const choices = allowed.filter((kind) =>
    (!helper || kind !== "call") && (depth < 3 || (kind !== "repeat" && kind !== "if")));
  const update = (index: number, block: Block) => onChange(blocks.map((item, i) => i === index ? block : item));
  const add = () => {
    const block: Block = selected === "repeat" ? { kind: "repeat", times: 2, body: [] }
      : selected === "if" ? { kind: "if", yes: [], no: [] } : { kind: selected };
    onChange([...blocks, block]);
  };
  return <fieldset className="code-group">
    <legend>{label}</legend>
    {!blocks.length && <p className="code-empty">No instructions yet. Choose a block, then add it.</p>}
    <ol className="code-blocks">
      {blocks.map((block, index) => <li key={index} className={`code-block code-${block.kind}`}>
        <div className="code-block-top">
          <strong>{index + 1}. {blockLabels[block.kind]}</strong>
          <div className="code-tools">
            <button type="button" disabled={index === 0} aria-label={`Move instruction ${index + 1} up in ${label}`}
              onClick={() => {
                const next = [...blocks];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }}>Up</button>
            <button type="button" aria-label={`Remove instruction ${index + 1} from ${label}`}
              onClick={() => onChange(blocks.filter((_, i) => i !== index))}>Remove</button>
          </div>
        </div>
        {block.kind === "repeat" && <>
          <label className="code-times">Times <select aria-label={`Repeat count for instruction ${index + 1} in ${label}`}
            value={block.times} onChange={(event) => update(index, { ...block, times: Number(event.target.value) })}>
            {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}
          </select></label>
          <BlockEditor label={`${label} / repeat ${index + 1}`} blocks={block.body} allowed={allowed}
            depth={depth + 1} helper={helper} onChange={(body) => update(index, { ...block, body })} />
        </>}
        {block.kind === "if" && <>
          <BlockEditor label={`${label} / Then ${index + 1}`} blocks={block.yes} allowed={allowed}
            depth={depth + 1} helper={helper} onChange={(yes) => update(index, { ...block, yes })} />
          <BlockEditor label={`${label} / Else ${index + 1} (optional)`} blocks={block.no} allowed={allowed}
            depth={depth + 1} helper={helper} onChange={(no) => update(index, { ...block, no })} />
        </>}
      </li>)}
    </ol>
    <div className="code-add">
      <label>Block for {label}
        <select value={selected} onChange={(event) => {
          const value = choices.find((kind) => kind === event.target.value);
          if (value) setSelected(value);
        }}>
          {choices.map((kind) => <option key={kind} value={kind}>{blockLabels[kind]}</option>)}
        </select>
      </label>
      <button type="button" className="button secondary" disabled={blocks.length >= 20} onClick={add}>Add block</button>
    </div>
  </fieldset>;
}

export default function CodingWorld({ initialGrade, completed, onComplete, onBack, onDirty }: {
  initialGrade: CodingGrade; completed: string[]; onComplete: (id: string) => void;
  onBack: () => void; onDirty: (dirty: boolean) => void;
}) {
  const [grade, setGrade] = useState(initialGrade);
  const [index, setIndex] = useState(0);
  const puzzle = codingPuzzles.filter((item) => item.grade === grade)[index];
  const [program, setProgram] = useState<Program>(puzzle.starter ?? { main: [], helper: [] });
  const [execution, setExecution] = useState<Execution | null>(null);
  const [step, setStep] = useState(0);
  const [hint, setHint] = useState(false);
  const [firstSolve, setFirstSolve] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const output = useRef<HTMLParagraphElement>(null);
  useEffect(() => { heading.current?.focus(); }, [puzzle.id]);
  useEffect(() => { if (execution) output.current?.focus(); }, [execution]);
  const dirty = program.main.length > 0 || program.helper.length > 0;
  useEffect(() => { onDirty(dirty); return () => onDirty(false); }, [dirty, onDirty]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const changePuzzle = (nextGrade: CodingGrade, nextIndex: number) => {
    if ((program.main.length || program.helper.length) && !window.confirm("Change coding puzzles? Your unsaved block plan will be cleared. Solved puzzles stay saved.")) return;
    const next = codingPuzzles.filter((item) => item.grade === nextGrade)[nextIndex];
    setGrade(nextGrade); setIndex(nextIndex);
    setProgram(next.starter ?? { main: [], helper: [] });
    setExecution(null); setStep(0); setHint(false);
  };
  const edit = (next: Program) => { setProgram(next); setExecution(null); setStep(0); };
  const run = () => {
    const result = runProgram(puzzle, program);
    setExecution(result);
    setFirstSolve(result.success && !completed.includes(puzzle.id));
    setStep(result.trace.length - 1);
    if (result.success) onComplete(puzzle.id);
  };
  const robot = execution?.trace[step] ?? startingRobot(puzzle);
  const directions = ["up", "right", "down", "left"];
  return <section className="coding-world" aria-label="Coding playground">
    <button className="text-button back" onClick={onBack}>Back to adventures</button>
    <div className="page-heading">
      <div><span className="eyebrow">CODING COVE · GRADES 3–5</span>
        <h1 ref={heading} tabIndex={-1}>Little commands. Big ideas.</h1>
        <p>Help the delivery robot reach G. Plan, run, observe, and debug. No typing code or downloads needed.</p>
      </div>
    </div>
    <div className="panel coding-selector">
      <label>Choose coding grade <select value={grade} onChange={(event) => {
        const next = codingGrades.find((g) => g === event.target.value);
        if (next) changePuzzle(next, 0);
      }}>{codingGrades.map((g) => <option value={g} key={g}>Grade {g}</option>)}</select></label>
      <p>Start anywhere. Each grade moves from basics to more challenging combinations.
        {" "}{completed.filter((id) => id.startsWith(`${grade}-`)).length}/6 puzzles solved for Grade {grade}.
        {" "}Earn +10 points the first time you solve each puzzle. Replays are always free.</p>
      <nav className="coding-lessons" aria-label="Coding lessons">
        {codingPuzzles.filter((p) => p.grade === grade).map((p, i) =>
          <button key={p.id} aria-current={index === i ? "step" : undefined}
            onClick={() => { if (index !== i) changePuzzle(grade, i); }}>
            {i + 1}. {p.concept} {completed.includes(p.id) ? "(solved)" : ""}
          </button>)}
      </nav>
    </div>
    <div className="panel coding-lesson">
      <span className="eyebrow">GRADE {grade} · PUZZLE {index + 1} OF 6</span>
      <h2>{puzzle.title}</h2><p>{puzzle.learn}</p><p><strong>Your mission:</strong> {puzzle.task}</p>
      {puzzle.required.length > 0 && <p>Practice blocks: {puzzle.required.map((k) => blockLabels[k]).join(", ")}.</p>}
      <button className="text-button" onClick={() => setHint(!hint)} aria-expanded={hint}>{hint ? "Hide hint" : "A little hint, please"}</button>
      {hint && <p className="hint">{puzzle.hint}</p>}
    </div>
    <div className="coding-layout">
      <div className="panel coding-stage">
        <h2>Delivery map</h2>
        <p>Paths are pale. Walls are striped. G is the goal. The arrow shows the robot's direction.</p>
        <div className="coding-board" role="img"
          aria-label={`Delivery map. Robot at row ${robot.y + 1}, column ${robot.x + 1}, facing ${directions[robot.direction]}.`}
          style={{ gridTemplateColumns: `repeat(${puzzle.board[0].length}, minmax(0, 1fr))` }}>
          {puzzle.board.flatMap((row, y) => [...row].map((cell, x) =>
            <div key={`${x}-${y}`} className={`coding-cell ${cell === "#" ? "wall" : ""} ${cell === "G" ? "goal" : ""}`} aria-hidden="true">
              {robot.x === x && robot.y === y ? <strong className="coding-robot">{"↑→↓←"[robot.direction]}</strong> : cell === "#" ? "#" : cell === "G" ? "G" : "·"}
            </div>))}
        </div>
        <details><summary>Read the map as a table</summary>
          <div className="coding-table"><table><caption>Original map. Robot starts facing right. Row and column numbers begin at 1.</caption>
            <thead><tr><th>Row</th>{[...puzzle.board[0]].map((_, x) => <th key={x}>Col {x + 1}</th>)}</tr></thead>
            <tbody>{puzzle.board.map((row, y) => <tr key={y}><th>{y + 1}</th>{[...row].map((cell, x) =>
              <td key={x}>{cell === "#" ? "Wall" : cell === "G" ? "Goal" : "^>v<".includes(cell) ? "Start" : "Path"}</td>)}</tr>)}</tbody>
          </table></div>
        </details>
        <div className="code-actions">
          <button className="button primary" onClick={run}>Run my program</button>
          <button className="button secondary" onClick={() => { setExecution(null); setStep(0); }}>Reset robot</button>
        </div>
        <p role="status" tabIndex={-1} ref={output} className={`coding-result ${execution?.success ? "success" : ""}`}>
          {execution ? execution.message : "Ready to experiment. A run always starts at the original position."}
          {execution?.success && (firstSolve ? " First solve: +10 points!" : " Already solved: replay practice earns no extra points.")}
        </p>
        {execution && <div className="coding-trace">
          <h3>Execution trace</h3>
          <p>Each step shows one instruction, including entering loops, making decisions, and calling Helper.</p>
          <div className="code-actions">
            <button className="button secondary" onClick={() => setStep(0)} disabled={step === 0}>Rewind</button>
            <button className="button secondary" onClick={() => setStep(step - 1)} disabled={step === 0}>Previous step</button>
            <button className="button secondary" onClick={() => setStep(step + 1)} disabled={step === execution.trace.length - 1}>Next step</button>
          </div>
          <p aria-live="polite">Step {step}/{execution.trace.length - 1}: {execution.trace[step].message}
            {" "}Row {robot.y + 1}, column {robot.x + 1}, facing {directions[robot.direction]}.</p>
        </div>}
      </div>
      <div className="panel coding-editor">
        <h2>Your block plan</h2>
        <p>Add blocks in order. Use Up to reorder or Remove to debug.
          {" "}{blockCount(program.main) + blockCount(program.helper)} blocks used
          {puzzle.budget ? ` / mission limit ${puzzle.budget}` : " / maximum 40"}.
          {" "}A Repeat counts once, plus its inside blocks.</p>
        <BlockEditor key={`${puzzle.id}-main`} label="Main program" blocks={program.main}
          allowed={puzzle.allowed} onChange={(main) => edit({ ...program, main })} />
        {puzzle.allowed.includes("call") && <BlockEditor key={`${puzzle.id}-helper`} label="Helper function" blocks={program.helper}
          allowed={puzzle.allowed} helper onChange={(helper) => edit({ ...program, helper })} />}
        <button className="button primary" onClick={run}>Run this plan</button>
        <button className="text-button" onClick={() => {
          if (window.confirm("Clear your block plan? Your solved puzzle progress stays saved."))
            edit({ main: [], helper: [] });
        }}>Clear blocks</button>
      </div>
    </div>
    <p className="coding-note">This is an original, beginner-friendly block language, not JavaScript or a full computer science course.
      Advanced means combining these foundations, not professional programming. Programs cannot access the internet, files, or your account.
      Plans are temporary; only solved puzzle IDs and earned points are saved. Coding does not count as a five-question daily mission or spelling/Math mastery.</p>
  </section>;
}
