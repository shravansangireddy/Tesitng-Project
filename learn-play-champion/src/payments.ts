import type { SupabaseClient } from "@supabase/supabase-js";

export const checkoutEnabled = import.meta.env.VITE_PAYPAL_CHECKOUT_ENABLED === "true";
export const paymentTypes = [
  "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED",
  "PAYMENT.CAPTURE.DECLINED", "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED",
] as const;
export interface PaymentEvent {
  event_id: string;
  event_type: (typeof paymentTypes)[number];
  resource_id: string;
  paypal_order_id: string;
  amount_cents: number;
  currency: "USD";
  environment: "sandbox" | "live";
  provider_created_at: string;
  received_at: string;
}
function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
const id = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{3,100}$/.test(value);
const date = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
export function parsePaymentEvents(value: unknown): PaymentEvent[] {
  if (!Array.isArray(value) || value.length > 25) throw new Error("Invalid payment ledger response.");
  const rows = value.map((row: unknown): PaymentEvent => {
    if (!object(row) || !id(row.event_id) || !id(row.resource_id) || !id(row.paypal_order_id) ||
      !paymentTypes.some(type => type === row.event_type) || !Number.isInteger(row.amount_cents) ||
      Number(row.amount_cents) <= 0 || Number(row.amount_cents) > 50000 || row.currency !== "USD" ||
      (row.environment !== "sandbox" && row.environment !== "live") || !date(row.received_at) || !date(row.provider_created_at))
      throw new Error("The payment service returned an invalid ledger entry.");
    return {
      event_id: row.event_id, resource_id: row.resource_id, paypal_order_id: row.paypal_order_id,
      event_type: row.event_type as PaymentEvent["event_type"], amount_cents: Number(row.amount_cents),
      currency: row.currency, environment: row.environment, received_at: row.received_at, provider_created_at: row.provider_created_at,
    };
  });
  if (new Set(rows.map(row => row.event_id)).size !== rows.length) throw new Error("Duplicate payment events in ledger response.");
  return rows;
}
export async function paymentAdmin(client: SupabaseClient) {
  const { data, error } = await client.rpc("is_payment_admin");
  if (error) throw new Error(`Could not check administrator access: ${error.message}. Deploy the payments migration.`);
  if (typeof data !== "boolean") throw new Error("Invalid administrator access response.");
  return data;
}
export async function loadPaymentEvents(client: SupabaseClient, before?: PaymentEvent) {
  const { data, error } = await client.rpc("admin_payment_events", {
    before_time: before?.received_at ?? null, before_event: before?.event_id ?? null,
  });
  if (error) throw new Error(`Could not load payment records: ${error.message}`);
  return parsePaymentEvents(data);
}
export async function checkoutRequest(client: SupabaseClient, body: {
  action: "create" | "capture"; requestId: string; amountCents?: number;
}) {
  const { data, error } = await client.functions.invoke("paypal-checkout", { body: { ...body, adultConfirmed: true } });
  if (error) throw new Error("PayPal checkout request failed. Check sign-in, connection, and payment deployment. Retry the same attempt; check PayPal before starting another.");
  if (!object(data)) throw new Error("Invalid checkout response.");
  if (typeof data.error === "string") throw new Error(data.error);
  if (data.environment !== "sandbox" && data.environment !== "live") throw new Error("Invalid PayPal environment.");
  if (body.action === "create") {
    if (typeof data.approvalUrl !== "string") throw new Error("PayPal approval link was missing.");
    const url = new URL(data.approvalUrl);
    const expected = data.environment === "live" ? "www.paypal.com" : "www.sandbox.paypal.com";
    if (url.protocol !== "https:" || url.hostname !== expected || url.username || url.password || url.port)
      throw new Error("Invalid PayPal approval link.");
    return { approvalUrl: url.href, environment: data.environment };
  }
  if ((data.status !== "COMPLETED" && data.status !== "PENDING") || !id(data.captureId))
    throw new Error("PayPal did not confirm a capture. Check PayPal before trying again.");
  return { status: data.status, captureId: data.captureId, environment: data.environment };
}
export function donationReturn() {
  const query = new URLSearchParams(location.search);
  const raw = query.get("donation_return");
  return raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw) ? raw : null;
}
