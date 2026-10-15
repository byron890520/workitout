// "Tools" button in the header that drops down a panel of every tool.
// The links are in the pre-built HTML (hidden until opened), so Google still follows them.
import { useEffect, useRef, useState } from "react";

export default function ToolsMenu({ items, current }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);
  const btn = useRef(null);
  const panel = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const links = [...panel.current.querySelectorAll("a")];
      const i = links.indexOf(document.activeElement);
      e.preventDefault();
      const next = e.key === "ArrowDown" ? (i + 1) % links.length : (i - 1 + links.length) % links.length;
      links[next]?.focus();
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const toggle = (e) => {
    const opening = !open;
    setOpen(opening);
    // Keyboard users land on the first tool; mouse and touch users keep their place.
    if (opening && e.detail === 0) setTimeout(() => panel.current?.querySelector("a")?.focus(), 60);
  };

  return (
    <div className={"tools-menu" + (open ? " open" : "")} ref={wrap}>
      <button type="button" ref={btn} className="tools-btn" aria-expanded={open} aria-controls="tools-panel" onClick={toggle}>
        <span className="tools-dots" aria-hidden="true"><i /><i /><i /><i /></span>
        Tools
        <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
      </button>
      <div className="tools-panel" id="tools-panel" ref={panel} inert={!open}>
        <ul>
          {items.map((it, i) => {
            const here = current.startsWith(it.href);
            return (
              <li key={it.href} style={{ "--n": i }}>
                <a href={it.href} aria-current={here ? "page" : undefined} onClick={() => setOpen(false)}>
                  <span className={`key ${it.alt ? "alt" : ""}`} aria-hidden="true">{it.glyph}</span>
                  <span className="txt"><strong>{it.title}</strong><span className="d">{it.desc}</span></span>
                  {here && <span className="here">You're here</span>}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="tools-scrim" aria-hidden="true" />
    </div>
  );
}
