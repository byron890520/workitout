// The home page's 3D board: letter tiles flip into place, then the board leans towards the pointer.
import { useEffect, useRef } from "react";

const ROWS = ["WORK", "IT+%", "OUT="];

export default function TileBoard() {
  const board = useRef(null);
  useEffect(() => {
    const el = board.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = el.parentElement;
    let raf = 0;
    const apply = (x, y) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${18 - y * 14}deg`);
        el.style.setProperty("--ry", `${-20 + x * 26}deg`);
      });
    };
    const onMove = (e) => {
      if (e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      apply((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    };
    const onScroll = () => {
      const r = stage.getBoundingClientRect();
      apply(0, Math.max(-0.6, Math.min(0.6, (r.top + r.height / 2) / innerHeight - 0.5)));
    };
    // Tap a tile to flip it again.
    const onTap = (e) => {
      const t = e.target.closest(".tile");
      if (!t) return;
      t.classList.remove("again");
      void t.offsetWidth;
      t.classList.add("again");
    };
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("click", onTap);
    return () => {
      removeEventListener("pointermove", onMove);
      removeEventListener("scroll", onScroll);
      el.removeEventListener("click", onTap);
      cancelAnimationFrame(raf);
    };
  }, []);

  let i = 0;
  return (
    <div className="board-stage" aria-hidden="true">
      <div className="board float" ref={board}>
        {ROWS.flatMap((row) => [...row].map((ch) => {
          const k = i++;
          return (
            <div key={k} className={"tile" + ("+%=".includes(ch) ? " op" : "")} style={{ "--i": k }}>
              <div className="inner"><span className="face front">{ch}</span><span className="face back">{ch}</span></div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}
