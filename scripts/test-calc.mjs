// Quick sanity checks against hand-worked SARS examples. Run: npm test
import assert from "node:assert/strict";
import { salary, incomeTax, medicalCredit, transferDuty, vat, aps, units } from "../src/lib/calc.js";

const s = salary({ monthlyGross: 30000, age: 30 });
assert.equal(Math.round(s.annualTax), 56172, "PAYE on R30 000/month");
assert.equal(s.uif, 177.12, "UIF cap");
assert.equal(incomeTax(99000, 30).tax, 0, "tax-free threshold");
assert.equal(medicalCredit(2), 9024, "medical credits, 2 members");
assert.equal(transferDuty(1500000), 8700, "transfer duty R1.5m");
assert.equal(transferDuty(1210000), 0, "transfer duty threshold");
assert.equal(Math.round(vat(1150, "remove").excl), 1000, "remove VAT");
assert.equal(aps([85, 72, 65, 55, 45, 35, 90], 60).total, 32, "APS best six");
assert.equal(units(500, 2.71).toFixed(1), "184.5", "prepaid units");
console.log("All calculator checks passed.");
