import type { LessonGuide } from "./content-schema";

export default function LessonTips({ guide }: { guide: LessonGuide }) {
  return (
    <details className="lesson-tips">
      <summary>Learn &amp; try together</summary>
      <p><strong>Learn:</strong> {guide.learn}</p>
      <p><strong>With a grown-up:</strong> {guide.together}</p>
      <small>
        {guide.standards.length
          ? `Selected Common Core targets: ${guide.standards.join(", ")}.`
          : "Pre-K exploration; no Common Core Pre-K alignment claimed."}
        Practice samples only; adult-led work is not automatically assessed.
      </small>
    </details>
  );
}
