import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadPaymentEvents, paymentAdmin, type PaymentEvent } from "./payments";

export default function PaymentAdmin({ client }: { client: SupabaseClient }) {
  const [rows, setRows] = useState<PaymentEvent[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [more, setMore] = useState(false);
  const active = useRef(true), inFlight = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function load(older: boolean) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      if (!await paymentAdmin(client)) throw new Error("Access denied. A trusted operator must assign your account payment administrator access.");
      const next = await loadPaymentEvents(client, older ? rows[rows.length - 1] : undefined);
      if (!active.current) return;
      setAllowed(true); setLoaded(true); setMore(next.length === 25);
      setRows(current => older ? [...current, ...next.filter(row => !current.some(old => old.event_id === row.event_id))] : next);
    } catch (failure) {
      if (active.current) {
        // Do not leave protected records visible after permission revocation or a failed refresh.
        setRows([]); setAllowed(false); setLoaded(false);
        setError(failure instanceof Error ? failure.message : "Could not load payment records.");
      }
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
  return <section className="payment-admin" aria-label="Protected payment admin console">
    <h3>Payment admin console</h3>
    <p>Server-assigned administrators only. Records are verified PayPal webhook events for this app's connected
      checkout, not a balance or a list of every transaction in the PayPal account.</p>
    <button className="button secondary" disabled={busy} onClick={() => void load(false)}>
      {busy ? "Loading payments…" : loaded ? "Refresh payment records" : "Open payment records"}
    </button>
    {error && <p role="alert">{error}</p>}
    {allowed && <>
      <p>USD only. Sandbox entries are test payments, not real money. Each row is an event:
        pending, completed, refund, and reversal entries can refer to the same payment.
        Do not add these rows together. Refunds may be partial; this is not net revenue.
        Provider time and receipt time may differ; late events do not overwrite newer records.</p>
      {rows.length ? <div className="payment-table-wrap" tabIndex={0} role="region" aria-label="Scrollable verified payment events">
        <table><caption>Verified payment activity, newest received first</caption>
          <thead><tr><th>Mode</th><th>Event / USD amount</th><th>PayPal IDs</th><th>Times</th></tr></thead>
          <tbody>{rows.map(row => <tr key={row.event_id}>
            <td>{row.environment === "sandbox" ? "Sandbox — test" : "Live"}</td>
            <td>{row.event_type.replace("PAYMENT.CAPTURE.", "")}<br />{(row.amount_cents / 100).toFixed(2)} USD</td>
            <td>Order: {row.paypal_order_id}<br />Capture/refund: {row.resource_id}<br />Event: {row.event_id}</td>
            <td>PayPal: {new Date(row.provider_created_at).toLocaleString()}<br />Received: {new Date(row.received_at).toLocaleString()}</td>
          </tr>)}</tbody>
        </table>
      </div> : <p role="status">No verified payment events have been received. This does not prove that no payments occurred.
        Check webhook setup and PayPal Activity before reconciling.</p>}
      {more && <button className="button secondary" disabled={busy} onClick={() => void load(true)}>Load older payment events</button>}
    </>}
    <p>No donor names, emails, card data, or learner progress are shown. Refunds and financial reconciliation
      are handled in the recipient's PayPal account. This console does not issue refunds.</p>
  </section>;
}
