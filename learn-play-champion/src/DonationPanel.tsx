import { useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutConfig, checkoutEnabled, checkoutRequest, donationReturn, type CheckoutResponse } from "./payments";
import { recordDonationAward } from "./parent-points";
import PaymentAdmin from "./PaymentAdmin";

interface GooglePaySdkConfig {
  allowedPaymentMethods: unknown[];
  countryCode: string;
  merchantInfo?: Record<string, unknown>;
}
interface GooglePayPaymentData { paymentMethodData?: unknown }
interface GooglePayAuthorization {
  transactionState: "SUCCESS" | "ERROR";
  error?: { intent: string; message: string; reason: string };
}
interface PayPalGooglePay {
  config(): Promise<GooglePaySdkConfig>;
  confirmOrder(input: { orderId: string; paymentMethodData: unknown }): Promise<{ status?: string }>;
}
interface GooglePaymentsClient {
  isReadyToPay(request: unknown): Promise<{ result?: boolean }>;
  loadPaymentData(request: unknown): Promise<unknown>;
}
interface PaymentWindow {
  paypal?: { Googlepay(): PayPalGooglePay };
  google?: { payments: { api: { PaymentsClient: new (options: {
    environment: "TEST" | "PRODUCTION";
    paymentDataCallbacks: { onPaymentAuthorized(paymentData: GooglePayPaymentData): Promise<GooglePayAuthorization> };
  }) => GooglePaymentsClient } } };
}
const scriptLoads = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  const pending = scriptLoads.get(src);
  if (pending) return pending;
  const load = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src; script.async = true;
    script.onload = () => resolve();
    script.onerror = () => { scriptLoads.delete(src); reject(new Error("A payment script could not be loaded.")); };
    document.head.append(script);
  });
  scriptLoads.set(src, load);
  return load;
}
/**
 * Parent Points thank-you for a completed donation. Only a COMPLETED
 * capture counts — a pending capture is not a completed donation, and
 * starting, cancelling, or failing a checkout never reaches this. The
 * award is keyed by the donation's request id, so a replayed success
 * (a refreshed return page, a retried completion) can never pay twice,
 * while a new donation pays again. Points are a small extra: any
 * failure here is swallowed so it can never change the donation's own
 * outcome, and with no signed-in grown-up there is simply no award.
 */
function noteDonationPoints(donor: SupabaseClient, response: CheckoutResponse, donationKey: string): void {
  if (response.status !== "COMPLETED") return;
  void (async () => {
    try {
      const { data } = await donor.auth.getUser();
      const userId = data.user?.id;
      if (userId) recordDonationAward(userId, donationKey);
    } catch { /* points never affect the donation itself */ }
  })();
}
function captureMessage(response: { status?: string; captureId?: string; environment: string }): string {
  return response.status === "COMPLETED"
    ? `PayPal reports a completed capture (${response.captureId}). ${response.environment === "sandbox" ? "Sandbox test only — no real money." : "Check PayPal for your receipt."} Admin records await a verified webhook.`
    : `PayPal reports a pending capture, not a completed donation. ${response.environment === "sandbox" ? "Sandbox test only. " : ""}Check PayPal; do not pay again to resolve a pending payment.`;
}

export default function DonationPanel({ adult, client }: { adult: boolean; client?: SupabaseClient | null }) {
  const [amount, setAmount] = useState("5");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [returnId, setReturnId] = useState(donationReturn);
  const [cancelled] = useState(() => new URLSearchParams(location.search).has("donation_cancel"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [gpEligible, setGpEligible] = useState(false);
  const [gpCancelled, setGpCancelled] = useState(false);
  const inFlight = useRef(false);
  const active = useRef(true);
  const context = useRef({ adult, client });
  context.current = { adult, client };
  const amountRef = useRef(amount);
  amountRef.current = amount;
  const requestIdRef = useRef<string | null>(null);
  const gpSupport = useRef<{ googlepay: PayPalGooglePay; client: GooglePaymentsClient; config: GooglePaySdkConfig } | null>(null);
  const gpStarted = useRef(false);
  const gpAuthRan = useRef(false);
  const gpAuthorize = useRef<(paymentData: GooglePayPaymentData) => Promise<GooglePayAuthorization>>(
    async () => ({ transactionState: "ERROR", error: { intent: "PAYMENT_AUTHORIZATION", message: "Google Pay is not ready.", reason: "OTHER_ERROR" } }));
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => { requestIdRef.current = requestId; }, [requestId]);
  gpAuthorize.current = async paymentData => {
    gpAuthRan.current = true;
    const current = context.current;
    try {
      const support = gpSupport.current;
      if (!current.client || !current.adult || !support)
        throw new Error("Google Pay is no longer available. No payment was completed.");
      const id = requestIdRef.current ?? crypto.randomUUID();
      setRequestId(id); requestIdRef.current = id;
      const created = await checkoutRequest(current.client, { action: "create", requestId: id,
        amountCents: Number(amountRef.current) * 100, wallet: "googlepay" });
      if (!created.orderId) throw new Error("PayPal order reference was missing.");
      try {
        const confirmation = await support.googlepay.confirmOrder(
          { orderId: created.orderId, paymentMethodData: paymentData.paymentMethodData });
        if (confirmation.status !== "APPROVED")
          throw new Error("Google Pay did not approve this donation. No capture was taken; check PayPal before trying again.");
        const captured = await checkoutRequest(current.client, { action: "capture", requestId: id });
        if (!captured.status) throw new Error("PayPal did not confirm a capture. Check PayPal before trying again.");
        noteDonationPoints(current.client, captured, id);
        if (active.current && context.current.adult && context.current.client === current.client) {
          setResult(captureMessage(captured)); setReturnId(null);
        }
      } catch (failure) {
        // The server-side order exists now; offer the same explicit completion
        // step the PayPal return flow uses instead of assuming an outcome.
        if (active.current) setReturnId(id);
        throw failure;
      }
      return { transactionState: "SUCCESS" };
    } catch (failure) {
      const message = failure instanceof Error ? failure.message
        : "Google Pay payment failed. No success is assumed; check PayPal before trying again.";
      if (active.current) setError(message);
      return { transactionState: "ERROR", error: { intent: "PAYMENT_AUTHORIZATION", message, reason: "OTHER_ERROR" } };
    }
  };
  useEffect(() => {
    if (!adult || !client || !checkoutEnabled || returnId || gpStarted.current) return;
    gpStarted.current = true;
    void (async () => {
      try {
        const config = await checkoutConfig(client);
        if (!config.enabled || !config.clientId || !config.environment) return;
        const win = window as unknown as PaymentWindow;
        if (!win.paypal?.Googlepay)
          await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(config.clientId)}&currency=USD&components=googlepay`);
        if (!win.google?.payments?.api?.PaymentsClient)
          await loadScript("https://pay.google.com/gp/p/js/pay.js");
        if (!active.current || !context.current.adult || context.current.client !== client) return;
        const loaded = window as unknown as PaymentWindow;
        if (!loaded.paypal?.Googlepay || !loaded.google?.payments?.api?.PaymentsClient) return;
        const googlepay = loaded.paypal.Googlepay();
        const sdkConfig = await googlepay.config();
        if (!Array.isArray(sdkConfig?.allowedPaymentMethods) || !sdkConfig.allowedPaymentMethods.length || !sdkConfig.countryCode) return;
        const paymentsClient = new loaded.google.payments.api.PaymentsClient({
          environment: config.environment === "live" ? "PRODUCTION" : "TEST",
          paymentDataCallbacks: { onPaymentAuthorized: paymentData => gpAuthorize.current(paymentData) },
        });
        const ready = await paymentsClient.isReadyToPay(
          { apiVersion: 2, apiVersionMinor: 0, allowedPaymentMethods: sdkConfig.allowedPaymentMethods });
        if (!ready?.result) return;
        if (!active.current || !context.current.adult || context.current.client !== client) return;
        gpSupport.current = { googlepay, client: paymentsClient, config: sdkConfig };
        setGpEligible(true);
      } catch { /* Google Pay stays hidden; the PayPal flow is unaffected. */ }
    })();
  }, [adult, client, returnId]);
  async function payWithGooglePay() {
    const support = gpSupport.current, current = context.current;
    if (!support || !current.client || !current.adult || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(""); setGpCancelled(false); gpAuthRan.current = false;
    try {
      await support.client.loadPaymentData({
        apiVersion: 2, apiVersionMinor: 0,
        allowedPaymentMethods: support.config.allowedPaymentMethods,
        transactionInfo: { countryCode: support.config.countryCode, currencyCode: "USD",
          totalPriceStatus: "FINAL", totalPrice: Number(amountRef.current).toFixed(2) },
        ...(support.config.merchantInfo ? { merchantInfo: support.config.merchantInfo } : {}),
        callbackIntents: ["PAYMENT_AUTHORIZATION"],
      });
    } catch (failure) {
      // When authorization ran, it already recorded the outcome; a sheet-level
      // rejection afterwards must not overwrite it or imply success.
      if (active.current && !gpAuthRan.current) {
        if ((failure as { statusCode?: unknown } | null)?.statusCode === "CANCELED") setGpCancelled(true);
        else setError("Google Pay could not finish. No success is assumed; check PayPal before starting another donation.");
      }
    } finally { inFlight.current = false; if (active.current) setBusy(false); }
  }
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
      setResult(captureMessage(response));
      noteDonationPoints(client, response, id);
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
      Payment tables omit PayPal payer names/emails; adult sign-in still uses your email.
      Google Pay, when offered on your device, runs through the same PayPal checkout: Google confirms the
      payment method, and PayPal captures the donation exactly like a PayPal approval.</p>
    {!adult ? <p>Confirm you are the responsible adult above to access donation links.</p>
      : !client ? <p>Sign in with the responsible adult's account to start or resume connected PayPal checkout.</p>
      : !checkoutEnabled ? <><p role="status">Connected checkout is not configured. The operator must deploy and enable the PayPal service.</p>
        <button className="button secondary" disabled>Donate with PayPal — not configured</button></>
      : <div className="donation-checkout">
        {cancelled && <p role="status">PayPal checkout was cancelled. No success is assumed.
          Check PayPal Activity before starting another donation; a return link is not a payment record.</p>}
        {gpCancelled && <p role="status">Google Pay checkout was cancelled. No success is assumed.
          Check PayPal Activity before starting another donation; closing the Google Pay sheet is not a payment record.</p>}
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
          {gpEligible && !requestId && <button className="button secondary" disabled={busy} onClick={() => void payWithGooglePay()}>
            Donate with Google Pay
          </button>}
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
