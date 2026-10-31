import { useRef, useState } from "react";
import type { Progress } from "./game";
import PrivacyNotice from "./PrivacyNotice";
import DonationPanel from "./DonationPanel";
import type { SupabaseClient } from "@supabase/supabase-js";
import ContentStudio from "./ContentStudio";
import KidLogins from "./KidLogins";
import ParentPassword from "./ParentPassword";

export default function PrivacyCenter({ progress, cloud, onErase, paymentClient, onContentDirty }: {
  progress: Progress; cloud: boolean; onErase?: () => Promise<void>; paymentClient?: SupabaseClient | null;
  onContentDirty?: (dirty: boolean) => void;
}) {
  const [adult, setAdult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const contentDirty = useRef(false);
  const [studioDirty, setStudioDirty] = useState(false);
  return <section className="privacy-center panel" aria-label="Privacy and data">
    <h1>Privacy &amp; data</h1>
    <p>For a parent, guardian, or authorized school adult. Learning without online sharing is always available as guest play.</p>
    <PrivacyNotice />
    <label className="privacy-adult"><input type="checkbox" checked={adult} disabled={busy}
      onChange={(event) => {
        if (!event.target.checked && contentDirty.current && !window.confirm("Close the content studio and discard unsaved edits?")) return;
        setAdult(event.target.checked);
      }} />I am the responsible adult reviewing this learner's data.
      This does not verify identity or establish legal consent.</label>
    <details><summary>Review the current learning save</summary>
      <p>Includes grade, theme, points, activity results, and completed coding/AI lessons. No voice transcript is saved here.
        For cloud play, use the operator contact to request room history, account identity data, and a complete provider-held record.</p>
      {adult ? <pre>{JSON.stringify(progress, null, 2)}</pre> : <p>Ask the responsible adult to confirm above before reviewing the save.</p>}
    </details>
    <button className="button secondary" disabled={!adult || busy} onClick={() => {
      try {
        const url = URL.createObjectURL(new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url; link.download = "champion-learning-progress.json";
        document.body.append(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setError("");
      } catch (failure) {
        setError(`Could not export progress: ${failure instanceof Error ? failure.message : String(failure)}`);
      }
    }}>Download current learning save</button>
    <p>{cloud
      ? "Erase cloud learning data deletes your progress, owned rooms, memberships, participation credits, and join-attempt history, then signs out. It does not delete the adult auth account, teaching drafts/review records, financial records, emails, provider logs, or backups. Contact the operator for full deletion and consent withdrawal."
      : "Erase local learning data clears this browser's learning save and reloads the app. It does not delete an account or cloud data. Other browser profiles/devices are separate."}</p>
    <button className="button secondary" disabled={!adult || busy || !onErase || studioDirty} onClick={async () => {
      if (!window.confirm(cloud ? "Erase this account's cloud learning and room data and sign out? This cannot be undone. The adult login identity remains."
        : "Erase this browser's learning progress, grade, and theme? This cannot be undone.")) return;
      setBusy(true); setError("");
      try { await onErase?.(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : "Could not erase learning data. Contact the operator."); }
      finally { setBusy(false); }
    }}>{busy ? "Erasing…" : cloud ? "Erase cloud learning data & sign out" : "Erase local learning data"}</button>
    {cloud && !onErase && <p role="status">Wait until saving finishes before erasing cloud data.</p>}
    {studioDirty && <p role="status">Save or close unsaved content edits before erasing learning data.</p>}
    {error && <p role="alert">{error}</p>}
    {cloud && paymentClient ? <KidLogins client={paymentClient} /> : null}
    {cloud && paymentClient ? <ParentPassword client={paymentClient} /> : null}
    {adult && !busy ? <ContentStudio client={paymentClient} onDirty={(dirty) => {
      contentDirty.current = dirty; setStudioDirty(dirty); onContentDirty?.(dirty);
    }} /> : <p>Confirm the responsible adult above to open teacher/admin content tools. Server-assigned access is required.</p>}
    <DonationPanel adult={adult && !busy} client={paymentClient} />
  </section>;
}
