import { describe, expect, it, vi } from "vitest";
import * as learningContent from "./content";
import { contentError, getLearningContent } from "./content";
import {
  bankNames,
  gradeIds,
  gradeFiles,
  parseMathTemplates,
  parseQuestionBank,
  parseTeammate,
  renderTemplate,
  validateContentFiles,
} from "./content-schema";
import { makeRound } from "./questions";

const original = getLearningContent();
function files(): Record<string, string> {
  return {
    ...Object.fromEntries(
      bankNames.map((name) => [
        `${name}.txt`,
        JSON.stringify(original.banks[name]),
      ]),
    ),
    "math-templates.txt": JSON.stringify(original.templates),
    "teammate.txt": JSON.stringify(original.teammate),
    ...Object.fromEntries(
      gradeIds.map((grade) => [
        gradeFiles[grade],
        JSON.stringify({
          ...original.grades[grade],
          lessons: Object.fromEntries(
            Object.entries(original.grades[grade].lessons).map(
              ([id, lesson]) => [
                id,
                {
                  title: lesson.title,
                  skill: lesson.skill,
                  ...(lesson.guide ? { guide: lesson.guide } : {}),
                  ...(lesson.questions[0].chart ? { chart: lesson.questions[0].chart } : {}),
                  ...(id === "reading" || id === "informational"
                    ? { passage: lesson.questions[0].passage }
                    : {}),
                  questions: lesson.questions.map((question) => [
                    question.prompt,
                    question.answer,
                    question.options || null,
                    question.hint,
                    question.explanation,
                  ]),
                },
              ],
            ),
          ),
        }),
      ]),
    ),
  };
}
describe("editable learning text files", () => {
  it("loads foundational and grade files and preserves their complete content", () => {
    expect(contentError).toBe("");
    expect(Object.keys(original.banks)).toHaveLength(7);
    expect(Object.values(original.banks).flat()).toHaveLength(35);
    expect(original.banks.reading.every((question) => !!question.passage)).toBe(
      true,
    );
    expect(validateContentFiles(files())).toEqual(original);
  });
  for (const name of bankNames) {
    it(`uses ${name}.txt directly for playable questions without mutating its choices`, () => {
      const before = JSON.stringify(original.banks[name]);
      const round = makeRound(name, () => 0.1);
      round.forEach((question, index) => {
        const source = original.banks[name][index];
        expect(question.prompt).toBe(source.prompt);
        expect(question.answer).toBe(source.answer);
        expect(question.passage).toBe(source.passage);
        expect(question.shape).toBe(source.shape);
        expect(question.hint).toBe(source.hint);
        expect(question.explanation).toBe(source.explanation);
        if (source.options)
          expect([...question.options!].sort()).toEqual(
            [...source.options].sort(),
          );
      });
      expect(JSON.stringify(original.banks[name])).toBe(before);
    });
  }
  it("accepts UTF-8 BOM, multiline stories and literal markup as text", () => {
    const bank = structuredClone(original.banks.reading);
    bank[0].passage = "One line.\nAnother line. <strong>Not HTML.</strong>";
    expect(
      parseQuestionBank(`\uFEFF${JSON.stringify(bank)}`, "reading")[0].passage,
    ).toBe(bank[0].passage);
  });
  it("reports the exact file when JSON or a required file is missing", () => {
    expect(() => parseQuestionBank("{", "reading")).toThrow(
      "reading.txt: invalid JSON",
    );
    const missing = files();
    delete missing["spelling.txt"];
    expect(() => validateContentFiles(missing)).toThrow(
      "spelling.txt: the required text file is missing",
    );
  });
  it("requires five questions and nonempty prompts, answers, hints and explanations", () => {
    expect(() => parseQuestionBank("[]", "sight")).toThrow("exactly five");
    for (const field of ["prompt", "answer", "hint", "explanation"] as const) {
      const bank = structuredClone(original.banks.sight);
      bank[0][field] = " ";
      expect(() => parseQuestionBank(JSON.stringify(bank), "sight")).toThrow(
        `question 1.${field}`,
      );
    }
  });
  it("rejects misspelled fields instead of silently ignoring them", () => {
    const bank = original.banks.sight.map((question) => ({
      ...question,
      promt: "typo",
    }));
    expect(() => parseQuestionBank(JSON.stringify(bank), "sight")).toThrow(
      'unknown field "promt"',
    );
  });
  it("checks correct choices, duplicates and valid answer-choice counts", () => {
    const bank = structuredClone(original.banks.sight);
    bank[0].answer = "not in choices";
    expect(() => parseQuestionBank(JSON.stringify(bank), "sight")).toThrow(
      "must exactly match",
    );
    bank[0].options = ["SEE", " see "];
    expect(() => parseQuestionBank(JSON.stringify(bank), "sight")).toThrow(
      "duplicate",
    );
    bank[0].options = ["see"];
    expect(() => parseQuestionBank(JSON.stringify(bank), "sight")).toThrow(
      "2 to 6",
    );
  });
  it("requires reading passages and valid geometry artwork names", () => {
    const reading = structuredClone(original.banks.reading);
    delete reading[0].passage;
    expect(() => parseQuestionBank(JSON.stringify(reading), "reading")).toThrow(
      "passage",
    );
    const geometry = original.banks.geometry.map((question) => ({
      ...question,
      shape: "hexagon",
    }));
    expect(() =>
      parseQuestionBank(JSON.stringify(geometry), "geometry"),
    ).toThrow("shape must be");
    const spelling = original.banks.spelling.map((question) => ({
      ...question,
      options: ["cat", "dog"],
    }));
    expect(() =>
      parseQuestionBank(JSON.stringify(spelling), "spelling"),
    ).toThrow("spelling is typed");
  });
  it("requires every generated-Math template and rejects invalid placeholders", () => {
    const templates = structuredClone(original.templates);
    templates.addition.prompt = "{a} plus {missing}";
    expect(() => parseMathTemplates(JSON.stringify(templates))).toThrow(
      "unknown placeholder {missing}",
    );
    templates.addition.prompt = "{a} plus {b";
    expect(() => parseMathTemplates(JSON.stringify(templates))).toThrow(
      "unmatched",
    );
    templates.addition.prompt = "An unrelated sentence";
    expect(() => parseMathTemplates(JSON.stringify(templates))).toThrow(
      "must include {a}, {b}",
    );
    const { division: _removed, ...incomplete } = original.templates;
    expect(() => parseMathTemplates(JSON.stringify(incomplete))).toThrow(
      "division must be an object",
    );
  });
  it("renders edited Math wording without changing computed answers", () => {
    const templates = structuredClone(original.templates);
    templates.addition.prompt = "What is {a} plus {b}?";
    const parsed = parseMathTemplates(JSON.stringify(templates));
    expect(
      renderTemplate(parsed.addition.prompt, { a: 4, b: 3, answer: 7 }),
    ).toBe("What is 4 plus 3?");
    expect(() => renderTemplate("{missing}", {})).toThrow("Missing value");
  });
  it("uses changed Math templates in actual generated rounds", () => {
    const edited = structuredClone(original);
    edited.templates.addition.prompt = "Please add {a} and {b}.";
    edited.templates.addition.hint = "Think about {a} plus {b}.";
    const spy = vi
      .spyOn(learningContent, "getLearningContent")
      .mockReturnValue(edited);
    try {
      const question = makeRound("arithmetic", () => 0)[0];
      expect(question.prompt).toBe("Please add 4 and 1.");
      expect(question.hint).toBe("Think about 4 plus 1.");
      expect(question.answer).toBe("5");
    } finally {
      spy.mockRestore();
    }
  });
  it("allows moving the teammate's correct answer and validates its index", () => {
    const teammate = { ...original.teammate, answerIndex: 2 };
    expect(parseTeammate(JSON.stringify(teammate)).answerIndex).toBe(2);
    for (const answerIndex of [-1, 0.5, 3, "0"]) {
      expect(() =>
        parseTeammate(JSON.stringify({ ...teammate, answerIndex })),
      ).toThrow("answerIndex");
    }
  });
});
