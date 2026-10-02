import { useEffect, useState } from "react";
import { CHAPTER_BY_ID } from "../data/canonicalTimeline";

/* Page accent outside any chapter — matches the original fixed washes. */
const DEFAULT = { chapter: "#d9b779", base: "#5a3d9a", nebula: "#c44878" };

/** Sets --chapter / --chapter-base / --chapter-nebula on :root (tweened by CSS @property). */
export function applyChapterTheme(id: string | null) {
  const root = document.documentElement;
  const v = id ? CHAPTER_BY_ID[id]?.visual : undefined;
  root.style.setProperty("--chapter", v?.atmosphere ?? DEFAULT.chapter);
  root.style.setProperty("--chapter-base", v?.base ?? DEFAULT.base);
  root.style.setProperty("--chapter-nebula", v?.nebula ?? DEFAULT.nebula);
  root.dataset.chapter = id ?? "";
}

/**
 * Returns the chapter whose section crosses the middle of the viewport.
 * Sections mark themselves with data-chapter-section="ch-0N".
 */
export function useActiveChapter(): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const seen = new Map<Element, boolean>();
    const pick = () => {
      let id: string | null = null;
      for (const [el, on] of seen) if (on && el.isConnected) id = (el as HTMLElement).dataset.chapterSection ?? null;
      setActive(id);
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target, e.isIntersecting));
        pick();
      },
      { rootMargin: "-48% 0px -48% 0px" }
    );
    const scan = () => {
      for (const el of Array.from(seen.keys())) {
        if (!el.isConnected) {
          io.unobserve(el);
          seen.delete(el);
        }
      }
      document.querySelectorAll<HTMLElement>("[data-chapter-section]").forEach((el) => {
        if (!seen.has(el)) {
          seen.set(el, false);
          io.observe(el);
        }
      });
    };
    scan();
    // debounced: DOM churn elsewhere (e.g. the galaxy hover label) never costs a scan per frame
    let pending = 0;
    const mo = new MutationObserver(() => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        scan();
      }, 250);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      window.clearTimeout(pending);
    };
  }, []);

  useEffect(() => applyChapterTheme(active), [active]);
  return active;
}
