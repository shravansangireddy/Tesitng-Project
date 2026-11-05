// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import PrivacyConsent from "./PrivacyConsent";
import PrivacyCenter from "./PrivacyCenter";
import { initialProgress } from "./game";
import { PRIVACY_CONSENT_UNAVAILABLE_MESSAGE } from "./privacy-consent";

const AGREED_ROW = {
  id: "consent-1",
  user_id: "adult-one",
  policy_version: "2026-11-04",
  notice_url: null,
  accepted_at: "2026-11-04T15:30:00Z",
  withdrawn_at: null,
};
const WITHDRAWN_ROW = {
  ...AGREED_ROW,
  withdrawn_at: "2026-11-05T14:00:00Z",
};

interface CardStubOptions {
  row?: unknown;
  fetchError?: unknown;
  recordRow?: unknown;
  withdrawRow?: unknown;
}

/** Stub for the consent card: one table read plus the two RPCs. */
function stubCardClient(options: CardStubOptions = {}) {
  const rpcCalls: string[] = [];
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => ({
      data: options.row ?? null,
      error: options.fetchError ?? null,
    }),
  };
  const client = {
    from: vi.fn(() => builder),
    rpc: vi.fn(async (name: string) => {
      rpcCalls.push(name);
      if (name === "record_my_privacy_policy_consent")
        return { data: options.recordRow ?? AGREED_ROW, error: null };
      if (name === "withdraw_my_privacy_policy_consent")
        return { data: options.withdrawRow ?? WITHDRAWN_ROW, error: null };
      return { data: null, error: null };
    }),
  } as unknown as SupabaseClient;
  return { client, rpcCalls };
}

/** Broad stub for the whole Parents dashboard (wiring checks only). */
function stubDashboardClient() {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: unknown) => void) =>
      resolve({ data: [], error: null }),
  };
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
    },
    from: vi.fn(() => builder),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    functions: { invoke: vi.fn() },
  } as unknown as SupabaseClient;
  return client;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find(
    (b) => b.textContent?.includes(text),
  );
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}
async function click(element: HTMLElement) {
  await act(async () => element.click());
}

describe("Privacy policy agreement card", () => {
  it("shows a loading state while the stored agreement loads", async () => {
    let resolveFetch: ((value: unknown) => void) | undefined;
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const builder: Record<string, unknown> = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => pending,
    };
    const client = {
      from: vi.fn(() => builder),
      rpc: vi.fn(),
    } as unknown as SupabaseClient;
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.textContent).toContain("Loading your privacy agreement");
    await act(async () => resolveFetch?.({ data: null, error: null }));
    expect(container.textContent).toContain("I agree to the Privacy Policy");
  });

  it("offers agreement when none is stored, then shows the recorded agreement", async () => {
    const { client, rpcCalls } = stubCardClient({ row: null });
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.textContent).toContain(
      "Your agreement is saved to your account, so you can see it any time, on any device.",
    );
    await click(button("I agree to the Privacy Policy"));
    expect(rpcCalls).toEqual(["record_my_privacy_policy_consent"]);
    expect(container.textContent).toContain(
      "You agreed to the Privacy Policy (version 2026-11-04) on",
    );
    expect(container.textContent).toContain("Nov 4, 2026");
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        b.textContent?.includes("I agree"),
      ),
    ).toBe(false);
  });

  it("shows the stored agreement with its date and withdraws only after confirm", async () => {
    const { client, rpcCalls } = stubCardClient({ row: AGREED_ROW });
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.textContent).toContain(
      "You agreed to the Privacy Policy (version 2026-11-04) on",
    );
    expect(container.textContent).toContain("Nov 4, 2026");

    vi.spyOn(window, "confirm").mockReturnValue(false);
    await click(button("Withdraw agreement"));
    expect(rpcCalls).toEqual([]);

    vi.mocked(window.confirm).mockReturnValue(true);
    await click(button("Withdraw agreement"));
    expect(rpcCalls).toEqual(["withdraw_my_privacy_policy_consent"]);
    expect(container.textContent).toContain("You withdrew your agreement on");
    expect(container.textContent).toContain("Nov 5, 2026");
    // And the parent can agree again right away.
    expect(button("I agree to the Privacy Policy")).toBeDefined();
  });

  it("shows a withdrawn agreement with a fresh agree button", async () => {
    const { client } = stubCardClient({ row: WITHDRAWN_ROW });
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.textContent).toContain("You withdrew your agreement on");
    expect(container.textContent).not.toContain("You agreed to the Privacy Policy");
    await click(button("I agree to the Privacy Policy"));
    expect(container.textContent).toContain(
      "You agreed to the Privacy Policy (version 2026-11-04) on",
    );
  });

  it("says saving is unavailable when the consent table is not deployed", async () => {
    const { client } = stubCardClient({
      fetchError: {
        code: "PGRST205",
        message:
          "Could not find the table 'public.parent_privacy_consents' in the schema cache",
      },
    });
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.textContent).toContain(
      PRIVACY_CONSENT_UNAVAILABLE_MESSAGE,
    );
    expect(
      [...container.querySelectorAll("button")].some((b) =>
        b.textContent?.includes("I agree"),
      ),
    ).toBe(false);
  });

  it("surfaces ordinary load failures as an alert", async () => {
    const { client } = stubCardClient({
      fetchError: { message: "connection reset" },
    });
    await act(async () => root.render(<PrivacyConsent client={client} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "connection reset",
    );
  });
});

describe("Privacy policy agreement in the Parents dashboard", () => {
  it("renders for a grown-up cloud session", async () => {
    const client = stubDashboardClient();
    await act(async () =>
      root.render(
        <PrivacyCenter
          progress={initialProgress}
          cloud
          paymentClient={client}
          onErase={vi.fn().mockResolvedValue(undefined)}
        />,
      ),
    );
    expect(container.textContent).toContain("Privacy policy agreement");
    expect(container.textContent).toContain("I agree to the Privacy Policy");
  });

  it("never renders for a kid login session", async () => {
    const client = stubDashboardClient();
    await act(async () =>
      root.render(
        <PrivacyCenter
          progress={initialProgress}
          cloud
          kidSession
          paymentClient={client}
          onErase={vi.fn().mockResolvedValue(undefined)}
        />,
      ),
    );
    expect(container.textContent).not.toContain("Privacy policy agreement");
  });
});
