import { salary, vat, aps, apsPoints, transferDuty, units, applianceCost, R, num, pct } from "../lib/calc.js";
import { useRef } from "react";
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

export function ApsCalc() {
  const [s, setS, set] = useUrlState({ m: ["", "", "", "", "", "", ""], lo: "" });
  const r = aps(s.m, s.lo);
  const setMark = (i) => (e) => setS((st) => { const m = [...st.m]; m[i] = e.target.value; return { ...st, m }; });
  const res = useRef(null);
  return (
    <div className="tool">
      <form className="card" onSubmit={(e) => e.preventDefault()}>
        <p className="field-label">Your subject marks (%), excluding Life Orientation</p>
        <div className="aps-grid">
          {s.m.map((v, i) => (
            <div className="aps-row" key={i}>
              <input type="number" inputMode="numeric" min="0" max="100" placeholder={`Subject ${i + 1} mark %`}
                aria-label={`Subject ${i + 1} percentage`} value={v} onChange={setMark(i)} />
              <span className={"aps-pts" + (v !== "" ? " on" : "")}>{v === "" ? "" : `${apsPoints(v)} pts`}</span>
            </div>
          ))}
        </div>
        <p className="hint">Enter up to 7 subjects. Your best 6 are counted.</p>
        <Field id="a-lo" label="Life Orientation mark % (optional)">
          <input id="a-lo" type="number" inputMode="numeric" min="0" max="100" value={s.lo} onChange={set("lo")} />
        </Field>
      </form>
      <div className="result" aria-live="polite" ref={res}>
        <div className="label">Your APS score</div>
        <AnimatedNumber value={r.total} format={(x) => String(Math.round(x))} />
        <div className="meter" aria-hidden="true"><span style={{ width: `${(r.total / 42) * 100}%` }} /></div>
        <dl>
          <dt>Subjects counted</dt><dd>{r.counted} of 6</dd>
          <dt>APS including LO</dt><dd>{r.withLO === null ? "–" : r.withLO}</dd>
          <dt>Maximum possible</dt><dd>42</dd>
        </dl>
        <Checked>Uses the NSC achievement levels (1–7), best six subjects</Checked>
        <ShareButton text={`My APS score is ${r.total}.`} />
      </div>
      <ResultPeek label={"APS"} text={String(r.total)} target={res} />
    </div>
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
