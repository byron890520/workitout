import { CONFIG } from "../lib/site.js";
// Filled in automatically once adsense_client is set in src/data/config.json.
export function GET() {
  const pub = (CONFIG.adsense_client || "").replace(/^ca-/, "");
  const body = pub ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` : "# Add your AdSense ID to src/data/config.json\n";
  return new Response(body, { headers: { "Content-Type": "text/plain" } });
}
