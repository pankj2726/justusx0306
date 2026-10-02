import type { Provider, Track } from "../data/canonicalTimeline";

export type ParsedMusic =
  | { provider: "spotify"; type: string; id: string; embed: string; url: string }
  | { provider: "youtube" | "youtube-music"; id: string; embed: string; url: string }
  | null;

/** Accepts open.spotify.com links (incl. /intl-xx/), spotify: URIs, youtube / youtu.be / music.youtube links. */
export function parseMusicLink(input: string): ParsedMusic {
  const raw = input.trim();
  if (!raw) return null;

  // spotify:track:ID
  const uri = raw.match(/^spotify:(track|album|playlist|episode|show|artist):([A-Za-z0-9]+)/);
  if (uri) {
    const [, type, id] = uri;
    return {
      provider: "spotify",
      type,
      id,
      url: `https://open.spotify.com/${type}/${id}`,
      embed: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    };
  }

  const sp = raw.match(/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/i);
  if (sp) {
    const [, type, id] = sp;
    return {
      provider: "spotify",
      type,
      id,
      url: `https://open.spotify.com/${type}/${id}`,
      embed: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    };
  }

  const yt =
    raw.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/) ||
    null;
  if (yt) {
    const isMusic = /music\.youtube\.com/.test(raw);
    return {
      provider: isMusic ? "youtube-music" : "youtube",
      id: yt[1],
      url: raw,
      embed: `https://www.youtube.com/embed/${yt[1]}`,
    };
  }
  return null;
}

export function trackFromLink(link: string, title = "", artist = ""): Track | null {
  const p = parseMusicLink(link);
  if (!p) return null;
  const provider: Provider = p.provider;
  return {
    title: title || (p.provider === "spotify" ? "Our song" : "Our video song"),
    artist,
    provider,
    spotifyId: p.provider === "spotify" ? p.id : undefined,
    spotifyUrl: p.url,
    src: p.embed,
  };
}

export function embedForTrack(t?: Track): { embed: string; provider: Provider; height: number } | null {
  if (!t) return null;
  if (t.provider === "local") return null;
  if (t.spotifyUrl) {
    const p = parseMusicLink(t.spotifyUrl);
    if (p) {
      const isSpotify = p.provider === "spotify";
      const compact = isSpotify && (p as { type: string }).type === "track";
      return { embed: p.embed, provider: p.provider, height: isSpotify ? (compact ? 152 : 352) : 220 };
    }
  }
  if (t.spotifyId) {
    return { embed: `https://open.spotify.com/embed/track/${t.spotifyId}?theme=0`, provider: "spotify", height: 152 };
  }
  return null;
}
