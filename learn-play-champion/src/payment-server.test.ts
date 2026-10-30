// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { checkoutHandler, webhookHandler, cents } from "../supabase/functions/_shared/payments";

const userId = "11111111-1111-4111-8111-111111111111";
const requestId = "22222222-2222-4222-8222-222222222222";
const captureKey = "33333333-3333-4333-8333-333333333333";
const config: Record<string, string> = {
  PAYMENTS_ENABLED: "true", PAYPAL_ENV: "sandbox", APP_BASE_URL: "https://learn.example/",
  SUPABASE_URL: "https://db.example", SUPABASE_SERVICE_ROLE_KEY: "server-key",
  PAYPAL_CLIENT_ID: "client-id", PAYPAL_CLIENT_SECRET: "server-secret", PAYPAL_WEBHOOK_ID: "configured-hook",
};
const env = (key: string) => config[key];
const intent = { id: requestId, user_id: userId, amount_cents: 500, paypal_order_id: "ORDER123",
  capture_request_id: captureKey, environment: "sandbox", created_at: new Date().toISOString() };
const amount = { value: "5.00", currency_code: "USD" };
const capture = { id: "CAPTURE123", status: "COMPLETED", amount,
  supplementary_data: { related_ids: { order_id: "ORDER123" } } };
const order = (status: string, captured = capture) => ({
  id: "ORDER123", status, purchase_units: [{ custom_id: requestId, amount, payments: { captures: [captured] } }],
  links: [{ rel: "payer-action", href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123" }],
});
const event = { id: "WH-TEST", event_type: "PAYMENT.CAPTURE.COMPLETED", resource: capture, create_time: "2026-10-29T12:00:00Z" };
function checkout(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://db.example/functions/v1/paypal-checkout", { method: "POST",
    headers: { Origin: "https://learn.example", Authorization: "Bearer user-jwt", ...headers }, body: JSON.stringify(body) });
}
function webhook(body: unknown = event, headers: Record<string, string> = {}) {
  return new Request("https://db.example/functions/v1/paypal-webhook", { method: "POST", headers: {
    "paypal-auth-algo": "SHA256withRSA", "paypal-cert-url": "https://api.paypal.com/cert",
    "paypal-transmission-id": "transmission", "paypal-transmission-sig": "signature",
    "paypal-transmission-time": "2026-10-29T12:00:00Z", ...headers,
  }, body: JSON.stringify(body) });
}
interface Reply { path: string; data?: unknown; status?: number }
function service(replies: Reply[]) {
  let index = 0;
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    const next = replies[index++];
    if (!next) throw new Error(`Unexpected fetch ${url}`);
    expect(String(url)).toContain(next.path);
    if (init?.body && String(url).includes("api-m.")) {
      expect(String(init.body)).not.toContain("user-jwt");
      expect(String(init.body)).not.toContain(userId);
    }
    return new Response(next.status === 204 ? null : JSON.stringify(next.data), { status: next.status ?? 200,
      headers: { "Content-Type": "application/json" } });
  });
  return fetcher;
}
const auth = { path: "/auth/v1/user", data: { id: userId } };
const oauth = { path: "/v1/oauth2/token", data: { access_token: "paypal-access" } };
const verified = { path: "/verify-webhook-signature", data: { verification_status: "SUCCESS" } };
afterEach(() => vi.restoreAllMocks());

describe("server checkout authority", () => {
  it("fails closed for disabled configuration, wrong origin, or an unauthenticated account", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect((await checkoutHandler(checkout({}), key => key === "PAYMENTS_ENABLED" ? "false" : env(key), fetcher)).status).toBe(503);
    expect((await checkoutHandler(checkout({}, { Origin: "https://evil.example" }), env, fetcher)).status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
    const expired = service([{ path: "/auth/v1/user", data: {}, status: 401 }]);
    expect((await checkoutHandler(checkout({}), env, expired)).status).toBe(401);
  });
  it("requires adult confirmation and integer whole-dollar USD bounds", async () => {
    for (const body of [
      { action: "create", requestId, amountCents: 500 },
      ...[0, 99, 550, 50001, 1.5, "500"].map(amountCents => ({ action: "create", requestId, amountCents, adultConfirmed: true })),
    ]) {
      const fetcher = service([auth]);
      expect((await checkoutHandler(checkout(body), env, fetcher)).status).toBe("adultConfirmed" in body && body.adultConfirmed ? 400 : 403);
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });
  it("creates a server-priced order with opaque IDs and stores it before returning approval", async () => {
    const fetcher = service([auth,
      { path: "/rpc/begin_donation", data: { ...intent, paypal_order_id: null } }, oauth,
      { path: "/v2/checkout/orders", data: order("PAYER_ACTION_REQUIRED") },
      { path: "donation_orders?id=", status: 204 }, { path: "donation_orders?select=", data: [intent] },
      { path: "/orders/ORDER123", data: order("PAYER_ACTION_REQUIRED") },
    ]);
    const result = await checkoutHandler(checkout({ action: "create", requestId, amountCents: 500, adultConfirmed: true }), env, fetcher);
    expect(result.status).toBe(200);
    expect(await result.json()).toMatchObject({ environment: "sandbox", approvalUrl: expect.stringContaining("www.sandbox.paypal.com") });
    const body = JSON.parse(String(fetcher.mock.calls[3][1]?.body));
    expect(body.purchase_units[0]).toMatchObject({ custom_id: requestId, amount });
    expect(body.payment_source.paypal.experience_context.shipping_preference).toBe("NO_SHIPPING");
    expect(body.payment_source.paypal.experience_context.return_url).toBe(`https://learn.example/?donation_return=${requestId}`);
    expect(new Headers(fetcher.mock.calls[3][1]?.headers).get("PayPal-Request-Id")).toBe(requestId);
    expect(new Headers(fetcher.mock.calls[1][1]?.headers).get("Authorization")).toBe("Bearer user-jwt");
  });
  it("does not capture an order for a different adult or use an untrusted callback token", async () => {
    const fetcher = service([auth, { path: `user_id=eq.${userId}`, data: [] }]);
    const response = await checkoutHandler(checkout({ action: "capture", requestId, token: "FORGED", adultConfirmed: true }), env, fetcher);
    expect(response.status).toBe(404);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("captures only the stored approved order with a stable server capture idempotency key", async () => {
    const fetcher = service([auth, { path: "donation_orders?select=", data: [intent] }, oauth,
      { path: "/orders/ORDER123", data: order("APPROVED") }, { path: "/orders/ORDER123/capture", data: {
        id: "ORDER123", purchase_units: [{ payments: { captures: [capture] } }],
      } },
    ]);
    const response = await checkoutHandler(checkout({ action: "capture", requestId, adultConfirmed: true }), env, fetcher);
    expect(await response.json()).toMatchObject({ status: "COMPLETED", captureId: "CAPTURE123" });
    expect(new Headers(fetcher.mock.calls[4][1]?.headers).get("PayPal-Request-Id")).toBe(captureKey);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes("payment_events"))).toBe(false);
  });
  it("does not capture again when PayPal already reports a completed order", async () => {
    const fetcher = service([auth, { path: "donation_orders?select=", data: [intent] }, oauth,
      { path: "/orders/ORDER123", data: order("COMPLETED") }]);
    const response = await checkoutHandler(checkout({ action: "capture", requestId, adultConfirmed: true }), env, fetcher);
    expect(response.status).toBe(200); expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("rejects mismatched provider amounts before attempting a capture", async () => {
    const wrong = order("APPROVED"); wrong.purchase_units[0].amount = { ...amount, value: "50.00" };
    const fetcher = service([auth, { path: "donation_orders?select=", data: [intent] }, oauth, { path: "/orders/ORDER123", data: wrong }]);
    expect((await checkoutHandler(checkout({ action: "capture", requestId, adultConfirmed: true }), env, fetcher)).status).toBe(409);
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("exposes a storage/PayPal failure instead of returning success", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetcher = service([auth, { path: "/rpc/begin_donation", status: 400, data: { message: "rate limited" } }]);
    const response = await checkoutHandler(checkout({ action: "create", requestId, amountCents: 500, adultConfirmed: true }), env, fetcher);
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("server-secret");
  });
});
describe("PayPal webhook verification and minimal ledger", () => {
  it("does not write records for missing headers or failed signature verification", async () => {
    const empty = vi.fn<typeof fetch>();
    expect((await webhookHandler(webhook(event, { "paypal-transmission-sig": "" }), env, empty)).status).toBe(400);
    expect(empty).not.toHaveBeenCalled();
    const fetcher = service([oauth, { path: "/verify-webhook-signature", data: { verification_status: "FAILURE" } }]);
    expect((await webhookHandler(webhook(), env, fetcher)).status).toBe(401);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("verifies against the configured webhook ID and inserts only minimal verified fields", async () => {
    const fetcher = service([oauth, verified, { path: "paypal_order_id=eq.ORDER123", data: [intent] },
      { path: "payment_events?on_conflict=event_id", status: 204 }]);
    const response = await webhookHandler(webhook({ ...event, resource: { ...capture, payer: { email_address: "private@example.com" } } }), env, fetcher);
    expect(response.status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({ webhook_id: "configured-hook", transmission_sig: "signature" });
    const stored = JSON.parse(String(fetcher.mock.calls[3][1]?.body));
    expect(stored).toEqual({ event_id: "WH-TEST", donation_id: requestId, resource_id: "CAPTURE123",
      event_type: "PAYMENT.CAPTURE.COMPLETED", amount_cents: 500, currency: "USD", provider_created_at: event.create_time });
    expect(new Headers(fetcher.mock.calls[3][1]?.headers).get("Prefer")).toContain("ignore-duplicates");
  });
  it("rejects unknown/mismatched orders and amounts instead of crediting fake donations", async () => {
    for (const [body, rows] of [
      [event, []],
      [{ ...event, resource: { ...capture, amount: { ...amount, value: "10.00" } } }, [intent]],
      [event, [{ ...intent, environment: "live" }]],
    ] as const) {
      const fetcher = service([oauth, verified, { path: "donation_orders?", data: rows }]);
      expect((await webhookHandler(webhook(body), env, fetcher)).status).toBe(409);
      expect(fetcher).toHaveBeenCalledTimes(3);
    }
  });
  it("records partial refunds even if the original capture event arrives later", async () => {
    const refund = { ...event, id: "WH-REFUND", event_type: "PAYMENT.CAPTURE.REFUNDED", resource: {
      id: "REFUND123", status: "COMPLETED", amount: { value: "2.00", currency_code: "USD" },
      links: [{ rel: "up", href: "https://api.sandbox.paypal.com/v2/payments/captures/CAPTURE123" }],
    } };
    const fetcher = service([oauth, verified, { path: "/v2/payments/captures/CAPTURE123", data: capture },
      { path: "paypal_order_id=eq.ORDER123", data: [intent] }, { path: "payment_events", status: 204 }]);
    expect((await webhookHandler(webhook(refund), env, fetcher)).status).toBe(200);
    expect(JSON.parse(String(fetcher.mock.calls[4][1]?.body))).toMatchObject({ amount_cents: 200, event_type: "PAYMENT.CAPTURE.REFUNDED", resource_id: "REFUND123" });
  });
  it("never fetches a webhook-provided arbitrary refund URL", async () => {
    const fetcher = service([oauth, verified]);
    const response = await webhookHandler(webhook({ ...event, event_type: "PAYMENT.CAPTURE.REFUNDED", resource: {
      ...capture, links: [{ rel: "up", href: "http://169.254.169.254/v2/payments/captures/CAPTURE123" }],
    } }), env, fetcher);
    expect(response.status).toBe(400); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("rejects oversized payloads and malformed monetary amounts", async () => {
    const fetcher = vi.fn<typeof fetch>();
    expect((await webhookHandler(webhook({ huge: "x".repeat(66000) }), env, fetcher)).status).toBe(413);
    expect(fetcher).not.toHaveBeenCalled();
    for (const value of ["-1.00", "1.001", "1e2", "5", "5,00", null]) expect(() => cents(value)).toThrow();
    expect(cents("12.34")).toBe(1234);
  });
});
