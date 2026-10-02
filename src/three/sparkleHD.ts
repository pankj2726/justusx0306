/* =========================================================================
   src/three/sparkleHD.ts — THE ONE ELEMENT, sharper, in its ORIGINAL colours.

   Colour pipeline is the original galaxyScene v3 one:
     · the sparkle is the original four-point bitmap design, drawn at 512px
       with mip-maps + anisotropy
     · fragment colour = vColor * tex.rgb, alpha = tex.a * vAlpha * uOpacity
     · no tone-mapping, no colour-space conversion, no bloom

   UPGRADE UNIFORMS (all default to NEUTRAL, so with defaults the output is
   byte-identical to before):
     uTw2        two-frequency twinkle mix           default 0
     uFlare      rare deterministic per-star flare   default 0
     uBreathAmp  global breathing amplitude          default 0
     uRotAmp     seeded per-point spike rotation     default 0   (per-point attitude from aPhase)
     uSpin       slow spike spin (rad/s)             default 0
     uDrift      bounded positional wobble           default 0
     uDesat      mix toward uDesatColor (silence)    default 0
     uDim        global alpha multiplier             default 1
     uProx       pointer-proximity brighten + lean   default 0
   EXPANSION UNIFORMS (also neutral by default):
     uBlink      per-point light blink (UFO lights)  default 0
     uBlinkRate  blink speed                         default 2.2
     uBeat       per-batch heartbeat size offset     default 0
     uReveal     per-batch fade (expansion scenery)  default 1
   Per-point rotation deliberately reuses aPhase instead of a new attribute:
   a shader attribute that some geometries lack would read a stale generic
   vertex value in WebGL and could change the look of the existing world.
   ========================================================================= */

import * as THREE from "three";

export type SparkUniforms = {
  uTime: { value: number };
  uTwinkle: { value: number };
  uOpacity: { value: number };
  uScale: { value: number };
  uMaxSize: { value: number };
  uMinPx: { value: number };
  uMap: { value: THREE.Texture };
  uTw2: { value: number };
  uFlare: { value: number };
  uBreathAmp: { value: number };
  uBreathPeriod: { value: number };
  uRotAmp: { value: number };
  uSpin: { value: number };
  uDrift: { value: number };
  uDesat: { value: number };
  uDesatColor: { value: THREE.Color };
  uDim: { value: number };
  uPointer: { value: THREE.Vector2 };
  uProx: { value: number };
  uProxRadius: { value: number };
  uViewport: { value: THREE.Vector2 };
  uBlink: { value: number };
  uBlinkRate: { value: number };
  uBeat: { value: number };
  uReveal: { value: number };
};

export type HDTier = "high" | "medium" | "low";

/** The original sparkle, proportion-for-proportion, drawn at 512px. */
export function sparkTextureHD(size = 512): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const h = size / 2;
  const g = ctx.createRadialGradient(h, h, 0, h, h, size * 0.16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const spike = (len: number, w: number, rot: number) => {
    ctx.save();
    ctx.translate(h, h);
    ctx.rotate(rot);
    const lg = ctx.createLinearGradient(-len, 0, len, 0);
    lg.addColorStop(0, "rgba(255,255,255,0)");
    lg.addColorStop(0.5, "rgba(255,255,255,0.95)");
    lg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.strokeStyle = lg;
    ctx.lineWidth = w;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-len, 0);
    ctx.lineTo(len, 0);
    ctx.stroke();
    ctx.restore();
  };
  spike(size * 0.5, size * 0.045, 0);
  spike(size * 0.5, size * 0.045, Math.PI / 2);
  spike(size * 0.22, size * 0.03, Math.PI / 4);
  spike(size * 0.22, size * 0.03, -Math.PI / 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

const VERT = /* glsl */ `
  attribute float aSize;
  attribute float aPhase;
  attribute float aSpeed;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uTime;
  uniform float uTwinkle;
  uniform float uScale;
  uniform float uMaxSize;
  uniform float uMinPx;
  uniform float uTw2;
  uniform float uFlare;
  uniform float uBreathAmp;
  uniform float uBreathPeriod;
  uniform float uRotAmp;
  uniform float uSpin;
  uniform float uDrift;
  uniform float uProx;
  uniform float uProxRadius;
  uniform vec2 uPointer;
  uniform vec2 uViewport;
  uniform float uBlink;
  uniform float uBlinkRate;
  uniform float uBeat;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRot;
  void main() {
    vColor = aColor;
    float tw1 = 0.8 + 0.2 * sin(uTime * aSpeed + aPhase);
    float tw2 = 0.8 + 0.12 * sin(uTime * aSpeed + aPhase) + 0.08 * sin(uTime * aSpeed * 2.37 + aPhase * 1.7);
    float tw = mix(tw1, tw2, uTw2);
    tw = mix(1.0, tw, uTwinkle);
    float flare = 0.0;
    if (uFlare > 0.0) {
      float period = 30.0 + 60.0 * fract(aPhase * 7.13);
      float local = mod(uTime + aPhase * 37.0, period);
      flare = uFlare * smoothstep(0.0, 0.08, local) * (1.0 - smoothstep(0.22, 0.4, local));
    }
    float breath = 1.0 - uBreathAmp * (0.5 + 0.5 * sin(uTime * 6.2831853 / uBreathPeriod + aPhase));
    vAlpha = aAlpha * tw * breath * (1.0 + 0.35 * flare);
    if (uBlink > 0.0) {
      float bl = 0.5 + 0.5 * sin(uTime * uBlinkRate + aPhase * 5.0);
      vAlpha *= mix(1.0, 0.15 + 0.85 * smoothstep(0.35, 0.65, bl), uBlink);
    }
    float sizeK = (1.0 + 0.6 * flare) * (1.0 - 0.5 * (1.0 - breath)) * (1.0 + uBeat);
    vRot = (fract(aPhase * 0.1591549) - 0.5) * 2.0 * uRotAmp + uSpin * uTime * (0.5 + fract(aPhase * 3.7));
    vec3 p = position;
    if (uDrift > 0.0) {
      p += vec3(sin(uTime * 0.11 + aPhase * 3.1), 0.35 * cos(uTime * 0.09 + aPhase * 2.3), cos(uTime * 0.1 + aPhase * 1.7)) * uDrift;
    }
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min(max(aSize * sizeK * (0.82 + 0.18 * tw) * uScale / -mv.z, uMinPx), uMaxSize);
    gl_Position = projectionMatrix * mv;
    if (uProx > 0.0 && gl_Position.w > 0.0) {
      vec2 ndc = gl_Position.xy / gl_Position.w;
      vec2 dpx = (uPointer - ndc) * 0.5 * uViewport;
      float dist = length(dpx);
      float near = uProx * (1.0 - smoothstep(0.0, uProxRadius, dist));
      if (near > 0.0 && dist > 0.5) {
        gl_Position.xy += (dpx / dist) * (3.0 * near) / (0.5 * uViewport) * gl_Position.w;
        vAlpha *= 1.0 + 0.25 * near;
      }
    }
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uDesat;
  uniform float uDim;
  uniform float uReveal;
  uniform vec3 uDesatColor;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRot;
  void main() {
    vec2 uv = gl_PointCoord;
    if (vRot != 0.0) {
      vec2 c = uv - 0.5;
      float cs = cos(vRot);
      float sn = sin(vRot);
      uv = vec2(cs * c.x - sn * c.y, sn * c.x + cs * c.y) + 0.5;
    }
    vec4 tex = texture2D(uMap, uv);
    float a = tex.a * vAlpha * uOpacity * uDim * uReveal;
    if (a < 0.004) discard;
    vec3 col = vColor * tex.rgb;
    if (uDesat > 0.0) {
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col, uDesatColor * (0.35 + 0.65 * l), uDesat);
    }
    gl_FragColor = vec4(col, a);
  }
`;

export function sparkMaterial(twinkle: number, map: THREE.Texture): { mat: THREE.ShaderMaterial; u: SparkUniforms } {
  const u: SparkUniforms = {
    uTime: { value: 0 },
    uTwinkle: { value: twinkle },
    uOpacity: { value: 1 },
    uScale: { value: 600 },
    uMaxSize: { value: 110 },
    uMinPx: { value: 0.6 },
    uMap: { value: map },
    uTw2: { value: 0 },
    uFlare: { value: 0 },
    uBreathAmp: { value: 0 },
    uBreathPeriod: { value: 14 },
    uRotAmp: { value: 0 },
    uSpin: { value: 0 },
    uDrift: { value: 0 },
    uDesat: { value: 0 },
    uDesatColor: { value: new THREE.Color(0x8aa0c0) },
    uDim: { value: 1 },
    uPointer: { value: new THREE.Vector2(-10, -10) },
    uProx: { value: 0 },
    uProxRadius: { value: 90 },
    uViewport: { value: new THREE.Vector2(1, 1) },
    uBlink: { value: 0 },
    uBlinkRate: { value: 2.2 },
    uBeat: { value: 0 },
    uReveal: { value: 1 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms: u as unknown as Record<string, THREE.IUniform>,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: VERT,
    fragmentShader: FRAG,
  });
  return { mat, u };
}

/** Device's largest drawable point. */
export function maxPointSize(renderer: THREE.WebGLRenderer): number {
  const gl = renderer.getContext();
  const r = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | number[] | null;
  return r && r[1] ? Number(r[1]) : 64;
}

/** The pixel ratio the original scene used on this device. */
export function originalPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, 2);
}

/**
 * Keep every sparkle at its ORIGINAL on-screen footprint while rendering at a
 * higher (supersampled) resolution; also feeds viewport + proximity radius.
 */
export function tuneSparkles(materials: { u: SparkUniforms }[], renderer: THREE.WebGLRenderer, heightCss: number, fovDeg: number, proxPx = 90) {
  const pr = renderer.getPixelRatio();
  const k = pr / originalPixelRatio();
  const scale = (heightCss * pr) / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)));
  const maxPt = Math.min(maxPointSize(renderer), 110 * k);
  const buf = renderer.getDrawingBufferSize(new THREE.Vector2());
  for (const { u } of materials) {
    u.uScale.value = scale;
    u.uMaxSize.value = maxPt;
    u.uMinPx.value = 0.6 * k;
    u.uViewport.value.copy(buf);
    u.uProxRadius.value = proxPx * pr;
  }
}

/** Render resolution per tier. High supersamples even on 1× screens. */
export function hdPixelRatio(tier: HDTier): number {
  const dpr = window.devicePixelRatio || 1;
  if (tier === "high") return Math.min(Math.max(dpr, 1.5), 2);
  if (tier === "medium") return Math.min(dpr, 2);
  return 1;
}

/** Seeded uniform direction on the unit sphere (so planets are identical on every load). */
export function seededDir(rnd: () => number, out = new THREE.Vector3()): THREE.Vector3 {
  const u = rnd() * 2 - 1;
  const th = rnd() * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return out.set(s * Math.cos(th), u, s * Math.sin(th));
}

export type SparkSink = {
  push: (p: THREE.Vector3, c: THREE.Color, size: number, alpha: number, rnd: () => number) => void;
};

/**
 * Planet body — the ORIGINAL v3 recipe (glitter shell · rim heroes · halo mass).
 * Optional extras (all omitted = byte-identical to before, same rng order):
 *   rim / rimStrength   seeded atmosphere rim
 *   bands               latitude colour bands (storm, garden…)
 *   bandMix             how strongly bands tint the shell (default 0.6)
 *   vortex              a dense swirl patch (storm eye)
 *   alpha               global alpha multiplier (ghost worlds)
 */
export function buildPlanetShell(
  sink: SparkSink,
  o: {
    id: string;
    radius: number;
    base: THREE.Color;
    atmo: THREE.Color;
    white: THREE.Color;
    events: number;
    M: number;
    rng: (key: string) => () => number;
    rim?: number;
    rimStrength?: number;
    bands?: THREE.Color[];
    bandMix?: number;
    vortex?: { lat: number; lon: number; count: number; color: THREE.Color };
    alpha?: number;
  }
) {
  const { id, radius, base, atmo, white, events, M, rng } = o;
  const A = o.alpha ?? 1;
  const bands = o.bands && o.bands.length ? o.bands : null;
  const bandMix = o.bandMix ?? 0.6;
  const rr = rng("shell-" + id);
  const shellN = Math.round((520 + events * 150) * M);
  for (let i = 0; i < shellN; i++) {
    const v = seededDir(rr).multiplyScalar(radius * (1.0 + rr() * 0.05));
    const c = base.clone().lerp(atmo, 0.25 + rr() * 0.65);
    if (bands) {
      const lat = Math.max(-1, Math.min(1, v.y / radius));
      c.lerp(bands[Math.min(bands.length - 1, Math.floor((lat + 1) * 0.5 * bands.length))], bandMix);
    }
    sink.push(v, rr() < 0.08 ? white : c, 0.7 + rr() * 0.9, (0.55 + rr() * 0.45) * A, rr);
  }
  for (let i = 0; i < 18; i++) {
    const v = seededDir(rr).multiplyScalar(radius * 1.02);
    sink.push(v, atmo.clone().lerp(white, 0.5), 1.6 + rr() * 1.0, 0.95 * A, rr);
  }
  for (let i = 0; i < Math.round(46 * M); i++) {
    const v = seededDir(rr).multiplyScalar(radius * (1.15 + rr() * 1.5));
    sink.push(v, atmo.clone(), 3.0 + rr() * 3.4, (0.05 + rr() * 0.07) * A, rr);
  }
  const rim = o.rim ?? o.rimStrength ?? 0;
  if (rim > 0) {
    const rr2 = rng("rim-" + id);
    const n = Math.round(260 * M * rim);
    const rimCol = atmo.clone().lerp(white, 0.35);
    for (let i = 0; i < n; i++) {
      const v = seededDir(rr2).multiplyScalar(radius * (1.03 + rr2() * 0.05));
      sink.push(v, rimCol, 0.45 + rr2() * 0.35, (0.5 + rr2() * 0.35) * A, rr2);
    }
  }
  if (o.vortex && o.vortex.count > 0) {
    const vr = rng("vortex-" + id);
    const { lat, lon, count, color } = o.vortex;
    const cy = Math.sin(lat);
    const cr = Math.cos(lat);
    const centre = new THREE.Vector3(Math.cos(lon) * cr, cy, Math.sin(lon) * cr);
    const east = new THREE.Vector3(-Math.sin(lon), 0, Math.cos(lon));
    const north = new THREE.Vector3().crossVectors(centre, east).normalize();
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const f = i / count;
      const ang = f * Math.PI * 6 + vr() * 0.4;
      const rad = 0.05 + f * 0.28;
      p.copy(centre)
        .addScaledVector(east, Math.cos(ang) * rad)
        .addScaledVector(north, Math.sin(ang) * rad * 0.7)
        .normalize()
        .multiplyScalar(radius * 1.012);
      sink.push(p, color.clone().lerp(white, (1 - f) * 0.4), 0.5 + vr() * 0.5, (0.6 + (1 - f) * 0.35) * A, vr);
    }
  }
}
