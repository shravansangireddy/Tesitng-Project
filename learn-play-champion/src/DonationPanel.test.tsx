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
    const first = invoke.mock.calls[0][1].body;
    expect(first).toMatchObject({ action: "create", amountCents: 500, adultConfirmed: true });
    expect(container.querySelector<HTMLSelectElement>("select")?.disabled).toBe(true);
    await click(button("Retry the same"));
    expect(invoke.mock.calls[1][1].body.requestId).toBe(first.requestId);
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
