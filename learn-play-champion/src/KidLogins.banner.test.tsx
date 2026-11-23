// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidLogins from "./KidLogins";

const KID_ROW = {
  kid_user_id: "kid-zara",
  parent_id: "adult-one",
  username: "zara",
  display_name: "Zara",
  grade: "2",
  active: true,
  created_at: "2026-10-30T00:00:00Z",
};

/**
 * A stub Supabase client for KidLogins: `ownKidRow` is what
 * fetchOwnKidAccount finds for the signed-in user (a row means the
 * session IS a kid login); `kidRows` is the grown-up's managed logins.
 */
function stubClient({
  ownKidRow = null as typeof KID_ROW | null,
  kidRows = [] as (typeof KID_ROW)[],
} = {}) {
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: "adult-one" } } }),
    },
    from: (table: string) => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        update: () => builder,
        insert: () => builder,
        delete: () => builder,
        single: async () => ({ data: null, error: null }),
        maybeSingle: async () => ({
          data: table === "kid_accounts" ? ownKidRow : null,
          error: null,
        }),
        then: (resolve: (value: unknown) => void) =>
          resolve({
            data: table === "kid_accounts" ? kidRows : [],
            error: null,
          }),
      };
      return builder;
    },
    functions: { invoke: vi.fn() },
  };
  return client as unknown as SupabaseClient;
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

describe("KidLogins zero-kid banner and PIN note", () => {
  it("shows the 1-step-away banner and the PIN reassurance to a grown-up with no kid logins", async () => {
    await act(async () =>
      root.render(<KidLogins client={stubClient()} />),
    );
    const banner = container.querySelector(".kid-logins-banner");
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain(
      "You’re 1 step away — add your child to start",
    );
    const cta = [...banner!.querySelectorAll("button")].find((b) =>
      b.textContent?.includes("Add your child — takes 2 minutes"),
    );
    expect(cta).toBeDefined();
    // The PIN fear-reducer sits with the create form's PIN field.
    expect(container.textContent).toContain(
      "Your child signs in with this username + PIN. You can reset the PIN anytime from your dashboard.",
    );
  });

  it("hides the banner once the grown-up has a kid login, but keeps the PIN note on the form", async () => {
    await act(async () =>
      root.render(<KidLogins client={stubClient({ kidRows: [KID_ROW] })} />),
    );
    expect(container.querySelector(".kid-logins-banner")).toBeNull();
    expect(container.textContent).not.toContain("You’re 1 step away");
    expect(container.textContent).toContain(
      "You can reset the PIN anytime from your dashboard.",
    );
  });

  it("renders nothing at all for a kid-login session, banner included", async () => {
    await act(async () =>
      root.render(<KidLogins client={stubClient({ ownKidRow: KID_ROW })} />),
    );
    expect(container.querySelector(".kid-logins")).toBeNull();
    expect(container.querySelector(".kid-logins-banner")).toBeNull();
  });
});
