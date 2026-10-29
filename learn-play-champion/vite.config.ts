import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { contentFiles, validateContentFiles } from "./src/content-schema.ts";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "validate-learning-content",
      buildStart() {
        const files = Object.fromEntries(
          contentFiles.map((file) => [
            file,
            readFileSync(
              new URL(`./src/content/${file}`, import.meta.url),
              "utf8",
            ),
          ]),
        );
        validateContentFiles(files);
      },
    },
  ],
});
