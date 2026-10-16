import CONFIG from "../data/config.json" with { type: "json" };
import UPDATED from "../data/updated.json" with { type: "json" };

export { CONFIG };
export const DEMO = !!process.env.DEMO;
export const BASE = CONFIG.domain.replace(/\/$/, "");

// Today's date in South Africa (YYYY-MM-DD), so hints publish at local midnight.
export function todaySA() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CONFIG.timezone || "Africa/Johannesburg" }).format(new Date());
}

/** The date a page's content last really changed (src/data/updated.json), not the build date. */
export const updatedFor = (path) => UPDATED[path] || UPDATED.default;

export const TOOLS = [
  { slug: "salary-calculator", group: "pay", nav: "Salary", title: "Salary After Tax Calculator", glyph: "R", alt: false,
    desc: "Take-home pay after PAYE, UIF and medical aid credits.", keywords: "paye tax income take home net pay payslip uif" },
  { slug: "net-to-gross-salary-calculator", group: "pay", nav: "Net to gross", title: "Net to Gross Salary Calculator", glyph: "+R", alt: true,
    desc: "The gross salary you need for the take-home pay you want.", keywords: "net to gross salary reverse take home ctc offer negotiate" },
  { slug: "hourly-rate-calculator", group: "pay", nav: "Hourly rate", title: "Hourly Rate to Salary Calculator", glyph: "R/h", alt: false,
    desc: "Turn an hourly rate into weekly, monthly and yearly pay.", keywords: "hourly rate salary per hour wage monthly annual freelance contractor" },
  { slug: "tax-refund-calculator", group: "pay", nav: "Tax refund", title: "SARS Tax Refund Calculator", glyph: "ITR", alt: true,
    desc: "Estimate your refund from SARS on assessment.", keywords: "tax refund sars efiling itr12 assessment irp5 medical retirement annuity" },
  { slug: "retirement-annuity-calculator", group: "pay", nav: "Retirement annuity", title: "Retirement Annuity Tax Calculator", glyph: "RA", alt: false,
    desc: "How much tax an RA saves you, and what it grows to.", keywords: "retirement annuity ra tax deduction section 11f pension provident savings" },
  { slug: "vat-calculator", group: "money", nav: "VAT", title: "VAT Calculator (15%)", glyph: "15%", alt: true,
    desc: "Add or remove 15% South African VAT in one tap.", keywords: "vat 15 percent add remove inclusive exclusive invoice" },
  { slug: "compound-interest-calculator", group: "money", nav: "Compound interest", title: "Compound Interest Calculator", glyph: "%↑", alt: false,
    desc: "See how savings and monthly top-ups grow over time.", keywords: "compound interest savings investment growth tfsa retirement monthly contribution" },
  { slug: "electricity-calculator", group: "money", nav: "Electricity", title: "Prepaid Electricity Calculator", glyph: "kWh", alt: true,
    desc: "Units per rand, plus what each appliance costs to run.", keywords: "electricity prepaid units eskom kwh geyser appliance" },
  { slug: "transfer-duty-calculator", group: "money", nav: "Bond transfer duty", title: "Bond Transfer Duty Calculator", glyph: "13%", alt: false,
    desc: "SARS transfer duty when you buy a property.", keywords: "bond transfer duty property house buy sars conveyancing costs" },
  { slug: "answers", group: "daily", nav: "Tax answers", title: "Tax & Money Answers", glyph: "?", alt: true,
    desc: "Quick answers to common SA tax and money questions.", keywords: "answers questions paye tax threshold uif vat transfer duty how much" },
  { slug: "woord-van-die-dag", group: "daily", nav: "Woord van die Dag", title: "Afrikaans Word of the Day", glyph: "Aa", alt: false,
    desc: "Woord van die Dag: one Afrikaans word, explained in English.", keywords: "afrikaans woord van die dag word of the day learn afrikaans vocabulary" },
  { slug: "word-hints", group: "daily", nav: "Word hints", title: "Daily Word Game Hints", glyph: "A?", alt: true,
    desc: "Spoiler-free Wordle and Wortel hints, updated daily.", keywords: "wordle wortel hint answer today word game puzzle" },
];

// How the Tools menu groups things.
export const GROUPS = [
  { id: "pay", label: "Salary & tax" },
  { id: "money", label: "Money & home" },
  { id: "daily", label: "Learn & play" },
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
