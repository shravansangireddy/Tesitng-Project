// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import ContentStudio from "./ContentStudio";
import TeacherLibrary from "./TeacherLibrary";
import App from "./App";
import { initialProgress, STORAGE_KEY } from "./game";
import { parseContentRows, parseStudioRows, parseTeacherPayload, type ContentRole, type StudioContent, type TeacherPayload } from "./teacher-content";

const id = "11111111-1111-4111-8111-111111111111";
const content: TeacherPayload = {
  title: "Garden discovery", grade: "2", kind: "passage", subject: "english",
  passage: "A seed grows into a plant.\nWatch its leaves unfold.",
  questions: [{ prompt: "What grows?", choices: ["A seed", "A shoe", "A cup"], answer: 0, explanation: "The seed grows into a plant." }],
};
const entry = (patch: Partial<StudioContent> = {}): StudioContent => ({
  id, payload: structuredClone(content), revision: 0, status: "draft", review_note: "", is_own: true,
  updated_at: "2026-10-29T12:00:00Z", ...patch,
});
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear(); history.replaceState(null, "", "/");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
function button(text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent?.includes(text));
  if (!found) throw new Error(`Missing ${text}`);
  return found;
}
async function click(element: HTMLElement) { await act(async () => element.click()); }
function field(label: string) {
  const found = [...container.querySelectorAll("label")].find(item =>
    [...item.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join("").trim() === label);
  const input = found?.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select");
  if (!input) throw new Error(`Missing field ${label}`);
  return input;
}
async function fill(label: string, value: string) {
  const input = field(label);
  await act(async () => {
    const prototype = input.tagName === "SELECT" ? HTMLSelectElement.prototype :
      input.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
function client(rpc: ReturnType<typeof vi.fn>) { return { rpc } as unknown as SupabaseClient; }
function server() {
  const state: { role: ContentRole | null; rows: StudioContent[]; fail: string; } = { role: "teacher", rows: [], fail: "" };
  const rpc = vi.fn(async (name: string, args?: Record<string, unknown>) => {
    if (state.fail) return { data: null, error: { message: state.fail } };
    if (name === "content_role") return { data: state.role, error: null };
    if (name === "studio_content") return { data: structuredClone(state.rows), error: null };
    if (name === "published_teacher_content") return { data: structuredClone(state.rows.filter(row =>
      row.status === "published" && row.payload.grade === args?.learning_grade).map(({ id, revision, payload }) => ({ id, revision, payload }))), error: null };
    if (name === "save_teacher_content") {
      state.rows = [entry({ payload: args?.new_payload as TeacherPayload, revision: args?.entry_id ? state.rows[0].revision + 1 : 0 })];
      return { data: id, error: null };
    }
    if (name === "review_teacher_content") {
      if (args?.action === "delete") state.rows = [];
      else state.rows = state.rows.map(row => ({ ...row, revision: row.revision + 1,
        status: args?.action === "submit" ? "submitted" : args?.action === "publish" ? "published" :
          args?.action === "reject" ? "rejected" : "archived", review_note: String(args?.note ?? "") }));
      return { data: true, error: null };
    }
    throw new Error(`Unexpected RPC ${name}`);
  });
  return { state, rpc, client: client(rpc) };
}
async function submitForm() {
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

describe("teacher content validation", () => {
  it("accepts passages and quizzes but rejects unknown fields, missing answers and oversized content", () => {
    expect(parseTeacherPayload(content)).toEqual(content);
    expect(parseTeacherPayload({ ...content, questions: [] }).questions).toEqual([]);
    expect(parseTeacherPayload({ ...content, kind: "quiz", passage: "" }).kind).toBe("quiz");
    for (const bad of [
      { ...content, title: "" }, { ...content, title: "Hi" + " ".repeat(120) },
      { ...content, grade: "9" }, { ...content, status: "published" },
      { ...content, kind: "quiz", passage: "" , questions: [] }, { ...content, passage: "" },
      { ...content, passage: "x".repeat(6001) }, { ...content, questions: Array(6).fill(content.questions[0]) },
      ...[{ answer: 3 }, { answer: "0" }, { choices: ["a", " A ", "b"] }, { prompt: "" }, { explanation: "" }]
        .map(patch => ({ ...content, questions: [{ ...content.questions[0], ...patch }] })),
    ]) expect(() => parseTeacherPayload(bad)).toThrow();
    expect(() => parseContentRows([{ id, revision: -1, payload: content }])).toThrow();
    expect(() => parseContentRows([entry(), entry()])).toThrow();
    expect(() => parseStudioRows([entry({ updated_at: "invalid" })])).toThrow();
  });
});
describe("teacher drafting and administrator approval", () => {
  it("authors a passage and question, previews, saves, and submits without self-publishing", async () => {
    const api = server();
    await act(async () => root.render(<ContentStudio client={api.client} />));
    await click(button("Open content studio")); await click(button("Create content draft"));
    await fill("Title", content.title); await fill("Grade", "2"); await fill("Passage text", content.passage);
    await click(button("Add question"));
    await fill("Question prompt", content.questions[0].prompt);
    for (let i = 0; i < 3; i++) await fill(`Choice ${i + 1}`, content.questions[0].choices[i]);
    await fill("Encouraging explanation", content.questions[0].explanation);
    await click(button("Preview learner view"));
    expect(container.querySelector(".teacher-activity")?.textContent).toContain(content.passage);
    await click(button("A shoe"));
    expect(container.querySelector(".teacher-question [role=status]")?.textContent).toContain("try another answer");
    expect(api.rpc.mock.calls.some(([name]) => name === "save_teacher_content")).toBe(false);
    await submitForm();
    expect(api.rpc).toHaveBeenCalledWith("save_teacher_content", { entry_id: null, expected_revision: 0, new_payload: content });
    expect(container.textContent).toContain("Draft saved");
    expect(container.querySelector("form")).toBeNull();
    await click(button(`Review ${content.title}`));
    expect([...container.querySelectorAll("button")].some(b => b.textContent?.includes("Approve & publish"))).toBe(false);
    await click(button("Submit for administrator review"));
    expect(api.rpc).toHaveBeenCalledWith("review_teacher_content", { entry_id: id, expected_revision: 0, action: "submit", note: "" });
    expect(api.state.rows[0].status).toBe("submitted");
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
  it("requires the reviewer checklist, returns reasons, and publishes only a saved submitted revision", async () => {
    const api = server(); api.state.role = "admin"; api.state.rows = [entry({ status: "submitted", revision: 3, is_own: false })];
    await act(async () => root.render(<ContentStudio client={api.client} />));
    await click(button("Open content studio")); await click(button(`Review ${content.title}`));
    expect(button("Approve & publish").disabled).toBe(true);
    expect(button("Return for changes").disabled).toBe(true);
    await click(container.querySelector<HTMLInputElement>(".studio-review input[type=checkbox]")!);
    expect(button("Return for changes").disabled).toBe(true);
    await fill("Review reason (required for rejection/archive)", "Please add detail.");
    await click(button("Return for changes"));
    expect(api.rpc).toHaveBeenCalledWith("review_teacher_content", { entry_id: id, expected_revision: 3, action: "reject", note: "Please add detail." });
    api.state.rows = [entry({ status: "submitted", revision: 6, is_own: false })];
    await click(button("Refresh content studio")); await click(button(`Review ${content.title}`));
    await click(container.querySelector<HTMLInputElement>(".studio-review input[type=checkbox]")!);
    await click(button("Approve & publish"));
    expect(api.state.rows[0].status).toBe("published");
    await click(button(`Review ${content.title}`));
    expect(button("Archive published content").disabled).toBe(true);
    await click(container.querySelector<HTMLInputElement>(".studio-review input[type=checkbox]")!);
    await fill("Review reason (required for rejection/archive)", "Retiring this passage.");
    await click(button("Archive published content"));
    expect(api.state.rows[0].status).toBe("archived");
  });
  it("preserves a conflicting unsaved draft, supports discard cancellation and limits questions", async () => {
    const api = server(); api.state.rows = [entry({ status: "rejected", revision: 2, review_note: "Try a clearer title." })];
    const dirty = vi.fn();
    await act(async () => root.render(<ContentStudio client={api.client} onDirty={dirty} />));
    await click(button("Open content studio")); await click(button(`Edit ${content.title}`));
    await fill("Title", "A clearer title");
    expect(dirty).toHaveBeenLastCalledWith(true);
    const warn = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(warn); expect(warn.defaultPrevented).toBe(true);
    api.state.fail = "Content changed. Refresh before editing.";
    await submitForm();
    expect(container.querySelector('[role=alert]')?.textContent).toContain("Content changed");
    expect(field("Title").value).toBe("A clearer title");
    for (let i = 1; i < 5; i++) await click(button("Add question"));
    expect(button("Add question").disabled).toBe(true);
    await click(button("Remove question 5")); expect(button("Add question").disabled).toBe(false);
    vi.mocked(window.confirm).mockReturnValue(false);
    await click(button("Close editor")); expect(container.querySelector("form")).not.toBeNull();
    vi.mocked(window.confirm).mockReturnValue(true);
    await click(button("Close editor")); expect(container.querySelector("form")).toBeNull();
    expect(dirty).toHaveBeenLastCalledWith(false);
  });
  it("supports quiz-only authoring, blocks invalid preview, and rechecks access after revocation", async () => {
    const api = server();
    await act(async () => root.render(<ContentStudio client={api.client} />));
    await click(button("Open content studio")); await click(button("Create content draft"));
    await fill("Content type", "quiz");
    expect(container.querySelector("label")?.textContent).toContain("Title");
    expect(container.textContent).not.toContain("Passage text");
    expect(container.querySelectorAll(".studio-question")).toHaveLength(1);
    await click(button("Preview learner view"));
    expect(container.querySelector('[role=alert]')).not.toBeNull();
    await click(button("Close editor"));
    api.state.role = null;
    await click(button("Refresh content studio"));
    expect(container.querySelector('[role=alert]')?.textContent).toContain("Access denied");
    expect(container.querySelector(".studio-items")).toBeNull();
  });
  it("denies ordinary adults and explains missing backend setup without claiming drafts exist", async () => {
    const api = server(); api.state.role = null;
    await act(async () => root.render(<ContentStudio client={api.client} />));
    await click(button("Open content studio"));
    expect(api.rpc).toHaveBeenCalledExactlyOnceWith("content_role", undefined);
    expect(container.querySelector('[role=alert]')?.textContent).toContain("Access denied");
    await act(async () => root.render(<ContentStudio />));
    expect(container.textContent).toContain("Sign in with an operator-approved teacher");
  });
});
describe("published learner activities", () => {
  it("uses the saved grade, renders safe text, retries questions, and does not change scoring or persist answers", async () => {
    const api = server(); api.state.rows = [entry({ status: "published", payload: {
      ...content, passage: "<script>alert('not executed')</script>\n" + content.passage,
    } })];
    const save = vi.fn();
    await act(async () => root.render(<App roomClient={api.client} cloudProgress={{ ...initialProgress, selectedGrade: "2" }} onProgressChange={save} />));
    await click(button("Explore teacher library")); await click(button("Load approved content"));
    expect(api.rpc).toHaveBeenCalledWith("published_teacher_content", { learning_grade: "2", after_id: null });
    await click(button(`Open ${content.title}`)); await click(button("A seed"));
    expect(container.querySelector(".teacher-passage")?.textContent).toContain("<script>");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector(".teacher-question [role=status]")?.textContent).toContain("You found it!");
    await click(button("Try these questions again"));
    expect(container.querySelector(".teacher-question [role=status]")).toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    api.state.rows = [];
    await click(button("Refresh approved content"));
    expect(container.textContent).toContain("No approved content for this grade");
    expect(container.querySelector(".teacher-activity")).toBeNull();
  });
  it("shows loading failures and malformed data explicitly and handles missing setup", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: { message: "Missing migration" } });
    await act(async () => root.render(<TeacherLibrary client={client(rpc)} grade="k" />));
    await click(button("Load approved content"));
    expect(container.querySelector('[role=alert]')?.textContent).toContain("Missing migration");
    rpc.mockResolvedValue({ data: [{ id, revision: 0, payload: content }], error: null });
    await click(button("Load approved content"));
    expect(container.querySelector('[role=alert]')?.textContent).toContain("selected grade");
    await act(async () => root.render(<TeacherLibrary key="unconfigured" grade="k" />));
    expect(container.textContent).toContain("not connected");
  });
  it("protects unsaved studio edits on navigation and adult-checkbox dismissal", async () => {
    const api = server();
    await act(async () => root.render(<App roomClient={api.client} cloudProgress={initialProgress} onProgressChange={vi.fn()} />));
    await click(button("Privacy & data"));
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    await click(button("Open content studio")); await click(button("Create content draft")); await fill("Title", "Unsaved");
    vi.mocked(window.confirm).mockReturnValue(false);
    await click(button("My dashboard"));
    expect(container.querySelector("form")).not.toBeNull();
    await click(container.querySelector<HTMLInputElement>(".privacy-adult input")!);
    expect(container.querySelector("form")).not.toBeNull();
    expect(button("Erase cloud learning").disabled).toBe(true);
    vi.mocked(window.confirm).mockReturnValue(true);
    await click(button("My dashboard"));
    expect(container.querySelector("form")).toBeNull();
  });
});
