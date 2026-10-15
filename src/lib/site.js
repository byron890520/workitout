import CONFIG from "../data/config.json" with { type: "json" };

export { CONFIG };
export const DEMO = !!process.env.DEMO;
export const BASE = CONFIG.domain.replace(/\/$/, "");

// Today's date in South Africa (YYYY-MM-DD), so hints publish at local midnight.
export function todaySA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.timezone || "Africa/Johannesburg" }).format(new Date());
}

export const TOOLS = [
  { slug: "salary-calculator", nav: "Salary", title: "Salary After Tax Calculator", glyph: "R", alt: false,
    desc: "Take-home pay after PAYE, UIF and medical aid credits.", keywords: "paye tax income take home net pay payslip uif" },
  { slug: "vat-calculator", nav: "VAT", title: "VAT Calculator (15%)", glyph: "15%", alt: true,
    desc: "Add or remove 15% South African VAT in one tap.", keywords: "vat 15 percent add remove inclusive exclusive invoice" },
  { slug: "aps-calculator", nav: "APS", title: "APS Score Calculator", glyph: "42", alt: false,
    desc: "Work out your matric Admission Point Score for university.", keywords: "aps matric university admission points nsc" },
  { slug: "electricity-calculator", nav: "Electricity", title: "Prepaid Electricity Calculator", glyph: "kWh", alt: true,
    desc: "Units per rand, plus what each appliance costs to run.", keywords: "electricity prepaid units eskom kwh geyser appliance" },
  { slug: "transfer-duty-calculator", nav: "Transfer duty", title: "Transfer Duty Calculator", glyph: "13%", alt: false,
    desc: "SARS transfer duty on a property purchase.", keywords: "transfer duty property house buy bond sars conveyancing" },
  { slug: "word-hints", nav: "Word hints", title: "Daily Word Game Hints", glyph: "A?", alt: true,
    desc: "Spoiler-free Wordle and Wortel hints, updated daily.", keywords: "wordle wortel hint answer today word game puzzle" },
];

export const glyphFor = (path) => TOOLS.find((t) => path.startsWith("/" + t.slug + "/"));

export function toolSchema(name, path, desc, category = "FinanceApplication") {
  return {
    "@type": "WebApplication", name, url: BASE + path, description: desc, applicationCategory: category,
    operatingSystem: "Any", inLanguage: "en-ZA", isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "ZAR" },
    areaServed: { "@type": "Country", name: "South Africa" },
  };
}
