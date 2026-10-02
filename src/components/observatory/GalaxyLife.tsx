import { useRef, useState, type FormEvent } from "react";
import { UI_COPY } from "../../data/galaxyCopy";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import type { Wish } from "../../lib/galaxyLocal";
import type { Discoverable } from "../../three/galaxyScene";
import { IClose, ITrash } from "../Icons";
import Sparkle from "../Sparkle";

const PANEL =
  "absolute z-40 flex max-h-[calc(100%-6rem)] flex-col overflow-hidden rounded-2xl border border-line-2 bg-night/90 backdrop-blur-2xl outline-none";

/* -------------------------------------------------------- discoveries -- */

export function DiscoveriesPanel({
  open,
  onClose,
  items,
  found,
  onFly,
}: {
  open: boolean;
  onClose: () => void;
  items: Discoverable[];
  found: string[];
  onFly: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, open);
  if (!open) return null;
  const n = items.filter((i) => found.includes(i.id)).length;
  return (
    <div
      ref={ref}
      data-modal-open
      role="dialog"
      aria-modal="true"
      aria-label={`${UI_COPY.discoveries}, ${n} of ${items.length} found`}
      tabIndex={-1}
      className={`${PANEL} inset-x-3 bottom-3 top-16 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-20 sm:w-[360px]`}
      onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="t-label !text-gold">{UI_COPY.discoveries}</div>
          <div className="mt-1 font-serif text-lg italic text-mist">
            {n} / {items.length}
          </div>
        </div>
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:text-ivory" aria-label="Close discoveries">
          <IClose size={16} />
        </button>
      </div>
      <ul className="flex-1 divide-y divide-line overflow-y-auto">
        {items.map((it) => {
          const got = found.includes(it.id);
          const flyable = got && it.kind !== "ufo" && it.kind !== "wish";
          return (
            <li key={it.id}>
              <button
                type="button"
                disabled={!flyable}
                onClick={() => flyable && onFly(it.id)}
                className="flex min-h-[56px] w-full items-center gap-3 px-5 py-3 text-left transition-colors enabled:hover:bg-white/[0.04] disabled:cursor-default"
                aria-label={got ? `${it.name}. ${it.line}${flyable ? `. ${UI_COPY.flyTo}` : ""}` : UI_COPY.undiscovered}
              >
                <Sparkle size={16} color={got ? "#d9b779" : "rgba(236,230,220,0.18)"} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate font-serif text-[17px] ${got ? "text-ivory" : "text-dim"}`}>{got ? it.name : "· · ·"}</span>
                  <span className="block truncate text-[12px] text-mist">{got ? it.line : UI_COPY.undiscovered}</span>
                </span>
                {flyable && <span className="t-label shrink-0 !text-gold">{UI_COPY.flyTo}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------- wish card -- */

export function WishCard({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (text: string) => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  useFocusTrap(ref, open);
  if (!open) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSave(text.trim());
    setText("");
  };
  return (
    <form
      ref={ref}
      data-modal-open
      role="dialog"
      aria-modal="true"
      aria-label={UI_COPY.makeWish}
      tabIndex={-1}
      onSubmit={submit}
      onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}
      className={`${PANEL} left-1/2 top-1/2 w-[min(92%,380px)] -translate-x-1/2 -translate-y-1/2 p-6 text-center`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 text-gold">
        <Sparkle size={22} spin />
      </div>
      <div className="t-label mt-4 !text-gold">{UI_COPY.wishPrompt}</div>
      <h3 className="mt-2 font-serif text-3xl">{UI_COPY.makeWish}</h3>
      <label className="mt-5 block text-left">
        <span className="sr-only">{UI_COPY.makeWish}</span>
        <input autoFocus value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder={UI_COPY.wishPlaceholder} className="field min-h-[44px]" />
      </label>
      <div className="mt-1 text-right text-[11px] text-dim">{text.length}/120</div>
      <p className="mt-2 text-[12px] text-mist">{UI_COPY.wishesPrivate}</p>
      <div className="mt-5 flex justify-center gap-2">
        <button type="button" onClick={onClose} className="btn btn-ghost !h-11">
          {UI_COPY.notNow}
        </button>
        <button type="submit" disabled={!text.trim()} className="btn btn-primary !h-11">
          {UI_COPY.saveWish}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------- wishes -- */

export function WishesPanel({
  open,
  onClose,
  wishes,
  onDelete,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  wishes: Wish[];
  onDelete: (id: string) => void;
  onAdd: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [text, setText] = useState("");
  useFocusTrap(ref, open);
  if (!open) return null;
  return (
    <div
      ref={ref}
      data-modal-open
      role="dialog"
      aria-modal="true"
      aria-label={UI_COPY.wishes}
      tabIndex={-1}
      className={`${PANEL} inset-x-3 bottom-3 top-16 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:top-20 sm:w-[360px]`}
      onKeyDown={(e) => e.key === "Escape" && (e.stopPropagation(), onClose())}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <div className="t-label !text-gold">{UI_COPY.wishes}</div>
          <div className="mt-1 text-[12px] text-mist">{UI_COPY.wishesPrivate}</div>
        </div>
        <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-dim hover:text-ivory" aria-label="Close wishes">
          <IClose size={16} />
        </button>
      </div>
      <form
        className="flex gap-2 border-b border-line p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
      >
        <label className="flex-1">
          <span className="sr-only">{UI_COPY.writeWish}</span>
          <input value={text} maxLength={120} onChange={(e) => setText(e.target.value)} placeholder={UI_COPY.writeWish} className="field min-h-[44px]" />
        </label>
        <button type="submit" disabled={!text.trim()} className="btn btn-ghost !h-11 !px-4">
          Add
        </button>
      </form>
      <ul className="flex-1 divide-y divide-line overflow-y-auto" aria-live="polite">
        {wishes.length === 0 && <li className="p-5 text-[13px] text-mist">{UI_COPY.noWishes}</li>}
        {wishes
          .slice()
          .reverse()
          .map((w) => (
            <li key={w.id} className="flex items-start gap-3 px-5 py-3">
              <Sparkle size={12} color="#ffc46b" className="mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="break-words font-serif text-[17px] italic text-ivory">{w.text}</p>
                <p className="t-label mt-1">{new Date(w.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <button onClick={() => onDelete(w.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-dim hover:text-rose" aria-label={`${UI_COPY.deleteWish}: ${w.text}`}>
                <ITrash size={14} />
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------- UFO toast -- */

export function UfoToast({ title, onOpen, onDismiss }: { title: string; onOpen: () => void; onDismiss: () => void }) {
  return (
    <div role="status" className="absolute left-1/2 top-28 z-30 w-[min(92%,420px)] -translate-x-1/2 rounded-2xl border border-line-2 bg-night/90 p-4 backdrop-blur-xl sm:top-32">
      <div className="t-label !text-gold">{UI_COPY.visitorBeam}</div>
      <div className="mt-1 truncate font-serif text-xl">{title}</div>
      <div className="mt-3 flex gap-2">
        <button onClick={onOpen} className="btn btn-primary !h-11 flex-1 justify-center !text-[12px]">
          {UI_COPY.openMemory}
        </button>
        <button onClick={onDismiss} className="flex h-11 w-11 items-center justify-center rounded-full border border-line-2 text-mist hover:text-ivory" aria-label="Dismiss">
          <IClose size={14} />
        </button>
      </div>
    </div>
  );
}
