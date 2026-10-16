// Short answer pages for common searches. Every figure is worked out from the same code the
// calculators use, so the pages stay right when rates.json changes after a Budget.
import { RATES, salary, incomeTax, medicalCredit, vat, transferDuty, compound, hourly, retirementAnnuity, money, pct } from "./calc.js";

const ty = RATES.taxYear;
const yr = "20" + ty.split("/")[1]; // "2027"
const R2 = (n) => "R" + (Math.round(n * 100) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const table = (head, rows) =>
  `<div class="table-scroll"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const bracketFor = (taxable) => {
  let row = RATES.brackets[0];
  for (const b of RATES.brackets) if (taxable > b[0]) row = b;
  return row;
};

/* ---------- "How much tax on R__ a month?" ---------- */
const salaryAmounts = [10000, 15000, 20000, 25000, 30000, 40000, 50000, 75000, 100000];
const salaryPage = (a) => {
  const s = salary({ monthlyGross: a });
  const annual = a * 12;
  const [lo, base, rate] = bracketFor(annual);
  const before = incomeTax(annual, 30).gross;
  const med1 = salary({ monthlyGross: a, medicalMembers: 1 });
  const med3 = salary({ monthlyGross: a, medicalMembers: 3 });
  const old = salary({ monthlyGross: a, age: 65 });
  const pen = salary({ monthlyGross: a, retirement: Math.round(a * 0.075) });
  const near = [a - 5000, a, a + 5000].filter((x) => x > 0).map((x) => salary({ monthlyGross: x }));
  const words = money(a);
  return {
    slug: `tax-on-r${a}-a-month`,
    group: "Salary and PAYE", tool: "salary-calculator",
    q: `How much tax do I pay on ${words} a month?`,
    title: `Tax on ${words} a Month in South Africa (${yr}) – Take-Home Pay`,
    desc: `On ${words} a month you pay about ${money(s.paye)} PAYE and ${R2(s.uif)} UIF, so you take home about ${money(s.net)}. Full ${ty} SARS breakdown.`,
    short: `On a salary of <strong>${words} a month</strong> you pay about <strong>${R2(s.paye)} PAYE</strong> and <strong>${R2(s.uif)} UIF</strong>, so your take-home pay is about <strong>${R2(s.net)}</strong>. That assumes you're under 65 with no medical aid or pension deductions, for the ${ty} tax year.`,
    sections: [
      { h: "The breakdown", html: table(["", "Per month", "Per year"], [
        ["Gross salary", R2(a), money(annual)],
        ["PAYE (income tax)", R2(s.paye), money(s.annualTax)],
        ["UIF (1%)", R2(s.uif), money(s.uif * 12)],
        ["<strong>Take-home pay</strong>", `<strong>${R2(s.net)}</strong>`, `<strong>${money(s.net * 12)}</strong>`],
      ]) + `<p>Your marginal tax rate is ${pct(s.marginal)}: each extra rand you earn is taxed at that rate. Your effective rate, the share of your whole salary that goes to PAYE, is ${pct(s.effective)}.</p>` },
      { h: "How the tax is worked out", html: `<ol>
        <li>Annual salary: ${money(a)} × 12 = ${money(annual)}.</li>
        <li>That falls in the ${pct(rate)} bracket, which starts above ${money(lo)}. Tax before rebates: ${base ? `${money(base)} + ${pct(rate)} × (${money(annual)} − ${money(lo)})` : `${pct(rate)} × ${money(annual)}`} = ${money(before)}.</li>
        <li>Subtract the primary rebate of ${money(RATES.rebates.primary)}: ${money(s.annualTax)} for the year.</li>
        <li>Divide by 12: ${R2(s.paye)} PAYE a month.</li>
        <li>UIF is 1% of your salary, capped at ${R2(RATES.uifCeiling * RATES.uifRate)} a month.</li></ol>` },
      { h: "What changes your take-home pay", html: table(["Situation", "PAYE", "Take-home"], [
        ["Under 65, no deductions", R2(s.paye), R2(s.net)],
        ["On medical aid alone", R2(med1.paye), R2(med1.net)],
        ["Medical aid, you plus 2 dependants", R2(med3.paye), R2(med3.net)],
        ["Aged 65 to 74", R2(old.paye), R2(old.net)],
        [`Paying 7.5% (${money(Math.round(a * 0.075))}) into a pension`, R2(pen.paye), R2(pen.net)],
      ]) + `<p>Medical aid gives you a tax credit; it doesn't include what you pay the medical scheme, which comes off your pay separately. A pension contribution lowers your tax, but the contribution itself also leaves your pay, which is why take-home drops.</p>` },
      { h: "Nearby salaries", html: table(["Gross per month", "PAYE", "Take-home"], near.map((x) => [money(x.gross), R2(x.paye), R2(x.net)])) },
    ],
  };
};

/* ---------- other questions ---------- */
const threshold = RATES.rebates.primary / RATES.brackets[0][2];
const t65 = (RATES.rebates.primary + RATES.rebates.secondary) / RATES.brackets[0][2];
const t75 = (RATES.rebates.primary + RATES.rebates.secondary + RATES.rebates.tertiary) / RATES.brackets[0][2];
const uifMax = RATES.uifCeiling * RATES.uifRate;
const m = RATES.medCredit;
const ra = retirementAnnuity({ monthly: 2000, income: 360000 });
const g10 = compound({ monthly: 1000, rate: 9, years: 10 });
const g20 = compound({ monthly: 1000, rate: 9, years: 20 });
const g30 = compound({ monthly: 1000, rate: 9, years: 30 });
const h100 = hourly({ rate: 100 });
const h = [50, 100, 150, 250, 500].map((r) => hourly({ rate: r }));
const td = [1210000, 1500000, 2000000, 2500000, 3000000, 5000000].map((p) => [p, transferDuty(p)]);
const v = vat(1000, "add"), vr = vat(1150, "remove");

const others = [
  {
    slug: "tax-threshold-south-africa", group: "Salary and PAYE", tool: "salary-calculator",
    q: `What is the tax threshold in South Africa for ${yr}?`,
    title: `Tax Threshold South Africa ${yr} (${ty}) – How Much Can You Earn Tax-Free?`,
    desc: `For the ${ty} tax year you pay no income tax below ${money(threshold)} a year if you're under 65, ${money(t65)} if 65 to 74, and ${money(t75)} if 75 or older.`,
    short: `For the ${ty} tax year (1 March 2026 to 28 February 2027), you pay no income tax if you earn less than <strong>${money(threshold)} a year</strong> and you're under 65. That's about ${money(threshold / 12)} a month.`,
    sections: [
      { h: "Thresholds by age", html: table(["Age", "Tax-free up to (per year)", "Per month"], [
        ["Under 65", money(threshold), money(threshold / 12)], ["65 to 74", money(t65), money(t65 / 12)], ["75 and older", money(t75), money(t75 / 12)]]) },
      { h: "Why the threshold is where it is", html: `<p>The threshold isn't a separate rule. Everyone gets a primary rebate of ${money(RATES.rebates.primary)} a year, and the first tax bracket is ${pct(RATES.brackets[0][2])}. Tax of 18% on ${money(threshold)} is exactly ${money(RATES.rebates.primary)}, so the rebate cancels it out. Older taxpayers get extra rebates of ${money(RATES.rebates.secondary)} (65+) and ${money(RATES.rebates.tertiary)} (75+), which pushes their threshold up.</p><p>Earning below the threshold still means UIF is deducted from your salary, at 1% capped at ${R2(uifMax)} a month.</p>` },
    ],
  },
  {
    slug: "how-is-paye-calculated", group: "Salary and PAYE", tool: "salary-calculator",
    q: "How is PAYE calculated in South Africa?",
    title: `How Is PAYE Calculated in South Africa? (${yr} Worked Example)`,
    desc: `PAYE is worked out on your annual salary using the SARS ${ty} tax tables, minus rebates and medical credits, then divided by 12. Step-by-step example.`,
    short: "Your employer works out PAYE by turning your monthly pay into an annual figure, applying the SARS tax tables, subtracting your rebates and medical aid tax credits, and dividing the result by 12.",
    sections: [
      { h: "The steps", html: `<ol><li>Annualise your pay: monthly salary × 12.</li><li>Subtract deductible retirement contributions (up to ${pct(RATES.retirementCapPct)} of income, capped at ${money(RATES.retirementCapAmount)} a year).</li><li>Apply the ${ty} tax brackets to what's left.</li><li>Subtract the rebates for your age.</li><li>Subtract medical scheme tax credits: R${m.first} a month for you, R${m.second} for the first dependant and R${m.additional} for each extra one.</li><li>Divide by 12 to get monthly PAYE.</li></ol>` },
      { h: `${yr} tax brackets`, html: table(["Taxable income per year", "Tax"], RATES.brackets.map(([lo, base, rate], i) => {
        const nx = RATES.brackets[i + 1];
        return [nx ? `${money(lo ? lo + 1 : 0)} – ${money(nx[0])}` : `${money(lo + 1)} and above`, base ? `${money(base)} + ${pct(rate)} above ${money(lo)}` : `${pct(rate)} of taxable income`];
      })) },
      { h: "Worked example: R30 000 a month", html: (() => { const s = salary({ monthlyGross: 30000 }); return `<p>${money(360000)} a year falls in the 26% bracket: ${money(44118)} + 26% × (${money(360000)} − ${money(245100)}) = ${money(73992)}. Less the ${money(RATES.rebates.primary)} rebate gives ${money(s.annualTax)}, or <strong>${R2(s.paye)} PAYE a month</strong>.</p>`; })() },
    ],
  },
  {
    slug: "how-much-is-uif", group: "Salary and PAYE", tool: "salary-calculator",
    q: "How much is UIF, and is it capped?",
    title: `How Much Is UIF? The ${yr} UIF Cap Explained`,
    desc: `UIF is 1% of your salary from you and 1% from your employer, capped at ${R2(uifMax)} a month each because it only applies up to ${money(RATES.uifCeiling)} of pay.`,
    short: `UIF is <strong>1% of your salary</strong>, matched by another 1% from your employer. It's capped: contributions only apply to the first ${money(RATES.uifCeiling)} of monthly pay, so the most you pay is <strong>${R2(uifMax)} a month</strong>.`,
    sections: [
      { h: "UIF at different salaries", html: table(["Monthly salary", "Your UIF", "Employer's UIF"], [5000, 10000, 17712, 30000, 60000].map((x) => { const u = Math.min(x, RATES.uifCeiling) * RATES.uifRate; return [money(x), R2(u), R2(u)]; })) },
      { h: "What UIF pays for", html: "<p>The Unemployment Insurance Fund pays benefits if you lose your job, and for maternity, parental and adoption leave, illness and to dependants when a contributor dies. Only the employee's 1% comes off your payslip; the employer's 1% is an extra cost to them.</p>" },
    ],
  },
  {
    slug: "medical-aid-tax-credit", group: "Salary and PAYE", tool: "tax-refund-calculator",
    q: `How much is the medical aid tax credit for ${yr}?`,
    title: `Medical Aid Tax Credit ${yr} (${ty}) – Amounts and How It Works`,
    desc: `For ${ty} the medical scheme fees tax credit is R${m.first} a month for you, R${m.second} for your first dependant and R${m.additional} for each additional dependant.`,
    short: `For the ${ty} tax year the medical scheme fees tax credit is <strong>R${m.first} a month</strong> for the main member, <strong>R${m.second}</strong> for the first dependant and <strong>R${m.additional}</strong> for each additional dependant. It comes straight off your tax.`,
    sections: [
      { h: "Credit by family size", html: table(["People on the medical aid", "Credit per month", "Credit per year"], [1, 2, 3, 4, 5].map((n) => [n === 1 ? "Just you" : `You plus ${n - 1}`, money(medicalCredit(n) / 12), money(medicalCredit(n))])) },
      { h: "Additional medical expenses credit", html: `<p>On assessment you can claim more. If you're under 65, SARS adds 25% of the amount by which your medical aid fees above 4× the credit, plus medical costs your scheme didn't cover, exceed 7.5% of your taxable income. People 65 and older, or with a disability, get a more generous version. Our <a href="/tax-refund-calculator/">tax refund calculator</a> works it out.</p>` },
    ],
  },
  {
    slug: "retirement-annuity-tax-deduction", group: "Saving and investing", tool: "retirement-annuity-calculator",
    q: "How much can I deduct for a retirement annuity?",
    title: `Retirement Annuity Tax Deduction ${yr} – The 27.5% Limit Explained`,
    desc: `You can deduct retirement contributions of up to 27.5% of your income, capped at ${money(RATES.retirementCapAmount)} a year. A R2 000 a month RA on R360 000 saves about ${money(ra.saved)} tax.`,
    short: `You can deduct contributions to a retirement annuity, pension and provident fund combined of up to <strong>27.5% of your income</strong>, capped at <strong>${money(RATES.retirementCapAmount)} a year</strong>. Anything above that carries forward to later years.`,
    sections: [
      { h: "Example", html: `<p>On ${money(360000)} a year, paying R2 000 a month into an RA (${money(24000)} a year) cuts your taxable income to ${money(336000)}. At a ${pct(ra.marginal)} marginal rate that saves <strong>${money(ra.saved)}</strong> in tax a year, so the RA really costs you about ${money(ra.netCost)} a month.</p>` },
      { h: "How you get the saving", html: "<p>If the RA is paid through your employer's payroll, the saving shows up in lower PAYE each month. If you pay it yourself, you claim it on your tax return using the IT3(f) certificate from your fund, and the saving usually comes back as a refund.</p>" },
    ],
  },
  {
    slug: "when-do-i-get-a-tax-refund", group: "Salary and PAYE", tool: "tax-refund-calculator",
    q: "Why would I get a tax refund from SARS?",
    title: "Why Would I Get a SARS Tax Refund? Common Reasons Explained",
    desc: "SARS refunds happen when the PAYE taken from your salary was more than the tax you actually owe once deductions such as RA contributions and medical expenses are claimed.",
    short: "You get a refund when the PAYE your employer took during the year is more than your actual tax once your return is assessed. The usual reasons are retirement annuity contributions you paid yourself, medical costs, or not working the full year.",
    sections: [
      { h: "Common reasons", html: "<ul><li><strong>A private retirement annuity.</strong> Payroll doesn't know about it, so PAYE was too high.</li><li><strong>High medical costs.</strong> The additional medical expenses credit is only given on assessment.</li><li><strong>Part of the year without work.</strong> PAYE assumes you earn that salary all year.</li><li><strong>Travel allowance.</strong> If your business travel is high, a logbook can lower the taxable portion.</li></ul>" },
      { h: "How quickly it's paid", html: "<p>If SARS doesn't select your return for verification, refunds are often paid within days of the assessment. If you're asked for supporting documents, it takes longer. Make sure your banking details on eFiling are correct.</p>" },
    ],
  },
  {
    slug: "how-to-calculate-vat", group: "VAT", tool: "vat-calculator",
    q: "How do I add or remove 15% VAT?",
    title: "How to Calculate VAT in South Africa (Add or Remove 15%)",
    desc: "To add 15% VAT multiply by 1.15; to remove VAT divide by 1.15. R1 000 plus VAT is R1 150, and R1 150 including VAT is R1 000 before VAT.",
    short: `To <strong>add VAT</strong>, multiply the price by 1.15: R1 000 becomes ${R2(v.incl)}. To <strong>remove VAT</strong>, divide by 1.15: ${R2(1150)} becomes ${R2(vr.excl)}. To find just the VAT in an inclusive price, multiply by 15 and divide by 115.`,
    sections: [
      { h: "Quick examples", html: table(["Excluding VAT", "VAT (15%)", "Including VAT"], [100, 500, 1000, 5000, 10000].map((x) => { const r = vat(x, "add"); return [R2(r.excl), R2(r.vat), R2(r.incl)]; })) },
      { h: "The common mistake", html: "<p>Taking 15% off a VAT-inclusive price gives the wrong answer. 15% of R1 150 is R172.50, which leaves R977.50, not R1 000. That's because the 15% was added to the smaller, VAT-exclusive amount.</p>" },
    ],
  },
  {
    slug: "transfer-duty-threshold", group: "Property", tool: "transfer-duty-calculator",
    q: `Do I pay transfer duty on a house under R1.21 million?`,
    title: `Transfer Duty Threshold ${yr} – No Duty Under ${money(RATES.transferDuty[1][0])}`,
    desc: `For ${ty} there is no transfer duty on property bought for ${money(RATES.transferDuty[1][0])} or less. Above that the rate starts at 3%. Examples at R1.5m, R2m and R3m.`,
    short: `No. For the ${ty} tax year there's <strong>no transfer duty on property up to ${money(RATES.transferDuty[1][0])}</strong>. Above that you pay 3% of the amount over ${money(RATES.transferDuty[1][0])}, with higher rates at higher prices.`,
    sections: [
      { h: "Transfer duty at different prices", html: table(["Purchase price", "Transfer duty", "% of price"], td.map(([p, d]) => [money(p), money(d), pct(d / p)])) },
      { h: "Good to know", html: "<p>The buyer pays transfer duty to SARS through the conveyancer before the property is registered. If you buy from a VAT-registered seller, such as a developer, VAT is included in the price instead and there's no transfer duty. Conveyancing and bond registration fees are extra.</p>" },
    ],
  },
  {
    slug: "transfer-duty-on-r2-million", group: "Property", tool: "transfer-duty-calculator",
    q: "How much is transfer duty on a R2 million house?",
    title: `Transfer Duty on a R2 Million House (${yr})`,
    desc: `Transfer duty on a R2 000 000 property is ${money(transferDuty(2000000))} for ${ty}. See how it's calculated and what it is at R1.5m and R2.5m.`,
    short: `Transfer duty on a <strong>R2 000 000</strong> property is <strong>${money(transferDuty(2000000))}</strong> for the ${ty} tax year, about ${pct(transferDuty(2000000) / 2000000)} of the price.`,
    sections: [
      { h: "How it's worked out", html: `<p>R2 000 000 falls in the band from ${money(RATES.transferDuty[2][0] + 1)} to ${money(RATES.transferDuty[3][0])}: ${money(RATES.transferDuty[2][1])} + 6% × (R2 000 000 − ${money(RATES.transferDuty[2][0])}) = <strong>${money(transferDuty(2000000))}</strong>.</p>` },
      { h: "Nearby prices", html: table(["Purchase price", "Transfer duty"], [1500000, 1800000, 2000000, 2200000, 2500000].map((p) => [money(p), money(transferDuty(p))])) },
    ],
  },
  {
    slug: "r1000-a-month-invested", group: "Saving and investing", tool: "compound-interest-calculator",
    q: "What does R1 000 a month grow to?",
    title: "What Does R1 000 a Month Grow To? (10, 20 and 30 Years)",
    desc: `Saving R1 000 a month at 9% grows to about ${money(g10.balance)} in 10 years, ${money(g20.balance)} in 20 years and ${money(g30.balance)} in 30 years.`,
    short: `Investing <strong>R1 000 a month</strong> at 9% a year grows to about <strong>${money(g10.balance)}</strong> after 10 years, <strong>${money(g20.balance)}</strong> after 20 years and <strong>${money(g30.balance)}</strong> after 30 years.`,
    sections: [
      { h: "Growth at different rates", html: table(["Years", "6% a year", "9% a year", "12% a year", "You paid in"], [5, 10, 20, 30].map((y) => [y, ...[6, 9, 12].map((r) => money(compound({ monthly: 1000, rate: r, years: y }).balance)), money(1000 * 12 * y)])) },
      { h: "Why time matters most", html: `<p>After 30 years at 9%, you've paid in ${money(g30.paid)} but most of the ${money(g30.balance)} is growth. Starting ten years earlier does more than doubling your contribution later. Remember that inflation reduces what the final amount will buy, and market returns go up and down.</p>` },
    ],
  },
  {
    slug: "hourly-rate-to-monthly-salary", group: "Salary and PAYE", tool: "hourly-rate-calculator",
    q: "How much is R100 an hour per month?",
    title: "R100 an Hour Is How Much a Month? (Hourly to Salary, South Africa)",
    desc: `At R100 an hour, 8 hours a day, 5 days a week, you earn ${money(h100.monthly)} a month or ${money(h100.annual)} a year before tax.`,
    short: `At <strong>R100 an hour</strong>, working 8 hours a day, 5 days a week, you earn about <strong>${money(h100.monthly)} a month</strong> (${money(h100.annual)} a year) before tax, and roughly ${money(h100.net)} a month after PAYE and UIF.`,
    sections: [
      { h: "Common hourly rates", html: table(["Hourly rate", "Per month", "Per year", "Take-home per month"], h.map((x, i) => [money([50, 100, 150, 250, 500][i]), money(x.monthly), money(x.annual), money(x.net)])) },
      { h: "The formula", html: "<p>Hourly rate × hours a day × days a week × 52 weeks, divided by 12 months. A month isn't exactly four weeks, so multiplying a weekly wage by four understates monthly pay by about 8%.</p>" },
    ],
  },
];

// Keep "R240 000" on one line wherever it lands.
const nb = (h) => h.replace(/R\d{1,3}(?: \d{3})+/g, (m) => m.replace(/ /g, "\u00a0"));
export const ANSWERS = [...salaryAmounts.map(salaryPage), ...others].map((a) => ({
  ...a, short: nb(a.short), sections: a.sections.map((x) => ({ ...x, html: nb(x.html) })),
}));
export const answer = (slug) => ANSWERS.find((a) => a.slug === slug);
export const answersFor = (tool) => ANSWERS.filter((a) => a.tool === tool);
export const GROUPS = [...new Set(ANSWERS.map((a) => a.group))];
