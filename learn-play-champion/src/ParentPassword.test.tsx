// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import ParentPassword from "./ParentPassword";

const KID_ROW = {
  kid_user_id: "kid-one",
  parent_id: "adult-one",
  username: "avyan",
  display_name: "Avyan",
  grade: "4",
  created_at: "2026-10-31T00:00:00Z",
};

function stubClient(kidRow: unknown) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    maybeSingle: async () => ({ data: kidRow, error: null }),
    then: (resolve: (value: unknown) => void) => resolve({ data: [], error: null }),
  };
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  const client = {
    from: () => builder,
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
      updateUser,
    },
  } as unknown as SupabaseClient;
  return { client, updateUser };
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
});

describe("ParentPassword", () => {
  it("sets the signed-in grown-up's password", async () => {
    const { client, updateUser } = stubClient(null);
    await act(async () => root.render(<ParentPassword client={client} />));
    const [first, second] = [...container.querySelectorAll<HTMLInputElement>('input[type="password"]')];
    expect(second).toBeDefined();
    for (const [input, value] of [[first, "grownup-pass-1"], [second, "grownup-pass-1"]] as const) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    const form = container.querySelector("form")!;
    await act(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(updateUser).toHaveBeenCalledWith({ password: "grownup-pass-1" });
    expect(container.textContent).toContain("Password set");
  });

  it("blocks mismatched passwords", async () => {
    const { client, updateUser } = stubClient(null);
    await act(async () => root.render(<ParentPassword client={client} />));
    const [first, second] = [...container.querySelectorAll<HTMLInputElement>('input[type="password"]')];
    for (const [input, value] of [[first, "grownup-pass-1"], [second, "different-1"]] as const) {
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
    }
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(updateUser).not.toHaveBeenCalled();
    expect(container.textContent).toContain("do not match");
  });

  it("stays hidden for a kid-login session", async () => {
    const { client } = stubClient(KID_ROW);
    await act(async () => root.render(<ParentPassword client={client} />));
    expect(container.textContent).not.toContain("Password sign-in");
  });
});
