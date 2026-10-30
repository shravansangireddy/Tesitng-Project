import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeLabels, type GradeId } from "./content-schema";
import { loadPublished, type PublishedContent } from "./teacher-content";
import TeacherActivity from "./TeacherActivity";
import "./teacher-content.css";

export default function TeacherLibrary({ client, grade }: { client?: SupabaseClient | null; grade: GradeId }) {
  const [rows, setRows] = useState<PublishedContent[]>([]);
  const [selected, setSelected] = useState<PublishedContent | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [more, setMore] = useState(false), [loaded, setLoaded] = useState(false);
  const active = useRef(true), inFlight = useRef(false), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { heading.current?.focus(); }, [selected?.id]);
  async function load(older: boolean) {
    if (!client || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const next = await loadPublished(client, grade, older ? rows[rows.length - 1]?.id : undefined);
      if (!active.current) return;
      setRows(current => older ? [...current, ...next.filter(row => !current.some(old => old.id === row.id))] : next);
      setMore(next.length === 25); setLoaded(true); setSelected(null);
    } catch (failure) {
      if (active.current) { setRows([]); setSelected(null); setLoaded(false); setError(failure instanceof Error ? failure.message : "Could not load approved content."); }
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  return <section className="teacher-library panel" aria-label="Approved teacher content library">
    <span className="eyebrow">MORE WAYS TO LEARN</span>
    <h1 ref={heading} tabIndex={-1}>Teacher library · {gradeLabels[grade]}</h1>
    <p>Extra passages and practice questions reviewed and published by this site's content administrators.
      An adult can help you choose. To change the grade, use your dashboard grade selector.</p>
    <p>Practice here has no competitive points or saved answers. Approval is human review, not a guarantee of
      accuracy. Tell your grown-up if something seems wrong or unsafe; use the operator contact in Privacy &amp; data.</p>
    {!client ? <p>The online teacher library is not connected. Your built-in books and activities still work.
      The operator must configure Supabase and complete the privacy review before loading shared content.</p> : <>
      <button className="button secondary" disabled={busy} onClick={() => void load(false)}>
        {busy ? "Loading library…" : loaded ? "Refresh approved content" : "Load approved content"}
      </button>
      {loaded && !rows.length && <p role="status">No approved content for this grade yet. Try the built-in picture books or adventures.</p>}
      {selected ? <>
        <button className="text-button" onClick={() => setSelected(null)}>Back to teacher library</button>
        <TeacherActivity key={`${selected.id}:${selected.revision}`} content={selected.payload} />
      </> : <ul className="teacher-library-items">{rows.map(entry => <li key={entry.id}>
        <h2>{entry.payload.title}</h2>
        <p>{entry.payload.kind === "passage" ? "Reading passage" : "Practice quiz"} · {entry.payload.subject === "english" ? "English" : "Math"} · {entry.payload.questions.length} questions</p>
        <button className="button primary" disabled={busy} onClick={() => setSelected(entry)}>Open {entry.payload.title}</button>
      </li>)}</ul>}
      {more && !selected && <button className="button secondary" disabled={busy} onClick={() => void load(true)}>Load more approved content</button>}
      {loaded && <small>Refresh checks current publications. An open activity is a temporary snapshot;
        withdrawing a publication does not erase pages already loaded on another device.</small>}
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
