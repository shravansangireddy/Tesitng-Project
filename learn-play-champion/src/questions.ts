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
    // Lesson pools hold complete sets of five questions beyond the original
    // five. Each round serves one uniformly random complete set, chosen with
    // the caller's random source; a zero stub deterministically serves the
    // first set. A trailing partial set (which the parser prevents) is floored
    // away and never served.
    const pool = grades[grade].lessons[id].questions;
    const sets = Math.floor(pool.length / 5);
    const setIndex =
      sets > 0 ? Math.min(sets - 1, Math.floor(random() * sets)) : 0;
    questions = pool.slice(setIndex * 5, setIndex * 5 + 5);
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

// Value samplers for every Math template family. Answers are computed from
// the sampled values, so generated questions are correct by construction.
// The distinct-prompt space of each family is the size of its sample grid;
// scripts/count-questions.mjs enumerates the same grids.
interface SampledTemplate {
  values: Record<string, number>;
  answer: number;
}
function pick(random: () => number, low: number, high: number): number {
  return low + Math.floor(random() * (high - low + 1));
}
const templateSamplers: Record<
  string,
  (random: () => number) => SampledTemplate
> = {
  addition: (random) => {
    const a = pick(random, 4, 18);
    const b = pick(random, 1, a);
    return { values: { a, b, answer: a + b }, answer: a + b };
  },
  subtraction: (random) => {
    const a = pick(random, 4, 18);
    const b = pick(random, 1, a);
    return { values: { a, b, answer: a - b }, answer: a - b };
  },
  multiplication: (random) => {
    const a = pick(random, 2, 9);
    const b = pick(random, 2, 9);
    return {
      values: { a, b, product: a * b, answer: a * b },
      answer: a * b,
    };
  },
  division: (random) => {
    const b = pick(random, 2, 9);
    const a = pick(random, 2, 9);
    return {
      values: { a, b, product: a * b, answer: a },
      answer: a,
    };
  },
  patterns: (random) => {
    const step = pick(random, 2, 6);
    const start = pick(random, 1, 8);
    const answer = start + step * 4;
    return {
      values: {
        step,
        start,
        n1: start + step,
        n2: start + step * 2,
        n3: start + step * 3,
        answer,
      },
      answer,
    };
  },
  fractions: (random) => {
    const b = [2, 3, 4, 5, 6, 8, 10, 12][pick(random, 0, 7)];
    const answer = pick(random, 1, 20);
    const a = b * answer;
    return { values: { a, b, answer }, answer };
  },
  decimals: (random) => {
    const a = pick(random, 1, 19) / 2;
    const b = pick(random, 1, 19) / 2;
    const answer = (Math.round(a * 10) + Math.round(b * 10)) / 10;
    return { values: { a, b, answer }, answer };
  },
  placevalue: (random) => {
    const a = pick(random, 100, 999);
    const place = [1, 10, 100][pick(random, 0, 2)];
    const digit = Math.floor(a / place) % 10;
    if (digit === 0) return templateSamplers.placevalue(random);
    return { values: { a, b: digit, answer: digit * place }, answer: digit * place };
  },
  money: (random) => {
    const a = pick(random, 0, 8);
    const b = pick(random, 0, 10);
    if (a === 0 && b === 0) return templateSamplers.money(random);
    const answer = a * 25 + b * 10;
    return { values: { a, b, answer }, answer };
  },
  time: (random) => {
    const a = pick(random, 1, 9);
    const b = pick(random, 1, 3);
    return { values: { a, b, answer: a + b }, answer: a + b };
  },
  measurement: (random) => {
    const a = pick(random, 1, 12);
    return { values: { a, answer: a * 100 }, answer: a * 100 };
  },
  missing: (random) => {
    const a = pick(random, 2, 30);
    const answer = pick(random, 2, 30);
    return { values: { a, b: a + answer, answer }, answer };
  },
  multidigit: (random) => {
    const a = pick(random, 12, 99);
    const b = pick(random, 3, 9);
    return {
      values: { a, b, product: a * b, answer: a * b },
      answer: a * b,
    };
  },
};
function optionSet(answer: number, random: () => number): number[] {
  const options = new Set<number>([answer]);
  for (const delta of [1, -1, 2, -2, 10, -10, 3, 5]) {
    if (options.size >= 4) break;
    const candidate = answer + delta;
    if (candidate >= 0) options.add(candidate);
  }
  return shuffle([...options], random);
}
export function makeGeneratedRound(
  family: string,
  random: () => number = Math.random,
): Question[] {
  const { templates } = getLearningContent();
  if (!Object.prototype.hasOwnProperty.call(templateSamplers, family))
    throw new Error(`Unknown Math template family: ${family}`);
  const template = templates[family as keyof typeof templates];
  const sampler = templateSamplers[family];
  const seen = new Set<string>();
  return Array.from({ length: 5 }, () => {
    let sampled = sampler(random);
    let guard = 0;
    while (seen.has(JSON.stringify(sampled.values)) && guard++ < 25)
      sampled = sampler(random);
    seen.add(JSON.stringify(sampled.values));
    return generatedQuestion(
      template,
      sampled.answer,
      optionSet(sampled.answer, random),
      sampled.values,
    );
  });
}
