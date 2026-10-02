import { useId } from "react";

type Props = {
  size?: number;
  base: string;
  atmosphere: string;
  ring?: string;
  moons?: number;
  glow?: number;
  className?: string;
  spin?: boolean;
};

/** A softly lit, realistic-feeling planet: lit limb, terminator shadow, atmospheric halo, optional ring & moons. */
export default function Planet({ size = 120, base, atmosphere, ring, moons = 0, glow = 0.6, className = "", spin = true }: Props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={`overflow-visible ${className}`} aria-hidden>
      <defs>
        <radialGradient id={`body${id}`} cx="34%" cy="30%" r="80%">
          <stop offset="0%" stopColor={atmosphere} />
          <stop offset="45%" stopColor={base} />
          <stop offset="100%" stopColor="#050508" />
        </radialGradient>
        <radialGradient id={`shade${id}`} cx="75%" cy="78%" r="70%">
          <stop offset="0%" stopColor="#000" stopOpacity=".75" />
          <stop offset="60%" stopColor="#000" stopOpacity=".15" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`halo${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor={atmosphere} stopOpacity={0.35 * glow} />
          <stop offset="100%" stopColor={atmosphere} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`ring${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor={ring ?? atmosphere} stopOpacity="0" />
          <stop offset="30%" stopColor={ring ?? atmosphere} stopOpacity=".75" />
          <stop offset="70%" stopColor={ring ?? atmosphere} stopOpacity=".55" />
          <stop offset="100%" stopColor={ring ?? atmosphere} stopOpacity="0" />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <circle cx="60" cy="60" r="30" />
        </clipPath>
      </defs>

      <circle cx="60" cy="60" r="58" fill={`url(#halo${id})`} />

      {ring && (
        <g transform="rotate(-18 60 60)">
          <path d="M 8 60 A 52 11 0 0 1 112 60" fill="none" stroke={`url(#ring${id})`} strokeWidth="1.6" opacity=".7" />
          <path d="M 14 60 A 46 9 0 0 1 106 60" fill="none" stroke={`url(#ring${id})`} strokeWidth=".6" opacity=".5" />
        </g>
      )}

      <circle cx="60" cy="60" r="30" fill={`url(#body${id})`} />
      <g clipPath={`url(#clip${id})`} opacity=".22">
        <ellipse cx="60" cy="50" rx="40" ry="3" fill="#fff" opacity=".35" />
        <ellipse cx="60" cy="62" rx="40" ry="2" fill="#000" opacity=".5" />
        <ellipse cx="60" cy="71" rx="40" ry="3.5" fill="#fff" opacity=".2" />
      </g>
      <circle cx="60" cy="60" r="30" fill={`url(#shade${id})`} />
      <circle cx="60" cy="60" r="30" fill="none" stroke={atmosphere} strokeOpacity=".35" strokeWidth=".6" />

      {ring && (
        <g transform="rotate(-18 60 60)">
          <path d="M 8 60 A 52 11 0 0 0 112 60" fill="none" stroke={`url(#ring${id})`} strokeWidth="1.6" />
          <path d="M 14 60 A 46 9 0 0 0 106 60" fill="none" stroke={`url(#ring${id})`} strokeWidth=".6" opacity=".7" />
        </g>
      )}

      {Array.from({ length: moons }).map((_, i) => (
        <g key={i} className={spin ? "spin-slow" : ""} style={{ transformOrigin: "60px 60px", animationDuration: `${28 + i * 14}s`, animationDelay: `${-i * 9}s` }}>
          <circle cx={60 + 42 + i * 6} cy={60} r={2.2 - i * 0.4} fill="#ece6dc" opacity=".85" />
        </g>
      ))}
    </svg>
  );
}
