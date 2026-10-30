// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { gradePages, sitePages } from "./site-content";
import { renderMachineGuide, renderRobots, renderSitePage, renderSitemap, siteOrigin, sitePath, stockPhotos } from "./site-pages";

describe("public learning guides", () => {
  it("publishes distinct, readable pages without requiring JavaScript", () => {
    expect(sitePages).toHaveLength(21);
    expect(gradePages).toHaveLength(7);
    expect(new Set(sitePages.map(sitePath)).size).toBe(sitePages.length);
    expect(new Set(sitePages.map(page => page.title)).size).toBe(sitePages.length);
    expect(new Set(sitePages.map(page => page.description)).size).toBe(sitePages.length);
    for (const page of sitePages) {
      const doc = new DOMParser().parseFromString(renderSitePage(page), "text/html");
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      expect(doc.querySelector("h1")?.textContent).toBe(page.heading);
      expect(doc.querySelector("article")?.textContent).toContain(page.intro);
      expect(doc.querySelectorAll("article section").length).toBeGreaterThanOrEqual(2);
      expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(page.description);
      expect(doc.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(page.title);
      expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index,follow");
      expect(doc.querySelectorAll("script:not([type='application/ld+json'])")).toHaveLength(0);
      expect(doc.querySelector("form")).toBeNull();
      expect(doc.querySelector("link[rel=canonical]")).toBeNull();
      for (const a of doc.querySelectorAll("a[href]")) {
        const href = a.getAttribute("href")!;
        expect(href === "/" || href === "#content" || sitePages.some(p => sitePath(p) === href) ||
          (href.startsWith("/books/") && href.endsWith(".pdf")) ||
          Object.values(stockPhotos).some(photo => photo.source === href)).toBe(true);
      }
    }
  });
  it("uses responsive local photos with dimensions, attribution, and no remote image requests", () => {
    let total = 0;
    for (const page of sitePages) {
      const doc = new DOMParser().parseFromString(renderSitePage(page), "text/html");
      for (const image of doc.querySelectorAll("img")) {
        total++;
        expect(image.getAttribute("src")).toMatch(/^\/images\/[\w-]+\.webp$/);
        expect(image.getAttribute("srcset")).toContain("600w");
        expect(image.getAttribute("srcset")).toContain("1200w");
        expect(image.getAttribute("width")).toBe("1200");
        expect(image.getAttribute("height")).toBe("800");
        expect(image.getAttribute("loading")).toBe("lazy");
        expect(image.hasAttribute("alt")).toBe(true);
      }
      for (const source of doc.querySelectorAll('a[href^="https://unsplash.com/"]')) {
        expect(source.getAttribute("rel")).toBe("noreferrer");
      }
      if (doc.querySelector("img")) {
        expect(doc.body.textContent).toContain("Illustrative stock");
        expect(doc.querySelector('a[href^="https://unsplash.com/"]')).not.toBeNull();
      }
    }
    expect(total).toBe(18);
    expect(Object.values(stockPhotos).map(photo => photo.file)).toEqual(["kids-creating", "map-adventure", "kids-homework", "kids-reading", "kids-coding", "family-learning"]);
    const home = new DOMParser().parseFromString(renderSitePage(sitePages[0]), "text/html");
    expect(home.querySelector(".adventure-feature h2")?.textContent).toContain("discovery is an adventure");
  });
  it("offers six openly licensed book PDFs for free download on the books page", () => {
    const books = sitePages.find(p => p.slug === "books-for-curious-kids")!;
    const doc = new DOMParser().parseFromString(renderSitePage(books), "text/html");
    const links = [...doc.querySelectorAll('a[href^="/books/"]')].map(a => a.getAttribute("href"));
    expect(links).toEqual([
      "/books/fossils-tales-of-long-ago.pdf",
      "/books/how-many.pdf",
      "/books/croak.pdf",
      "/books/colours.pdf",
      "/books/rain.pdf",
      "/books/i-feel.pdf",
    ]);
    for (const a of doc.querySelectorAll('a[href^="/books/"]')) expect(a.hasAttribute("download")).toBe(true);
    expect(doc.body.textContent).toContain("CC BY 4.0");
    expect(doc.body.textContent).toContain("Pratham Books");
  });
  it("provides an original subject and grade catalog with working audience entry points", () => {
    const doc = new DOMParser().parseFromString(renderSitePage(sitePages[0]), "text/html");
    expect(doc.body.className).toBe("landing-page");
    expect(doc.querySelectorAll(".subject-card")).toHaveLength(4);
    expect(doc.querySelectorAll(".grade-card")).toHaveLength(7);
    expect(doc.querySelectorAll(".step-cards li")).toHaveLength(3);
    expect(doc.querySelectorAll(".audience-card")).toHaveLength(2);
    expect(doc.querySelector(".hero-art svg title")?.textContent).toContain("Pip the owl");
    expect(doc.querySelector(".learning-facts")?.textContent).toContain("560");
    expect(doc.querySelectorAll("nav[aria-label=Primary] details")).toHaveLength(2);
    expect(doc.querySelector('a[href="/learn/for-families/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/learn/for-teachers/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/learn/how-it-works/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/learn/faq/"]')).not.toBeNull();
    expect(doc.querySelector('a[href="/learn/about/"]')).not.toBeNull();
    expect(doc.querySelectorAll("img[src^='http'],iframe,form")).toHaveLength(0);
    expect(doc.body.textContent).not.toContain("IXL");
  });
  it("keeps inner-page navigation consistent without showing the home-only promotion", () => {
    for (const page of sitePages.filter(p => p.slug)) {
      const doc = new DOMParser().parseFromString(renderSitePage(page), "text/html");
      expect(doc.body.className).toBe("guide-page");
      expect(doc.querySelector('nav[aria-label="Breadcrumb"]')?.textContent).toContain(page.title.split(" | ")[0]);
      expect(doc.querySelector(".hero-art")).toBeNull();
      expect(doc.querySelector(".learning-facts")).toBeNull();
      expect(doc.querySelector(".site-footer")).not.toBeNull();
      expect(doc.querySelectorAll('nav[aria-label="Grade guides"] a')).toHaveLength(7);
    }
  });
  it("uses only the configured origin for canonicals, sitemap, and discovery", () => {
    const origin = siteOrigin("https://learning.test/");
    expect(origin).toBe("https://learning.test");
    const sitemap = new DOMParser().parseFromString(renderSitemap(origin!), "application/xml");
    expect(sitemap.querySelector("parsererror")).toBeNull();
    expect([...sitemap.querySelectorAll("loc")].map(loc => loc.textContent)).toEqual(sitePages.map(p => origin + sitePath(p)));
    for (const page of sitePages) {
      const doc = new DOMParser().parseFromString(renderSitePage(page, origin), "text/html");
      const url = origin + sitePath(page);
      expect(doc.querySelector("link[rel=canonical]")?.getAttribute("href")).toBe(url);
      expect(doc.querySelector('meta[property="og:url"]')?.getAttribute("content")).toBe(url);
      const schema = JSON.parse(doc.querySelector('script[type="application/ld+json"]')!.textContent!);
      expect(schema.url).toBe(url);
      expect(schema.description).toBe(page.description);
      expect(schema["@type"]).toBe("WebPage");
      expect(schema).not.toHaveProperty("aggregateRating");
    }
    expect(renderRobots(origin)).toContain("Sitemap: https://learning.test/sitemap.xml");
    expect(renderRobots()).not.toContain("Sitemap:");
    expect(renderMachineGuide(origin)).toContain("not a web or AI indexing standard");
  });
  it("rejects misleading or unsafe origin configuration", () => {
    expect(siteOrigin("")).toBeUndefined();
    for (const value of ["http://learning.test", "https://learning.test/app", "https://user:pass@learning.test",
      "https://learning.test/?token=secret", "https://learning.test/#fragment", "https://localhost", "https://your-site.example", "not a url"]) {
      expect(() => siteOrigin(value)).toThrow();
    }
  });
  it("escapes editorial text in markup, metadata, and structured data", () => {
    const page = { ...sitePages[0], title: '<script>alert("x")</script>', description: 'A "quote" & <tag>' };
    const doc = new DOMParser().parseFromString(renderSitePage(page), "text/html");
    expect(doc.title).toBe(page.title);
    expect(doc.querySelectorAll("script")).toHaveLength(1);
    expect(JSON.parse(doc.querySelector("script")!.textContent!).name).toBe(page.title);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(page.description);
  });
});
