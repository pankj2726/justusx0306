import type { ReactNode } from "react";
import { useReveal } from "../hooks/useReveal";
import Sparkle from "./Sparkle";

export default function SectionHeader({ eyebrow, title, children, align = "left" }: { eyebrow: string; title: ReactNode; children?: ReactNode; align?: "left" | "center" }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} data-stagger="90" className={`reveal ${align === "center" ? "mx-auto text-center" : ""} max-w-3xl`}>
      <div className={`flex items-center gap-3 ${align === "center" ? "justify-center" : ""}`}>
        <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--chapter)]" />
        <Sparkle size={12} color="var(--chapter)" />
        <span className="t-label !text-gold">{eyebrow}</span>
      </div>
      <h2 className="display mt-5 text-5xl sm:text-7xl">{title}</h2>
      {children && <p className="t-body mt-5 max-w-xl text-mist">{children}</p>}
    </div>
  );
}
