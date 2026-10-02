import { CHAPTERS } from "../data/canonicalTimeline";
import { ROMAN } from "../lib/format";
import { prefersReducedMotion } from "../lib/quality";
import Sparkle from "./Sparkle";

/** Desktop-only chapter progress rail: seven sparkle nodes, the active one lit. */
export default function ChapterRail({ active }: { active: string | null }) {
  const shown = !!active;
  return (
    <nav
      aria-label="Chapters"
      className={`fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-1.5 transition-opacity duration-500 lg:flex ${shown ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {CHAPTERS.map((c) => {
        const on = active === c.id;
        return (
          <button
            key={c.id}
            type="button"
            tabIndex={shown ? 0 : -1}
            onClick={() => document.getElementById(c.id)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" })}
            aria-label={`Chapter ${ROMAN[c.index]}: ${c.title}`}
            aria-current={on ? "true" : undefined}
            className="group relative flex h-9 w-9 items-center justify-center rounded-full"
          >
            <Sparkle size={on ? 18 : 11} color={on ? c.visual.atmosphere : "rgba(236,230,220,0.38)"} className="transition-all duration-500" />
            <span className="pointer-events-none absolute right-11 whitespace-nowrap rounded-full border border-line-2 bg-night/85 px-3 py-1 font-serif text-sm italic text-ivory opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {ROMAN[c.index]} · {c.title}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
