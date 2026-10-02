import { useState } from "react";
import type { Track } from "../data/canonicalTimeline";
import { embedForTrack, parseMusicLink } from "../lib/music";
import Sparkle from "./Sparkle";

type Props = {
  track?: Track | null;
  url?: string;
  title?: string;
  artist?: string;
  compact?: boolean;
  color?: string;
  className?: string;
};

/**
 * Click-to-load music. Renders a poster (title, artist, gold play sparkle);
 * the Spotify / YouTube iframe only exists in the DOM after a click.
 */
export default function MusicEmbed({ track, url, title, artist, compact = false, color = "#d9b779", className = "" }: Props) {
  const [loaded, setLoaded] = useState<string | null>(null);

  let resolved: { embed: string; provider: string; height: number } | null = null;
  if (track) resolved = embedForTrack(track);
  else if (url) {
    const p = parseMusicLink(url);
    if (p) resolved = { embed: p.embed, provider: p.provider, height: p.provider === "spotify" ? 152 : 200 };
  }
  if (!resolved) return null;

  const isSpotify = resolved.provider === "spotify";
  const h = compact ? (isSpotify ? 80 : 180) : resolved.height;
  const name = title || track?.title || "Our song";
  const by = artist ?? track?.artist ?? "";
  const providerName = isSpotify ? "Spotify" : resolved.provider === "youtube-music" ? "YouTube Music" : "YouTube";

  if (loaded === resolved.embed) {
    const src = isSpotify ? resolved.embed : `${resolved.embed}${resolved.embed.includes("?") ? "&" : "?"}autoplay=1`;
    return (
      <iframe
        title={`${name}${by ? ` — ${by}` : ""}`}
        src={src}
        width="100%"
        height={h}
        className={`block rounded-xl ${className}`}
        style={{ border: 0 }}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
      />
    );
  }

  const key = resolved.embed;
  return (
    <button
      type="button"
      onClick={() => setLoaded(key)}
      className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-xl border border-line-2 px-4 text-left transition-colors hover:border-ivory/30 ${className}`}
      style={{ height: h, background: `linear-gradient(120deg, ${color}2e, rgba(12,12,18,0.92) 58%)` }}
      aria-label={`Play ${name}${by ? ` by ${by}` : ""} — loads the ${providerName} player`}
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-black/40 text-gold transition-transform duration-300 group-hover:scale-105">
        <Sparkle size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-serif text-xl text-ivory">{name}</span>
        {by && <span className="block truncate text-[13px] text-mist">{by}</span>}
        {!compact && <span className="t-label mt-1 block">Tap to load {providerName}</span>}
      </span>
    </button>
  );
}
