/** The one motif as a DOM ornament: the four-point twinkle sparkle (inline SVG). */
export default function Sparkle({
  size = 14,
  color = "currentColor",
  spin = false,
  className = "",
  title,
}: {
  size?: number;
  color?: string;
  spin?: boolean;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`${spin ? "sparkle-spin" : ""} ${className}`}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <path d="M12 .8C12.55 7.7 16.3 11.45 23.2 12 16.3 12.55 12.55 16.3 12 23.2 11.45 16.3 7.7 12.55.8 12 7.7 11.45 11.45 7.7 12 .8Z" fill={color} />
      <path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" stroke={color} strokeWidth=".7" strokeLinecap="round" opacity=".55" />
    </svg>
  );
}
