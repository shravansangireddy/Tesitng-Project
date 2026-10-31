// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import KidTasks from "./KidTasks";

const ROWS = [
  {
    id: "task-1",
    kid_user_id: "kid-one",
    parent_id: "adult-one",
    title: "Play Math Mountain",
    activity: "arithmetic",
    done: false,
    created_at: "2026-10-31T12:00:00Z",
    completed_at: null,
  },
  {
    id: "task-2",
    kid_user_id: "kid-one",
    parent_id: "adult-one",
    title: "Read a picture book",
    activity: null,
    done: true,
    created_at: "2026-10-31T12:05:00Z",
    completed_at: "2026-10-31T12:30:00Z",
  },
];

function stubClient(rows: unknown[]) {
  const update = vi.fn(
    async (_payload: Record<string, unknown>) => ({ error: null }),
  );
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    update: (payload: Record<string, unknown>) => {
      void update(payload);
      return builder;
    },
    then: (resolve: (value: unknown) => void) =>
      resolve({ data: rows, error: null }),
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, update };
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

function button(text: string) {
  return [...container.querySelectorAll("button")].find((element) =>
    element.textContent?.includes(text),
  );
}

describe("KidTasks", () => {
  it("shows open tasks with a Start button and done tasks checked", async () => {
    const { client } = stubClient(ROWS);
    const onStart = vi.fn();
    await act(async () =>
      root.render(
        <KidTasks client={client} kidUserId="kid-one" onStartActivity={onStart} />,
      ),
    );
    expect(container.textContent).toContain("Your tasks");
    expect(container.textContent).toContain("Play Math Mountain");
    expect(container.textContent).toContain("✅ Read a picture book");
    await act(async () => button("Start")?.click());
    expect(onStart).toHaveBeenCalledWith("arithmetic");
  });

  it("marks a task done when the kid taps Done", async () => {
    const { client, update } = stubClient(ROWS);
    await act(async () =>
      root.render(
        <KidTasks client={client} kidUserId="kid-one" onStartActivity={vi.fn()} />,
      ),
    );
    await act(async () => button("Done ✓")?.click());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ done: true }),
    );
    expect(container.textContent).toContain("✅ Play Math Mountain");
  });

  it("renders nothing when the kid has no tasks", async () => {
    const { client } = stubClient([]);
    await act(async () =>
      root.render(
        <KidTasks client={client} kidUserId="kid-one" onStartActivity={vi.fn()} />,
      ),
    );
    expect(container.textContent).toBe("");
  });
});
