import type { GalaxyEvent, PlatePresentation, Track } from "../data/canonicalTimeline";

/* ----------------------------- IndexedDB media ---------------------------- */

export type MediaKind = "photo" | "video" | "audio";

export type MediaRecord = {
  id: string;
  eventId: string;
  kind: MediaKind;
  caption?: string;
  name: string;
  blob?: Blob;
  url?: string; // external link media
  createdAt: number;
  /** additive: 1600px WebP display copy + 480px thumbnail, generated on upload */
  display?: Blob;
  thumb?: Blob;
};

const DB_NAME = "love-galaxy-db";
const STORE = "media";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id" });
        s.createIndex("eventId", "eventId", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllMedia(): Promise<MediaRecord[]> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result as MediaRecord[]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function putMedia(rec: MediaRecord): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(rec);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteMedia(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function blobToDataURL(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

export async function dataURLToBlob(u: string): Promise<Blob> {
  const r = await fetch(u);
  return r.blob();
}

/** Display (1600px) + thumbnail (480px) copies for an uploaded photo. Originals are kept. */
export async function makeImageVariants(file: Blob): Promise<{ display?: Blob; thumb?: Blob }> {
  if (typeof createImageBitmap !== "function" || /gif|svg/i.test(file.type)) return {};
  const bmp = await createImageBitmap(file);
  const variant = (max: number, q: number) =>
    new Promise<Blob | undefined>((resolve) => {
      const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(bmp.width * s));
      c.height = Math.max(1, Math.round(bmp.height * s));
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(undefined);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, 0, 0, c.width, c.height);
      c.toBlob((b) => resolve(b ?? undefined), "image/webp", q);
    });
  const display = await variant(1600, 0.86);
  const thumb = await variant(480, 0.8);
  bmp.close();
  return { display, thumb };
}

/* ---------------------------- localStorage bits --------------------------- */

export type EventExtras = {
  music?: Track;
  presentation?: PlatePresentation;
  note?: string;
  favorite?: boolean;
};

/** Admin edits to an original (canonical) event. The canonical file itself is never modified. */
export type EventOverride = Partial<Pick<GalaxyEvent, "title" | "date" | "description" | "location" | "chapterId">>;

export type Settings = {
  ourSongUrl: string;
  herName: string;
  hisName: string;
  adminPass: string;
  /** additive: optional galaxy sound (off by default) */
  sound: boolean;
  /** additive: galaxy life (expansion) — all default on */
  expansionEnabled: boolean;
  showDiscoveries: boolean;
  ufoEnabled: boolean;
  fallingStarsEnabled: boolean;
};

const K_EXTRAS = "love-galaxy:extras";
const K_CUSTOM = "love-galaxy:custom-events";
const K_SETTINGS = "love-galaxy:settings";
const K_OVERRIDES = "love-galaxy:overrides";
const K_HIDDEN = "love-galaxy:hidden";

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, v: T) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* quota */
  }
}

export const loadExtras = () => read<Record<string, EventExtras>>(K_EXTRAS, {});
export const saveExtras = (v: Record<string, EventExtras>) => write(K_EXTRAS, v);

export const loadCustomEvents = () => read<GalaxyEvent[]>(K_CUSTOM, []);
export const saveCustomEvents = (v: GalaxyEvent[]) => write(K_CUSTOM, v);

export const loadOverrides = () => read<Record<string, EventOverride>>(K_OVERRIDES, {});
export const saveOverrides = (v: Record<string, EventOverride>) => write(K_OVERRIDES, v);

export const loadHidden = () => read<string[]>(K_HIDDEN, []);
export const saveHidden = (v: string[]) => write(K_HIDDEN, v);

export const DEFAULT_SETTINGS: Settings = {
  ourSongUrl: "https://open.spotify.com/track/1dGr1c8CrMLDpV6mPbImSI",
  herName: "Archu",
  hisName: "Me",
  adminPass: "0910",
  sound: false,
  expansionEnabled: true,
  showDiscoveries: true,
  ufoEnabled: true,
  fallingStarsEnabled: true,
};
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(K_SETTINGS, {}) });
export const saveSettings = (v: Settings) => write(K_SETTINGS, v);

export function uid(prefix = "m") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
