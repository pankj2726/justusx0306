import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EVENTS, type GalaxyEvent } from "../data/canonicalTimeline";
import {
  blobToDataURL,
  dataURLToBlob,
  makeImageVariants,
  deleteMedia,
  getAllMedia,
  loadCustomEvents,
  loadExtras,
  loadHidden,
  loadOverrides,
  loadSettings,
  putMedia,
  saveCustomEvents,
  saveExtras,
  saveHidden,
  saveOverrides,
  saveSettings,
  uid,
  type EventExtras,
  type EventOverride,
  type MediaKind,
  type MediaRecord,
  type Settings,
} from "../lib/storage";

export type MediaItem = MediaRecord & { src: string; thumbSrc: string };
export type StoreEvent = GalaxyEvent & { custom?: boolean; edited?: boolean; extras: EventExtras };

type Ctx = {
  /* read side (visitor + admin) */
  events: StoreEvent[];
  hiddenEvents: GalaxyEvent[];
  extras: Record<string, EventExtras>;
  settings: Settings;
  mediaByEvent: Record<string, MediaItem[]>;
  allMedia: MediaItem[];
  /* access */
  isAdmin: boolean;
  unlock: (pass: string) => boolean;
  lock: () => void;
  /* write side (admin) */
  setExtras: (eventId: string, patch: Partial<EventExtras>) => void;
  addFiles: (eventId: string, files: FileList | File[]) => Promise<void>;
  addMediaUrl: (eventId: string, url: string, kind: MediaKind, caption?: string) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  updateCaption: (id: string, caption: string) => Promise<void>;
  setCover: (id: string) => Promise<void>;
  addCustomEvent: (e: Omit<GalaxyEvent, "id" | "galaxyObjectId">) => GalaxyEvent;
  updateEvent: (id: string, patch: EventOverride) => void;
  deleteEvent: (id: string) => void;
  restoreEvent: (id: string) => void;
  resetEvent: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exportData: (includeMedia: boolean) => Promise<Blob>;
  importData: (file: File) => Promise<void>;
};

const MemoryCtx = createContext<Ctx | null>(null);
const K_ADMIN = "love-galaxy:admin-session";

function kindOf(file: File): MediaKind | null {
  if (file.type.startsWith("image/")) return "photo";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return null;
}

export function MemoryProvider({ children }: { children: ReactNode }) {
  const [extras, setExtrasState] = useState<Record<string, EventExtras>>(() => loadExtras());
  const [custom, setCustom] = useState<GalaxyEvent[]>(() => loadCustomEvents());
  const [overrides, setOverrides] = useState<Record<string, EventOverride>>(() => loadOverrides());
  const [hidden, setHidden] = useState<string[]>(() => loadHidden());
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return sessionStorage.getItem(K_ADMIN) === "1";
    } catch {
      return false;
    }
  });
  const urls = useRef<Map<string, string>>(new Map());

  const toItem = useCallback((r: MediaRecord): MediaItem => {
    const url = (key: string, b: Blob) => {
      let u = urls.current.get(key);
      if (!u) {
        u = URL.createObjectURL(b);
        urls.current.set(key, u);
      }
      return u;
    };
    let src = r.url ?? "";
    if (r.blob) src = url(r.id, r.display ?? r.blob);
    const thumbSrc = r.thumb ? url(`${r.id}:thumb`, r.thumb) : src;
    return { ...r, src, thumbSrc };
  }, []);

  useEffect(() => {
    getAllMedia().then((all) => setMedia(all.sort((a, b) => a.createdAt - b.createdAt).map(toItem)));
    const map = urls.current;
    return () => {
      map.forEach((u) => URL.revokeObjectURL(u));
      map.clear();
    };
  }, [toItem]);

  /* ---------------------------------------------------------- access -- */
  const unlock = useCallback(
    (pass: string) => {
      if (pass !== settings.adminPass) return false;
      setIsAdmin(true);
      try {
        sessionStorage.setItem(K_ADMIN, "1");
      } catch {
        /* private mode */
      }
      return true;
    },
    [settings.adminPass]
  );
  const lock = useCallback(() => {
    setIsAdmin(false);
    try {
      sessionStorage.removeItem(K_ADMIN);
    } catch {
      /* private mode */
    }
  }, []);

  /* ----------------------------------------------------------- extras -- */
  const setExtras = useCallback((eventId: string, patch: Partial<EventExtras>) => {
    setExtrasState((prev) => {
      const next = { ...prev, [eventId]: { ...prev[eventId], ...patch } };
      saveExtras(next);
      return next;
    });
  }, []);

  /* ------------------------------------------------------------ media -- */
  const addFiles = useCallback(
    async (eventId: string, files: FileList | File[]) => {
      const added: MediaItem[] = [];
      for (const f of Array.from(files)) {
        const kind = kindOf(f);
        if (!kind) continue;
        const variants = kind === "photo" ? await makeImageVariants(f).catch(() => ({})) : {};
        const rec: MediaRecord = { id: uid("m"), eventId, kind, name: f.name, blob: f, createdAt: Date.now(), ...variants };
        await putMedia(rec);
        added.push(toItem(rec));
      }
      setMedia((m) => [...m, ...added]);
    },
    [toItem]
  );

  const addMediaUrl = useCallback(
    async (eventId: string, url: string, kind: MediaKind, caption?: string) => {
      const rec: MediaRecord = { id: uid("m"), eventId, kind, name: url, url, caption, createdAt: Date.now() };
      await putMedia(rec);
      setMedia((m) => [...m, toItem(rec)]);
    },
    [toItem]
  );

  const removeMedia = useCallback(async (id: string) => {
    await deleteMedia(id);
    for (const key of [id, `${id}:thumb`]) {
      const u = urls.current.get(key);
      if (u) {
        URL.revokeObjectURL(u);
        urls.current.delete(key);
      }
    }
    setMedia((m) => m.filter((x) => x.id !== id));
  }, []);

  const strip = (item: MediaItem): MediaRecord => {
    const { src: _src, thumbSrc: _thumb, ...rec } = item;
    void _src;
    void _thumb;
    return rec;
  };

  const updateCaption = useCallback(
    async (id: string, caption: string) => {
      const item = media.find((m) => m.id === id);
      if (!item) return;
      await putMedia({ ...strip(item), caption });
      setMedia((m) => m.map((x) => (x.id === id ? { ...x, caption } : x)));
    },
    [media]
  );

  const setCover = useCallback(
    async (id: string) => {
      const item = media.find((m) => m.id === id);
      if (!item) return;
      const min = Math.min(...media.filter((m) => m.eventId === item.eventId).map((m) => m.createdAt));
      const createdAt = min - 1;
      await putMedia({ ...strip(item), createdAt });
      setMedia((m) => m.map((x) => (x.id === id ? { ...x, createdAt } : x)).sort((a, b) => a.createdAt - b.createdAt));
    },
    [media]
  );

  /* ----------------------------------------------------------- events -- */
  const customIds = useMemo(() => new Set(custom.map((c) => c.id)), [custom]);

  const addCustomEvent = useCallback((e: Omit<GalaxyEvent, "id" | "galaxyObjectId">) => {
    const suffix = Math.random().toString(36).slice(2, 6);
    const full: GalaxyEvent = { ...e, id: `event-${e.date}-c${suffix}`, galaxyObjectId: `memory-${e.date}-c${suffix}` };
    setCustom((prev) => {
      const next = [...prev, full];
      saveCustomEvents(next);
      return next;
    });
    return full;
  }, []);

  const updateEvent = useCallback(
    (id: string, patch: EventOverride) => {
      if (customIds.has(id)) {
        setCustom((prev) => {
          const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
          saveCustomEvents(next);
          return next;
        });
        return;
      }
      setOverrides((prev) => {
        const next = { ...prev, [id]: { ...prev[id], ...patch } };
        saveOverrides(next);
        return next;
      });
    },
    [customIds]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      if (customIds.has(id)) {
        setCustom((prev) => {
          const next = prev.filter((e) => e.id !== id);
          saveCustomEvents(next);
          return next;
        });
        return;
      }
      setHidden((prev) => {
        const next = prev.includes(id) ? prev : [...prev, id];
        saveHidden(next);
        return next;
      });
    },
    [customIds]
  );

  const restoreEvent = useCallback((id: string) => {
    setHidden((prev) => {
      const next = prev.filter((x) => x !== id);
      saveHidden(next);
      return next;
    });
  }, []);

  const resetEvent = useCallback((id: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      saveOverrides(next);
      return next;
    });
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  /* ----------------------------------------------------------- backup -- */
  const exportData = useCallback(
    async (includeMedia: boolean) => {
      const payload: Record<string, unknown> = {
        app: "our-little-galaxy",
        version: 2,
        exportedAt: new Date().toISOString(),
        settings,
        extras,
        customEvents: custom,
        overrides,
        hidden,
      };
      if (includeMedia) {
        const all = await getAllMedia();
        payload.media = await Promise.all(
          all.map(async (r) => ({
            id: r.id,
            eventId: r.eventId,
            kind: r.kind,
            caption: r.caption,
            name: r.name,
            createdAt: r.createdAt,
            url: r.url,
            data: r.blob ? await blobToDataURL(r.blob) : undefined,
          }))
        );
      }
      return new Blob([JSON.stringify(payload)], { type: "application/json" });
    },
    [settings, extras, custom, overrides, hidden]
  );

  const importData = useCallback(async (file: File) => {
    const data = JSON.parse(await file.text());
    if (data.extras) saveExtras(data.extras);
    if (data.customEvents) saveCustomEvents(data.customEvents);
    if (data.overrides) saveOverrides(data.overrides);
    if (data.hidden) saveHidden(data.hidden);
    if (data.settings) saveSettings({ ...loadSettings(), ...data.settings });
    if (Array.isArray(data.media)) {
      for (const m of data.media) {
        await putMedia({
          id: m.id ?? uid("m"),
          eventId: m.eventId,
          kind: m.kind,
          caption: m.caption,
          name: m.name ?? "",
          createdAt: m.createdAt ?? Date.now(),
          url: m.url,
          blob: m.data ? await dataURLToBlob(m.data) : undefined,
        });
      }
    }
  }, []);

  /* ------------------------------------------------------------ views -- */
  const events = useMemo(() => {
    const hid = new Set(hidden);
    const canon: StoreEvent[] = EVENTS.filter((e) => !hid.has(e.id)).map((e) => {
      const o = overrides[e.id];
      return { ...e, ...(o ?? {}), edited: !!o && Object.keys(o).length > 0, custom: false, extras: extras[e.id] ?? {} };
    });
    const added: StoreEvent[] = custom.map((e) => ({ ...e, custom: true, edited: false, extras: extras[e.id] ?? {} }));
    return [...canon, ...added].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }, [custom, extras, overrides, hidden]);

  const hiddenEvents = useMemo(() => EVENTS.filter((e) => hidden.includes(e.id)).map((e) => ({ ...e, ...(overrides[e.id] ?? {}) })), [hidden, overrides]);

  const mediaByEvent = useMemo(() => {
    const out: Record<string, MediaItem[]> = {};
    for (const m of media) (out[m.eventId] ||= []).push(m);
    return out;
  }, [media]);

  const value: Ctx = {
    events,
    hiddenEvents,
    extras,
    settings,
    mediaByEvent,
    allMedia: media,
    isAdmin,
    unlock,
    lock,
    setExtras,
    addFiles,
    addMediaUrl,
    removeMedia,
    updateCaption,
    setCover,
    addCustomEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    resetEvent,
    updateSettings,
    exportData,
    importData,
  };

  return <MemoryCtx.Provider value={value}>{children}</MemoryCtx.Provider>;
}

export function useMemories() {
  const c = useContext(MemoryCtx);
  if (!c) throw new Error("useMemories must be used within MemoryProvider");
  return c;
}
