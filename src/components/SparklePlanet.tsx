import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CHAPTER_BY_ID, type ChapterId } from "../data/canonicalTimeline";
import { getPlanetStudio, type CoverFit } from "../three/sparklePlanet";
import Planet from "./Planet";

type Props = {
  chapterId: ChapterId;
  /** CSS size in px (square). Omit and size it with className instead. */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** "planet" frames shell + ring; "system" also keeps every moon orbit in frame. */
  fit?: CoverFit;
  zoom?: number;
  spin?: boolean;
  /** extra azimuth offset (radians) to vary the angle between covers */
  phase?: number;
  /** soft radial fade at the canvas edge so orbiting moons never hard-clip */
  mask?: boolean;
};

/** The galaxy's own sparkle planet for a chapter, used as a cover image. */
export default function SparklePlanet({ chapterId, size, className = "", style, fit = "planet", zoom = 1, spin = true, phase = 0, mask = true }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const studio = getPlanetStudio();
    if (!studio) {
      setFallback(true);
      return;
    }
    const entry = studio.register({ canvas, chapterId, fit, zoom, spin, phase });
    if (!entry) {
      setFallback(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => (entry.visible = e.isIntersecting), { rootMargin: "120px" });
    io.observe(canvas);
    return () => {
      io.disconnect();
      studio.unregister(entry);
    };
  }, [chapterId, fit, zoom, spin, phase]);

  const dims: CSSProperties = size ? { width: size, height: size } : {};

  if (fallback) {
    const c = CHAPTER_BY_ID[chapterId];
    return (
      <span className={`inline-block ${className}`} style={{ ...dims, ...style }}>
        <Planet size={size ?? 120} base={c.visual.base} atmosphere={c.visual.atmosphere} ring={c.visual.ring} moons={c.visual.moons} glow={c.visual.glow} />
      </span>
    );
  }

  const maskCss = mask ? "radial-gradient(circle at 50% 50%, #000 56%, transparent 71%)" : undefined;
  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block ${className}`}
      style={{ ...dims, maskImage: maskCss, WebkitMaskImage: maskCss, ...style }}
    />
  );
}
