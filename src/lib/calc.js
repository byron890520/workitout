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

export function apsPoints(pct) {
  pct = +pct;
  if (!(pct >= 0)) return 0;
  if (pct >= 80) return 7;
  if (pct >= 70) return 6;
  if (pct >= 60) return 5;
  if (pct >= 50) return 4;
  if (pct >= 40) return 3;
  if (pct >= 30) return 2;
  return 1;
}

export function aps(marks, loMark) {
  const pts = marks.filter((m) => m !== "" && m != null && !isNaN(+m)).map(apsPoints)
    .sort((a, b) => b - a).slice(0, 6);
  const total = pts.reduce((s, p) => s + p, 0);
  const lo = loMark === "" || loMark == null || isNaN(+loMark) ? null : apsPoints(loMark);
  return { total, counted: pts.length, withLO: lo === null ? null : total + lo };
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
