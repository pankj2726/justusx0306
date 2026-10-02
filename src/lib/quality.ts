import type { QualityTier } from "../three/galaxyScene";

/** Rough GPU/CPU budget guess so phones stay smooth and desktops look rich. */
export function detectTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 4;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || window.innerWidth < 768;
  if (mobile) return cores >= 8 && mem >= 6 ? "medium" : "low";
  if (cores >= 8 && mem >= 8) return "high";
  if (cores >= 4) return "medium";
  return "low";
}

export const isMobileLayout = () => typeof window !== "undefined" && window.innerWidth < 768;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
