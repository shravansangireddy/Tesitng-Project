export const bankNames = [
  "sight",
  "vocabulary",
  "spelling",
  "reading",
  "sentence",
  "problems",
  "geometry",
] as const;
export type BankName = (typeof bankNames)[number];
export const templateNames = [
  "addition",
  "subtraction",
  "multiplication",
  "division",
  "patterns",
] as const;
export type TemplateName = (typeof templateNames)[number];
export const gradeIds = ["prek", "k", "1", "2", "3", "4", "5"] as const;
export type GradeId = (typeof gradeIds)[number];
export const gradeLabels: Record<GradeId, string> = {
  prek: "Pre-K",
  k: "Kindergarten",
  "1": "Grade 1",
  "2": "Grade 2",
  "3": "Grade 3",
  "4": "Grade 4",
  "5": "Grade 5",
};
export const gradeFiles: Record<GradeId, string> = {
  prek: "grades/pre-k.txt",
  k: "grades/kindergarten.txt",
  "1": "grades/grade-1.txt",
  "2": "grades/grade-2.txt",
  "3": "grades/grade-3.txt",
  "4": "grades/grade-4.txt",
  "5": "grades/grade-5.txt",
};
export const coreLessonIds = [
  ...bankNames,
  "arithmetic",
  "multiply",
  "patterns",
] as const;
export const curriculumLessonIds = [
  "informational",
  "writing",
  "place",
  "fractions",
  "measurement",
  "data",
] as const;
export const lessonIds = [...coreLessonIds, ...curriculumLessonIds] as const;
export type LessonId = (typeof lessonIds)[number];
export interface LessonGuide {
  standards: string[];
  learn: string;
  together: string;
}
export interface GradeLesson {
  title: string;
  skill: string;
  questions: Question[];
  guide?: LessonGuide;
}
export interface GradeContent {
  grade: GradeId;
  overview: string;
  lessons: Record<LessonId, GradeLesson>;
}
export const contentFiles = [
  ...bankNames.map((name) => `${name}.txt`),
  "math-templates.txt",
  "teammate.txt",
  ...gradeIds.map((grade) => gradeFiles[grade]),
];
export interface Question {
  prompt: string;
  answer: string;
  options?: string[];
  hint: string;
  explanation: string;
  passage?: string;
  shape?: "triangle" | "square" | "circle" | "rectangle" | "pentagon";
  chart?: LearningChart;
}
export interface LearningChart {
  type: "bar" | "line";
  title: string;
  labels: string[];
  counts: number[];
  unit: string;
  scale: number;
}
export interface MathTemplate {
  prompt: string;
  hint: string;
  explanation: string;
}
export interface TeammateContent {
  prompt: string;
  quote: string;
  preview: string;
  options: string[];
  answerIndex: number;
  success: string;
  retry: string;
}
export interface LearningContent {
  banks: Record<BankName, Question[]>;
  templates: Record<TemplateName, MathTemplate>;
  teammate: TeammateContent;
  grades: Record<GradeId, GradeContent>;
}
function fail(file: string, detail: string): never {
  throw new Error(`Learning content error in ${file}: ${detail}`);
}
function parseJson(raw: string, file: string): unknown {
  try {
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch (error) {
    return fail(
      file,
      `invalid JSON. ${error instanceof Error ? error.message : "Check the text file."}`,
    );
  }
}
function object(
  value: unknown,
  file: string,
  label: string,
  keys: readonly string[],
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    return fail(file, `${label} must be an object.`);
  const record = value as Record<string, unknown>;
  const unexpected = Object.keys(record).find((key) => !keys.includes(key));
  if (unexpected)
    return fail(file, `${label} has an unknown field "${unexpected}".`);
  return record;
}
function text(value: unknown, file: string, label: string): string {
  if (typeof value !== "string" || !value.trim())
    return fail(file, `${label} must be nonempty text.`);
  return value;
}
function options(
  value: unknown,
  file: string,
  label: string,
  caseSensitive = false,
): string[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6)
    return fail(file, `${label} must contain 2 to 6 answer choices.`);
  const choices = value.map((choice, index) =>
    text(choice, file, `${label}[${index}]`),
  );
  if (
    new Set(
      choices.map((choice) =>
        caseSensitive ? choice.trim() : choice.trim().toLowerCase(),
      ),
    ).size !== choices.length
  )
    return fail(file, `${label} has duplicate choices.`);
  return choices;
}
export function parseQuestionBank(raw: string, name: BankName): Question[] {
  const file = `${name}.txt`;
  const value = parseJson(raw, file);
  if (!Array.isArray(value) || value.length !== 5)
    return fail(file, "each activity needs exactly five questions.");
  return value.map((item, index) => {
    const label = `question ${index + 1}`;
    const record = object(item, file, label, [
      "prompt",
      "answer",
      "hint",
      "explanation",
      "options",
      "passage",
      "shape",
    ]);
    const question: Question = {
      prompt: text(record.prompt, file, `${label}.prompt`),
      answer: text(record.answer, file, `${label}.answer`),
      hint: text(record.hint, file, `${label}.hint`),
      explanation: text(record.explanation, file, `${label}.explanation`),
    };
    if (name !== "spelling") {
      question.options = options(record.options, file, `${label}.options`);
      if (!question.options.includes(question.answer))
        return fail(
          file,
          `${label}.answer must exactly match one of its options.`,
        );
    } else if (record.options !== undefined)
      return fail(file, `${label}: spelling is typed; remove options.`);
    if (name === "reading")
      question.passage = text(record.passage, file, `${label}.passage`);
    else if (record.passage !== undefined)
      return fail(file, `${label}: passages belong in reading.txt.`);
    if (name === "geometry") {
      const shape = record.shape;
      if (
        shape !== "triangle" &&
        shape !== "square" &&
        shape !== "circle" &&
        shape !== "rectangle" &&
        shape !== "pentagon"
      ) {
        return fail(
          file,
          `${label}.shape must be triangle, square, circle, rectangle, or pentagon.`,
        );
      }
      question.shape = shape;
    } else if (record.shape !== undefined)
      return fail(file, `${label}: shapes belong in geometry.txt.`);
    return question;
  });
}
const variables: Record<TemplateName, readonly string[]> = {
  addition: ["a", "b", "answer"],
  subtraction: ["a", "b", "answer"],
  multiplication: ["a", "b", "product", "answer"],
  division: ["a", "b", "product", "answer"],
  patterns: ["start", "n1", "n2", "n3", "step", "answer"],
};
export function parseMathTemplates(
  raw: string,
): Record<TemplateName, MathTemplate> {
  const file = "math-templates.txt";
  const record = object(parseJson(raw, file), file, "templates", templateNames);
  const result = {} as Record<TemplateName, MathTemplate>;
  for (const name of templateNames) {
    const template = object(record[name], file, name, [
      "prompt",
      "hint",
      "explanation",
    ]);
    const parsed: MathTemplate = {
      prompt: text(template.prompt, file, `${name}.prompt`),
      hint: text(template.hint, file, `${name}.hint`),
      explanation: text(template.explanation, file, `${name}.explanation`),
    };
    for (const [field, wording] of Object.entries(parsed)) {
      const remaining = wording.replace(
        /\{([^{}]+)\}/g,
        (_match: string, variable: string) => {
          if (!variables[name].includes(variable))
            return fail(
              file,
              `${name}.${field} uses unknown placeholder {${variable}}.`,
            );
          return "";
        },
      );
      if (/[{}]/.test(remaining))
        return fail(
          file,
          `${name}.${field} has unmatched or empty placeholder braces.`,
        );
    }
    const required =
      name === "patterns"
        ? ["start", "n1", "n2", "n3"]
        : name === "division"
          ? ["product", "b"]
          : ["a", "b"];
    if (required.some((variable) => !parsed.prompt.includes(`{${variable}}`)))
      return fail(
        file,
        `${name}.prompt must include ${required.map((variable) => `{${variable}}`).join(", ")} so the generated problem can be answered.`,
      );
    result[name] = parsed;
  }
  return result;
}
export function renderTemplate(
  template: string,
  values: Record<string, number>,
): string {
  return template.replace(
    /\{([^{}]+)\}/g,
    (_match: string, variable: string) => {
      if (
        !Object.prototype.hasOwnProperty.call(values, variable) ||
        !Number.isFinite(values[variable])
      )
        throw new Error(
          `Missing value for learning content placeholder {${variable}}.`,
        );
      return String(values[variable]);
    },
  );
}
export function parseTeammate(raw: string): TeammateContent {
  const file = "teammate.txt";
  const record = object(parseJson(raw, file), file, "teammate", [
    "prompt",
    "quote",
    "preview",
    "options",
    "answerIndex",
    "success",
    "retry",
  ]);
  const choices = options(record.options, file, "options");
  if (
    !Number.isInteger(record.answerIndex) ||
    (record.answerIndex as number) < 0 ||
    (record.answerIndex as number) >= choices.length
  )
    return fail(file, "answerIndex must be a zero-based index into options.");
  return {
    prompt: text(record.prompt, file, "prompt"),
    quote: text(record.quote, file, "quote"),
    preview: text(record.preview, file, "preview"),
    options: choices,
    answerIndex: record.answerIndex as number,
    success: text(record.success, file, "success"),
    retry: text(record.retry, file, "retry"),
  };
}
export function validateContentFiles(
  files: Record<string, string>,
): LearningContent {
  const read = (file: string): string => {
    if (typeof files[file] !== "string")
      return fail(file, "the required text file is missing.");
    return files[file];
  };
  const banks = {} as Record<BankName, Question[]>;
  for (const name of bankNames)
    banks[name] = parseQuestionBank(read(`${name}.txt`), name);
  return {
    banks,
    templates: parseMathTemplates(read("math-templates.txt")),
    teammate: parseTeammate(read("teammate.txt")),
    grades: Object.fromEntries(
      gradeIds.map((grade) => [
        grade,
        parseGradeContent(read(gradeFiles[grade]), grade),
      ]),
    ) as Record<GradeId, GradeContent>,
  };
}

export function parseGradeContent(raw: string, grade: GradeId): GradeContent {
  const file = gradeFiles[grade];
  const record = object(parseJson(raw, file), file, "grade pack", [
    "grade",
    "overview",
    "lessons",
  ]);
  if (record.grade !== grade) return fail(file, `grade must be "${grade}".`);
  const lessons = object(record.lessons, file, "lessons", lessonIds);
  const parsed = {} as Record<LessonId, GradeLesson>;
  for (const id of lessonIds) {
    const lesson = object(lessons[id], file, id, [
      "title",
      "skill",
      "passage",
      "questions",
      "guide",
      "chart",
    ]);
    const hasPassage = id === "reading" || id === "informational";
    const passage = hasPassage
      ? text(lesson.passage, file, `${id}.passage`)
      : undefined;
    if (!hasPassage && lesson.passage !== undefined)
      return fail(file, `${id}: only reading and informational have a passage.`);
    let chart: LearningChart | undefined;
    if (lesson.chart !== undefined) {
      if (id !== "data") return fail(file, `${id}: charts belong in data lessons.`);
      const source = object(lesson.chart, file, "data.chart", [
        "type",
        "title",
        "labels",
        "counts",
        "unit",
        "scale",
      ]);
      if (source.type !== "bar" && source.type !== "line")
        return fail(file, "data.chart.type must be bar or line.");
      const labels = options(source.labels, file, "data.chart.labels", true);
      const counts = source.counts;
      if (
        !Array.isArray(counts) ||
        counts.length !== labels.length ||
        !counts.every((n): n is number =>
          typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 10,
        )
      )
        return fail(
          file,
          "data.chart.counts must match labels and contain integers from 0 to 10.",
        );
      const scale = source.scale;
      if (
        typeof scale !== "number" ||
        !Number.isInteger(scale) ||
        scale < 1 ||
        scale > 10 ||
        (source.type === "line" && scale !== 1)
      )
        return fail(file, "data.chart.scale must be 1 to 10; line plots use 1.");
      if (source.type === "line") {
        const values = labels.map((label) => {
          if (!/^\d+(?:\.\d+|\/[1-9]\d*)?$/.test(label))
            return fail(file, "data.chart line labels must be nonnegative numbers or fractions.");
          const [numerator, denominator = "1"] = label.split("/");
          return Number(numerator) / Number(denominator);
        });
        const step = values[1] - values[0];
        if (
          !values.every(Number.isFinite) ||
          step <= 0 ||
          values.slice(1).some(
            (n, i) => n <= values[i] || Math.abs((n - values[i]) / step - 1) > 1e-9,
          )
        )
          return fail(file, "data.chart line labels must increase in equal steps.");
      }
      chart = {
        type: source.type,
        title: text(source.title, file, "data.chart.title"),
        labels,
        counts,
        unit: text(source.unit, file, "data.chart.unit"),
        scale,
      };
    } else if (id === "data") return fail(file, "data.chart is required.");
    let guide: LessonGuide | undefined;
    if (
      curriculumLessonIds.some((name) => name === id) ||
      lesson.guide !== undefined
    ) {
      const source = object(lesson.guide, file, `${id}.guide`, [
        "standards",
        "learn",
        "together",
      ]);
      if (!Array.isArray(source.standards) ||
        (grade === "prek" ? source.standards.length !== 0 : source.standards.length === 0))
        return fail(
          file,
          grade === "prek"
            ? `${id}.guide.standards must be empty; Common Core starts at Kindergarten.`
            : `${id}.guide.standards needs at least one standard code.`,
        );
      const gradeCode = grade === "k" ? "K" : grade;
      const codes = source.standards.map((code, index) => {
        const value = text(code, file, `${id}.guide.standards[${index}]`);
        const math = value.match(
          /^(K|[1-5])\.(CC|OA|NBT|NF|MD|G)\.\d+(?:\.[a-d])?$/,
        );
        const english = value.match(
          /^(RI|RL|RF|W|SL|L)\.(K|[1-5])\.\d+(?:\.[a-z])?$/,
        );
        if ((math?.[1] ?? english?.[2]) !== gradeCode)
          return fail(
            file,
            `${id}.guide has an invalid or wrong-grade standard code: ${value}.`,
          );
        return value;
      });
      if (new Set(codes).size !== codes.length)
        return fail(file, `${id}.guide.standards has duplicate codes.`);
      guide = {
        standards: codes,
        learn: text(source.learn, file, `${id}.guide.learn`),
        together: text(source.together, file, `${id}.guide.together`),
      };
    }
    const rows = lesson.questions;
    if (!Array.isArray(rows) || rows.length !== 5)
      return fail(file, `${id}.questions needs exactly five question rows.`);
    const questions = rows.map((row, index): Question => {
      const label = `${id}.questions[${index}]`;
      if (!Array.isArray(row) || row.length !== 5)
        return fail(
          file,
          `${label} must be [prompt, answer, options or null, hint, explanation].`,
        );
      const question: Question = {
        prompt: text(row[0], file, `${label}.prompt`),
        answer: text(row[1], file, `${label}.answer`),
        hint: text(row[3], file, `${label}.hint`),
        explanation: text(row[4], file, `${label}.explanation`),
      };
      if (id === "spelling") {
        if (row[2] !== null)
          return fail(file, `${label}: spelling choices must be null.`);
      } else {
        question.options = options(row[2], file, `${label}.options`, true);
        if (!question.options.includes(question.answer))
          return fail(file, `${label}.answer must exactly match a choice.`);
      }
      if (passage) question.passage = passage;
      if (chart) question.chart = chart;
      return question;
    });
    parsed[id] = {
      title: text(lesson.title, file, `${id}.title`),
      skill: text(lesson.skill, file, `${id}.skill`),
      questions,
      ...(guide ? { guide } : {}),
    };
  }
  return {
    grade,
    overview: text(record.overview, file, "overview"),
    lessons: parsed,
  };
}
