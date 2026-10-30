import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeIds, gradeLabels } from "./content-schema";
import {
  blankContent, blankQuestion, getContentRole, loadStudio, parseTeacherPayload, reviewContent, saveContent,
  type ContentRole, type StudioContent, type TeacherPayload, type TeacherQuestion,
} from "./teacher-content";
import TeacherActivity from "./TeacherActivity";
import "./teacher-content.css";

export default function ContentStudio({ client, onDirty }: { client?: SupabaseClient | null; onDirty?: (dirty: boolean) => void }) {
  const [role, setRole] = useState<ContentRole | null>(null);
  const [rows, setRows] = useState<StudioContent[]>([]);
  const [ready, setReady] = useState(false), [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [status, setStatus] = useState("");
  const [draft, setDraft] = useState<TeacherPayload | null>(null);
  const [editing, setEditing] = useState<StudioContent | undefined>();
  const [dirty, setDirty] = useState(false), [preview, setPreview] = useState<TeacherPayload | null>(null);
  const [selected, setSelected] = useState<StudioContent | null>(null), [note, setNote] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const active = useRef(true), inFlight = useRef(false), editorHeading = useRef<HTMLHeadingElement>(null);
  const dirtyCallback = useRef(onDirty); dirtyCallback.current = onDirty;
  useEffect(() => { dirtyCallback.current?.(dirty); return () => { dirtyCallback.current?.(false); }; }, [dirty]);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => { if (draft) editorHeading.current?.focus(); }, [!!draft]);
  async function run(work: () => Promise<void>) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setStatus("");
    try { await work(); }
    catch (failure) { if (active.current) setError(failure instanceof Error ? failure.message : "Content request failed."); }
    finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  async function refresh(older = false) {
    if (!client) return;
    try {
      const access = await getContentRole(client);
      if (!active.current) return;
      if (!access) throw new Error("Access denied. Ask the operator to assign a teacher or content administrator role.");
      const next = await loadStudio(client, older ? rows[rows.length - 1]?.id : undefined);
      if (!active.current) return;
      setRole(access); setReady(true); setMore(next.length === 25);
      setRows(current => older ? [...current, ...next.filter(row => !current.some(old => old.id === row.id))] : next);
      setSelected(null); setNote(""); setConfirmed(false);
    } catch (failure) {
      if (active.current) { setRole(null); setRows([]); setReady(false); setSelected(null); }
      throw failure;
    }
  }
  function closeEditor() {
    if (dirty && !window.confirm("Discard unsaved content edits? Saved server drafts are kept.")) return;
    setDraft(null); setEditing(undefined); setDirty(false); setPreview(null);
  }
  function change(patch: Partial<TeacherPayload>) {
    setDraft(current => current ? { ...current, ...patch } : current); setDirty(true); setPreview(null);
  }
  function question(index: number, patch: Partial<TeacherQuestion>) {
    if (draft) change({ questions: draft.questions.map((q, i) => i === index ? { ...q, ...patch } : q) });
  }
  async function action(entry: StudioContent, name: "submit" | "publish" | "reject" | "archive" | "delete") {
    if (!client) return;
    if (["publish", "reject", "archive"].includes(name) && !confirmed)
      throw new Error("Confirm the review checklist before deciding.");
    if (["reject", "archive"].includes(name) && !note.trim()) throw new Error("Provide a reason for rejection or archiving.");
    if (name === "delete" && !window.confirm("Delete this draft permanently?")) return;
    await reviewContent(client, entry, name, note);
    if (!active.current) return;
    await refresh(); setStatus(`Content action confirmed: ${name}.`);
  }
  return <section className="content-studio" aria-label="Teacher and administrator content studio">
    <h2>Teacher &amp; admin content studio</h2>
    <p>Create grade-based passages and three-choice questions. Teachers submit saved drafts;
      content administrators must approve before learners can see them. Payment administrator access
      does not grant content access.</p>
    <p>Only original or properly licensed, age-appropriate material. Never include student names, contact details,
      private stories, external links, payment requests, or copyrighted textbook copies.
      Text only: no uploads, scripts, HTML rendering, chat, or automatic AI publishing.</p>
    {!client ? <p>Sign in with an operator-approved teacher or content administrator account to use the studio.</p> : <>
      <button className="button secondary" disabled={busy || !!draft} onClick={() => void run(() => refresh())}>
        {busy ? "Working…" : ready ? "Refresh content studio" : "Open content studio"}
      </button>
      {ready && role && !draft && <>
        <p>Access: {role === "admin" ? "Content administrator — all items and review queue" : "Teacher — your own items"}. Up to 100 items per author.
          Submitted and published text is locked; revisions of published work require a new draft and fresh review.</p>
        <button className="button primary" disabled={busy} onClick={() => {
          setDraft(blankContent()); setEditing(undefined); setDirty(false); setSelected(null); setPreview(null); setStatus("");
        }}>Create content draft</button>
        {!rows.length && <p role="status">No content items yet. Create your first draft.</p>}
        <ul className="studio-items">{rows.map(entry => <li key={entry.id}>
          <strong>{entry.payload.title}</strong> · {gradeLabels[entry.payload.grade]} · {entry.status}
          <span>Revision {entry.revision} · {entry.is_own ? "Your item" : "Another author's item"}</span>
          <button className="button secondary" disabled={busy} onClick={() => { setSelected(entry); setNote(""); setConfirmed(false); }}>Review {entry.payload.title}</button>
          {entry.is_own && ["draft", "rejected"].includes(entry.status) && <button className="button secondary" disabled={busy}
            onClick={() => { setDraft(structuredClone(entry.payload)); setEditing(entry); setDirty(false); setSelected(null); setPreview(null); }}>Edit {entry.payload.title}</button>}
        </li>)}</ul>
        {more && <button className="button secondary" disabled={busy} onClick={() => void run(() => refresh(true))}>Load more content items</button>}
        {selected && <section className="studio-review" aria-label="Content review">
          <h3>Review saved revision {selected.revision} · {selected.status}</h3>
          {selected.review_note && <p><strong>Review note:</strong> {selected.review_note}</p>}
          <TeacherActivity key={`${selected.id}:${selected.revision}`} content={selected.payload} />
          {selected.is_own && ["draft", "rejected"].includes(selected.status) && <>
            <button className="button primary" disabled={busy} onClick={() => void run(() => action(selected, "submit"))}>Submit for administrator review</button>
            <button className="button secondary" disabled={busy} onClick={() => void run(() => action(selected, "delete"))}>Delete draft</button>
          </>}
          {role === "admin" && ["submitted", "published"].includes(selected.status) && <fieldset disabled={busy}>
            <legend>Administrator decision</legend>
            <label><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />
              I reviewed the entire passage, every question, choices, correct answer and explanation for accuracy,
              grade suitability, safety, personal information, external solicitation, and usage rights.
              Published content will be publicly readable, not limited to my class.</label>
            <label>Review reason (required for rejection/archive)
              <textarea value={note} maxLength={1000} onChange={event => setNote(event.target.value)} />
            </label>
            {selected.status === "submitted" ? <>
              <button className="button primary" disabled={!confirmed} onClick={() => void run(() => action(selected, "publish"))}>Approve &amp; publish</button>
              <button className="button secondary" disabled={!confirmed || !note.trim()} onClick={() => void run(() => action(selected, "reject"))}>Return for changes</button>
            </> : <button className="button secondary" disabled={!confirmed || !note.trim()} onClick={() => void run(() => action(selected, "archive"))}>Archive published content</button>}
          </fieldset>}
        </section>}
      </>}
      {draft && <form className="studio-editor" onSubmit={event => {
        event.preventDefault();
        void run(async () => {
          const parsed = parseTeacherPayload(draft);
          await saveContent(client, parsed, editing);
          if (!active.current) return;
          setDirty(false); setDraft(null); setEditing(undefined); setPreview(null);
          setStatus("Draft saved. It is not published; select Review, then submit it for approval.");
          await refresh();
        });
      }}>
        <h3 ref={editorHeading} tabIndex={-1}>{editing ? "Edit draft" : "New content draft"}</h3>
        <p>Edits are kept only in this page until Save draft. Keep a separate copy before leaving the studio.
          Saving does not submit or publish.</p>
        <fieldset disabled={busy}>
          <label>Title<input required maxLength={120} value={draft.title} onChange={event => change({ title: event.target.value })} /></label>
          <div className="studio-fields">
            <label>Grade<select value={draft.grade} onChange={event => {
              const grade = gradeIds.find(id => id === event.target.value); if (grade) change({ grade });
            }}>{gradeIds.map(id => <option key={id} value={id}>{gradeLabels[id]}</option>)}</select></label>
            <label>Subject<select value={draft.subject} onChange={event => change({ subject: event.target.value === "math" ? "math" : "english" })}>
              <option value="english">English</option><option value="math">Math</option></select></label>
            <label>Content type<select value={draft.kind} onChange={event => {
              const kind = event.target.value === "quiz" ? "quiz" : "passage";
              if (kind === "quiz" && draft.passage && !window.confirm("Switch to quiz and remove passage text?")) return;
              change({ kind, passage: kind === "quiz" ? "" : draft.passage,
                questions: kind === "quiz" && !draft.questions.length ? [blankQuestion()] : draft.questions });
            }}><option value="passage">Reading passage</option><option value="quiz">Multiple-choice quiz</option></select></label>
          </div>
          {draft.kind === "passage" && <label>Passage text<textarea required maxLength={6000} rows={10} value={draft.passage}
            onChange={event => change({ passage: event.target.value })} /></label>}
          <p>Up to five optional passage questions; quizzes need at least one. Three distinct choices per question.</p>
          {draft.questions.map((q, index) => <fieldset className="studio-question" key={index}>
            <legend>Question {index + 1}</legend>
            <label>Question prompt<textarea required maxLength={300} value={q.prompt} onChange={event => question(index, { prompt: event.target.value })} /></label>
            {q.choices.map((choice, option) => <label key={option}>Choice {option + 1}
              <input required maxLength={150} value={choice} onChange={event => {
                const choices: TeacherQuestion["choices"] = [...q.choices]; choices[option] = event.target.value; question(index, { choices });
              }} /></label>)}
            <label>Correct choice<select value={q.answer} onChange={event => question(index, { answer: Number(event.target.value) })}>
              {[0, 1, 2].map(option => <option key={option} value={option}>Choice {option + 1}</option>)}</select></label>
            <label>Encouraging explanation<textarea required maxLength={500} value={q.explanation} onChange={event => question(index, { explanation: event.target.value })} /></label>
            <button type="button" className="button secondary" onClick={() => change({ questions: draft.questions.filter((_, i) => i !== index) })}>Remove question {index + 1}</button>
          </fieldset>)}
          <button type="button" className="button secondary" disabled={draft.questions.length >= 5}
            onClick={() => change({ questions: [...draft.questions, blankQuestion()] })}>Add question</button>
          <button type="button" className="button secondary" onClick={() => {
            try { setPreview(parseTeacherPayload(draft)); setError(""); } catch (failure) { setError(failure instanceof Error ? failure.message : "Invalid content."); }
          }}>Preview learner view</button>
          <button className="button primary" type="submit">Save draft</button>
          <button className="button secondary" type="button" onClick={closeEditor}>Close editor</button>
        </fieldset>
        {preview && <section aria-label="Draft preview"><h3>Unpublished learner preview</h3><TeacherActivity key={JSON.stringify(preview)} content={preview} /></section>}
      </form>}
    </>}
    {error && <p role="alert">{error}</p>}
    {status && <p role="status">{status}</p>}
    <p>There is no automated safety certification. Administrators must review submissions.
      Author accounts, content/review history, and operator audit records are separate from learner progress erasure.
      Contact the operator for access, copyright concerns, unsafe content, or deletion requests.</p>
  </section>;
}
