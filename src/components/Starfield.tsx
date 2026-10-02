import { useEffect, useRef } from "react";

/* Per-chapter sky mood: density (fraction of stars drawn) and twinkle speed. */
const MOOD: Record<string, { d: number; s: number }> = {
  "ch-01": { d: 1.1, s: 1.0 },
  "ch-02": { d: 0.95, s: 0.9 },
  "ch-03": { d: 1.15, s: 1.05 },
  "ch-04": { d: 1.0, s: 1.0 },
  "ch-05": { d: 1.05, s: 1.1 },
  "ch-06": { d: 0.7, s: 0.6 },
  "ch-07": { d: 1.2, s: 1.25 },
};
const NEUTRAL = { d: 1, s: 1 };
const MAX_D = 1.2;

/** Quiet star field; nebula washes follow the active chapter via CSS variables. One canvas. */
export default function Starfield({ chapter = null }: { chapter?: string | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef(NEUTRAL);

  useEffect(() => {
    target.current = (chapter && MOOD[chapter]) || NEUTRAL;
  }, [chapter]);

  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type S = { x: number; y: number; r: number; a: number; t: number; sp: number; depth: number };
    let stars: S[] = [];
    const cur = { d: 1, s: 1 };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      c.width = w * dpr;
      c.height = h * dpr;
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(((w * h) / 5200) * MAX_D);
      stars = Array.from({ length: n }).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() < 0.92 ? Math.random() * 0.8 + 0.2 : Math.random() * 1.3 + 0.8,
        a: Math.random() * 0.6 + 0.15,
        t: Math.random() * Math.PI * 2,
        sp: Math.random() * 0.015 + 0.004,
        depth: Math.random() * 0.6 + 0.2,
      }));
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const tg = target.current;
      const k = reduce ? 1 : 0.02;
      cur.d += (tg.d - cur.d) * k;
      cur.s += (tg.s - cur.s) * k;
      ctx.clearRect(0, 0, w, h);
      const scroll = window.scrollY;
      const count = Math.floor((stars.length * cur.d) / MAX_D);
      for (let i = 0; i < count; i++) {
        const s = stars[i];
        s.t += s.sp * cur.s;
        const tw = reduce ? 1 : 0.65 + Math.sin(s.t) * 0.35;
        let y = (s.y - scroll * s.depth * 0.08) % h;
        if (y < 0) y += h;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(236,230,220,${s.a * tw})`;
        ctx.fill();
        if (s.r > 1.2) {
          ctx.beginPath();
          ctx.arc(s.x, y, s.r * 3.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(236,220,190,${0.04 * tw})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 10%, color-mix(in srgb, var(--chapter-nebula) 11%, transparent), transparent 50%), radial-gradient(ellipse at 85% 35%, color-mix(in srgb, var(--chapter-base) 11%, transparent), transparent 50%), radial-gradient(ellipse at 50% 100%, color-mix(in srgb, var(--chapter) 7%, transparent), transparent 55%)",
        }}
      />
      <canvas ref={ref} className="absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
