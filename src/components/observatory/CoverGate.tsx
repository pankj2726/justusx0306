import { SILENCE_DAYS } from "../../data/canonicalTimeline";

type Props = { entered: boolean; onEnter: () => void; his: string; her: string; moments: number; chapters: number };

/** The entrance: the galaxy turns slowly behind a veil until you step in. */
export default function CoverGate({ entered, onEnter, his, her, moments, chapters }: Props) {
  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center px-6 text-center transition-all duration-[1400ms] ${
        entered ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ background: "radial-gradient(ellipse at center, rgba(3,3,6,0.25) 0%, rgba(3,3,6,0.75) 70%, rgba(3,3,6,0.95) 100%)" }}
    >
      <div className={`transition-transform duration-[1400ms] ${entered ? "scale-110" : "scale-100"}`}>
        <div className="label !text-gold">An observatory for two</div>
        <h3 className="display mt-6 text-[clamp(3rem,9vw,7.5rem)]">
          {his} <span className="italic gold-text">&</span> {her}
        </h3>
        <p className="mx-auto mt-6 max-w-md font-serif text-xl font-light italic text-mist">
          {moments} moments, {chapters} worlds, {SILENCE_DAYS} days of silence — and one orbit that held.
        </p>
        <button onClick={onEnter} className="btn btn-primary mt-10">
          Enter the observatory
        </button>
        <div className="mt-6 font-mono text-[9.5px] uppercase tracking-[0.25em] text-dim">drag to orbit · tap a world · tap a star</div>
      </div>
    </div>
  );
}
