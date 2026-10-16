// Calculator maths. Pure functions only, so they can be tested and reused.
// Rates live in src/data/rates.json – update that file after each Budget.
import RATES from "../data/rates.json" with { type: "json" };

export { RATES };

function bandCalc(table, amount) {
  if (!(amount > 0)) return { value: 0, rate: table[0][2] };
  let row = table[0];
  for (const r of table) if (amount > r[0]) row = r;
  return { value: row[1] + (amount - row[0]) * row[2], rate: row[2] };
}

export function incomeTax(annualTaxable, age) {
  const t = bandCalc(RATES.brackets, annualTaxable);
  let rebate = RATES.rebates.primary;
  if (age >= 65) rebate += RATES.rebates.secondary;
  if (age >= 75) rebate += RATES.rebates.tertiary;
  return { gross: t.value, rebate, tax: Math.max(0, t.value - rebate), marginal: t.rate };
}

export function medicalCredit(members) {
  members = Math.max(0, Math.floor(+members || 0));
  const m = RATES.medCredit;
  let monthly = 0;
  if (members >= 1) monthly += m.first;
  if (members >= 2) monthly += m.second;
  if (members > 2) monthly += (members - 2) * m.additional;
  return monthly * 12;
}

export function salary({ monthlyGross, age = 30, medicalMembers = 0, retirement = 0 }) {
  const gross = Math.max(0, +monthlyGross || 0);
  const ret = Math.max(0, +retirement || 0);
  const annualGross = gross * 12;
  const retDeduct = Math.min(ret * 12, annualGross * RATES.retirementCapPct, RATES.retirementCapAmount);
  const taxable = Math.max(0, annualGross - retDeduct);
  const t = incomeTax(taxable, +age);
  const mtc = medicalCredit(medicalMembers);
  const annualTax = Math.max(0, t.tax - mtc);
  const paye = annualTax / 12;
  const uif = Math.min(gross, RATES.uifCeiling) * RATES.uifRate;
  return {
    gross, paye, uif, retirement: ret, net: gross - paye - uif - ret, annualTax, taxable,
    medicalCredit: mtc, marginal: t.marginal, effective: annualGross > 0 ? annualTax / annualGross : 0,
  };
}

export function vat(amount, mode) {
  amount = Math.max(0, +amount || 0);
  if (mode === "remove") {
    const excl = amount / (1 + RATES.vat);
    return { excl, vat: amount - excl, incl: amount };
  }
  return { excl: amount, vat: amount * RATES.vat, incl: amount * (1 + RATES.vat) };
}

/**
 * Compound growth with monthly top-ups.
 * Interest is added at the end of each compounding period (12, 4 or 1 times a year) on the balance at that point;
 * top-ups are paid at the end of each month and can rise by a fixed % every year.
 * Returns the final figures plus one row per year for the chart and table.
 */
export function compound({ start = 0, monthly = 0, rate = 0, years = 10, perYear = 12, escalate = 0 }) {
  start = Math.max(0, +start || 0);
  monthly = Math.max(0, +monthly || 0);
  const r = Math.max(0, +rate || 0) / 100;
  const n = Math.min(100, Math.max(0, Math.round(+years || 0)));
  const p = [1, 4, 12].includes(+perYear) ? +perYear : 12;
  const esc = Math.max(0, +escalate || 0) / 100;
  const monthsPerPeriod = 12 / p;
  let balance = start, paid = start, topUp = monthly;
  const rows = [];
  for (let y = 1; y <= n; y++) {
    for (let m = 1; m <= 12; m++) {
      if (m % monthsPerPeriod === 0) balance *= 1 + r / p;
      balance += topUp;
      paid += topUp;
    }
    rows.push({ year: y, balance, paid, interest: balance - paid });
    topUp *= 1 + esc;
  }
  return { balance, paid, interest: balance - paid, rows };
}

export function transferDuty(price) {
  return Math.max(0, bandCalc(RATES.transferDuty, Math.max(0, +price || 0)).value);
}

export function units(rand, ratePerKwh) {
  rand = +rand || 0;
  ratePerKwh = +ratePerKwh || 0;
  return ratePerKwh > 0 ? rand / ratePerKwh : 0;
}

export function applianceCost(watts, hoursPerDay, ratePerKwh) {
  const kwhDay = ((+watts || 0) * (+hoursPerDay || 0)) / 1000;
  const day = kwhDay * (+ratePerKwh || 0);
  return { kwhDay, day, month: day * 30.4, year: day * 365 };
}

/** Works backwards from the take-home pay you want to the gross salary that delivers it. */
export function grossFromNet({ net, age = 30, medicalMembers = 0, retirement = 0 }) {
  const want = Math.max(0, +net || 0);
  let lo = want, hi = want * 3 + 1000;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (salary({ monthlyGross: mid, age, medicalMembers, retirement }).net < want) lo = mid; else hi = mid;
  }
  return salary({ monthlyGross: Math.round(hi * 100) / 100, age, medicalMembers, retirement });
}

/** Hourly rate to monthly and yearly pay (52 weeks a year), then after tax. */
export function hourly({ rate, hoursPerDay = 8, daysPerWeek = 5, age = 30 }) {
  const perWeek = Math.max(0, +rate || 0) * Math.max(0, +hoursPerDay || 0) * Math.max(0, +daysPerWeek || 0);
  const annual = perWeek * 52;
  const monthly = annual / 12;
  return { perWeek, annual, monthly, ...salary({ monthlyGross: monthly, age }) };
}

/**
 * Estimates a SARS refund (or amount owed) for the year from an IRP5 and the deductions/credits
 * claimed on assessment: retirement annuity contributions paid privately and the additional
 * medical expenses credit (s6B).
 */
export function taxRefund({ income, payePaid, age = 30, medicalMembers = 0, medicalContrib = 0, outOfPocket = 0, ra = 0 }) {
  income = Math.max(0, +income || 0);
  const raDeduct = Math.min(Math.max(0, +ra || 0), income * RATES.retirementCapPct, RATES.retirementCapAmount);
  const taxable = Math.max(0, income - raDeduct);
  const t = incomeTax(taxable, +age);
  const mtc = medicalCredit(medicalMembers);
  const contrib = Math.max(0, +medicalContrib || 0), oop = Math.max(0, +outOfPocket || 0);
  let amtc = 0;
  if (+age >= 65) amtc = (1 / 3) * Math.max(0, contrib - 3 * mtc) + (1 / 3) * oop;
  else amtc = 0.25 * Math.max(0, contrib - 4 * mtc + oop - 0.075 * taxable);
  const liability = Math.max(0, t.tax - mtc - amtc);
  const paid = Math.max(0, +payePaid || 0);
  return { raDeduct, taxable, liability, mtc, amtc, paid, refund: paid - liability, marginal: t.marginal };
}

/**
 * Retirement annuity: the tax you save each year on contributions, the real monthly cost,
 * and what the fund could grow to.
 */
export function retirementAnnuity({ monthly, income, age = 30, rate = 9, years = 25 }) {
  monthly = Math.max(0, +monthly || 0);
  income = Math.max(0, +income || 0);
  const deduct = Math.min(monthly * 12, income * RATES.retirementCapPct, RATES.retirementCapAmount);
  const before = incomeTax(income, +age).tax, after = incomeTax(income - deduct, +age).tax;
  const saved = before - after;
  const g = compound({ monthly, rate, years });
  return { deduct, saved, savedMonthly: saved / 12, netCost: monthly - saved / 12, balance: g.balance, paid: g.paid, growth: g.interest,
    capped: monthly * 12 > deduct, marginal: incomeTax(income, +age).marginal };
}

// Formatting shared by every calculator. Hand-rolled so the pre-built page and the browser
// always show identical text (Intl output differs between Node and browsers): R 25 141.88
function group(n, decimals) {
  const neg = n < 0;
  const [i, f] = Math.abs(n).toFixed(decimals).split(".");
  const g = i.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return (neg ? "-" : "") + g + (f ? "." + f : "");
}
export const R = (n) => "R\u00a0" + group(+n || 0, 2);
export const num = (n) => group(Math.round((+n || 0) * 10) / 10, (Math.round((+n || 0) * 10) % 10) ? 1 : 0);
export const pct = (n) => num((n || 0) * 100) + "%";
export const money = (n) => "R" + group(Math.round(+n || 0), 0).replace(/\u00a0/g, " ");
