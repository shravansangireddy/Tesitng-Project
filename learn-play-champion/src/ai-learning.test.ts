import { describe, expect, it } from "vitest";
import { aiLessons, initialExamples, predict, testCards, trainModel } from "./ai-learning";
import { completeAILesson, initialProgress, parseProgress } from "./game";

describe("kid-friendly AI learning", () => {
  it("offers a connected six-lesson path with correct checks and grade discussion prompts", () => {
    expect(aiLessons.map((l) => l.id)).toEqual(["patterns", "examples", "training", "model", "testing", "responsible"]);
    for (const lesson of aiLessons) {
      expect(lesson.options).toContain(lesson.answer);
      expect(new Set(lesson.options).size).toBe(3);
      expect(lesson.extend).toHaveLength(3);
      expect(lesson.meaning.length).toBeGreaterThan(30);
      expect(lesson.explanation.length).toBeGreaterThan(50);
    }
    expect(aiLessons.find((l) => l.id === "model")?.story).toContain("does not have feelings");
    expect(aiLessons.find((l) => l.id === "responsible")?.story).toContain("More examples alone do not guarantee fairness");
  });
  it("learns an inspectable snapshot, not a secretly coded shape rule", () => {
    const examples = initialExamples.map((e) => ({ ...e }));
    const model = trainModel(examples, "shape");
    expect(model.counts).toEqual({ circle: { Sun: 2, Moon: 0 }, square: { Sun: 0, Moon: 1 } });
    examples[0].label = "Moon";
    expect(model.counts.circle).toEqual({ Sun: 2, Moon: 0 });
    expect(predict(model, { shape: "circle", color: "red" }).label).toBe("Sun");
    expect(predict(trainModel([{ shape: "circle", color: "blue", label: "Moon" }], "shape"),
      { shape: "circle", color: "red" }).label).toBe("Moon");
  });
  it("demonstrates a wrong color prediction, a useful shape prediction, and missing evidence", () => {
    const color = trainModel(initialExamples, "color");
    const shape = trainModel(initialExamples, "shape");
    expect(testCards.map((c) => predict(color, c).label)).toEqual(["Sun", null]);
    expect(testCards.map((c) => predict(shape, c).label)).toEqual(["Moon", null]);
    for (const card of testCards) expect(initialExamples.some((e) => e.shape === card.shape && e.color === card.color)).toBe(false);
    expect(predict(shape, testCards[1]).reason).toContain("No triangle examples");
  });
  it("refuses to guess on a tie or empty evidence and counts repeated labels honestly", () => {
    expect(predict(trainModel([], "shape"), testCards[0]).label).toBeNull();
    const tie = trainModel([{ shape: "circle", color: "blue", label: "Sun" }, { shape: "circle", color: "blue", label: "Moon" }], "shape");
    expect(predict(tie, { shape: "circle", color: "red" }).reason).toContain("tie");
    const repeat = trainModel([...initialExamples, initialExamples[0]], "shape");
    expect(repeat.counts.circle.Sun).toBe(3);
  });
  it("saves first completions only without changing English/Math or coding records", () => {
    const first = completeAILesson(initialProgress, "model");
    expect(first.points).toBe(10);
    expect(first.aiCompleted).toEqual(["model"]);
    expect(completeAILesson(first, "model")).toBe(first);
    expect(first.rounds).toBe(0);
    expect(first.answered).toBe(0);
    expect(first.missionDate).toBe("");
    expect(first.codingCompleted).toBeUndefined();
    expect(parseProgress(JSON.stringify(first))).toEqual(first);
    expect(parseProgress(JSON.stringify(initialProgress))).toEqual(initialProgress);
    expect(() => completeAILesson(first, "fake")).toThrow("Unknown AI lesson");
  });
  it("rejects malformed, duplicate or unknown saved completions", () => {
    for (const aiCompleted of [null, {}, "model", ["fake"], ["model", "model"], [1]]) {
      expect(() => parseProgress(JSON.stringify({ ...initialProgress, aiCompleted }))).toThrow();
    }
  });
});
