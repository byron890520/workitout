// "Tools" button in the header. Opens a panel with the tools in three groups:
// side-by-side columns on wide screens, tap-to-switch tabs on phones (so no list is long).
// Every link is in the pre-built HTML (hidden until opened), so Google still follows them.
import { useEffect, useRef, useState } from "react";

export default function ToolsMenu({ items, groups, current }) {
  const home = groups.find((g) => items.some((it) => it.group === g.id && current.startsWith(it.href)))?.id ?? groups[0].id;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(home);
  const wrap = useRef(null);
  const btn = useRef(null);
  const panel = useRef(null);

  // Only links you can actually see (on phones, the open tab's).
  const visibleLinks = () => [...panel.current.querySelectorAll(".tools-group a")].filter((a) => a.offsetParent !== null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); btn.current?.focus(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const links = visibleLinks();
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
    if (opening) setTab(home);
    setOpen(opening);
    // Keyboard users land on the first tool; mouse and touch users keep their place.
    if (opening && e.detail === 0) setTimeout(() => visibleLinks()[0]?.focus(), 60);
  };

  const onTabKey = (e, i) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + groups.length) % groups.length;
    setTab(groups[n].id);
    panel.current.querySelectorAll('[role="tab"]')[n]?.focus();
  };

  return (
    <div className={"tools-menu" + (open ? " open" : "")} ref={wrap}>
      <button type="button" ref={btn} className="tools-btn" aria-expanded={open} aria-controls="tools-panel" onClick={toggle}>
        <span className="tools-dots" aria-hidden="true"><i /><i /><i /><i /></span>
        Tools
        <svg className="chev" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
      </button>
      <div className="tools-panel" id="tools-panel" ref={panel} inert={!open}>
        <div className="tools-tabs" role="tablist" aria-label="Tool groups">
          {groups.map((g, i) => (
            <button key={g.id} type="button" role="tab" id={`tt-${g.id}`} aria-controls={`tg-${g.id}`}
              aria-selected={tab === g.id} tabIndex={tab === g.id ? 0 : -1}
              onClick={() => setTab(g.id)} onKeyDown={(e) => onTabKey(e, i)}>
              {g.label}<span className="n">{items.filter((it) => it.group === g.id).length}</span>
            </button>
          ))}
          <span className="tools-tab-ink" aria-hidden="true" style={{ "--i": groups.findIndex((g) => g.id === tab) }} />
        </div>
        <div className="tools-groups">
          {groups.map((g) => (
            <section key={g.id} className={"tools-group" + (tab === g.id ? " active" : "")} id={`tg-${g.id}`} role="tabpanel" aria-labelledby={`tt-${g.id}`}>
              <h2 className="tools-group-h">{g.label}</h2>
              <ul>
                {items.filter((it) => it.group === g.id).map((it, i) => {
                  const here = current.startsWith(it.href);
                  return (
                    <li key={it.href} style={{ "--n": i }}>
                      <a href={it.href} aria-current={here ? "page" : undefined} onClick={() => setOpen(false)}>
                        <span className={`key ${it.alt ? "alt" : ""}`} aria-hidden="true">{it.glyph}</span>
                        <span className="txt"><strong>{it.title}</strong><span className="d">{it.desc}</span></span>
                        {here && <span className="here">Here</span>}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <div className="tools-scrim" aria-hidden="true" />
    </div>
  );
}
