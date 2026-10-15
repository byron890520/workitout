import { BASE, DEMO } from "../lib/site.js";
export function GET() {
  const rules = DEMO ? "User-agent: *\nDisallow: /\n" : "User-agent: *\nAllow: /\n";
  return new Response(`${rules}\nSitemap: ${BASE}/sitemap-index.xml\n`, { headers: { "Content-Type": "text/plain" } });
}
