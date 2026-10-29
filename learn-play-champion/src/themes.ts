export const themes = [
  { id: "island", label: "Rainbow Island", description: "Purple skies and sunny discoveries", colors: ["#6240c0", "#fff1b7", "#d9f6ec"] },
  { id: "ocean", label: "Ocean Explorers", description: "Teal waves and coral treasures", colors: ["#086b80", "#ffe4da", "#d7f4ff"] },
  { id: "garden", label: "Jungle Garden", description: "Leafy greens and butterfly pinks", colors: ["#286a3b", "#ffe1ed", "#edfacf"] },
  { id: "space", label: "Cosmic Adventure", description: "Berry planets and starry lilac", colors: ["#863c86", "#e7e5ff", "#ffedc4"] },
] as const;
export type ThemeId = typeof themes[number]["id"];
