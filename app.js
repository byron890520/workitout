/* Work It Out – calculator logic.
   Pure functions at the top (also exported for tests), DOM wiring below.
   Rates: SARS 2026/27 tax year (1 Mar 2026 – 28 Feb 2027). Update RATES each Budget. */
(function (root) {
  "use strict";

  var RATES = /*RATES_START*/{
    taxYear: "2026/27",
    brackets: [ // [lower bound, base tax, marginal rate]
      [0, 0, 0.18],
      [245100, 44118, 0.26],
      [383100, 79998, 0.31],
      [530200, 125599, 0.36],
      [695800, 185215, 0.39],
      [887000, 259783, 0.41],
      [1878600, 666339, 0.45]
    ],
    rebates: { primary: 17820, secondary: 9765, tertiary: 3249 },
    medCredit: { first: 376, second: 376, additional: 254 }, // per month
    uifCeiling: 17712, uifRate: 0.01,
    retirementCapPct: 0.275, retirementCapAmount: 430000,
    vat: 0.15,
    transferDuty: [ // [lower bound, base duty, rate]
      [0, 0, 0],
      [1210000, 0, 0.03],
      [1663800, 13614, 0.06],
      [2329300, 53544, 0.08],
      [2994800, 106784, 0.11],
      [13310000, 1241456, 0.13]
    ]
  }/*RATES_END*/;

  function bandCalc(table, amount) {
    if (!(amount > 0)) return { value: 0, rate: table[0][2] };
    var row = table[0];
    for (var i = 0; i < table.length; i++) if (amount > table[i][0]) row = table[i];
    return { value: row[1] + (amount - row[0]) * row[2], rate: row[2] };
  }

  function incomeTax(annualTaxable, age) {
    var t = bandCalc(RATES.brackets, annualTaxable);
    var reb = RATES.rebates.primary;
    if (age >= 65) reb += RATES.rebates.secondary;
    if (age >= 75) reb += RATES.rebates.tertiary;
    return { gross: t.value, rebate: reb, tax: Math.max(0, t.value - reb), marginal: t.rate };
  }

  function medicalCredit(members) {
    members = Math.max(0, Math.floor(members || 0));
    var m = RATES.medCredit, monthly = 0;
    if (members >= 1) monthly += m.first;
    if (members >= 2) monthly += m.second;
    if (members > 2) monthly += (members - 2) * m.additional;
    return monthly * 12;
  }

  function salary(opts) {
    var gross = Math.max(0, +opts.monthlyGross || 0);
    var age = +opts.age || 30;
    var ret = Math.max(0, +opts.retirement || 0);
    var annualGross = gross * 12;
    var retDeduct = Math.min(ret * 12, annualGross * RATES.retirementCapPct, RATES.retirementCapAmount);
    var taxable = Math.max(0, annualGross - retDeduct);
    var t = incomeTax(taxable, age);
    var mtc = medicalCredit(opts.medicalMembers);
    var annualTax = Math.max(0, t.tax - mtc);
    var paye = annualTax / 12;
    var uif = Math.min(gross, RATES.uifCeiling) * RATES.uifRate;
    var net = gross - paye - uif - ret;
    return {
      gross: gross, paye: paye, uif: uif, retirement: ret, net: net,
      annualTax: annualTax, taxable: taxable, medicalCredit: mtc,
      marginal: t.marginal, effective: annualGross > 0 ? annualTax / annualGross : 0
    };
  }

  function vat(amount, mode) {
    amount = Math.max(0, +amount || 0);
    if (mode === "remove") {
      var excl = amount / (1 + RATES.vat);
      return { excl: excl, vat: amount - excl, incl: amount };
    }
    return { excl: amount, vat: amount * RATES.vat, incl: amount * (1 + RATES.vat) };
  }

  function apsPoints(pct) {
    pct = +pct;
    if (!(pct >= 0)) return 0;
    if (pct >= 80) return 7; if (pct >= 70) return 6; if (pct >= 60) return 5;
    if (pct >= 50) return 4; if (pct >= 40) return 3; if (pct >= 30) return 2;
    return 1;
  }

  function aps(marks, loMark) {
    var pts = marks.filter(function (m) { return m !== "" && m != null && !isNaN(+m); })
      .map(apsPoints).sort(function (a, b) { return b - a; }).slice(0, 6);
    var total = pts.reduce(function (s, p) { return s + p; }, 0);
    var lo = (loMark === "" || loMark == null || isNaN(+loMark)) ? null : apsPoints(loMark);
    return { total: total, counted: pts.length, withLO: lo === null ? null : total + lo };
  }

  function transferDuty(price) {
    return Math.max(0, bandCalc(RATES.transferDuty, Math.max(0, +price || 0)).value);
  }

  function units(rand, ratePerKwh) {
    rand = +rand || 0; ratePerKwh = +ratePerKwh || 0;
    return ratePerKwh > 0 ? rand / ratePerKwh : 0;
  }

  function applianceCost(watts, hoursPerDay, ratePerKwh) {
    var kwhDay = (+watts || 0) * (+hoursPerDay || 0) / 1000;
    var day = kwhDay * (+ratePerKwh || 0);
    return { kwhDay: kwhDay, day: day, month: day * 30.4, year: day * 365 };
  }

  var calc = { RATES: RATES, incomeTax: incomeTax, medicalCredit: medicalCredit, salary: salary,
    vat: vat, apsPoints: apsPoints, aps: aps, transferDuty: transferDuty, units: units,
    applianceCost: applianceCost };

  if (typeof module !== "undefined" && module.exports) { module.exports = calc; return; }
  root.WorkItOutCalc = calc;

  /* ---------------- DOM wiring ---------------- */
  var fmtR = new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 2 });
  var fmtN = new Intl.NumberFormat("en-ZA", { maximumFractionDigits: 1 });
  function R(n) { return fmtR.format(n || 0); }
  function pct(n) { return fmtN.format((n || 0) * 100) + "%"; }
  function $(id) { return document.getElementById(id); }
  function val(id) { var el = $(id); return el ? el.value : ""; }
  function set(id, text) { var el = $(id); if (el) el.textContent = text; }
  function bind(form, fn) {
    if (!form) return;
    form.addEventListener("input", fn); form.addEventListener("change", fn);
    form.addEventListener("submit", function (e) { e.preventDefault(); fn(); });
    fn();
  }

  document.addEventListener("DOMContentLoaded", function () {
    bind($("salary-form"), function () {
      var r = salary({ monthlyGross: val("s-gross"), age: val("s-age"),
        medicalMembers: val("s-med"), retirement: val("s-ret") });
      set("s-net", R(r.net)); set("s-paye", R(r.paye)); set("s-uif", R(r.uif));
      set("s-retout", R(r.retirement)); set("s-annual", R(r.annualTax));
      set("s-marginal", pct(r.marginal)); set("s-effective", pct(r.effective));
    });

    bind($("vat-form"), function () {
      var mode = (document.querySelector("input[name=v-mode]:checked") || {}).value || "add";
      var r = vat(val("v-amount"), mode);
      set("v-excl", R(r.excl)); set("v-vat", R(r.vat)); set("v-incl", R(r.incl));
    });

    bind($("aps-form"), function () {
      var marks = Array.prototype.map.call(document.querySelectorAll(".aps-mark"), function (i) { return i.value; });
      var r = aps(marks, val("a-lo"));
      set("a-total", String(r.total)); set("a-counted", r.counted + " of 6 subjects counted");
      set("a-withlo", r.withLO === null ? "–" : String(r.withLO));
      Array.prototype.forEach.call(document.querySelectorAll(".aps-mark"), function (i) {
        var out = i.parentNode.querySelector(".aps-pts");
        if (out) out.textContent = i.value === "" ? "" : apsPoints(i.value) + " pts";
      });
    });

    bind($("td-form"), function () {
      var price = +val("td-price") || 0, d = transferDuty(price);
      set("td-duty", R(d)); set("td-pct", price > 0 ? pct(d / price) : "0%");
    });

    var preset = $("e-preset");
    if (preset) preset.addEventListener("change", function () { if (preset.value) $("e-rate").value = preset.value; });
    var appl = $("e-appl");
    if (appl) appl.addEventListener("change", function () { if (appl.value) $("e-watts").value = appl.value; });
    bind($("elec-form"), function () {
      var rate = val("e-rate");
      set("e-units", fmtN.format(units(val("e-rand"), rate)) + " kWh");
      var c = applianceCost(val("e-watts"), val("e-hours"), rate);
      set("e-kwh", fmtN.format(c.kwhDay) + " kWh"); set("e-day", R(c.day));
      set("e-month", R(c.month)); set("e-year", R(c.year));
    });

    var y = $("year"); if (y) y.textContent = new Date().getFullYear();
  });
})(this);
