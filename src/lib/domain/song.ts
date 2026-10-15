/**
 * "Our song": a link to a track on a music service. We never host audio; the
 * recipient listens through the service's own player (official embed) or opens
 * the link. Only well-known music services are accepted, so a gift can't be
 * used to send someone an arbitrary link.
 */
export type SongProvider = "spotify" | "apple" | "youtube" | "soundcloud" | "deezer" | "tidal";

export interface SongLink {
  provider: SongProvider;
  providerName: string;
  url: string;
  /** Official embeddable player URL, when the service offers one. */
  embedUrl: string | null;
}

const NAMES: Record<SongProvider, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  deezer: "Deezer",
  tidal: "TIDAL",
};

export function parseSongLink(raw: string): SongLink | null {
  const text = raw.trim();
  if (!text) return null;
  let u: URL;
  try {
    u = new URL(text);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const clean = `https://${u.hostname}${u.pathname}${u.search}`;

  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,40})/);
    if (!m) return null;
    return { provider: "spotify", providerName: NAMES.spotify, url: `https://open.spotify.com/${m[1]}/${m[2]}`, embedUrl: `https://open.spotify.com/embed/${m[1]}/${m[2]}` };
  }
  if (host === "music.apple.com") {
    return { provider: "apple", providerName: NAMES.apple, url: clean, embedUrl: `https://embed.music.apple.com${u.pathname}${u.search}` };
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? u.pathname.slice(1).split("/")[0] : u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : u.searchParams.get("v");
    if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
    return { provider: "youtube", providerName: NAMES.youtube, url: `https://www.youtube.com/watch?v=${id}`, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === "soundcloud.com" || host === "on.soundcloud.com") {
    return { provider: "soundcloud", providerName: NAMES.soundcloud, url: clean, embedUrl: host === "soundcloud.com" ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}` : null };
  }
  if (host === "deezer.com" || host === "link.deezer.com") return { provider: "deezer", providerName: NAMES.deezer, url: clean, embedUrl: null };
  if (host === "tidal.com" || host === "listen.tidal.com") return { provider: "tidal", providerName: NAMES.tidal, url: clean, embedUrl: null };
  return null;
}
