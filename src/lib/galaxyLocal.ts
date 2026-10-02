/* Galaxy-only local persistence (additive keys, never sent anywhere). */

const K_DISCOVERIES = "galaxy-discoveries-v1";
const K_WISHES = "galaxy-wishes-v1";

export type Wish = { id: string; text: string; createdAt: number };

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, v: T) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
}

export const loadDiscoveries = (): string[] => {
  const v = read<unknown>(K_DISCOVERIES, []);
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
};
export const saveDiscoveries = (ids: string[]) => write(K_DISCOVERIES, ids);

export const loadWishes = (): Wish[] => {
  const v = read<unknown>(K_WISHES, []);
  return Array.isArray(v) ? (v.filter((w) => w && typeof w.text === "string" && typeof w.id === "string") as Wish[]) : [];
};
export const saveWishes = (w: Wish[]) => write(K_WISHES, w);

export const newWish = (text: string): Wish => ({
  id: `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
  text: text.slice(0, 120),
  createdAt: Date.now(),
});
