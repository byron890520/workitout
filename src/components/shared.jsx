// Small building blocks shared by the calculator islands.
import { useEffect, useRef, useState } from "react";

const calm = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Rolls a headline number to its new value so people can see what changed. */
export function AnimatedNumber({ value, format, className = "big" }) {
  const [shown, setShown] = useState(value);
  const [bump, setBump] = useState(false);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    from.current = value;
    if (calm() || start === value) { setShown(value); return; }
    let raf, t0;
    setBump(true);
    const step = (t) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / 420);
      setShown(start + (value - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step); else setBump(false);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <div className={className + (bump ? " bump" : "")}>{format(shown)}</div>;
}

/**
 * Form state that lives in the page link (?gross=30000&age=30), so a result can be shared.
 * The first render uses the defaults (matching the pre-built HTML); the link is read after load.
 */
export function useUrlState(defaults) {
  const [state, setState] = useState(defaults);
  const ready = useRef(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const next = { ...defaults };
    let found = false;
    for (const k of Object.keys(defaults)) {
      if (!q.has(k)) continue;
      found = true;
      next[k] = Array.isArray(defaults[k]) ? q.get(k).split(",") : q.get(k);
    }
    if (found) setState(next);
    ready.current = true;
  }, []);
  useEffect(() => {
    if (!ready.current) return;
    const id = setTimeout(() => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(state)) {
        const s = Array.isArray(v) ? v.join(",") : String(v ?? "");
        if (s !== (Array.isArray(defaults[k]) ? defaults[k].join(",") : String(defaults[k]))) q.set(k, s);
      }
      const qs = q.toString();
      try { history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "")); } catch {}
    }, 250);
    return () => clearTimeout(id);
  }, [state]);
  const set = (k) => (e) => setState((s) => ({ ...s, [k]: e.target.value }));
  return [state, setState, set];
}

/** Shares the current result: the phone's share sheet where available, otherwise copies the link. */
export function ShareButton({ text }) {
  const [msg, setMsg] = useState("");
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ title: document.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setMsg("Link copied");
    } catch (err) {
      if (err?.name === "AbortError") return;
      setMsg("Copy the link from your address bar");
    }
    setTimeout(() => setMsg(""), 2500);
  };
  return (
    <div className="share">
      <button type="button" className="btn btn-share" onClick={share}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M18 16a3 3 0 0 0-2.4 1.2l-6.7-3.4a3 3 0 0 0 0-1.6l6.7-3.4A3 3 0 1 0 15 7l-6.7 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1z"/></svg>
        Share this result
      </button>
      <span className="share-msg" role="status" aria-live="polite">{msg}</span>
    </div>
  );
}

export function Field({ id, label, hint, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}

/**
 * Phones only: keeps the headline answer pinned to the bottom of the screen while the form is
 * being filled in, and hides it once the full result panel is on screen. Tap to jump to the result.
 */
export function ResultPeek({ label, text, target }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = target.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top > 0), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  return (
    <button type="button" className={"peek" + (show ? " show" : "")} aria-hidden={!show} tabIndex={show ? 0 : -1}
      onClick={() => target.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
      <span>{label}</span><strong>{text}</strong>
    </button>
  );
}

/** Groups digits as you type ("30000" → "30 000") while storing the plain number. */
const fmtTyped = (raw) => {
  const clean = String(raw ?? "").replace(/[^\d.]/g, "");
  const [int, ...dec] = clean.split(".");
  const grouped = int.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return dec.length ? `${grouped}.${dec.join("").slice(0, 2)}` : grouped;
};

export function MoneyInput({ id, value, onValue, ...rest }) {
  const ref = useRef(null);
  const onChange = (e) => {
    const el = e.target;
    const caret = el.selectionStart ?? el.value.length;
    const digitsBefore = el.value.slice(0, caret).replace(/[^\d.]/g, "").length;
    const plain = el.value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
    onValue(plain);
    // Put the cursor back after the same number of digits once the spaces move.
    requestAnimationFrame(() => {
      const shown = ref.current;
      if (!shown || document.activeElement !== shown) return;
      let pos = 0, seen = 0;
      while (pos < shown.value.length && seen < digitsBefore) { if (/[\d.]/.test(shown.value[pos])) seen++; pos++; }
      shown.setSelectionRange(pos, pos);
    });
  };
  return (
    <div className="money">
      <span aria-hidden="true">R</span>
      <input ref={ref} id={id} type="text" inputMode="decimal" autoComplete="off" value={fmtTyped(value)} onChange={onChange} {...rest} />
    </div>
  );
}

/** Tap-to-fill amounts under a field. */
export function Chips({ values, current, onPick, label = (v) => v }) {
  return (
    <div className="chips" role="group" aria-label="Quick amounts">
      {values.map((v) => (
        <button type="button" key={v} className={String(current) === String(v) ? "on" : ""} aria-pressed={String(current) === String(v)}
          onClick={() => onPick(String(v))}>{label(v)}</button>
      ))}
    </div>
  );
}

/** Small note in the result panel saying which official figures were used. */
export function Checked({ children }) {
  return (
    <p className="checked">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6 11-11-1.4-1.4z"/></svg>
      {children}
    </p>
  );
}
