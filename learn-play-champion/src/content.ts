import { validateContentFiles, type LearningContent } from "./content-schema";
export type { Question } from "./content-schema";

const imported = import.meta.glob<string>("./content/**/*.txt", {
  query: "?raw",
  import: "default",
  eager: true,
});
const files = Object.fromEntries(
  Object.entries(imported).map(([path, raw]) => [
    path.slice("./content/".length),
    raw,
  ]),
);
function loadContent():
  | { data: LearningContent; error: "" }
  | { data: null; error: string } {
  try {
    return { data: validateContentFiles(files), error: "" };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Learning content could not be loaded.";
    console.error(message);
    return { data: null, error: message };
  }
}
const loaded = loadContent();
export const contentError = loaded.error;
export function getLearningContent(): LearningContent {
  if (!loaded.data) throw new Error(loaded.error);
  return loaded.data;
}
