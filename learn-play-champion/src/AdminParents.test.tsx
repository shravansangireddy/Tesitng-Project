// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import AdminParents from "./AdminParents";
import PrivacyCenter from "./PrivacyCenter";
import { initialProgress } from "./game";
import { ADMIN_PARENTS_UNAVAILABLE_MESSAGE } from "./admin-parents";

const PARENT_A = {
  parent_user_id: "11111111-1111-4111-8111-111111111111",
  email: "a@example.com",
  registered_at: "2026-01-02T12:00:00Z",
  kid_count: 2,
  task_count: 3,
  tasks_done: 2,
  task_titles: [
    { title: "Shared Task One", done: true },
    { title: "Shared Task Two", done: false },
    { title: "A Kid Task", done: true },
  ],
};
const PARENT_B = {
  parent_user_id: "22222222-2222-4222-8222-222222222222",
  email: "b@example.com",
  registered_at: "2026-01-03T12:00:00Z",
  kid_count: 1,
  task_count: 0,
  tasks_done: 0,
  task_titles: [],
};

function registeredLabel(iso: string) {
  return `Registered ${new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
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
function rpcClient(rpc: ReturnType<typeof vi.fn>) {
  return { rpc } as unknown as SupabaseClient;
}

describe("Registered parents admin panel", () => {
  it("does not request the list for an ordinary adult, regardless of UI access", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    await act(async () => root.render(<AdminParents client={rpcClient(rpc)} />));
    expect(container.textContent).toContain("Registered parents");
    await click(button("Open registered parents"));
    expect(rpc).toHaveBeenCalledExactlyOnceWith("is_payment_admin");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Access denied");
    expect(container.textContent).not.toContain("a@example.com");
  });

  it("renders the total, counts, and task titles under each parent for an administrator", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: [{ ...PARENT_A, display_name: "Secret Kid Name" }, PARENT_B],
        error: null,
      });
    await act(async () => root.render(<AdminParents client={rpcClient(rpc)} />));
    await click(button("Open registered parents"));
    expect(rpc).toHaveBeenCalledWith("admin_registered_parents");
    expect(container.textContent).toContain("Registered parents: 2");
    expect(container.textContent).toContain("a@example.com");
    expect(container.textContent).toContain(registeredLabel(PARENT_A.registered_at));
    expect(container.textContent).toContain("2 kids · 3 tasks (2 done)");
    expect(container.textContent).toContain("✓ Shared Task One");
    expect(container.textContent).toContain("⏳ Shared Task Two");
    expect(container.textContent).toContain("✓ A Kid Task");
    expect(container.textContent).toContain("b@example.com");
    expect(container.textContent).toContain("1 kid · 0 tasks (0 done)");
    // Nothing about any kid leaks into the panel.
    expect(container.textContent).not.toContain("Secret Kid");
  });

  it("shows the empty state when no grown-up accounts exist", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [], error: null });
    await act(async () => root.render(<AdminParents client={rpcClient(rpc)} />));
    await click(button("Open registered parents"));
    expect(container.textContent).toContain("Registered parents: 0");
    expect(container.textContent).toContain("No parents registered yet.");
  });

  it("clears the list when administrator access is revoked on refresh", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({ data: [PARENT_A], error: null })
      .mockResolvedValueOnce({ data: false, error: null });
    await act(async () => root.render(<AdminParents client={rpcClient(rpc)} />));
    await click(button("Open registered parents"));
    expect(container.textContent).toContain("a@example.com");
    await click(button("Refresh registered parents"));
    expect(container.textContent).not.toContain("a@example.com");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Access denied");
  });

  it("shows the quiet unavailable note when the function is not deployed", async () => {
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: true, error: null })
      .mockResolvedValueOnce({
        data: null,
        error: {
          code: "PGRST202",
          message:
            "Could not find the function public.admin_registered_parents in the schema cache",
        },
      });
    await act(async () => root.render(<AdminParents client={rpcClient(rpc)} />));
    await click(button("Open registered parents"));
    expect(container.textContent).toContain(ADMIN_PARENTS_UNAVAILABLE_MESSAGE);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});

describe("Registered parents in the Parents dashboard", () => {
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

  it("mounts beside the donation panel once the responsible adult confirms", async () => {
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
    expect(container.textContent).not.toContain("Open registered parents");
    const adultBox = container.querySelector<HTMLInputElement>(".privacy-adult input");
    if (!adultBox) throw new Error("Missing responsible-adult checkbox");
    await click(adultBox);
    expect(container.textContent).toContain("Registered parents");
    expect(button("Open registered parents")).toBeDefined();
  });
});
