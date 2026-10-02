import { useEffect, useRef, useState, type RefObject } from "react";
import { easeOutExpo } from "../lib/motion";

const reducedNow = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Adds the `in` class once the element scrolls into view.
 * Backwards compatible. `data-stagger="70"` on the element staggers its
 * children (sets --stagger-delay on each child, 70ms apart).
 */
export function useReveal<T extends HTMLElement>(threshold = 0.12) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const t = e.target as HTMLElement;
          if (t.dataset.stagger !== undefined) {
            const step = Number(t.dataset.stagger) || 70;
            Array.from(t.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--stagger-delay", `${i * step}ms`));
          }
          t.classList.add("in");
          io.unobserve(t);
        });
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

/** Counts 0 → target once when `ref` becomes visible (eased). Reduced motion: final value. */
export function useCountUp(target: number, ref: RefObject<HTMLElement | null>, duration = 1400) {
  const [v, setV] = useState(() => (reducedNow() ? target : 0));
  const done = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reducedNow() || done.current) {
      setV(target);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        done.current = true;
        const t0 = performance.now();
        const step = (t: number) => {
          const k = Math.min(1, (t - t0) / duration);
          setV(Math.round(target * easeOutExpo(k)));
          if (k < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, ref, duration]);
  return v;
}
