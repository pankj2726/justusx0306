import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CHAPTER_BY_ID, CHAPTERS, EVENT_BY_ID, type PlatePresentation } from "../data/canonicalTimeline";
import { ROMAN, Title } from "../lib/format";
import { parseMusicLink, trackFromLink } from "../lib/music";
import { formatDate, todayISO } from "../lib/time";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { galaxyAudio } from "../lib/audio";
import { useMemories } from "../store/MemoryStore";
import MusicEmbed from "./MusicEmbed";
import { IArrowL, IClose, IEye, IHeart, IHeartFill, IImage, ILink, ILock, IMusic, IPlay, IPlus, ISearch, ITrash, IUpload } from "./Icons";

type Tab = "events" | "settings" | "backup";

/* ------------------------------------------------------------ helpers -- */

function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="label">{title}</div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, hint, className = "" }: { label: string; children: ReactNode; hint?: string; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label !text-[9.5px]">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1.5 block text-[11px] text-dim">{hint}</span>}
    </label>
  );
}

function Badge({ children, tone = "mist" }: { children: ReactNode; tone?: "mist" | "gold" | "rose" }) {
  const c = tone === "gold" ? "border-gold/40 text-gold" : tone === "rose" ? "border-rose/40 text-rose" : "border-line-2 text-mist";
  return <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-[1px] font-mono text-[9px] uppercase tracking-wider ${c}`}>{children}</span>;
}

/* ------------------------------------------------------------ gate ----- */

export function AdminGate({ open, onClose, onUnlocked }: { open: boolean; onClose: () => void; onUnlocked: () => void }) {
  const { unlock } = useMemories();
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useFocusTrap(formRef, open);
  if (!open) return null;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (unlock(pass)) {
      setPass("030105060703");
      setErr(false);
      onUnlocked();
    } else setErr(true);
  };
  return (
    <div data-modal-open className="fade-in fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" onClick={onClose}>
      <form
        ref={formRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin passcode"
        tabIndex={-1}
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="rise w-full max-w-sm rounded-3xl border border-line bg-night-2 p-8 text-center outline-none"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-gold/40 text-gold">
          <ILock size={18} />
        </div>
        <div className="label mt-6 !text-gold">Admin</div>
        <h2 className="display mt-2 text-4xl">
          Enter the <span className="italic">studio</span>
        </h2>
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setErr(false);
          }}
          placeholder="Passcode"
          className={`field mt-8 text-center tracking-[0.4em] ${err ? "!border-rose/70" : ""}`}
        />
        {err && <p className="mt-2 text-[12px] text-rose">That passcode isn't right.</p>}
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Unlock
          </button>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ panel ---- */

type PanelProps = { open: boolean; onClose: () => void; focusId: string | null; onPreview: (id: string) => void };

export default function AdminPanel({ open, onClose, focusId, onPreview }: PanelProps) {
  const { events, hiddenEvents, restoreEvent, addCustomEvent, mediaByEvent, lock } = useMemories();
  const [tab, setTab] = useState<Tab>("events");
  const [sel, setSel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [chapterFilter, setChapterFilter] = useState("all");
  const asideRef = useRef<HTMLElement>(null);
  useFocusTrap(asideRef, open);

  useEffect(() => {
    if (open && focusId) {
      setTab("events");
      setSel(focusId);
    }
  }, [open, focusId]);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === "Escape" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return events.filter(
      (e) => (chapterFilter === "all" || e.chapterId === chapterFilter) && (!qq || `${e.title} ${e.description} ${e.location ?? ""} ${e.date}`.toLowerCase().includes(qq))
    );
  }, [events, q, chapterFilter]);

  const selEvent = sel ? events.find((e) => e.id === sel) : undefined;
  const editedCount = events.filter((e) => e.edited).length;
  const addedCount = events.filter((e) => e.custom).length;

  const createNew = () => {
    const ev = addCustomEvent({ date: todayISO(), title: "New memory", description: "", chapterId: "ch-07" });
    setTab("events");
    setQ("");
    setChapterFilter("all");
    setSel(ev.id);
  };

  return (
    <div className={`fixed inset-0 z-[80] ${open ? "" : "pointer-events-none"}`} data-modal-open={open ? "" : undefined} aria-hidden={!open}>
      <div onClick={onClose} className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ${open ? "opacity-100" : "opacity-0"}`} />
      <aside
        ref={asideRef}
        role="dialog"
        aria-modal="true"
        aria-label="Admin studio"
        tabIndex={-1}
        className={`absolute inset-y-0 right-0 flex w-full max-w-[1100px] flex-col outline-none border-l border-line-2 bg-night-2 shadow-[0_0_120px_rgba(0,0,0,0.8)] transition-transform duration-500 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-7">
          <div className="min-w-0">
            <div className="label !text-gold">Admin</div>
            <div className="font-serif text-2xl leading-none">The studio</div>
          </div>
          <nav className="ml-auto flex rounded-full border border-line p-1">
            {(["events", "settings", "backup"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3 py-1.5 text-[12px] capitalize tracking-wide sm:px-3.5 ${tab === t ? "bg-ivory text-night" : "text-mist hover:text-ivory"}`}>
                {t}
              </button>
            ))}
          </nav>
          <button
            onClick={() => {
              lock();
              onClose();
            }}
            className="hidden items-center gap-2 rounded-full border border-line-2 px-3 py-2 text-[11px] text-mist hover:text-rose sm:flex"
            title="Lock the studio and return to the visitor view"
          >
            <ILock size={13} /> Lock
          </button>
          <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-2 text-mist hover:text-ivory" aria-label="Close">
            <IClose size={16} />
          </button>
        </header>

        {tab === "events" && (
          <div className="grid min-h-0 flex-1 md:grid-cols-[340px_1fr]">
            {/* list */}
            <div className={`min-h-0 flex-col border-r border-line ${selEvent ? "hidden md:flex" : "flex"}`}>
              <div className="space-y-2.5 border-b border-line p-4">
                <button onClick={createNew} className="btn btn-primary !h-10 w-full justify-center">
                  <IPlus size={14} /> New memory
                </button>
                <label className="relative block">
                  <ISearch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, story, place, date…" className="field !py-2 !pl-10" />
                </label>
                <select value={chapterFilter} onChange={(e) => setChapterFilter(e.target.value)} className="field !py-2">
                  <option value="all" className="bg-night">
                    All chapters
                  </option>
                  {CHAPTERS.map((c) => (
                    <option key={c.id} value={c.id} className="bg-night">
                      {ROMAN[c.index]} · {c.title}
                    </option>
                  ))}
                </select>
                <div className="font-mono text-[9.5px] uppercase tracking-widest text-dim">
                  {list.length} of {events.length} · {editedCount} edited · {addedCount} added
                </div>
              </div>
              <ol className="min-h-0 flex-1 overflow-y-auto">
                {list.map((e) => {
                  const c = CHAPTER_BY_ID[e.chapterId];
                  const mc = mediaByEvent[e.id]?.length ?? 0;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setSel(e.id)}
                        className={`flex w-full items-start gap-3 border-b border-line px-4 py-3 text-left transition-colors ${sel === e.id ? "bg-white/[0.07]" : "hover:bg-white/[0.03]"}`}
                      >
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: c?.visual.atmosphere, boxShadow: `0 0 8px ${c?.visual.atmosphere}` }} />
                        <span className="min-w-0 flex-1">
                          <span className="block font-mono text-[9.5px] uppercase tracking-widest text-dim">
                            {formatDate(e.date, { day: "2-digit", month: "short", year: "numeric" })} · {ROMAN[c?.index ?? 0]}
                          </span>
                          <span className="block truncate font-serif text-[16px]">
                            <Title title={e.title} />
                          </span>
                          {(e.edited || e.custom || e.extras.music || mc > 0 || e.extras.favorite) && (
                            <span className="mt-1 flex flex-wrap gap-1.5">
                              {e.edited && <Badge tone="gold">edited</Badge>}
                              {e.custom && <Badge tone="gold">added</Badge>}
                              {e.extras.music && (
                                <Badge>
                                  <IMusic size={9} /> song
                                </Badge>
                              )}
                              {mc > 0 && (
                                <Badge>
                                  <IImage size={9} /> {mc}
                                </Badge>
                              )}
                              {e.extras.favorite && <Badge tone="rose">♥</Badge>}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {!list.length && <li className="p-6 text-center font-serif italic text-mist">Nothing matches.</li>}
              </ol>
              {hiddenEvents.length > 0 && (
                <details className="max-h-56 overflow-y-auto border-t border-line p-4">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-mist">Deleted · {hiddenEvents.length}</summary>
                  <ul className="mt-3 space-y-2">
                    {hiddenEvents.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3">
                        <span className="truncate text-[13px] text-dim">{e.title}</span>
                        <button onClick={() => restoreEvent(e.id)} className="shrink-0 text-[11px] text-gold hover:text-ivory">
                          Restore
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {/* editor */}
            <div className={`min-h-0 overflow-y-auto ${selEvent ? "block" : "hidden md:block"}`}>
              {selEvent ? (
                <EventEditor key={`${selEvent.id}-${selEvent.edited ? 1 : 0}`} id={selEvent.id} onBack={() => setSel(null)} onDeleted={() => setSel(null)} onPreview={onPreview} />
              ) : (
                <div className="flex h-full flex-col items-center justify-center p-10 text-center">
                  <div className="font-serif text-3xl font-light">Choose a memory to edit</div>
                  <p className="mt-3 max-w-sm text-[14px] text-mist">Change its title, date, chapter, place and story; attach a song; add or reorder photos, videos and voice notes.</p>
                  <button onClick={createNew} className="btn btn-ghost mt-8">
                    <IPlus size={14} /> Or start a new one
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "settings" && <SettingsTab />}
        {tab === "backup" && <BackupTab />}
      </aside>
    </div>
  );
}

/* ------------------------------------------------------ event editor --- */

function EventEditor({ id, onBack, onDeleted, onPreview }: { id: string; onBack: () => void; onDeleted: () => void; onPreview: (id: string) => void }) {
  const { events, updateEvent, deleteEvent, resetEvent, setExtras } = useMemories();
  const ev = events.find((e) => e.id === id);
  const [d, setD] = useState(() => ({
    title: ev?.title ?? "",
    date: ev?.date ?? todayISO(),
    chapterId: ev?.chapterId ?? "ch-07",
    location: ev?.location ?? "",
    description: ev?.description ?? "",
    note: ev?.extras.note ?? "",
  }));
  const [saved, setSaved] = useState(false);
  if (!ev) return null;

  const original = EVENT_BY_ID[id];
  const color = CHAPTER_BY_ID[ev.chapterId]?.visual.atmosphere ?? "#d9b779";
  const dirty =
    d.title !== ev.title ||
    d.date !== ev.date ||
    d.chapterId !== ev.chapterId ||
    d.location !== (ev.location ?? "") ||
    d.description !== ev.description ||
    d.note !== (ev.extras.note ?? "");
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((x) => ({ ...x, [k]: v }));

  const save = () => {
    if (!d.title.trim() || !d.date) return;
    const clean = { ...d, title: d.title.trim(), location: d.location.trim(), description: d.description.trim() };
    updateEvent(id, { title: clean.title, date: clean.date, chapterId: clean.chapterId, location: clean.location, description: clean.description });
    if (clean.note !== (ev.extras.note ?? "")) setExtras(id, { note: clean.note });
    setD(clean);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const revert = () =>
    setD({ title: ev.title, date: ev.date, chapterId: ev.chapterId, location: ev.location ?? "", description: ev.description, note: ev.extras.note ?? "" });
  const presentation: PlatePresentation = ev.extras.presentation ?? "both";

  return (
    <div className="p-5 sm:p-8">
      <div className="flex items-start gap-3">
        <button onClick={onBack} className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-2 text-mist hover:text-ivory md:hidden" aria-label="Back">
          <IArrowL size={14} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-widest" style={{ color }}>
            {ev.custom ? "Added memory" : ev.edited ? "Original · edited" : "Original"}
          </div>
          <h3 className="mt-1 truncate font-serif text-3xl">
            <Title title={ev.title} />
          </h3>
        </div>
        <button onClick={() => onPreview(id)} className="btn btn-ghost !h-9 shrink-0 !px-3.5 !text-[11px]">
          <IEye size={13} /> <span className="hidden sm:inline">View as visitor</span>
        </button>
      </div>

      <Section
        title="Card & story"
        right={
          <div className="flex items-center gap-2">
            {saved && <span className="font-mono text-[10px] uppercase tracking-widest text-gold">Saved ✓</span>}
            {dirty && (
              <button onClick={revert} className="text-[11px] text-dim hover:text-ivory">
                Discard
              </button>
            )}
            <button onClick={save} disabled={!dirty || !d.title.trim()} className="btn btn-primary !h-9 !px-4 !text-[12px]">
              Save changes
            </button>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2" hint="Emoji are welcome — they render subtly next to the title.">
            <input value={d.title} onChange={(e) => set("title", e.target.value)} className="field font-serif !text-lg" />
          </Field>
          <Field label="Date">
            <input type="date" value={d.date} onChange={(e) => set("date", e.target.value)} className="field [color-scheme:dark]" />
          </Field>
          <Field label="Chapter">
            <select value={d.chapterId} onChange={(e) => set("chapterId", e.target.value)} className="field">
              {CHAPTERS.map((c) => (
                <option key={c.id} value={c.id} className="bg-night">
                  {ROMAN[c.index]} · {c.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Place" className="sm:col-span-2">
            <input value={d.location} onChange={(e) => set("location", e.target.value)} placeholder="Pizza shop, the room, Dankaur…" className="field" />
          </Field>
          <Field label="The memory (story)" className="sm:col-span-2">
            <textarea value={d.description} onChange={(e) => set("description", e.target.value)} rows={6} className="field font-serif !text-lg leading-relaxed" />
          </Field>
          <Field label="A note" className="sm:col-span-2" hint="Shown to visitors under the story, in italics. Leave empty to hide.">
            <textarea value={d.note} onChange={(e) => set("note", e.target.value)} rows={3} className="field font-serif !text-lg italic" />
          </Field>
        </div>
        {ev.edited && original && (
          <div className="mt-4 rounded-xl border border-line bg-white/[0.02] p-4 text-[12px] text-mist">
            <span className="text-dim">Original:</span> {original.title} · {formatDate(original.date)} ·{" "}
            <button
              onClick={() => {
                if (confirm("Restore the original title, date, chapter, place and story?")) resetEvent(id);
              }}
              className="text-gold hover:text-ivory"
            >
              Restore original text
            </button>
          </div>
        )}
      </Section>

      <Section title="Display">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setExtras(id, { favorite: !ev.extras.favorite })}
            className={`flex h-9 items-center gap-2 rounded-full border px-4 text-[12px] transition-colors ${ev.extras.favorite ? "border-rose/50 bg-rose/10 text-rose" : "border-line-2 text-mist hover:text-rose"}`}
          >
            {ev.extras.favorite ? <IHeartFill size={13} /> : <IHeart size={13} />} {ev.extras.favorite ? "Favourite" : "Mark as favourite"}
          </button>
          <div className="flex items-center gap-1 rounded-full border border-line p-1">
            {(["both", "spotify", "collage"] as PlatePresentation[]).map((p) => (
              <button
                key={p}
                onClick={() => setExtras(id, { presentation: p })}
                className={`rounded-full px-3 py-1 text-[11px] tracking-wide ${presentation === p ? "bg-ivory text-night" : "text-mist hover:text-ivory"}`}
              >
                {p === "both" ? "Song + gallery" : p === "spotify" ? "Song only" : "Gallery only"}
              </button>
            ))}
          </div>
        </div>
      </Section>

      <SongEditor id={id} />
      <MediaManager id={id} />

      <Section title="Danger zone">
        <button
          onClick={() => {
            const msg = ev.custom ? "Delete this memory permanently?" : "Remove this memory from the site? You can restore it later from “Deleted”.";
            if (confirm(msg)) {
              deleteEvent(id);
              onDeleted();
            }
          }}
          className="flex h-10 items-center gap-2 rounded-full border border-rose/40 px-4 text-[12px] text-rose transition-colors hover:bg-rose/10"
        >
          <ITrash size={13} /> {ev.custom ? "Delete memory" : "Remove from site"}
        </button>
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------- song ---- */

function SongEditor({ id }: { id: string }) {
  const { events, setExtras } = useMemories();
  const ev = events.find((e) => e.id === id)!;
  const track = ev.extras.music ?? ev.music;
  const [link, setLink] = useState(track?.spotifyUrl ?? "");
  const [title, setTitle] = useState(track?.title ?? "");
  const [artist, setArtist] = useState(track?.artist ?? "");
  const [lyrics, setLyrics] = useState((track?.lyrics ?? []).join("\n"));
  const [msg, setMsg] = useState("");
  const parsed = parseMusicLink(link);

  const save = () => {
    const t = trackFromLink(link, title.trim(), artist.trim());
    if (!t) return;
    t.lyrics = lyrics.trim() ? lyrics.split("\n") : undefined;
    setExtras(id, { music: t });
    setMsg("Song attached ✓");
    window.setTimeout(() => setMsg(""), 1800);
  };
  const remove = () => {
    setExtras(id, { music: undefined });
    setLink("");
    setTitle("");
    setArtist("");
    setLyrics("");
  };

  return (
    <Section title="Song" right={msg && <span className="font-mono text-[10px] uppercase tracking-widest text-gold">{msg}</span>}>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          <Field label="Spotify or YouTube link" hint="Spotify: Share → Copy song link. Tracks, albums and playlists all work.">
            <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://open.spotify.com/track/…" className="field" />
          </Field>
          {link && (
            <p className={`font-mono text-[10px] uppercase tracking-widest ${parsed ? "text-gold" : "text-rose"}`}>
              {parsed ? `Recognised · ${parsed.provider}${"type" in parsed ? ` ${parsed.type}` : ""}` : "Link not recognised"}
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Song title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" />
            </Field>
            <Field label="Artist">
              <input value={artist} onChange={(e) => setArtist(e.target.value)} className="field" />
            </Field>
          </div>
          <Field label="Lyrics to show (optional)">
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} rows={3} className="field font-serif italic" />
          </Field>
          <div className="flex gap-2">
            <button onClick={save} disabled={!parsed} className="btn btn-primary !h-9 !px-4 !text-[12px]">
              {track ? "Update song" : "Attach song"}
            </button>
            {track && (
              <button onClick={remove} className="btn btn-ghost !h-9 !px-4 !text-[12px]">
                Remove
              </button>
            )}
          </div>
        </div>
        <div>
          {parsed ? (
            <MusicEmbed url={link} title={title || "Preview"} artist={artist} />
          ) : (
            <div className="flex h-[152px] items-center justify-center rounded-xl border border-dashed border-line-2 text-[12px] text-dim">Preview appears here</div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------ media ---- */

function MediaManager({ id }: { id: string }) {
  const { mediaByEvent, addFiles, addMediaUrl, removeMedia, updateCaption, setCover } = useMemories();
  const media = mediaByEvent[id] ?? [];
  const visual = media.filter((m) => m.kind !== "audio");
  const audio = media.filter((m) => m.kind === "audio");
  const coverId = visual.find((m) => m.kind === "photo")?.id;
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");

  const handle = async (files: FileList | File[]) => {
    setBusy(true);
    try {
      await addFiles(id, files);
    } finally {
      setBusy(false);
    }
  };
  const addUrl = async () => {
    const u = url.trim();
    if (!u) return;
    const kind = /\.(mp4|webm|mov)(\?|$)/i.test(u) ? "video" : /\.(mp3|wav|ogg|m4a)(\?|$)/i.test(u) ? "audio" : "photo";
    await addMediaUrl(id, u, kind);
    setUrl("");
  };

  return (
    <Section title={`Images, videos & voice notes · ${media.length}`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) handle(e.dataTransfer.files);
        }}
        onClick={() => input.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-8 text-center transition-colors ${drag ? "border-gold bg-gold/5" : "border-line-2 hover:border-mist/50 hover:bg-white/[0.015]"}`}
      >
        <IUpload size={20} className={busy ? "animate-pulse text-gold" : "text-mist"} />
        <div className="font-serif text-lg">{busy ? "Saving…" : "Drop photos, videos or voice notes"}</div>
        <div className="font-mono text-[9.5px] uppercase tracking-widest text-dim">or click to browse</div>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/*,video/*,audio/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handle(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <ILink size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="…or add an image / video / audio by link" className="field !py-2 !pl-10" />
        </div>
        <button onClick={addUrl} disabled={!url.trim()} className="btn btn-ghost !h-auto !px-4 !text-[12px]">
          Add
        </button>
      </div>

      {visual.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visual.map((m) => (
            <figure key={m.id} className="group overflow-hidden rounded-xl border border-line bg-white/[0.02]">
              <div className="relative">
                {m.kind === "photo" ? (
                  <img src={m.src} alt="" className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="relative">
                    <video src={m.src} className="aspect-square w-full object-cover" muted playsInline preload="metadata" />
                    <span className="absolute inset-0 flex items-center justify-center text-ivory">
                      <IPlay size={20} />
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2">
                  {m.id === coverId ? (
                    <span className="rounded-full bg-gold px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-night">Cover</span>
                  ) : m.kind === "photo" ? (
                    <button onClick={() => setCover(m.id)} className="rounded-full bg-black/60 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-ivory opacity-0 backdrop-blur transition-opacity hover:text-gold group-hover:opacity-100">
                      Make cover
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => confirm("Remove this from the gallery?") && removeMedia(m.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-ivory opacity-0 backdrop-blur transition-opacity hover:text-rose group-hover:opacity-100"
                    aria-label="Remove"
                  >
                    <ITrash size={12} />
                  </button>
                </div>
              </div>
              <input
                defaultValue={m.caption ?? ""}
                onBlur={(e) => e.target.value !== (m.caption ?? "") && updateCaption(m.id, e.target.value)}
                placeholder="Caption…"
                className="w-full bg-transparent px-3 py-2 font-serif text-[15px] italic text-ivory outline-none placeholder:text-dim"
              />
            </figure>
          ))}
        </div>
      )}

      {audio.length > 0 && (
        <div className="mt-5 space-y-2">
          {audio.map((m) => (
            <div key={m.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
              <IMusic size={15} className="shrink-0 text-gold" />
              <div className="min-w-0 flex-1">
                <input
                  defaultValue={m.caption ?? ""}
                  onBlur={(e) => e.target.value !== (m.caption ?? "") && updateCaption(m.id, e.target.value)}
                  placeholder={m.name || "Voice note title…"}
                  className="w-full bg-transparent font-serif text-[15px] italic text-ivory outline-none placeholder:text-dim"
                />
                <audio src={m.src} controls className="mt-1 h-9 w-full opacity-80" />
              </div>
              <button onClick={() => confirm("Remove this audio?") && removeMedia(m.id)} className="text-dim hover:text-rose" aria-label="Remove">
                <ITrash size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="mt-4 text-[11px] text-dim">The first photo is the cover on the memory page. Captions save when you click away.</p>
    </Section>
  );
}

/* ---------------------------------------------------------- settings --- */

function SettingsTab() {
  const { settings, updateSettings } = useMemories();
  const [his, setHis] = useState(settings.hisName);
  const [her, setHer] = useState(settings.herName);
  const [song, setSong] = useState(settings.ourSongUrl);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState("");
  const [passMsg, setPassMsg] = useState("");
  const songOk = !song.trim() || !!parseMusicLink(song);

  const saveGeneral = () => {
    if (!songOk) return;
    updateSettings({ hisName: his.trim() || "Me", herName: her.trim() || "Archu", ourSongUrl: song.trim() });
    setMsg("Saved ✓");
    window.setTimeout(() => setMsg(""), 1800);
  };
  const savePass = () => {
    if (pass.length < 4) return setPassMsg("Use at least 4 characters.");
    if (pass !== pass2) return setPassMsg("The two passcodes don't match.");
    updateSettings({ adminPass: pass });
    setPass("");
    setPass2("");
    setPassMsg("Passcode changed ✓");
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6 sm:p-10">
        <Section title="Names & our song" right={msg && <span className="font-mono text-[10px] uppercase tracking-widest text-gold">{msg}</span>}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name">
              <input value={his} onChange={(e) => setHis(e.target.value)} className="field" />
            </Field>
            <Field label="Her name">
              <input value={her} onChange={(e) => setHer(e.target.value)} className="field" />
            </Field>
            <Field label="“Our song” — the player in the corner" className="sm:col-span-2" hint={songOk ? "Spotify or YouTube link." : "Link not recognised."}>
              <input value={song} onChange={(e) => setSong(e.target.value)} className={`field ${songOk ? "" : "!border-rose/60"}`} />
            </Field>
          </div>
          <button onClick={saveGeneral} disabled={!songOk} className="btn btn-primary mt-5 !h-10">
            Save
          </button>
        </Section>

        <Section title="Sound">
          <label className="flex cursor-pointer items-center justify-between gap-4">
            <span className="text-[14px] leading-relaxed text-mist">Soft sound in the galaxy — a low pad, a chime on each star, a bell at the reunion. Off by default.</span>
            <input
              type="checkbox"
              checked={settings.sound}
              onChange={(e) => {
                updateSettings({ sound: e.target.checked });
                if (e.target.checked) galaxyAudio.enable();
                else galaxyAudio.disable();
              }}
              className="h-5 w-5 shrink-0 accent-[#d9b779]"
              aria-label="Galaxy sound"
            />
          </label>
        </Section>

        <Section title="Admin passcode">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New passcode">
              <input type="password" value={pass} onChange={(e) => { setPass(e.target.value); setPassMsg(""); }} className="field" />
            </Field>
            <Field label="Repeat">
              <input type="password" value={pass2} onChange={(e) => { setPass2(e.target.value); setPassMsg(""); }} className="field" />
            </Field>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button onClick={savePass} disabled={!pass} className="btn btn-ghost !h-10">
              Change passcode
            </button>
            {passMsg && <span className="text-[12px] text-mist">{passMsg}</span>}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-dim">
            The passcode keeps casual visitors out of the studio on this device. It is a lock, not real security — anyone with access to this browser's storage could bypass it.
          </p>
        </Section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ backup --- */

function BackupTab() {
  const { exportData, importData, events, allMedia } = useMemories();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const download = async (full: boolean) => {
    setBusy(full ? "full" : "light");
    try {
      const blob = await exportData(full);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `our-galaxy-${full ? "complete" : "text"}-${todayISO()}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } finally {
      setBusy(null);
    }
  };
  const onImport = async (f: File) => {
    if (!confirm("Importing replaces the current edits, songs and settings with the file's contents (photos in the file are added). Continue?")) return;
    setBusy("import");
    try {
      await importData(f);
      setMsg("Imported — reloading…");
      window.setTimeout(() => location.reload(), 700);
    } catch {
      setMsg("That file couldn't be read.");
      setBusy(null);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl p-6 sm:p-10">
        <Section title="Where your changes live">
          <p className="text-[14px] leading-relaxed text-mist">
            Everything you edit here — text, songs, photos, videos — is saved in <span className="text-ivory">this browser</span>. Visitors on other phones or computers won't see it
            automatically. To move it, export the <span className="text-ivory">complete backup</span> and import it on the other device.
          </p>
          <div className="mt-4 font-mono text-[10px] uppercase tracking-widest text-dim">
            {events.length} memories · {allMedia.length} media files
          </div>
        </Section>

        <Section title="Export">
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => download(true)} disabled={!!busy} className="rounded-2xl border border-gold/40 bg-gold/5 p-5 text-left transition-colors hover:bg-gold/10 disabled:opacity-50">
              <div className="font-serif text-xl text-gold">{busy === "full" ? "Preparing…" : "Complete backup"}</div>
              <div className="mt-1 text-[12px] text-mist">Text, songs, settings and every photo, video and voice note. Can be large.</div>
            </button>
            <button onClick={() => download(false)} disabled={!!busy} className="rounded-2xl border border-line-2 p-5 text-left transition-colors hover:bg-white/[0.03] disabled:opacity-50">
              <div className="font-serif text-xl">{busy === "light" ? "Preparing…" : "Text-only backup"}</div>
              <div className="mt-1 text-[12px] text-mist">Edits, added memories, songs and settings. Small and quick.</div>
            </button>
          </div>
        </Section>

        <Section title="Import">
          <label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line-2 p-6 text-[13px] text-mist transition-colors hover:border-mist/50 ${busy ? "pointer-events-none opacity-50" : ""}`}>
            <IUpload size={16} /> {busy === "import" ? "Importing…" : "Choose a backup file (.json)"}
            <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </label>
          {msg && <p className="mt-3 font-mono text-[10px] uppercase tracking-widest text-gold">{msg}</p>}
        </Section>
      </div>
    </div>
  );
}
