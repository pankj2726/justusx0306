/* =========================================================================
   src/lib/audio.ts — a tiny WebAudio synth (no audio files, single-file safe).
   Off by default; only ever starts after a user gesture.
     · pad    — low, soft; thins and darkens in the silence
     · chime  — on picking a memory (pitch by chapter)
     · bell   — at the reunion
   ========================================================================= */

type Mood = "normal" | "silence";

class GalaxyAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private oscs: OscillatorNode[] = [];
  private on = false;
  private mood: Mood = "normal";

  get enabled() {
    return this.on;
  }

  enable() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    }
    void this.ctx.resume();
    if (this.on) return;
    this.on = true;
    this.startPad();
  }

  disable() {
    if (!this.ctx || !this.on) return;
    this.on = false;
    const t = this.ctx.currentTime;
    this.padGain?.gain.cancelScheduledValues(t);
    this.padGain?.gain.setTargetAtTime(0, t, 0.3);
    const oscs = this.oscs;
    this.oscs = [];
    window.setTimeout(() => {
      oscs.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
    }, 1600);
  }

  private startPad() {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = this.mood === "silence" ? 360 : 1100;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    filter.connect(gain).connect(master);
    [110, 164.81, 220.5].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "sine" : "triangle";
      o.frequency.value = f;
      o.detune.value = (i - 1) * 6;
      o.connect(filter);
      o.start();
      this.oscs.push(o);
    });
    gain.gain.setTargetAtTime(this.mood === "silence" ? 0.016 : 0.03, ctx.currentTime, 1.2);
    this.padFilter = filter;
    this.padGain = gain;
  }

  setMood(m: Mood) {
    this.mood = m;
    if (!this.ctx || !this.on || !this.padFilter || !this.padGain) return;
    const t = this.ctx.currentTime;
    this.padFilter.frequency.setTargetAtTime(m === "silence" ? 360 : 1100, t, 1.5);
    this.padGain.gain.setTargetAtTime(m === "silence" ? 0.016 : 0.03, t, 1.5);
  }

  private tone(freq: number, dur: number, gain: number, delay = 0) {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  chime(step = 0) {
    if (!this.on) return;
    const scale = [0, 2, 4, 7, 9, 12, 14];
    const f = 659.25 * Math.pow(2, scale[((step % scale.length) + scale.length) % scale.length] / 12);
    this.tone(f, 1.4, 0.08);
    this.tone(f * 2.01, 0.9, 0.025);
  }

  bell() {
    if (!this.on) return;
    [523.25, 1046.5 * 1.002, 1567.98 * 0.998, 2093 * 1.004].forEach((f, i) => this.tone(f, 3.2 - i * 0.5, 0.09 / (i + 1), i * 0.01));
  }
}

export const galaxyAudio = new GalaxyAudio();
