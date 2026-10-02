import { useEffect, useState } from "react";
import { useMemories } from "../store/MemoryStore";
import { IEdit, ILock } from "./Icons";

const LINKS = [
  { href: "#galaxy", label: "Galaxy" },
  { href: "#timeline", label: "Timeline" },
  { href: "#gallery", label: "Gallery" },
  { href: "#numbers", label: "Numbers" },
  { href: "#letter", label: "Letter" },
];

export default function Nav({ onAdmin }: { onAdmin: () => void }) {
  const { settings, isAdmin, lock } = useMemories();
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(h > 0 ? window.scrollY / h : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${scrolled ? "border-b border-line bg-night/70 backdrop-blur-xl" : "border-b border-transparent"}`}>
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <a href="#home" className="flex items-baseline gap-1.5 font-serif text-2xl font-light tracking-tight">
          <span>{settings.hisName.charAt(0)}</span>
          <span className="italic text-gold">&</span>
          <span>{settings.herName.charAt(0)}</span>
        </a>
        <div className="no-scrollbar hidden items-center gap-8 overflow-x-auto md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="label !text-[10px] transition-colors hover:!text-ivory">
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <>
              <span className="hidden rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-gold sm:inline">Admin</span>
              <button onClick={onAdmin} className="btn btn-primary !h-9 !px-4 !text-xs">
                <IEdit size={13} /> <span className="hidden sm:inline">Studio</span>
              </button>
              <button onClick={lock} className="flex h-9 w-9 items-center justify-center rounded-full border border-line-2 text-mist transition-colors hover:text-rose" title="Lock — back to the visitor view" aria-label="Lock admin">
                <ILock size={14} />
              </button>
            </>
          ) : (
            <button onClick={onAdmin} className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-dim transition-colors hover:text-ivory" title="Admin" aria-label="Admin">
              <ILock size={14} />
            </button>
          )}
        </div>
      </nav>
      <div
        className="absolute bottom-[-1px] left-0 h-px"
        style={{ width: `${progress * 100}%`, background: "linear-gradient(to right, transparent, var(--chapter), color-mix(in srgb, var(--chapter) 45%, transparent))" }}
      />
    </header>
  );
}
