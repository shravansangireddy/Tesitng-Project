// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

const state = vi.hoisted(() => ({ enabled: false }));
vi.mock("./payments", async importOriginal => ({
  ...await importOriginal<typeof import("./payments")>(),
  get checkoutEnabled() { return state.enabled; },
}));
import DonationPanel from "./DonationPanel";
import PaymentAdmin from "./PaymentAdmin";
import { checkoutRequest, parsePaymentEvents } from "./payments";
import { loadParentPointsStore, parentPointsAccountFor } from "./parent-points";
import App from "./App";
import { STORAGE_KEY } from "./game";

let root: Root, container: HTMLDivElement;
const requestId = "11111111-1111-4111-8111-111111111111";
const row = {
  event_id: "WH-TEST", event_type: "PAYMENT.CAPTURE.COMPLETED", resource_id: "CAPTURE123",
  paypal_order_id: "ORDER123", currency: "USD", amount_cents: 500, environment: "sandbox",
  provider_created_at: "2026-10-29T12:00:00Z", received_at: "2026-10-29T12:01:00Z",
};
function client(rpc: ReturnType<typeof vi.fn>, invoke = vi.fn()) {
  return { rpc, functions: { invoke } } as unknown as SupabaseClient;
}
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  state.enabled = false; localStorage.clear(); history.replaceState(null, "", "/");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });

describe("connected donations", () => {
  it("keeps donation/operator links hidden until adult confirmation and requires adult sign-in", async () => {
    await act(async () => root.render(<DonationPanel adult={false} />));
    expect(container.querySelector("a")).toBeNull();
    expect(container.querySelector(".payment-admin")).toBeNull();
    await act(async () => root.render(<DonationPanel adult />));
    expect(container.textContent).toContain("Sign in with the responsible adult");
    expect(container.querySelector(".payment-admin")).toBeNull();
  });
  it("shows configuration instructions without pretending checkout is connected", async () => {
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn())} />));
    expect(button("Donate with PayPal").disabled).toBe(true);
    expect(container.textContent).toContain("Connected checkout is not configured");
    expect(container.textContent).toContain("does not grant administrator access");
  });
  it("reuses the same request ID on a failed create instead of silently starting a new payment", async () => {
    state.enabled = true;
    const invoke = vi.fn().mockResolvedValue({ data: null, error: new Error("Offline") });
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), invoke)} />));
    await click(button("Donate with PayPal"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("same attempt");
    // The panel also asks the server for its public checkout config on mount
    // (for Google Pay eligibility), so select the create calls by action.
    const creates = () => invoke.mock.calls.filter(call => call[1].body.action === "create");
    const first = creates()[0][1].body;
    expect(first).toMatchObject({ action: "create", amountCents: 500, adultConfirmed: true });
    expect(container.querySelector<HTMLSelectElement>("select")?.disabled).toBe(true);
    await click(button("Retry the same"));
    expect(creates()).toHaveLength(2);
    expect(creates()[1][1].body.requestId).toBe(first.requestId);
  });
  it("does not capture automatically from a forged return link and shows pending accurately", async () => {
    state.enabled = true;
    history.replaceState(null, "", `/?donation_return=${requestId}&token=UNTRUSTED&PayerID=UNTRUSTED`);
    const invoke = vi.fn().mockResolvedValue({ data: { status: "PENDING", captureId: "CAPTURE123", environment: "sandbox" }, error: null });
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), invoke)} />));
    expect(invoke).not.toHaveBeenCalled();
    await click(button("Complete approved donation"));
    expect(invoke).toHaveBeenCalledWith("paypal-checkout", { body: { action: "capture", requestId, adultConfirmed: true } });
    expect(container.textContent).toContain("pending capture, not a completed donation");
    expect(location.search).toBe("");
  });
  it("discards a late approval response when the adult confirmation is withdrawn", async () => {
    state.enabled = true;
    let finish!: (value: { data: { approvalUrl: string; environment: string }; error: null }) => void;
    const invoke = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const connected = client(vi.fn(), invoke);
    await act(async () => root.render(<DonationPanel adult client={connected} />));
    await click(button("Donate with PayPal"));
    await act(async () => root.render(<DonationPanel adult={false} client={connected} />));
    await act(async () => finish({ data: {
      environment: "sandbox", approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123",
    }, error: null }));
    expect(container.textContent).toContain("Confirm you are the responsible adult");
    expect(location.pathname).toBe("/");
    expect(container.querySelector(".payment-admin")).toBeNull();
  });
  it("does not follow approval URLs outside PayPal or accept success-shaped invalid responses", async () => {
    for (const data of [
      { environment: "live", approvalUrl: "https://evil.example/pay" },
      { environment: "sandbox", approvalUrl: "https://www.paypal.com/checkoutnow" },
      { environment: "live", approvalUrl: "https://name:password@www.paypal.com/checkoutnow" },
      { environment: "live", status: "COMPLETED" },
    ]) {
      await expect(checkoutRequest(client(vi.fn(), vi.fn().mockResolvedValue({ data, error: null })),
        { action: data.approvalUrl ? "create" : "capture", requestId })).rejects.toThrow();
    }
  });
  it("exposes donations only inside the grown-up privacy area without changing learning progress", async () => {
    await act(async () => root.render(<App />));
    expect(container.querySelector(".donation-panel")).toBeNull();
    await click(button("Privacy & data"));
    expect(container.querySelector(".donation-panel")).not.toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
describe("google pay donations", () => {
  const gpSdkConfig = {
    allowedPaymentMethods: [{ type: "CARD",
      parameters: { allowedAuthMethods: ["PAN_TOKEN", "CRYPTOGRAM_3DS"], allowedCardNetworks: ["VISA"] },
      tokenizationSpecification: { type: "PAYMENT_GATEWAY", parameters: { gateway: "paypal", gatewayMerchantId: "MERCHANT123" } } }],
    countryCode: "US", merchantInfo: { merchantName: "Learn & Play Champion" },
  };
  interface GpWindow { paypal?: unknown; google?: unknown }
  let callbacks: { onPaymentAuthorized(paymentData: unknown): Promise<unknown> } | null;
  let clientOptions: Record<string, unknown>[];
  let paymentRequests: Record<string, unknown>[];
  function installGooglePay(sheet: "authorize" | "cancel", ready = true) {
    const order: string[] = [];
    const confirmOrder = vi.fn(async () => { order.push("confirmOrder"); return { status: "APPROVED" }; });
    class PaymentsClient {
      constructor(options: Record<string, unknown>) {
        clientOptions.push(options);
        callbacks = options.paymentDataCallbacks as typeof callbacks;
      }
      isReadyToPay() { return Promise.resolve({ result: ready }); }
      async loadPaymentData(request: Record<string, unknown>) {
        paymentRequests.push(request);
        if (sheet === "cancel") throw { statusCode: "CANCELED" };
        return callbacks?.onPaymentAuthorized({ paymentMethodData: { type: "CARD", info: {} } });
      }
    }
    Object.assign(window, {
      paypal: { Googlepay: () => ({ config: async () => gpSdkConfig, confirmOrder }) },
      google: { payments: { api: { PaymentsClient } } },
    });
    return { order, confirmOrder };
  }
  function gpInvoke(order: string[], configEnabled = true) {
    return vi.fn().mockImplementation((_name: string, args: { body: Record<string, unknown> }) => {
      order.push(`invoke:${String(args.body.action)}`);
      if (args.body.action === "config") return Promise.resolve({ data: configEnabled
        ? { enabled: true, environment: "sandbox", clientId: "CLIENT123" }
        : { enabled: false, environment: null, clientId: null }, error: null });
      if (args.body.action === "create") return Promise.resolve({ data: { orderId: "ORDER123", environment: "sandbox" }, error: null });
      if (args.body.action === "capture") return Promise.resolve({ data: { status: "COMPLETED", captureId: "CAPTURE123", environment: "sandbox" }, error: null });
      return Promise.resolve({ data: null, error: new Error("Unexpected action") });
    });
  }
  async function flush(rounds = 8) {
    for (let i = 0; i < rounds; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  }
  function googlePayButton() {
    return [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes("Google Pay"));
  }
  beforeEach(() => { callbacks = null; clientOptions = []; paymentRequests = []; });
  afterEach(() => { delete (window as GpWindow).paypal; delete (window as GpWindow).google; });
  it("renders no Google Pay button when the device is not eligible", async () => {
    state.enabled = true;
    const { order } = installGooglePay("authorize", false);
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), gpInvoke(order))} />));
    await flush();
    expect(googlePayButton()).toBeUndefined();
    expect(button("Donate with PayPal")).toBeDefined();
  });
  it("renders no Google Pay button when the server reports checkout disabled", async () => {
    state.enabled = true;
    const { order } = installGooglePay("authorize");
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), gpInvoke(order, false))} />));
    await flush();
    expect(googlePayButton()).toBeUndefined();
    expect(order).toEqual(["invoke:config"]);
  });
  it("renders the Google Pay button when the device is eligible", async () => {
    state.enabled = true;
    const { order } = installGooglePay("authorize");
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), gpInvoke(order))} />));
    await flush();
    expect(googlePayButton()).toBeDefined();
    expect(clientOptions[0]).toMatchObject({ environment: "TEST" });
    expect(order).toEqual(["invoke:config"]);
  });
  it("creates, confirms, and captures in order and reports the completed capture", async () => {
    state.enabled = true;
    const gp = installGooglePay("authorize");
    const invoke = gpInvoke(gp.order);
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), invoke)} />));
    await flush();
    await click(googlePayButton()!);
    await flush();
    expect(gp.order).toEqual(["invoke:config", "invoke:create", "confirmOrder", "invoke:capture"]);
    const bodies = invoke.mock.calls.map(call => call[1].body);
    const create = bodies.find(body => body.action === "create");
    const capture = bodies.find(body => body.action === "capture");
    expect(create).toMatchObject({ amountCents: 500, wallet: "googlepay", adultConfirmed: true });
    expect(capture.requestId).toBe(create.requestId);
    expect(gp.confirmOrder).toHaveBeenCalledWith({ orderId: "ORDER123", paymentMethodData: { type: "CARD", info: {} } });
    expect(paymentRequests[0].transactionInfo).toMatchObject({ totalPrice: "5.00", currencyCode: "USD", countryCode: "US" });
    expect(paymentRequests[0].callbackIntents).toEqual(["PAYMENT_AUTHORIZATION"]);
    expect(container.textContent).toContain("PayPal reports a completed capture (CAPTURE123)");
    expect(container.textContent).toContain("Sandbox test only — no real money.");
  });
  it("awards parent points once for the completed Google Pay donation", async () => {
    state.enabled = true;
    const gp = installGooglePay("authorize");
    const invoke = gpInvoke(gp.order);
    const authed = { rpc: vi.fn(), functions: { invoke },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "adult-one" } } }) } } as unknown as SupabaseClient;
    await act(async () => root.render(<DonationPanel adult client={authed} />));
    await flush();
    await click(googlePayButton()!);
    await flush();
    expect(container.textContent).toContain("PayPal reports a completed capture (CAPTURE123)");
    const account = parentPointsAccountFor(loadParentPointsStore(), "adult-one");
    expect(account.totals.general).toBe(20);
    expect(account.recent[0].label).toBe("Donation — thank you");
    expect(account.eventKeys).toHaveLength(1);
    expect(account.eventKeys[0]).toMatch(/^donation:/);
  });
  it("awards no parent points when the Google Pay sheet is cancelled", async () => {
    state.enabled = true;
    const gp = installGooglePay("cancel");
    const invoke = gpInvoke(gp.order);
    const authed = { rpc: vi.fn(), functions: { invoke },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "adult-one" } } }) } } as unknown as SupabaseClient;
    await act(async () => root.render(<DonationPanel adult client={authed} />));
    await flush();
    await click(googlePayButton()!);
    await flush();
    expect(container.textContent).toContain("Google Pay checkout was cancelled. No success is assumed.");
    expect(parentPointsAccountFor(loadParentPointsStore(), "adult-one").totals.general).toBe(0);
  });
  it("shows no success when the user cancels the Google Pay sheet", async () => {
    state.enabled = true;
    const gp = installGooglePay("cancel");
    const invoke = gpInvoke(gp.order);
    await act(async () => root.render(<DonationPanel adult client={client(vi.fn(), invoke)} />));
    await flush();
    await click(googlePayButton()!);
    await flush();
    expect(gp.order).toEqual(["invoke:config"]);
    expect(container.textContent).toContain("Google Pay checkout was cancelled. No success is assumed.");
    expect(container.textContent).not.toContain("completed capture");
  });
});
describe("parent points for donations", () => {
  function authedClient(invoke: ReturnType<typeof vi.fn>, userId: string | null = "adult-one") {
    return { rpc: vi.fn(), functions: { invoke },
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    } as unknown as SupabaseClient;
  }
  async function flush(rounds = 8) {
    for (let i = 0; i < rounds; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  }
  const completedInvoke = () => vi.fn().mockResolvedValue({
    data: { status: "COMPLETED", captureId: "CAPTURE123", environment: "sandbox" }, error: null,
  });
  it("awards 20 parent points once when the returned donation capture completes", async () => {
    state.enabled = true;
    history.replaceState(null, "", `/?donation_return=${requestId}`);
    const invoke = completedInvoke();
    await act(async () => root.render(<DonationPanel adult client={authedClient(invoke)} />));
    await click(button("Complete approved donation"));
    await flush();
    expect(container.textContent).toContain("PayPal reports a completed capture (CAPTURE123)");
    const account = parentPointsAccountFor(loadParentPointsStore(), "adult-one");
    expect(account.totals.general).toBe(20);
    expect(account.eventKeys).toEqual([`donation:${requestId}`]);
    expect(account.recent[0].label).toBe("Donation — thank you");
    // Replaying the same return (refresh, revisit, retry) never pays twice.
    await act(async () => root.unmount());
    root = createRoot(container);
    history.replaceState(null, "", `/?donation_return=${requestId}`);
    await act(async () => root.render(<DonationPanel adult client={authedClient(invoke)} />));
    await click(button("Complete approved donation"));
    await flush();
    expect(parentPointsAccountFor(loadParentPointsStore(), "adult-one").totals.general).toBe(20);
  });
  it("awards nothing for a pending capture", async () => {
    state.enabled = true;
    history.replaceState(null, "", `/?donation_return=${requestId}`);
    const invoke = vi.fn().mockResolvedValue({
      data: { status: "PENDING", captureId: "CAPTURE123", environment: "sandbox" }, error: null,
    });
    await act(async () => root.render(<DonationPanel adult client={authedClient(invoke)} />));
    await click(button("Complete approved donation"));
    await flush();
    expect(container.textContent).toContain("pending capture, not a completed donation");
    const account = parentPointsAccountFor(loadParentPointsStore(), "adult-one");
    expect(account.totals.general).toBe(0);
    expect(account.eventKeys).toEqual([]);
  });
  it("completes the donation but awards nothing when nobody is signed in", async () => {
    state.enabled = true;
    history.replaceState(null, "", `/?donation_return=${requestId}`);
    await act(async () => root.render(<DonationPanel adult client={authedClient(completedInvoke(), null)} />));
    await click(button("Complete approved donation"));
    await flush();
    expect(container.textContent).toContain("PayPal reports a completed capture (CAPTURE123)");
    expect(loadParentPointsStore()).toEqual({ accounts: {} });
  });
});
describe("protected payment console", () => {
  it("does not request the ledger for an ordinary adult, regardless of UI access", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    await act(async () => root.render(<PaymentAdmin client={client(rpc)} />));
    await click(button("Open payment records"));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("is_payment_admin");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Access denied");
    expect(container.querySelector("table")).toBeNull();
  });
  it("renders verified events, supports keyset pagination, and clears records after revocation", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({ ...row, event_id: `WH-${100 - i}` }));
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: rows, error: null })
      .mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ ...row, event_id: "WH-OLD", event_type: "PAYMENT.CAPTURE.REFUNDED", amount_cents: 200 }], error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    await act(async () => root.render(<PaymentAdmin client={client(rpc)} />));
    await click(button("Open payment records"));
    expect(container.querySelectorAll("tbody tr")).toHaveLength(25);
    expect(container.textContent).toContain("Sandbox — test");
    expect(container.textContent).toContain("Do not add these rows together");
    await click(button("Load older"));
    expect(rpc).toHaveBeenCalledWith("admin_payment_events", { before_time: row.received_at, before_event: "WH-76" });
    expect(container.querySelectorAll("tbody tr")).toHaveLength(26);
    expect(container.textContent).toContain("2.00 USD");
    await click(button("Refresh payment records"));
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Access denied");
  });
  it("reports missing migrations and malformed ledger responses, not empty success", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({ data: [{ ...row, amount_cents: -1 }], error: null });
    await act(async () => root.render(<PaymentAdmin client={client(rpc)} />));
    await click(button("Open payment records"));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("invalid ledger entry");
    for (const data of [null, [{ ...row, currency: "EUR" }], [row, row], [{ ...row, event_type: "fake" }]]) {
      expect(() => parsePaymentEvents(data)).toThrow();
    }
  });
});
