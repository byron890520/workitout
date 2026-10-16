import { BASE, TOOLS } from "./site.js";

export const EMBEDDABLE = ["salary-calculator", "net-to-gross-salary-calculator", "hourly-rate-calculator", "tax-refund-calculator",
  "retirement-annuity-calculator", "vat-calculator", "compound-interest-calculator", "electricity-calculator", "transfer-duty-calculator"];

/** The copy-and-paste code a site owner puts on their page. The credit link sits outside the iframe so it counts as a real link. */
export function snippet(slug) {
  const t = TOOLS.find((x) => x.slug === slug);
  return `<iframe src="${BASE}/embed/${slug}/" title="${t.title}" loading="lazy" style="width:100%;max-width:960px;height:820px;border:0"></iframe>
<p style="font:14px sans-serif;margin:6px 0 0">${t.title} by <a href="${BASE}/${slug}/">Work It Out</a></p>
<script>addEventListener("message",function(e){if(e.origin!=="${BASE}"||!e.data||!e.data.wioHeight)return;document.querySelectorAll('iframe[src^="${BASE}/embed/"]').forEach(function(f){if(f.contentWindow===e.source)f.style.height=e.data.wioHeight+"px"})});</script>`;
}
