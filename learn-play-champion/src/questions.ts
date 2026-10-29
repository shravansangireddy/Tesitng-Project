import { getLearningContent, type Question } from "./content";
import {
  renderTemplate,
  curriculumLessonIds,
  type BankName,
  type MathTemplate,
  type GradeId,
} from "./content-schema";
import type { ActivityId } from "./game";

function generatedQuestion(
  template: MathTemplate,
  answer: number,
  options: number[],
  values: Record<string, number>,
): Question {
  return {
    prompt: renderTemplate(template.prompt, values),
    answer: String(answer),
    options: options.map(String),
    hint: renderTemplate(template.hint, values),
    explanation: renderTemplate(template.explanation, values),
  };
}
export function makeRound(
  id: ActivityId,
  random: () => number = Math.random,
  grade?: GradeId,
): Question[] {
  const { banks, templates, grades } = getLearningContent();
  if (!grade && curriculumLessonIds.some((name) => name === id))
    throw new Error(`Choose a grade for curriculum activity: ${id}`);
  let questions: Question[];
  if (grade) {
    if (
      !Object.prototype.hasOwnProperty.call(grades, grade) ||
      !Object.prototype.hasOwnProperty.call(grades[grade].lessons, id)
    ) {
      throw new Error(`Unknown grade or learning activity: ${grade}/${id}`);
    }
    questions = grades[grade].lessons[id].questions;
  } else if (id === "arithmetic") {
    questions = Array.from({ length: 5 }, (_, i) => {
      const a = 4 + Math.floor(random() * 15);
      const b = 1 + Math.floor(random() * a);
      const subtract = i % 2 === 1;
      const answer = subtract ? a - b : a + b;
      return generatedQuestion(
        templates[subtract ? "subtraction" : "addition"],
        answer,
        [answer, answer + 1, answer + 3, Math.max(0, answer - 2)],
        { a, b, answer },
      );
    });
  } else if (id === "multiply") {
    questions = Array.from({ length: 5 }, (_, i) => {
      const a = 2 + Math.floor(random() * 8);
      const b = 2 + Math.floor(random() * 8);
      const divide = i % 2 === 1;
      const answer = divide ? a : a * b;
      return generatedQuestion(
        templates[divide ? "division" : "multiplication"],
        answer,
        [answer, answer + 1, answer + b, answer - 1],
        { a, b, product: a * b, answer },
      );
    });
  } else if (id === "patterns") {
    questions = Array.from({ length: 5 }, () => {
      const step = 2 + Math.floor(random() * 5);
      const start = 1 + Math.floor(random() * 8);
      const answer = start + step * 4;
      return generatedQuestion(
        templates.patterns,
        answer,
        [answer, answer + 1, answer + step, answer - 1],
        {
          step,
          start,
          n1: start + step,
          n2: start + step * 2,
          n3: start + step * 3,
          answer,
        },
      );
    });
  } else {
    if (!Object.prototype.hasOwnProperty.call(banks, id))
      throw new Error(`Unknown learning activity: ${id}`);
    questions = banks[id as BankName];
  }
  return questions.map((question) => ({
    ...question,
    options: question.options
      ? shuffle([...new Set(question.options)], random)
      : undefined,
  }));
}
function shuffle<T>(values: T[], random: () => number): T[] {
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}
