import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { contentFiles, validateContentFiles } from "./src/content-schema.ts";
import { sitePages } from "./src/site-content.ts";
import { siteOrigin, sitePath, renderSitePage, renderSitemap, renderRobots, renderMachineGuide, siteStyles } from "./src/site-pages.ts";

export default defineConfig(({ mode }) => {
  const origin = siteOrigin(loadEnv(mode, process.cwd(), "PUBLIC_").PUBLIC_SITE_URL);
  const pages = new Map(sitePages.map(page => [sitePath(page), renderSitePage(page, origin)]));
  const assets = new Map<string, string>([...pages].map(([path, html]) => [path.slice(1) + "index.html", html]));
  assets.set("learn/site.css", siteStyles);
  assets.set("robots.txt", renderRobots(origin));
  assets.set("llms.txt", renderMachineGuide(origin));
  if (origin) assets.set("sitemap.xml", renderSitemap(origin));
  return {
    plugins: [
      react(),
      {
        name: "public-learning-guides",
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const path = new URL(request.url ?? "/", "http://localhost").pathname;
            if (path === "/learn" || sitePages.some(page => page.slug && path === sitePath(page).slice(0, -1))) {
              response.writeHead(308, { Location: path + "/" });
              response.end();
              return;
            }
            const content = pages.get(path) ?? assets.get(path.slice(1));
            if (content !== undefined) {
              const type = path.endsWith(".css") ? "text/css" : path.endsWith(".xml") ? "application/xml" :
                path.endsWith(".txt") ? "text/plain" : "text/html";
              response.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
              response.end(content);
              return;
            }
            if (path.startsWith("/learn/")) {
              response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
              response.end("Learning guide not found.");
              return;
            }
            next();
          });
        },
        generateBundle() {
          for (const [fileName, source] of assets) this.emitFile({ type: "asset", fileName, source });
        },
      },
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
  };
});
