import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutEnabled, checkoutRequest, donationReturn } from "./payments";
import PaymentAdmin from "./PaymentAdmin";

export default function DonationPanel({ adult, client }: { adult: boolean; client?: SupabaseClient | null }) {
  const [amount, setAmount] = useState("5");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState(donationReturn);
  const [cancelled] = useState(() => new URLSearchParams(location.search).has("donation_cancel"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const inFlight = useRef(false);
  const active = useRef(true);
  const context = useRef({ adult, client });
  context.current = { adult, client };
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function pay(capture: boolean) {
    if (!client || !adult || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const id = capture ? returnId : requestId ?? crypto.randomUUID();
      if (!id) throw new Error("Missing donation return reference. Contact the operator.");
      if (!capture) setRequestId(id);
      const response = await checkoutRequest(client, { action: capture ? "capture" : "create",
        requestId: id, ...(capture ? {} : { amountCents: Number(amount) * 100 }) });
      if (!active.current || !context.current.adult || context.current.client !== client) return;
      if (response.approvalUrl) { location.assign(response.approvalUrl); return; }
      setResult(response.status === "COMPLETED"
        ? `PayPal reports a completed capture (${response.captureId}). ${response.environment === "sandbox" ? "Sandbox test only — no real money." : "Check PayPal for your receipt."} Admin records await a verified webhook.`
        : `PayPal reports a pending capture, not a completed donation. ${response.environment === "sandbox" ? "Sandbox test only. " : ""}Check PayPal; do not pay again to resolve a pending payment.`);
      setReturnId(null);
      const url = new URL(location.href);
      for (const key of ["donation_return", "token", "PayerID"]) url.searchParams.delete(key);
      history.replaceState(history.state, "", url);
    } catch (failure) {
      if (active.current) setError(failure instanceof Error ? failure.message : "Checkout failed. Review PayPal before retrying.");
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  return <section className="donation-panel" aria-label="Grown-up donations and operator setup">
    <h2>Optional grown-up donations</h2>
    <p>Learning is free to use here whether or not you donate. Donations never unlock lessons,
      points, badges, or a place on the leaderboard. Children should not make payments.</p>
    <p>PayPal opens on an external website and handles payment details under its own privacy terms.
      The server stores a donation request linked to the adult login, amount, order IDs, and verified payment events;
      no learner grade or progress is sent to PayPal. This app never collects card details.
      Payment tables omit PayPal payer names/emails; adult sign-in still uses your email.</p>
    {!adult ? <p>Confirm you are the responsible adult above to access donation links.</p>
      : !client ? <p>Sign in with the responsible adult's account to start or resume connected PayPal checkout.</p>
      : !checkoutEnabled ? <><p role="status">Connected checkout is not configured. The operator must deploy and enable the PayPal service.</p>
        <button className="button secondary" disabled>Donate with PayPal — not configured</button></>
      : <div className="donation-checkout">
        {cancelled && <p role="status">PayPal checkout was cancelled. No success is assumed.
          Check PayPal Activity before starting another donation; a return link is not a payment record.</p>}
        {returnId ? <><p>Returned from PayPal? This link alone is not proof of payment.
          Complete this existing donation only if you approved it in PayPal. The server verifies the order and amount.</p>
          <button className="button secondary" disabled={busy || !!result} onClick={() => void pay(true)}>
            {busy ? "Checking PayPal…" : "Complete approved donation"}
          </button></> : !result && <>
          <label>Donation amount (USD)
            <select value={amount} disabled={busy || !!requestId} onChange={event => setAmount(event.target.value)}>
              {[5, 10, 25, 50].map(value => <option key={value} value={value}>${value} USD</option>)}
            </select>
          </label>
          <button className="button secondary" disabled={busy} onClick={() => void pay(false)}>
            {busy ? "Opening PayPal…" : requestId ? "Retry the same PayPal checkout" : "Donate with PayPal"}
          </button>
          <p>Continue on PayPal, review the recipient and amount, then return here to complete the approved donation.
            No tax deduction is promised. A failed request can have an uncertain outcome; retry the same attempt,
            and check PayPal before starting another.</p>
        </>}
      </div>}
    {adult && error && <p role="alert">{error}</p>}
    {adult && result && <p role="status">{result}</p>}
    {adult && <details className="donation-admin">
      <summary>Operator setup &amp; payment tracking</summary>
      <p>This panel shows public setup information only. The adult checkbox does not grant administrator access.
        PayPal credentials are server-only. The protected console below checks database-assigned administrator access.</p>
      <p><strong>Connected checkout:</strong> {checkoutEnabled ? "Frontend enabled — server setup still required" : "Disabled"}</p>
      <ol>
        <li>Deploy the payments migration and the checkout/webhook Supabase functions. Configure the
          recipient's PayPal REST app, server secrets, and verified webhook URL using the README.</li>
        <li>Assign trusted administrators in <code>payment_admins</code> using trusted SQL, never a browser checkbox.</li>
        <li>Complete sandbox acceptance checks before enabling live checkout. Reconcile against PayPal Activity;
          hosted-link donations and unrelated PayPal payments are not imported.</li>
      </ol>
      <p><a className="button secondary" href="https://www.paypal.com/" target="_blank" rel="noopener noreferrer">
        Open PayPal to sign in &amp; track payments
      </a></p>
      <p>Do not enter API secrets in this app or in VITE settings. Do not treat a return URL,
        button click, or screenshot as proof of payment. Donations are not claimed to be tax-deductible.
        Recipient eligibility, charitable claims, receipts, and refund policies are the operator's responsibility.</p>
    </details>}
    {adult && client && <PaymentAdmin client={client} />}
  </section>;
}
