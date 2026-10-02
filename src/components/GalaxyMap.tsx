import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CHAPTER_BY_ID, CHAPTERS, EVENTS, REUNION_EVENT, SILENCE_DAYS, SILENCE_END, SILENCE_OPENING_EVENT, parseISO, type ChapterId } from "../data/canonicalTimeline";
import { UI_COPY } from "../data/galaxyCopy";
import { galaxyAudio } from "../lib/audio";
import { ROMAN, splitTitle } from "../lib/format";
import { loadDiscoveries, loadWishes, newWish, saveDiscoveries, saveWishes, type Wish } from "../lib/galaxyLocal";
import { easeInOutSoft } from "../lib/motion";
import { detectTier, isMobileLayout, prefersReducedMotion } from "../lib/quality";
import { formatDate } from "../lib/time";
import { useMemories } from "../store/MemoryStore";
import { GalaxyScene, type Discoverable, type GalaxyLayout, type GalaxyState, type QualityTier, type SatInput, type StarMeta } from "../three/galaxyScene";
import { ISettings } from "./Icons";
import ChapterOverlay from "./observatory/ChapterOverlay";
import CoverGate from "./observatory/CoverGate";
import EventJourney from "./observatory/EventJourney";
import { DiscoveriesPanel, UfoToast, WishCard, WishesPanel } from "./observatory/GalaxyLife";
import Minimap from "./observatory/Minimap";
import ObservatoryRail from "./observatory/ObservatoryRail";
import SectionHeader from "./SectionHeader";

const STATE_LABEL: Record<GalaxyState, string> = {
  entrance: "Entrance",
  observatory: "Observatory",
  chapter: "World",
  journey: "Journey",
  reunion: "Reunion",
  silence: "The silence",
  present: "The present",
};

/** 0 → 588 days, eased over ~4s while the camera sits in the silence. */
function SilenceCounter({ active, reduced }: { active: boolean; reduced: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setN(SILENCE_DAYS);
      return () => setN(0);
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / 4000);
      setN(Math.round(easeInOutSoft(k) * SILENCE_DAYS));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      setN(0);
    };
  }, [active, reduced]);
  return (
    <div aria-hidden className={`pointer-events-none absolute bottom-28 left-1/2 z-10 -translate-x-1/2 text-center transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0"}`}>
      <div className="display text-7xl tabular-nums text-ivory sm:text-8xl">{n}</div>
      <div className="mt-2 font-serif text-xl italic text-[#8aa0c0]">days of silence</div>
    </div>
  );
}

type Panel = null | "discoveries" | "wishes" | "wish-card";

export default function GalaxyMap({ onOpen }: { onOpen: (id: string) => void }) {
  const { events, mediaByEvent, settings, updateSettings } = useMemories();

  const shellRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const hoverLayerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GalaxyScene | null>(null);

  const [entered, setEntered] = useState(false);
  const [state, setState] = useState<GalaxyState>("entrance");
  const [chapterId, setChapterId] = useState<ChapterId | null>(null);
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [eventIndex, setEventIndex] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [railOpen, setRailOpen] = useState(false);
  const [quality, setQuality] = useState<QualityTier>(() => detectTier());
  const [reduced, setReduced] = useState(() => prefersReducedMotion());
  const [timeline, setTimeline] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [layout, setLayout] = useState<GalaxyLayout | null>(null);
  const [isNarrow] = useState(() => isMobileLayout());

  /* galaxy life */
  const [discItems, setDiscItems] = useState<Discoverable[]>([]);
  const [found, setFound] = useState<string[]>(() => loadDiscoveries());
  const [wishes, setWishes] = useState<Wish[]>(() => loadWishes());
  const [panel, setPanel] = useState<Panel>(null);
  const [ufoEvent, setUfoEvent] = useState<string | null>(null);
  const [satCursor, setSatCursor] = useState<string | null>(null);
  const foundRef = useRef(found);
  const discRef = useRef(discItems);
  foundRef.current = found;
  discRef.current = discItems;

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    events.forEach((e) => (c[e.chapterId] = (c[e.chapterId] ?? 0) + 1));
    return c;
  }, [events]);

  const say = useCallback((text: string) => setAnnounce(text), []);

  /* ------------------------------------------------------- navigation -- */
  const openChapter = useCallback(
    (id: ChapterId) => {
      setJourneyOpen(false);
      setChapterId(id);
      setRailOpen(false);
      setSatCursor(null);
      sceneRef.current?.highlightSatellite(null);
      if (!events.some((e) => e.chapterId === id)) {
        setState("silence");
        sceneRef.current?.setState("silence");
      } else {
        setState("chapter");
        sceneRef.current?.setState("chapter", { chapterId: id });
      }
    },
    [events]
  );

  const openEvent = useCallback(
    (id: string, via?: "satellite") => {
      const i = events.findIndex((e) => e.id === id);
      if (i < 0) return;
      const ev = events[i];
      setEventIndex(i);
      setChapterId(null);
      setJourneyOpen(true);
      setSatCursor(null);
      sceneRef.current?.highlightSatellite(null);
      if (isNarrow) setRailOpen(false);
      const next: GalaxyState = ev.date === SILENCE_END ? "reunion" : "journey";
      setState(next);
      sceneRef.current?.setState(next, { eventId: ev.id, via });
      if (ev.date === SILENCE_END) {
        sceneRef.current?.pulseReunion();
        galaxyAudio.bell();
      }
    },
    [events, isNarrow]
  );

  const closeJourney = useCallback(() => {
    setJourneyOpen(false);
    setState("observatory");
    sceneRef.current?.setState("observatory");
  }, []);

  const goHome = useCallback(() => {
    setJourneyOpen(false);
    setChapterId(null);
    setState("observatory");
    sceneRef.current?.setState("observatory");
  }, []);

  const takeMeSomewhere = useCallback(() => {
    const i = Math.floor(Math.random() * events.length);
    openEvent(events[i].id);
    setNotice(`Cosmic discovery · ${events[i].title}`);
  }, [events, openEvent]);

  const goPresent = useCallback(() => {
    setJourneyOpen(false);
    setChapterId(null);
    setRailOpen(false);
    setState("present");
    sceneRef.current?.setState("present");
  }, []);

  const goSilence = useCallback((title?: string) => {
    setJourneyOpen(false);
    setChapterId(null);
    setRailOpen(false);
    setState("silence");
    sceneRef.current?.setState("silence");
    setNotice(title ?? "The Silence · 588 days of gravity");
  }, []);

  const enter = useCallback(() => {
    setEntered(true);
    setState("observatory");
    sceneRef.current?.setState("observatory");
    if (!isNarrow) setRailOpen(true);
  }, [isNarrow]);

  const handlers = useRef({ openChapter, openEvent, goSilence, say });
  handlers.current = { openChapter, openEvent, goSilence, say };

  /* ------------------------------------------------------ scene mount -- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: GalaxyScene;
    try {
      scene = new GalaxyScene(canvas, {
        tier: quality,
        reducedMotion: reduced,
        onPick: (info) => {
          const h = handlers.current;
          switch (info.kind) {
            case "chapter":
              h.openChapter(info.id as ChapterId);
              break;
            case "event": {
              const ch = events.find((e) => e.id === info.id)?.chapterId ?? EVENTS.find((e) => e.id === info.id)?.chapterId;
              galaxyAudio.chime((CHAPTER_BY_ID[ch ?? ""]?.index ?? 1) - 1);
              h.openEvent(info.id, info.via);
              break;
            }
            case "system":
              setNotice(`${info.title} — tap the pair to scatter them`);
              break;
            case "discovery": {
              // newly found ones are announced by onDiscover; re-tapping shows the name again
              if (foundRef.current.includes(info.id)) {
                const d = discRef.current.find((x) => x.id === info.id);
                if (d) setNotice(`${d.name} — ${d.line}`);
              }
              break;
            }
            case "ufo":
              break; // the scene beams; onUfoBeam offers the memory
            default:
              h.goSilence(info.title);
          }
        },
        onHover: () => undefined,
        onStateChange: (s) => setState(s),
        onAutoDowngrade: (next) => {
          setQuality(next);
          setNotice("Softened the sky for smoother motion");
        },
      });
    } catch (err) {
      console.warn("WebGL unavailable", err);
      setFailed(true);
      return;
    }
    sceneRef.current = scene;
    scene.setLabelLayer(labelRef.current);
    setLayout(scene.getLayout());
    scene.onDiscover = (id) => {
      setFound((f) => (f.includes(id) ? f : [...f, id]));
      const d = scene.getDiscoverables().find((x) => x.id === id);
      if (d) {
        setNotice(`${UI_COPY.discovered}: ${d.name} — ${d.line}`);
        handlers.current.say(`${UI_COPY.discovered}: ${d.name}`);
      }
    };
    scene.onWishCaught = () => setPanel("wish-card");
    scene.onUfoBeam = (id) => setUfoEvent(id);
    (window as unknown as Record<string, unknown>).__galaxyDebug = () => scene.getExpansionDebug();

    const hoverEl = labelRef.current?.lastElementChild;
    const hoverLayer = hoverLayerRef.current;
    if (hoverEl && hoverLayer) hoverLayer.appendChild(hoverEl);

    return () => {
      scene.dispose();
      sceneRef.current = null;
      if (hoverLayer) hoverLayer.innerHTML = "";
    };
    // mount once; navigation goes through sceneRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setQuality(quality);
    setDiscItems(sceneRef.current?.getDiscoverables() ?? []);
  }, [quality]);
  useEffect(() => {
    sceneRef.current?.setReducedMotion(reduced);
  }, [reduced]);
  useEffect(() => {
    sceneRef.current?.setTimeline(timeline >= 1 ? null : timeline);
  }, [timeline]);

  // favourites & media → star halos / satellites (visual only)
  const starMeta = useMemo(() => {
    const m: Record<string, StarMeta> = {};
    events.forEach((e) => {
      const media = mediaByEvent[e.id]?.length ?? 0;
      if (e.extras.favorite || media) m[e.id] = { favorite: !!e.extras.favorite, media };
    });
    return m;
  }, [events, mediaByEvent]);
  useEffect(() => {
    sceneRef.current?.setStarMeta(starMeta);
  }, [starMeta]);

  // event-matched satellites: one per memory (canonical + user-added)
  const satList = useMemo<SatInput[]>(
    () =>
      events.map((e) => ({
        id: e.id,
        chapterId: e.chapterId,
        date: e.date,
        title: e.title,
        favorite: !!e.extras.favorite,
        media: mediaByEvent[e.id]?.length ?? 0,
        special: e.id === REUNION_EVENT ? "reunion" : e.id === SILENCE_OPENING_EVENT ? "silence-open" : undefined,
      })),
    [events, mediaByEvent]
  );
  useEffect(() => {
    sceneRef.current?.setEventSatellites(satList);
  }, [satList]);

  // galaxy life settings
  useEffect(() => {
    sceneRef.current?.setExpansionEnabled(settings.expansionEnabled);
  }, [settings.expansionEnabled]);
  useEffect(() => {
    sceneRef.current?.setGalaxyLife({ ufo: settings.ufoEnabled, fallingStars: settings.fallingStarsEnabled, discoveries: settings.showDiscoveries });
    if (!settings.showDiscoveries && panel === "discoveries") setPanel(null);
  }, [settings.ufoEnabled, settings.fallingStarsEnabled, settings.showDiscoveries, panel]);
  const onLife = useCallback(
    (key: "expansion" | "ufo" | "falling" | "discoveries", value: boolean) => {
      const map = { expansion: "expansionEnabled", ufo: "ufoEnabled", falling: "fallingStarsEnabled", discoveries: "showDiscoveries" } as const;
      updateSettings({ [map[key]]: value });
    },
    [updateSettings]
  );

  // persistence
  useEffect(() => {
    saveDiscoveries(found);
    sceneRef.current?.setDiscoveries(found);
  }, [found]);
  useEffect(() => saveWishes(wishes), [wishes]);

  // sound
  const toggleSound = useCallback(
    (on: boolean) => {
      updateSettings({ sound: on });
      if (on) galaxyAudio.enable();
      else galaxyAudio.disable();
    },
    [updateSettings]
  );
  useEffect(() => {
    galaxyAudio.setMood(state === "silence" ? "silence" : "normal");
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!announce) return;
    const t = window.setTimeout(() => setAnnounce(""), 5000);
    return () => window.clearTimeout(t);
  }, [announce]);
  useEffect(() => {
    if (!ufoEvent) return;
    const t = window.setTimeout(() => setUfoEvent(null), 9000);
    return () => window.clearTimeout(t);
  }, [ufoEvent]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else shellRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const openFull = useCallback(
    (id: string) => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
      onOpen(id);
    },
    [onOpen]
  );

  const flyToDiscovery = useCallback((id: string) => {
    setPanel(null);
    setJourneyOpen(false);
    setChapterId(null);
    setState("observatory");
    sceneRef.current?.setState("observatory");
    sceneRef.current?.flyToDiscovery(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("[data-modal-open]")) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!entered) return;
      const r = shellRef.current?.getBoundingClientRect();
      const inView = !!r && r.bottom > 0 && r.top < window.innerHeight;
      if (e.key === "Escape") {
        if (journeyOpen) closeJourney();
        else if (chapterId) goHome();
        else setRailOpen(false);
      }
      // [ and ] step through this chapter's satellites; Enter opens the highlighted one
      if (chapterId && inView && (e.key === "[" || e.key === "]")) {
        const list = events.filter((x) => x.chapterId === chapterId);
        if (!list.length) return;
        e.preventDefault();
        const cur = list.findIndex((x) => x.id === satCursor);
        const next = e.key === "]" ? (cur + 1 + list.length) % list.length : (cur <= 0 ? list.length : cur) - 1;
        const ev = list[next];
        setSatCursor(ev.id);
        sceneRef.current?.highlightSatellite(ev.id);
        say(UI_COPY.satelliteOf(next + 1, list.length, splitTitle(ev.title).text));
      }
      if (chapterId && inView && e.key === "Enter" && satCursor) {
        e.preventDefault();
        openEvent(satCursor, "satellite");
      }
      if (journeyOpen && inView && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const j = e.key === "ArrowRight" ? eventIndex + 1 : eventIndex - 1;
        if (j >= 0 && j < events.length) openEvent(events[j].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entered, journeyOpen, chapterId, closeJourney, goHome, eventIndex, events, openEvent, satCursor, say]);

  const getFocus = useCallback(() => sceneRef.current?.getFocus() ?? null, []);

  /* ----------------------------------------------------------- derived -- */
  const activeEvent = events[eventIndex];
  const activeChapter = chapterId ? CHAPTER_BY_ID[chapterId] : null;
  const chapterEvents = chapterId ? events.filter((e) => e.chapterId === chapterId) : [];
  const ufoTitle = ufoEvent ? events.find((e) => e.id === ufoEvent)?.title ?? EVENTS.find((e) => e.id === ufoEvent)?.title ?? "" : "";
  const discoveredCount = discItems.filter((d) => found.includes(d.id)).length;

  const timelineLabel = useMemo(() => {
    if (timeline >= 1) return "The whole story";
    const d0 = parseISO(EVENTS[0].date);
    const d1 = parseISO(EVENTS[EVENTS.length - 1].date);
    return new Date(d0 + (d1 - d0) * timeline).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
  }, [timeline]);

  const crumb =
    state === "chapter" && activeChapter
      ? `World ${ROMAN[activeChapter.index]} · ${activeChapter.title} · ${chapterEvents.length} satellites`
      : (state === "journey" || state === "reunion") && activeEvent
      ? formatDate(activeEvent.date, { day: "2-digit", month: "short", year: "numeric" })
      : null;

  const liveText = !entered
    ? ""
    : state === "chapter" && activeChapter
    ? `Chapter ${ROMAN[activeChapter.index]}, ${activeChapter.title}. ${chapterEvents.length} satellites. Press ] and [ to step through them.`
    : (state === "journey" || state === "reunion") && activeEvent
    ? `${state === "reunion" ? "The reunion. " : ""}Memory: ${splitTitle(activeEvent.title).text}, ${formatDate(activeEvent.date)}`
    : state === "silence"
    ? `The silence, ${SILENCE_DAYS} days apart`
    : state === "present"
    ? "The present"
    : "Observatory, the whole galaxy";

  const panelOpen = panel !== null;

  return (
    <section id="galaxy" className="relative py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <SectionHeader eyebrow="The observatory" title={<>Our story, <span className="italic text-gold">in the stars</span></>}>
          A galaxy made entirely of sparkles, built from our own numbers. Every chapter world carries one satellite for each of its moments. Far out, other worlds keep
          quiet company — some ringed, some in love, one or two just passing through. The 588-day silence stays empty.
        </SectionHeader>
      </div>

      <div
        ref={shellRef}
        onPointerDown={() => settings.sound && galaxyAudio.enable()}
        className={`relative mt-14 w-full overflow-hidden bg-[#020207] ${fullscreen ? "h-screen" : "h-[92svh] min-h-[560px] border-y border-line"}`}
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" aria-label="Interactive galaxy of our memories" role="img" />
        <div ref={labelRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
        <div ref={hoverLayerRef} className="pointer-events-none fixed inset-0 z-[15]" />
        <div className="sr-only" aria-live="polite">
          {announce || liveText}
        </div>

        <SilenceCounter active={entered && state === "silence"} reduced={reduced} />

        <div className={`absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-3 py-3 transition-opacity duration-700 sm:px-5 sm:py-4 ${entered ? "opacity-100" : "pointer-events-none opacity-0"}`}>
          <div className="flex min-w-0 items-center gap-3">
            <button onClick={() => setRailOpen((o) => !o)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-2 bg-night/60 text-mist backdrop-blur hover:text-ivory lg:hidden" aria-label="Open observatory controls">
              <ISettings size={15} />
            </button>
            <div className="min-w-0">
              <div className="t-label !text-gold">{STATE_LABEL[state]}</div>
              {crumb && <div className="truncate font-serif text-sm italic text-mist">{crumb}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="t-label hidden xl:inline">tap a world · a satellite · a golden falling star</span>
            <button onClick={toggleFullscreen} className="flex h-11 items-center gap-2 rounded-full border border-line-2 bg-night/60 px-3 text-[12px] text-mist backdrop-blur hover:text-ivory" aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                {fullscreen ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
              </svg>
              <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
            </button>
          </div>
        </div>

        {entered && (
          <ObservatoryRail
            open={railOpen}
            onClose={() => setRailOpen(false)}
            counts={counts}
            activeChapter={chapterId}
            onChapter={openChapter}
            onRandom={takeMeSomewhere}
            onSilence={() => goSilence()}
            onPresent={goPresent}
            onHome={goHome}
            timeline={timeline}
            onTimeline={setTimeline}
            timelineLabel={timelineLabel}
            quality={quality}
            onQuality={setQuality}
            reduced={reduced}
            onReduced={setReduced}
            sound={settings.sound}
            onSound={toggleSound}
            life={{ expansion: settings.expansionEnabled, ufo: settings.ufoEnabled, falling: settings.fallingStarsEnabled, discoveries: settings.showDiscoveries }}
            onLife={onLife}
            discoveryCount={{ found: discoveredCount, total: discItems.length }}
            onOpenDiscoveries={() => {
              setRailOpen(false);
              setPanel("discoveries");
            }}
            wishCount={wishes.length}
            onOpenWishes={() => {
              setRailOpen(false);
              setPanel("wishes");
            }}
          />
        )}

        <Minimap layout={layout} getFocus={getFocus} onChapter={openChapter} hidden={!entered || panelOpen || (isNarrow && (journeyOpen || !!chapterId || railOpen))} />

        <ChapterOverlay
          chapter={activeChapter}
          events={chapterEvents}
          onClose={goHome}
          onEvent={(id) => openEvent(id, "satellite")}
          onRead={(id) => {
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
            document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />

        <EventJourney
          open={journeyOpen}
          event={activeEvent}
          index={eventIndex}
          total={events.length}
          media={activeEvent ? mediaByEvent[activeEvent.id] ?? [] : []}
          onPrev={() => eventIndex > 0 && openEvent(events[eventIndex - 1].id)}
          onNext={() => eventIndex < events.length - 1 && openEvent(events[eventIndex + 1].id)}
          onClose={closeJourney}
          onOpenFull={openFull}
        />

        {ufoEvent && entered && (
          <UfoToast
            title={splitTitle(ufoTitle).text}
            onOpen={() => {
              const id = ufoEvent;
              setUfoEvent(null);
              openEvent(id);
            }}
            onDismiss={() => setUfoEvent(null)}
          />
        )}

        <DiscoveriesPanel open={panel === "discoveries" && settings.showDiscoveries} onClose={() => setPanel(null)} items={discItems} found={found} onFly={flyToDiscovery} />
        <WishCard
          open={panel === "wish-card"}
          onClose={() => setPanel(null)}
          onSave={(text) => {
            setWishes((w) => [...w, newWish(text)]);
            setPanel(null);
            setNotice("Your wish is kept — on this device only.");
          }}
        />
        <WishesPanel
          open={panel === "wishes"}
          onClose={() => setPanel(null)}
          wishes={wishes}
          onDelete={(id) => setWishes((w) => w.filter((x) => x.id !== id))}
          onAdd={(text) => setWishes((w) => [...w, newWish(text)])}
        />

        <div className={`pointer-events-none absolute left-1/2 top-16 z-30 -translate-x-1/2 transition-all duration-500 sm:top-20 ${notice ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`} role="status">
          <div className="max-w-[92vw] truncate rounded-full border border-line-2 bg-night/80 px-4 py-2 font-serif text-[15px] italic text-ivory backdrop-blur-xl">{notice}</div>
        </div>

        {!failed && <CoverGate entered={entered} onEnter={enter} his={settings.hisName} her={settings.herName} moments={events.length} chapters={CHAPTERS.length} />}

        {failed && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="font-serif text-2xl italic text-mist">This browser couldn't start the 3D observatory.</p>
            <a href="#timeline" className="btn btn-ghost">
              Read the chronicle instead
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
