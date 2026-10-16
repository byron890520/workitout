import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { readFileSync } from "node:fs";

const read = (f) => JSON.parse(readFileSync(new URL(`./src/data/${f}`, import.meta.url), "utf8"));
const config = read("config.json");
const demo = !!process.env.DEMO;

// "Last updated" dates for the sitemap, so Google re-crawls pages that changed.
const today = new Intl.DateTimeFormat("en-CA", { timeZone: config.timezone || "Africa/Johannesburg" }).format(new Date());
const hints = read("hints.json").filter((h) => h.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1));
const slugs = { wordle: ["wordle-hint-", "wordle-hint-today"], wortel: ["wortel-wenk-", "wortel-wenk-vandag"] };
const lastmod = new Map();
for (const h of hints) {
  const [dated, todaySlug] = slugs[h.game] || [];
  if (!dated) continue;
  lastmod.set(`/word-hints/${dated}${h.date}/`, h.date);
  if (!lastmod.has(`/word-hints/${todaySlug}/`)) lastmod.set(`/word-hints/${todaySlug}/`, h.date);
}
if (hints[0]) lastmod.set("/word-hints/", hints[0].date);
const words = read("woorde.json").filter((w) => w.date <= today).sort((a, b) => (a.date < b.date ? 1 : -1));
for (const w of words) lastmod.set(`/woord-van-die-dag/${w.date}/`, w.date);
if (words[0]) lastmod.set("/woord-van-die-dag/", words[0].date);

export default defineConfig({
  site: config.domain,
  trailingSlash: "always",
  build: { format: "directory", inlineStylesheets: "always" },
  integrations: [
    react(),
    // The preview build is never indexed, so it gets no sitemap.
    ...(demo ? [] : [sitemap({
      filter: (page) => !page.includes("/404") && !page.includes("/embed/"),
      serialize(item) {
        const path = new URL(item.url).pathname;
        const date = lastmod.get(path) || today;
        const daily = path.includes("-today/") || path.includes("-vandag/") || path === "/word-hints/" || path === "/woord-van-die-dag/";
        return { ...item, lastmod: date, changefreq: daily ? "daily" : "monthly",
          priority: path === "/" ? 1.0 : daily || path.endsWith("-calculator/") ? 0.9 : path.startsWith("/answers/") ? 0.7 : 0.5 };
      },
    })]),
  ],
});
