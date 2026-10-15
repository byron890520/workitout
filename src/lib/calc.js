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
