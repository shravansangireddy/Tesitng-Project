// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import BarChart from "./BarChart";
import type { ProgressBar } from "./progress-charts";

let container: HTMLDivElement;
let root: Root;

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

const BARS: ProgressBar[] = [
  { id: "english", label: "English", value: 40, color: "#7650d9" },
  { id: "math", label: "Math", value: 10, color: "#3d7760" },
];

describe("BarChart", () => {
  it("renders labels and values as real text, with fills scaled to the largest bar", async () => {
    await act(async () =>
      root.render(<BarChart title="English vs Math" bars={BARS} unit="correct" />),
    );
    expect(container.querySelector("figcaption")?.textContent).toBe("English vs Math");
    const rows = [...container.querySelectorAll(".bar-row")];
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelector(".bar-row-label")?.textContent).toBe("English");
    expect(rows[0].querySelector(".bar-row-value")?.textContent).toBe("40 correct");
    expect(rows[1].querySelector(".bar-row-value")?.textContent).toBe("10 correct");
    const fills = [...container.querySelectorAll<HTMLElement>(".bar-fill")];
    expect(fills[0].style.width).toBe("100%");
    expect(fills[1].style.width).toBe("25%");
    expect(fills[0].style.background).toBe("rgb(118, 80, 217)");
  });

  it("keeps the decorative track hidden from assistive technology", async () => {
    await act(async () =>
      root.render(<BarChart title="Points" bars={BARS} />),
    );
    const tracks = [...container.querySelectorAll(".bar-track")];
    expect(tracks).toHaveLength(2);
    expect(tracks.every((track) => track.getAttribute("aria-hidden") === "true")).toBe(true);
  });

  it("renders zero-value bars as empty tracks instead of dividing by zero", async () => {
    const zeros: ProgressBar[] = [
      { id: "a", label: "Alpha", value: 0, color: "#7650d9" },
      { id: "b", label: "Beta", value: 0, color: "#3d7760" },
    ];
    await act(async () => root.render(<BarChart title="Zeros" bars={zeros} />));
    const fills = [...container.querySelectorAll<HTMLElement>(".bar-fill")];
    expect(fills.map((fill) => fill.style.width)).toEqual(["0%", "0%"]);
  });
});
