import { useState } from "react";
import { parseMusicLink } from "../lib/music";
import MusicEmbed from "./MusicEmbed";
import { useMemories } from "../store/MemoryStore";
import { IClose, IMusic } from "./Icons";

export default function MusicDock() {
  const { settings, updateSettings, isAdmin } = useMemories();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [link, setLink] = useState(settings.ourSongUrl);
  const parsed = parseMusicLink(settings.ourSongUrl);
  const draft = parseMusicLink(link);

  return (
    <div className="fixed bottom-5 left-5 z-50">
      <div
        className={`absolute bottom-16 left-0 w-[min(90vw,360px)] origin-bottom-left transition-all duration-500 ${
          open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="panel !bg-night-2/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="label !text-gold">Our song</div>
              <div className="mt-1 font-serif text-lg italic text-mist">plays while you wander</div>
            </div>
            <button onClick={() => setOpen(false)} className="text-dim hover:text-ivory" aria-label="Minimise"><IClose size={16} /></button>
          </div>
          <div className="mt-4">
            {parsed ? <MusicEmbed url={settings.ourSongUrl} title="Our song" /> : <p className="text-sm text-rose">Add a Spotify link below.</p>}
          </div>
          {!isAdmin ? null : !edit ? (
            <button onClick={() => setEdit(true)} className="mt-4 font-mono text-[10px] uppercase tracking-widest text-dim hover:text-ivory">Change song</button>
          ) : (
            <div className="mt-4 space-y-2">
              <input value={link} onChange={(e) => setLink(e.target.value)} className="field" placeholder="https://open.spotify.com/track/…" />
              <div className="flex items-center gap-3">
                <button disabled={!draft} onClick={() => { updateSettings({ ourSongUrl: link.trim() }); setEdit(false); }} className="btn btn-primary !h-9 !text-xs">Save</button>
                <span className="font-mono text-[10px] uppercase tracking-widest text-dim">{link && (draft ? draft.provider : "Not recognised")}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => { setOpen((o) => !o); setLoaded(true); }}
        className="flex h-12 items-center gap-3 rounded-full border border-line-2 bg-night/80 pl-1.5 pr-5 backdrop-blur-xl transition-colors hover:border-mist/50"
        aria-label="Our song"
      >
        <span className={`relative flex h-9 w-9 items-center justify-center rounded-full ${loaded ? "spin-disc" : ""}`} style={{ background: "repeating-radial-gradient(circle, #111 0 2px, #1b1b22 2px 3px)" }}>
          <span className="h-3 w-3 rounded-full bg-gold" />
        </span>
        {loaded ? (
          <span className="eq flex h-3 items-end gap-[3px]">
            <span style={{ animationDelay: "0s" }} />
            <span style={{ animationDelay: ".2s" }} />
            <span style={{ animationDelay: ".4s" }} />
            <span style={{ animationDelay: ".1s" }} />
          </span>
        ) : (
          <IMusic size={14} className="text-gold" />
        )}
        <span className="label !text-[9.5px] !text-ivory">Our song</span>
      </button>
    </div>
  );
}
