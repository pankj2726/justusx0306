import { useCallback, useEffect, useState } from "react";
import AdminPanel, { AdminGate } from "./components/AdminPanel";
import ChapterRail from "./components/ChapterRail";
import EventModal from "./components/EventModal";
import GalaxyMap from "./components/GalaxyMap";
import Hero from "./components/Hero";
import LoveLetter from "./components/LoveLetter";
import MusicDock from "./components/MusicDock";
import Nav from "./components/Nav";
import OnThisDay from "./components/OnThisDay";
import Scrapbook from "./components/Scrapbook";
import Starfield from "./components/Starfield";
import Stats from "./components/Stats";
import Timeline from "./components/Timeline";
import { useActiveChapter } from "./hooks/useActiveChapter";
import { MemoryProvider, useMemories } from "./store/MemoryStore";

const clearHash = () => history.replaceState(null, "", window.location.pathname + window.location.search);

function Shell() {
  const { isAdmin } = useMemories();
  const activeChapter = useActiveChapter();
  const [openId, setOpenId] = useState<string | null>(() => {
    const h = window.location.hash;
    return h.startsWith("#memory/") ? h.slice(8) : null;
  });
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminFocus, setAdminFocus] = useState<string | null>(null);
  const [gate, setGate] = useState(false);

  const open = useCallback((id: string) => {
    setOpenId(id);
    history.replaceState(null, "", `#memory/${id}`);
  }, []);
  const close = useCallback(() => {
    setOpenId(null);
    clearHash();
  }, []);

  /** Studio entry: admins go straight in, visitors see the passcode gate. */
  const openAdmin = useCallback(
    (focus?: string) => {
      setAdminFocus(focus ?? null);
      if (isAdmin) setAdminOpen(true);
      else setGate(true);
    },
    [isAdmin]
  );
  const editFromModal = useCallback(
    (id: string) => {
      setOpenId(null);
      clearHash();
      openAdmin(id);
    },
    [openAdmin]
  );

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash;
      if (h.startsWith("#memory/")) setOpenId(h.slice(8));
      if (h === "#admin") {
        clearHash();
        openAdmin();
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [openAdmin]);

  useEffect(() => {
    if (!isAdmin) setAdminOpen(false);
  }, [isAdmin]);

  return (
    <div className="relative min-h-screen">
      <a href="#timeline" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ivory focus:px-4 focus:py-2 focus:text-night">
        Skip to the story
      </a>
      <Starfield chapter={activeChapter} />
      <div data-app-bg>
        <Nav onAdmin={() => openAdmin()} />
      </div>
      <main data-app-bg>
        <Hero onAddEvent={() => openAdmin()} />
        <OnThisDay onOpen={open} />
        <GalaxyMap onOpen={open} />
        <Timeline onOpen={open} />
        <Scrapbook onOpen={open} />
        <Stats />
        <LoveLetter />
      </main>
      <div data-app-bg>
        <ChapterRail active={activeChapter} />
        <MusicDock />
      </div>
      <EventModal eventId={openId} onClose={close} onNavigate={open} onEdit={isAdmin ? editFromModal : undefined} />
      <AdminPanel
        open={adminOpen && isAdmin}
        focusId={adminFocus}
        onClose={() => setAdminOpen(false)}
        onPreview={(id) => {
          setAdminOpen(false);
          open(id);
        }}
      />
      <AdminGate
        open={gate && !isAdmin}
        onClose={() => setGate(false)}
        onUnlocked={() => {
          setGate(false);
          setAdminOpen(true);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <MemoryProvider>
      <Shell />
    </MemoryProvider>
  );
}
