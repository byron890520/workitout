import { salary, vat, compound, transferDuty, units, applianceCost, R, num, pct } from "../lib/calc.js";
import { useRef, useState } from "react";
import { AnimatedNumber, useUrlState, ShareButton, Field, ResultPeek, MoneyInput, Chips, Checked } from "./shared.jsx";
import { RATES } from "../lib/calc.js";

const k = (v) => (v >= 1e6 ? `R${+(v / 1e6).toFixed(2)}m` : v >= 1000 ? `R${v / 1000}k` : `R${v}`);

const n = { type: "number", inputMode: "decimal", min: 0 };

export function SalaryCalc() {
  const [s, setS, set] = useUrlState({ gross: "30000", age: "30", med: "0", ret: "0" });
  const val = (key) => (v) => setS((st) => ({ ...st, [key]: v }));
  const r = salary({ monthlyGross: s.gross, age: s.age, medicalMembers: s.med, retirement: s.ret });
  const res = useRef(null);
  return (
    <div className="tool">
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Field id="s-gross" label="Gross monthly salary (R)">
          <MoneyInput id="s-gross" value={s.gross} onValue={val("gross")} />
          <Chips values={[15000, 25000, 40000, 60000]} current={s.gross} onPick={val("gross")} label={k} />
        </Field>
        <Field id="s-age" label="Your age">
          <select id="s-age" value={s.age} onChange={set("age")}>
            <option value="30">Under 65</option><option value="65">65 to 74</option><option value="75">75 or older</option>
          </select>
        </Field>
        <Field id="s-med" label="People on your medical aid (incl. you)" hint="Enter 0 if you don't have medical aid.">
          <input id="s-med" type="number" inputMode="numeric" min="0" step="1" value={s.med} onChange={set("med")} />
        </Field>
        <Field id="s-ret" label="Monthly retirement / pension contribution (R)">
          <MoneyInput id="s-ret" value={s.ret} onValue={val("ret")} />
        </Field>
      </form>
      <div className="result" aria-live="polite" ref={res}>
        <div className="label">Take-home pay per month</div>
        <AnimatedNumber value={r.net} format={R} />
        <Breakdown share={r.gross} parts={[["PAYE", r.paye], ["UIF", r.uif], ["Retirement", r.retirement], ["Take-home", r.net]]} />
        <dl>
          <dt>PAYE (income tax)</dt><dd>{R(r.paye)}</dd>
          <dt>UIF (1%)</dt><dd>{R(r.uif)}</dd>
          <dt>Retirement contribution</dt><dd>{R(r.retirement)}</dd>
          <dt>Tax for the year</dt><dd>{R(r.annualTax)}</dd>
          <dt>Marginal tax rate</dt><dd>{pct(r.marginal)}</dd>
          <dt>Effective tax rate</dt><dd>{pct(r.effective)}</dd>
        </dl>
        <Checked>Uses SARS {RATES.taxYear} tax tables, rebates and medical credits</Checked>
        <ShareButton text={`My take-home pay works out to ${R(r.net)} a month.`} />
      </div>
      <ResultPeek label={"Take-home"} text={R(r.net)} target={res} />
    </div>
  );
}

/** A single bar showing where each rand of salary goes. */
function Breakdown({ share, parts }) {
  if (!(share > 0)) return null;
  const cls = ["b-tax", "b-uif", "b-ret", "b-net"];
  return (
    <div className="split" role="img" aria-label={parts.map(([l, v]) => `${l} ${Math.round((v / share) * 100)}%`).join(", ")}>
      {parts.map(([l, v], i) => v > 0 && <span key={l} className={cls[i]} style={{ flexGrow: v }} title={`${l}: ${R(v)}`} />)}
    </div>
  );
}

export function VatCalc() {
  const [s, setS, set] = useUrlState({ amount: "1000", mode: "add" });
  const val = (key) => (v) => setS((st) => ({ ...st, [key]: v }));
  const r = vat(s.amount, s.mode);
  const res = useRef(null);
  return (
    <div className="tool">
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Field id="v-amount" label="Amount (R)">
          <MoneyInput id="v-amount" value={s.amount} onValue={val("amount")} />
          <Chips values={[100, 1000, 5000, 10000]} current={s.amount} onPick={val("amount")} label={k} />
        </Field>
        <fieldset>
          <legend>This amount…</legend>
          <div className="seg">
            <label><input type="radio" name="v-mode" value="add" checked={s.mode === "add"} onChange={set("mode")} /> excludes VAT (add 15%)</label>
            <label><input type="radio" name="v-mode" value="remove" checked={s.mode === "remove"} onChange={set("mode")} /> includes VAT (remove 15%)</label>
          </div>
        </fieldset>
      </form>
      <div className="result" aria-live="polite" ref={res}>
        <div className="label">{s.mode === "add" ? "Amount including VAT" : "Amount excluding VAT"}</div>
        <AnimatedNumber value={s.mode === "add" ? r.incl : r.excl} format={R} />
        <dl>
          <dt>Amount excluding VAT</dt><dd>{R(r.excl)}</dd>
          <dt>VAT (15%)</dt><dd>{R(r.vat)}</dd>
          <dt>Amount including VAT</dt><dd>{R(r.incl)}</dd>
        </dl>
        <Checked>Standard South African VAT rate of 15%</Checked>
        <ShareButton text={`VAT on ${R(r.excl)} is ${R(r.vat)}.`} />
      </div>
      <ResultPeek label={s.mode === "add" ? "Incl. VAT" : "Excl. VAT"} text={R(s.mode === "add" ? r.incl : r.excl)} target={res} />
    </div>
  );
}

export function CompoundCalc() {
  const [s, setS, set] = useUrlState({ start: "10000", monthly: "1000", rate: "9", years: "20", freq: "12", esc: "0" });
  const val = (key) => (v) => setS((st) => ({ ...st, [key]: v }));
  const r = compound({ start: s.start, monthly: s.monthly, rate: s.rate, years: s.years, perYear: s.freq, escalate: s.esc });
  const res = useRef(null);
  const share = r.balance > 0 ? r.interest / r.balance : 0;
  return (
    <>
      <div className="tool">
        <form className="card" onSubmit={(e) => e.preventDefault()}>
          <Field id="c-start" label="Starting amount (R)">
            <MoneyInput id="c-start" value={s.start} onValue={val("start")} />
            <Chips values={[0, 10000, 50000, 100000]} current={s.start} onPick={val("start")} label={(v) => (v ? k(v) : "R0")} />
          </Field>
          <Field id="c-monthly" label="Monthly top-up (R)">
            <MoneyInput id="c-monthly" value={s.monthly} onValue={val("monthly")} />
            <Chips values={[500, 1000, 2500, 5000]} current={s.monthly} onPick={val("monthly")} label={k} />
          </Field>
          <Field id="c-rate" label="Interest or growth rate per year (%)" hint="Bank savings often pay 6–8%; long-term growth funds have averaged more, with ups and downs.">
            <input id="c-rate" {...n} max="50" step="0.25" value={s.rate} onChange={set("rate")} />
            <Chips values={[6, 8, 10, 12]} current={s.rate} onPick={val("rate")} label={(v) => v + "%"} />
          </Field>
          <Field id="c-years" label="How many years?">
            <input id="c-years" type="number" inputMode="numeric" min="1" max="60" step="1" value={s.years} onChange={set("years")} />
            <Chips values={[5, 10, 20, 30]} current={s.years} onPick={val("years")} label={(v) => v + " yrs"} />
          </Field>
          <div className="two">
            <Field id="c-freq" label="Interest added">
              <select id="c-freq" value={s.freq} onChange={set("freq")}>
                <option value="12">Monthly</option><option value="4">Quarterly</option><option value="1">Yearly</option>
              </select>
            </Field>
            <Field id="c-esc" label="Yearly raise (%)">
              <input id="c-esc" {...n} max="30" step="1" value={s.esc} onChange={set("esc")} />
            </Field>
          </div>
        </form>
        <div className="result" aria-live="polite" ref={res}>
          <div className="label">Value after {Math.round(+s.years || 0)} years</div>
          <AnimatedNumber value={r.balance} format={R} />
          <dl>
            <dt>You paid in</dt><dd>{R(r.paid)}</dd>
            <dt>Interest earned</dt><dd>{R(r.interest)}</dd>
            <dt>Share that is interest</dt><dd>{pct(share)}</dd>
          </dl>
          <Checked>Interest is added {s.freq === "12" ? "monthly" : s.freq === "4" ? "quarterly" : "yearly"}; top-ups go in at the end of each month. Before tax and inflation.</Checked>
          <ShareButton text={`Saving ${R(+s.monthly || 0)} a month at ${s.rate}% could grow to ${R(r.balance)} in ${s.years} years.`} />
        </div>
        <ResultPeek label="Final value" text={R(r.balance)} target={res} />
      </div>
      <GrowthChart rows={r.rows} />
    </>
  );
}

/** Rounds an axis maximum up to 1, 2 or 5 × a power of ten. */
function niceMax(v) {
  if (!(v > 0)) return { max: 1, step: 0.25 };
  const raw = v / 4, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * p).find((x) => x >= raw);
  return { max: Math.ceil(v / step) * step, step };
}
const short = (v) => (v >= 1e6 ? `R${+(v / 1e6).toFixed(1)}m` : v >= 1000 ? `R${Math.round(v / 1000)}k` : `R${Math.round(v)}`);

/** Stacked bars, one per year: what you paid in vs interest earned. */
function GrowthChart({ rows }) {
  const [hover, setHover] = useState(null);
  if (!rows.length) return null;
  const last = rows[rows.length - 1];
  const { max, step } = niceMax(last.balance);
  const ticks = [];
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t);
  const every = rows.length > 30 ? 10 : rows.length > 12 ? 5 : rows.length > 6 ? 2 : 1;
  const h = hover == null ? null : rows[hover];
  return (
    <section className="card chart-card" aria-labelledby="growth-h">
      <div className="chart-head">
        <h2 id="growth-h">How it grows, year by year</h2>
        <ul className="legend">
          <li><i className="sw paid" />You paid in</li>
          <li><i className="sw int" />Interest earned</li>
        </ul>
      </div>
      <div className="chart" onMouseLeave={() => setHover(null)}>
        <div className="grid" aria-hidden="true">
          {ticks.slice().reverse().map((t) => <div key={t} style={{ bottom: `${(t / max) * 100}%` }}><span>{short(t)}</span></div>)}
        </div>
        <div className="bars" role="img" aria-label={`After ${last.year} years: ${R(last.balance)}, of which ${R(last.paid)} paid in and ${R(last.interest)} interest.`}>
          {rows.map((row, i) => (
            <div key={row.year} className={"col" + (hover === i ? " on" : "")} tabIndex={0}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              aria-label={`Year ${row.year}: ${R(row.balance)}`}>
              <div className="stack" style={{ height: `${(row.balance / max) * 100}%` }}>
                <span className="seg int" style={{ flexGrow: Math.max(row.interest, 0) }} />
                <span className="seg paid" style={{ flexGrow: row.paid }} />
              </div>
              <span className="x">{row.year % every === 0 || i === 0 ? row.year : ""}</span>
            </div>
          ))}
        </div>
        {h && (
          <div className="tip" style={{ left: `${((hover + 0.5) / rows.length) * 100}%` }} role="status">
            <strong>Year {h.year}</strong>
            <span>{R(h.balance)}</span>
            <span><i className="sw paid" />Paid in {R(h.paid)}</span>
            <span><i className="sw int" />Interest {R(h.interest)}</span>
          </div>
        )}
      </div>
      <p className="axis-note">Years</p>
      <details className="table-view">
        <summary>Show the year-by-year table</summary>
        <div className="table-scroll"><table>
          <thead><tr><th>Year</th><th>Paid in</th><th>Interest</th><th>Value</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.year}><td>{row.year}</td><td>{R(row.paid)}</td><td>{R(row.interest)}</td><td>{R(row.balance)}</td></tr>)}</tbody>
        </table></div>
      </details>
    </section>
  );
}

const PRESETS = [["2.71", "Eskom Homelight 20A (≈R2.71/kWh)"], ["3.44", "Eskom Homelight 60A (≈R3.44/kWh)"],
  ["3.34", "City Power Joburg, block 1 (≈R3.34/kWh)"], ["3.43", "City of Cape Town, block 1 (≈R3.43/kWh)"]];
const APPLIANCES = [["3000", "Geyser (3 000 W)"], ["2200", "Kettle (2 200 W)"], ["2000", "Heater (2 000 W)"],
  ["1500", "Aircon (1 500 W)"], ["1000", "Microwave (1 000 W)"], ["150", "Fridge, average (150 W)"],
  ["100", "TV (100 W)"], ["10", "LED bulb (10 W)"]];

export function ElectricityCalc() {
  const [s, setS, set] = useUrlState({ rate: "2.71", rand: "500", watts: "3000", hours: "2" });
  const u = units(s.rand, s.rate);
  const c = applianceCost(s.watts, s.hours, s.rate);
  const pick = (k) => (e) => e.target.value && setS((st) => ({ ...st, [k]: e.target.value }));
  const res = useRef(null);
  return (
    <div className="tool">
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Field id="e-preset" label="Your tariff">
          <select id="e-preset" value={PRESETS.some(([v]) => v === s.rate) ? s.rate : ""} onChange={pick("rate")}>
            <option value="">Custom rate</option>{PRESETS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <Field id="e-rate" label="Price per kWh, incl. VAT (R)" hint="Check the rate on your last token slip – municipal tariffs vary.">
          <input id="e-rate" {...n} step="0.01" value={s.rate} onChange={set("rate")} />
        </Field>
        <Field id="e-rand" label="How much are you buying? (R)">
          <MoneyInput id="e-rand" value={s.rand} onValue={(v) => setS((st) => ({ ...st, rand: v }))} />
          <Chips values={[200, 500, 1000, 2000]} current={s.rand} onPick={(v) => setS((st) => ({ ...st, rand: v }))} label={k} />
        </Field>
        <h3>Appliance running cost</h3>
        <Field id="e-appl" label="Appliance">
          <select id="e-appl" value={APPLIANCES.some(([v]) => v === s.watts) ? s.watts : ""} onChange={pick("watts")}>
            <option value="">Custom wattage</option>{APPLIANCES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
        </Field>
        <div className="two">
          <Field id="e-watts" label="Power (watts)"><input id="e-watts" type="number" inputMode="numeric" min="0" value={s.watts} onChange={set("watts")} /></Field>
          <Field id="e-hours" label="Hours a day"><input id="e-hours" {...n} max="24" step="0.25" value={s.hours} onChange={set("hours")} /></Field>
        </div>
      </form>
      <div className="result" aria-live="polite" ref={res}>
        <div className="label">Units you'll get</div>
        <AnimatedNumber value={u} format={(x) => num(x) + " kWh"} />
        <dl>
          <dt>Appliance use per day</dt><dd>{num(c.kwhDay)} kWh</dd>
          <dt>Cost per day</dt><dd>{R(c.day)}</dd>
          <dt>Cost per month</dt><dd>{R(c.month)}</dd>
          <dt>Cost per year</dt><dd>{R(c.year)}</dd>
        </dl>
        <Checked>Rate you entered; presets are 2026/27 tariffs incl. VAT</Checked>
        <ShareButton text={`${R(+s.rand)} of electricity buys about ${num(u)} units.`} />
      </div>
      <ResultPeek label={"Units"} text={num(u) + " kWh"} target={res} />
    </div>
  );
}

export function TransferDutyCalc() {
  const [s, setS] = useUrlState({ price: "1500000" });
  const val = (v) => setS({ price: v });
  const d = transferDuty(s.price);
  const price = +s.price || 0;
  const res = useRef(null);
  return (
    <div className="tool">
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <Field id="td-price" label="Purchase price (R)" hint="No transfer duty applies if you buy from a VAT-registered developer – VAT is in the price instead.">
          <MoneyInput id="td-price" value={s.price} onValue={val} />
          <Chips values={[1000000, 1500000, 2500000, 4000000]} current={s.price} onPick={val} label={k} />
        </Field>
      </form>
      <div className="result" aria-live="polite" ref={res}>
        <div className="label">Transfer duty payable to SARS</div>
        <AnimatedNumber value={d} format={R} />
        <dl>
          <dt>As a % of the price</dt><dd>{price > 0 ? pct(d / price) : "0%"}</dd>
          <dt>Price plus duty</dt><dd>{R(price + d)}</dd>
        </dl>
        <Checked>Uses SARS transfer duty rates for {RATES.taxYear}</Checked>
        <ShareButton text={`Transfer duty on ${R(price)} is ${R(d)}.`} />
      </div>
      <ResultPeek label={"Transfer duty"} text={R(d)} target={res} />
    </div>
  );
}
