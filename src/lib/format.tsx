const EMOJI = /(\p{Extended_Pictographic}|\u200d|\ufe0f|\u2764)+/gu;

/** Splits a title into plain text + trailing emoji so emoji can be rendered subtly. Data stays unchanged. */
export function splitTitle(title: string): { text: string; emoji: string } {
  const emoji = (title.match(EMOJI) ?? []).join("");
  const text = title.replace(EMOJI, "").replace(/\s{2,}/g, " ").trim();
  return { text: text || title, emoji };
}

export function Title({ title, className = "" }: { title: string; className?: string }) {
  const { text, emoji } = splitTitle(title);
  return (
    <span className={className}>
      {text}
      {emoji && <span className="emoji-soft">{emoji}</span>}
    </span>
  );
}

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
