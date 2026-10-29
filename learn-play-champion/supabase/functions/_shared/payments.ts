type Json = Record<string, unknown>;
export type PaymentEnv = (name: string) => string | undefined;
type Fetcher = typeof fetch;
class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function object(value: unknown): Json {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "Invalid payment payload.");
  return value as Json;
}
export function text(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 256) throw new HttpError(400, "Missing or invalid payment field.");
  return value;
}
export function paypalId(value: unknown): string {
  const id = text(value);
  if (!/^[A-Za-z0-9_-]{3,100}$/.test(id)) throw new HttpError(400, "Invalid PayPal identifier.");
  return id;
}
export function cents(value: unknown): number {
  if (typeof value !== "string" || !/^\d{1,7}\.\d{2}$/.test(value)) throw new HttpError(400, "Invalid USD amount.");
  return Number(value.replace(".", ""));
}
function uuid(value: unknown): string {
  const id = text(value);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new HttpError(400, "Invalid donation request.");
  return id;
}
async function payload(request: Request): Promise<Json> {
  // Stream limits also protect chunked requests without a Content-Length header.
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Missing request body.");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > 65536) { await reader.cancel(); throw new HttpError(413, "Payment payload is too large."); }
    chunks.push(part.value);
  }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  try { return object(JSON.parse(new TextDecoder().decode(all))); }
  catch { throw new HttpError(400, "Invalid JSON payment payload."); }
}
const eventTypes = new Set([
  "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.DECLINED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED",
]);
function settings(env: PaymentEnv) {
  const required = (key: string) => {
    const value = env(key)?.trim();
    if (!value) throw new HttpError(503, `Payment service setup is incomplete: ${key}.`);
    return value;
  };
  if (required("PAYMENTS_ENABLED") !== "true") throw new HttpError(503, "Online donations are disabled by the operator.");
  const mode = required("PAYPAL_ENV");
  if (mode !== "sandbox" && mode !== "live") throw new HttpError(503, "PAYPAL_ENV must be sandbox or live.");
  const app = new URL(required("APP_BASE_URL"));
  if (app.username || app.password || app.search || app.hash ||
    (app.protocol !== "https:" && !(mode === "sandbox" && app.protocol === "http:" && ["localhost", "127.0.0.1"].includes(app.hostname))))
    throw new HttpError(503, "Invalid APP_BASE_URL payment setting.");
  return {
    base: mode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com",
    approvalHost: mode === "live" ? "www.paypal.com" : "www.sandbox.paypal.com",
    app, mode, db: required("SUPABASE_URL").replace(/\/$/, ""),
    key: required("SUPABASE_SERVICE_ROLE_KEY"), clientId: required("PAYPAL_CLIENT_ID"),
    secret: required("PAYPAL_CLIENT_SECRET"), webhookId: required("PAYPAL_WEBHOOK_ID"),
  };
}
type Settings = ReturnType<typeof settings>;
async function jsonRequest(fetcher: Fetcher, url: string, init: RequestInit, label: string) {
  const response = await fetcher(url, { ...init, signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!response.ok) {
    console.error(`${label} failed`, response.status);
    throw new HttpError(502, `${label} failed. Retry or contact the operator; no payment success is assumed.`);
  }
  if (response.status === 204) return null;
  return response.json() as Promise<unknown>;
}
async function db(s: Settings, fetcher: Fetcher, path: string, method: string, body?: unknown, auth = s.key, prefer?: string) {
  return jsonRequest(fetcher, `${s.db}/rest/v1/${path}`, {
    method, headers: { apikey: s.key, Authorization: `Bearer ${auth}`, "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, "Payment storage");
}
async function token(s: Settings, fetcher: Fetcher) {
  const result = object(await jsonRequest(fetcher, `${s.base}/v1/oauth2/token`, {
    method: "POST", headers: { Authorization: `Basic ${btoa(`${s.clientId}:${s.secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  }, "PayPal authentication"));
  return text(result.access_token);
}
async function paypal(s: Settings, fetcher: Fetcher, access: string, path: string, method: string, body?: unknown, requestId?: string) {
  return object(await jsonRequest(fetcher, `${s.base}${path}`, {
    method, headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json", Prefer: "return=representation",
      ...(requestId ? { "PayPal-Request-Id": requestId } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, "PayPal request"));
}
function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers } });
}
function failure(error: unknown, headers: Record<string, string> = {}) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status, headers);
  console.error("Payment service request failed", error instanceof Error ? error.name : "UnknownError");
  return json({ error: "Payment service unavailable. Retry or contact the operator; no payment success is assumed." }, 500, headers);
}
async function getOrder(s: Settings, fetcher: Fetcher, id: string, user?: string): Promise<Json | null> {
  const rows = await db(s, fetcher, `donation_orders?select=*&id=eq.${id}${user ? `&user_id=eq.${user}` : ""}`, "GET");
  if (!Array.isArray(rows)) throw new HttpError(502, "Invalid payment storage response.");
  return rows.length ? object(rows[0]) : null;
}
function checkAmount(order: Json, expected: Json) {
  if (!Array.isArray(order.purchase_units) || order.purchase_units.length !== 1) throw new HttpError(502, "Unexpected PayPal order.");
  const unit = object(order.purchase_units[0]), amount = object(unit.amount);
  if (unit.custom_id !== expected.id || amount.currency_code !== "USD" || cents(amount.value) !== expected.amount_cents)
    throw new HttpError(409, "PayPal order does not match the stored donation.");
}
function approval(s: Settings, order: Json) {
  if (!Array.isArray(order.links)) throw new HttpError(502, "PayPal approval link is missing.");
  const link = order.links.map(object).find(item => item.rel === "payer-action" || item.rel === "approve");
  const url = new URL(text(link?.href));
  if (url.protocol !== "https:" || url.hostname !== s.approvalHost || url.username || url.password || url.port)
    throw new HttpError(502, "Invalid PayPal approval link.");
  return url.href;
}

export async function checkoutHandler(request: Request, env: PaymentEnv, fetcher: Fetcher = fetch): Promise<Response> {
  let cors: Record<string, string> = {};
  try {
    const s = settings(env);
    cors = { "Access-Control-Allow-Origin": s.app.origin, Vary: "Origin",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Access-Control-Allow-Methods": "POST, OPTIONS" };
    if (request.headers.get("Origin") !== s.app.origin) throw new HttpError(403, "Payment requests must come from the configured app.");
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") throw new HttpError(405, "Use POST.");
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Sign in with the adult account before donating.");
    const userResponse = await fetcher(`${s.db}/auth/v1/user`, {
      headers: { apikey: s.key, Authorization: authorization }, signal: AbortSignal.timeout(15000), redirect: "error",
    });
    if (!userResponse.ok) throw new HttpError(401, "The adult sign-in has expired. Sign in again.");
    const user = uuid(object(await userResponse.json()).id);
    const input = await payload(request), id = uuid(input.requestId);
    if (input.adultConfirmed !== true) throw new HttpError(403, "The responsible adult must confirm this donation.");
    if (input.action !== "create" && input.action !== "capture") throw new HttpError(400, "Unknown donation action.");
    let intent: Json;
    if (input.action === "create") {
      if (!Number.isInteger(input.amountCents) || Number(input.amountCents) < 100 || Number(input.amountCents) > 50000 || Number(input.amountCents) % 100 !== 0)
        throw new HttpError(400, "Choose a whole-dollar donation between 1 and 500 USD.");
      intent = object(await db(s, fetcher, "rpc/begin_donation", "POST", { request_id: id, cents: input.amountCents, mode: s.mode }, authorization.slice(7)));
    } else {
      const found = await getOrder(s, fetcher, id, user);
      if (!found) throw new HttpError(404, "Donation request was not found for this adult account.");
      intent = found;
    }
    if (intent.environment !== s.mode) throw new HttpError(409, "This checkout belongs to a different PayPal environment.");
    const access = await token(s, fetcher);
    let order: Json;
    if (input.action === "create" && !intent.paypal_order_id) {
      if (Date.now() - Date.parse(text(intent.created_at)) > 5 * 3600000)
        throw new HttpError(409, "This checkout attempt expired. Contact the operator before starting again.");
      const returnUrl = new URL(s.app); returnUrl.searchParams.set("donation_return", id);
      const cancelUrl = new URL(s.app); cancelUrl.searchParams.set("donation_cancel", id);
      order = await paypal(s, fetcher, access, "/v2/checkout/orders", "POST", {
        intent: "CAPTURE",
        purchase_units: [{ custom_id: id, description: "Optional support for Learn & Play Champion",
          amount: { currency_code: "USD", value: (Number(intent.amount_cents) / 100).toFixed(2) } }],
        payment_source: { paypal: { experience_context: {
          shipping_preference: "NO_SHIPPING", user_action: "CONTINUE",
          return_url: returnUrl.href, cancel_url: cancelUrl.href,
        } } },
      }, id);
      const orderId = paypalId(order.id);
      await db(s, fetcher, `donation_orders?id=eq.${id}&user_id=eq.${user}&paypal_order_id=is.null`, "PATCH", { paypal_order_id: orderId });
      const persisted = await getOrder(s, fetcher, id, user);
      if (persisted?.paypal_order_id !== orderId) throw new HttpError(409, "Checkout storage did not confirm the PayPal order. Retry the same attempt.");
      order = await paypal(s, fetcher, access, `/v2/checkout/orders/${orderId}`, "GET");
      checkAmount(order, intent);
    } else {
      order = await paypal(s, fetcher, access, `/v2/checkout/orders/${paypalId(intent.paypal_order_id)}`, "GET");
      checkAmount(order, intent);
    }
    if (input.action === "create") {
      if (order.status !== "CREATED" && order.status !== "PAYER_ACTION_REQUIRED") throw new HttpError(409, "This order already advanced. Return to your existing checkout instead.");
      return json({ approvalUrl: approval(s, order), environment: s.mode }, 200, cors);
    }
    if (order.status === "APPROVED") {
      order = await paypal(s, fetcher, access, `/v2/checkout/orders/${paypalId(intent.paypal_order_id)}/capture`,
        "POST", {}, uuid(intent.capture_request_id));
      if (order.id !== intent.paypal_order_id) throw new HttpError(409, "PayPal returned an unexpected captured order.");
    }
    if (!Array.isArray(order.purchase_units) || order.purchase_units.length !== 1)
      throw new HttpError(409, "PayPal returned unexpected capture details.");
    const units = order.purchase_units;
    const captures = object(object(units[0]).payments).captures;
    if (!Array.isArray(captures) || captures.length !== 1) throw new HttpError(409, "No confirmed capture is available. Review PayPal before trying again.");
    const capture = object(captures[0]), amount = object(capture.amount);
    if (amount.currency_code !== "USD" || cents(amount.value) !== intent.amount_cents)
      throw new HttpError(409, "The capture amount did not match the donation.");
    if (capture.status !== "COMPLETED" && capture.status !== "PENDING")
      throw new HttpError(409, "PayPal has not confirmed this payment. Check PayPal or contact the operator.");
    return json({ status: capture.status, captureId: paypalId(capture.id), environment: s.mode,
      notice: "Admin records appear only after a verified webhook. This is not a tax receipt." }, 200, cors);
  } catch (error) { return failure(error, cors); }
}

export async function webhookHandler(request: Request, env: PaymentEnv, fetcher: Fetcher = fetch): Promise<Response> {
  try {
    const s = settings(env);
    if (request.method !== "POST") throw new HttpError(405, "Use POST.");
    const event = await payload(request);
    const verification: Json = { webhook_id: s.webhookId, webhook_event: event };
    for (const [field, header] of Object.entries({
      auth_algo: "paypal-auth-algo", cert_url: "paypal-cert-url", transmission_id: "paypal-transmission-id",
      transmission_sig: "paypal-transmission-sig", transmission_time: "paypal-transmission-time",
    })) {
      const value = request.headers.get(header);
      if (!value || value.length > 2048) throw new HttpError(400, "Missing PayPal verification headers.");
      verification[field] = value;
    }
    const access = await token(s, fetcher);
    const verified = await paypal(s, fetcher, access, "/v1/notifications/verify-webhook-signature", "POST", verification);
    if (verified.verification_status !== "SUCCESS") throw new HttpError(401, "PayPal webhook verification failed.");
    const eventId = paypalId(event.id), type = text(event.event_type);
    if (!eventTypes.has(type)) return json({ ignored: "Unsupported event type" });
    const resource = object(event.resource), resourceId = paypalId(resource.id);
    let capture = resource;
    if (type === "PAYMENT.CAPTURE.REFUNDED") {
      if (!Array.isArray(resource.links)) throw new HttpError(400, "Refund is missing its capture reference.");
      const up = resource.links.map(object).find(link => link.rel === "up");
      const url = new URL(text(up?.href));
      const match = url.pathname.match(/^\/v2\/payments\/captures\/([A-Za-z0-9_-]{3,100})$/);
      const hosts = s.mode === "live" ? ["api-m.paypal.com", "api.paypal.com"] : ["api-m.sandbox.paypal.com", "api.sandbox.paypal.com"];
      if (url.protocol !== "https:" || !hosts.includes(url.hostname) || url.port || url.username || url.password || !match || url.search || url.hash)
        throw new HttpError(400, "Invalid refund capture reference.");
      // Fetch only a fixed PayPal endpoint, never a webhook-supplied arbitrary URL.
      capture = await paypal(s, fetcher, access, `/v2/payments/captures/${match[1]}`, "GET");
    }
    const orderId = paypalId(object(object(capture.supplementary_data).related_ids).order_id);
    const matches = await db(s, fetcher, `donation_orders?select=*&paypal_order_id=eq.${orderId}`, "GET");
    if (!Array.isArray(matches)) throw new HttpError(502, "Invalid payment storage response.");
    if (!matches.length) {
      // A webhook may beat the create-order storage write; retry rather than discard it.
      throw new HttpError(409, "No matching donation order yet. Retry notification or reconcile with the operator.");
    }
    const intent = object(matches[0]), captureAmount = object(capture.amount), amount = object(resource.amount);
    if (intent.environment !== s.mode) throw new HttpError(409, "Webhook environment does not match the stored donation.");
    const value = cents(amount.value);
    if (captureAmount.currency_code !== "USD" || cents(captureAmount.value) !== intent.amount_cents ||
      amount.currency_code !== "USD" || value <= 0 ||
      (type === "PAYMENT.CAPTURE.REFUNDED" ? value > Number(intent.amount_cents) : value !== intent.amount_cents))
      throw new HttpError(409, "Webhook amount does not match the stored donation.");
    const created = text(event.create_time);
    if (!Number.isFinite(Date.parse(created))) throw new HttpError(400, "Invalid webhook time.");
    await db(s, fetcher, "payment_events?on_conflict=event_id", "POST", {
      event_id: eventId, donation_id: intent.id, resource_id: resourceId, event_type: type,
      amount_cents: value, currency: "USD", provider_created_at: created,
    }, s.key, "resolution=ignore-duplicates,return=minimal");
    return json({ received: true });
  } catch (error) { return failure(error); }
}
