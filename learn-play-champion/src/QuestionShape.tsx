import type { Question } from "./content-schema";

export default function QuestionShape({ shape }: { shape: NonNullable<Question["shape"]> }) {
  return <svg className="shape-image" viewBox="0 0 160 120" role="img" aria-label={`A ${shape}`}>
    {shape === "triangle" && <polygon points="80,10 145,110 15,110" />}
    {shape === "square" && <rect x="30" y="10" width="100" height="100" rx="3" />}
    {shape === "rectangle" && <rect x="10" y="25" width="140" height="80" rx="3" />}
    {shape === "circle" && <circle cx="80" cy="60" r="50" />}
    {shape === "pentagon" && <polygon points="80,8 138,50 116,112 44,112 22,50" />}
  </svg>;
}
