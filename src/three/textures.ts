/* =========================================================================
   src/three/textures.ts
   Seed hashing + procedural canvas textures for the galaxy.
   Everything here is deterministic: same key → same pixels.
   ========================================================================= */

import * as THREE from "three";

/** 32-bit string hash (FNV-1a + murmur3 finaliser). */
export function seedFrom(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

function mulberry(key: string) {
  let a = seedFrom("TEX::" + key) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function finish(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Soft radial glow used for star halos, nebula veils and atmospheres. */
export function glowTexture(size = 128) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const h = size / 2;
  const grd = g.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.12, "rgba(255,255,255,0.85)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.22)");
  grd.addColorStop(0.7, "rgba(255,255,255,0.04)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c);
}

/** Tight dot for particles. */
export function dotTexture(size = 64) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const h = size / 2;
  const grd = g.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.35, "rgba(255,255,255,0.55)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c);
}

/** Hollow ring for shock-waves. */
export function ringSpriteTexture(size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  const h = size / 2;
  const grd = g.createRadialGradient(h, h, h * 0.7, h, h, h);
  grd.addColorStop(0, "rgba(255,255,255,0)");
  grd.addColorStop(0.55, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.7, "rgba(255,255,255,0.25)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return finish(c);
}

/** Banded gas/rock surface with warped bands, pole shading and storms. */
export function planetSurfaceTexture(base: string, accent: string, atmo: string, key: string) {
  const W = 512;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const rnd = mulberry("planet:" + key);

  const cb = new THREE.Color(base);
  const cc = new THREE.Color(accent);
  const ca = new THREE.Color(atmo);
  const dark = cb.clone().multiplyScalar(0.38);

  // smoothed row noise
  const raw = Array.from({ length: H }, () => rnd() * 2 - 1);
  const rowNoise = raw.map((_, i) => {
    let s = 0;
    for (let k = -3; k <= 3; k++) s += raw[Math.min(H - 1, Math.max(0, i + k))];
    return s / 7;
  });

  const f1 = 2 + rnd() * 4;
  const f2 = 8 + rnd() * 12;
  const ph1 = rnd() * 6.28;
  const ph2 = rnd() * 6.28;
  const w1 = 1 + Math.floor(rnd() * 3);
  const w2 = 3 + Math.floor(rnd() * 4);
  const a1 = 0.012 + rnd() * 0.02;
  const a2 = 0.006 + rnd() * 0.012;
  const p1 = rnd() * 6.28;
  const p2 = rnd() * 6.28;

  const img = g.createImageData(W, H);
  const tmp = new THREE.Color();
  for (let y = 0; y < H; y++) {
    const v = y / H;
    const pole = 0.55 + 0.45 * Math.sin(v * Math.PI);
    for (let x = 0; x < W; x++) {
      const u = x / W;
      const warp = Math.sin(u * Math.PI * 2 * w1 + p1) * a1 + Math.sin(u * Math.PI * 2 * w2 + p2 + v * 6) * a2;
      const vv = Math.min(0.999, Math.max(0, v + warp));
      const n = Math.sin(vv * f1 * Math.PI + ph1) * 0.55 + Math.sin(vv * f2 * Math.PI + ph2) * 0.3 + rowNoise[(vv * H) | 0] * 0.45;
      if (n < -0.3) tmp.copy(cb).lerp(dark, Math.min(1, (-n - 0.3) * 1.4));
      else if (n < 0.3) tmp.copy(cb).lerp(cc, (n + 0.3) / 0.6);
      else tmp.copy(cc).lerp(ca, Math.min(1, (n - 0.3) * 1.3));
      tmp.multiplyScalar(pole);
      const i = (y * W + x) * 4;
      img.data[i] = Math.min(255, tmp.r * 255);
      img.data[i + 1] = Math.min(255, tmp.g * 255);
      img.data[i + 2] = Math.min(255, tmp.b * 255);
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);

  // storms
  const storms = 4 + Math.floor(rnd() * 6);
  for (let s = 0; s < storms; s++) {
    const x = rnd() * W;
    const y = H * (0.2 + rnd() * 0.6);
    const r = 5 + rnd() * 18;
    const col = rnd() > 0.5 ? ca : dark;
    const grd = g.createRadialGradient(x, y, 0, x, y, r * 2);
    grd.addColorStop(0, `rgba(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0},0.55)`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(x, y, r * 2.4, r * 0.7, 0, 0, Math.PI * 2);
    g.fill();
  }

  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Radial ring band texture (u = inner → outer). */
export function ringBandTexture(color: string, key: string) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 4;
  const g = c.getContext("2d")!;
  const col = new THREE.Color(color);
  const rnd = mulberry("ring:" + key);
  const gaps = Array.from({ length: 4 }, () => rnd());
  for (let x = 0; x < 512; x++) {
    const u = x / 512;
    const edge = Math.pow(Math.sin(u * Math.PI), 0.6);
    let a = edge * (0.45 + rnd() * 0.55);
    for (const gp of gaps) if (Math.abs(u - gp) < 0.012) a *= 0.12;
    g.fillStyle = `rgba(${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0},${a})`;
    g.fillRect(x, 0, 1, 4);
  }
  return finish(c);
}
