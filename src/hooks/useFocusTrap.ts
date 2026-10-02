import { useEffect, type RefObject } from "react";

/* Nested traps: only the top-most active container handles Tab. */
const stack: HTMLElement[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),iframe,audio[controls],video[controls],[tabindex]:not([tabindex="-1"])';

/**
 * Dialog focus management: moves focus in, traps Tab/Shift+Tab, marks the app
 * background (elements with [data-app-bg]) inert, and returns focus to the
 * opener on close.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!active || !el) return;
    const opener = document.activeElement as HTMLElement | null;
    stack.push(el);

    const bg = Array.from(document.querySelectorAll<HTMLElement>("[data-app-bg]")).filter((b) => !b.contains(el));
    const prev = bg.map((b) => b.inert);
    bg.forEach((b) => {
      b.inert = true;
    });

    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? el).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || stack[stack.length - 1] !== el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        el.focus();
        return;
      }
      const f = items[0];
      const l = items[items.length - 1];
      const cur = document.activeElement;
      if (e.shiftKey && (cur === f || !el.contains(cur))) {
        e.preventDefault();
        l.focus();
      } else if (!e.shiftKey && (cur === l || !el.contains(cur))) {
        e.preventDefault();
        f.focus();
      }
    };
    document.addEventListener("keydown", onKey, true);

    return () => {
      document.removeEventListener("keydown", onKey, true);
      const i = stack.lastIndexOf(el);
      if (i >= 0) stack.splice(i, 1);
      bg.forEach((b, j) => {
        b.inert = prev[j];
      });
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [active, ref]);
}
