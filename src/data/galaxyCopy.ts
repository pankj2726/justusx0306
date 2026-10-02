/* =========================================================================
   src/data/galaxyCopy.ts — every new UI string for the galaxy expansion.
   Short, warm, neutral. No dates, no story claims, no new facts.
   ========================================================================= */

export type DiscoveryText = { name: string; line: string };

export const COPY_GIANTS: DiscoveryText[] = [
  { name: "The Ringed Giant", line: "Old, slow, and far away." },
  { name: "The Lavender Giant", line: "It wears its rings quietly." },
  { name: "The Rose Giant", line: "A soft glow at the edge of the sky." },
];

export const COPY_WORLDS: Record<"ice" | "ember" | "storm" | "ghost" | "garden", DiscoveryText[]> = {
  ice: [
    { name: "The Ice World", line: "Cold light, kept very still." },
    { name: "The Frost World", line: "Every glint is a small hello." },
    { name: "The Pale World", line: "Quiet enough to hear the stars." },
  ],
  ember: [
    { name: "The Ember World", line: "Warm all the way through." },
    { name: "The Hearth World", line: "It never quite stops glowing." },
    { name: "The Amber World", line: "Like a lamp left on." },
  ],
  storm: [
    { name: "The Storm World", line: "Wild weather, soft colours." },
    { name: "The Tempest World", line: "It spins its own songs." },
    { name: "The Swirl World", line: "Always moving, never lost." },
  ],
  ghost: [
    { name: "The Ghost World", line: "Almost not there, and still shining." },
    { name: "The Veiled World", line: "A shy light in the dark." },
    { name: "The Whisper World", line: "You notice it if you look gently." },
  ],
  garden: [
    { name: "The Garden World", line: "Something is always blooming here." },
    { name: "The Meadow World", line: "Green light and small roses." },
    { name: "The Grove World", line: "Soft, patient, alive." },
  ],
};

export const COPY_TWIN: DiscoveryText = { name: "The Twin Worlds", line: "Two lights, one orbit." };
export const COPY_HEART_RING: DiscoveryText = { name: "The Heart Ring", line: "It shows its shape only from the right angle." };
export const COPY_HEART_BELT: DiscoveryText = { name: "The Heart Belt", line: "A ring of dust that remembers a shape." };
export const COPY_UFO: DiscoveryText = { name: "First Visitor", line: "Someone stopped by to admire the view." };
export const COPY_WISH: DiscoveryText = { name: "A Caught Star", line: "Some wishes land softly." };

export const UI_COPY = {
  discoveries: "Discoveries",
  discovered: "Discovered",
  undiscovered: "Not yet found",
  flyTo: "Fly there",
  openMemory: "Open this memory",
  visitorBeam: "A small visitor pointed at a memory.",
  makeWish: "Make a wish",
  wishPrompt: "You caught a falling star.",
  wishPlaceholder: "Write your wish…",
  saveWish: "Keep this wish",
  notNow: "Not now",
  wishes: "Wishes",
  noWishes: "No wishes yet. Catch a golden falling star, or write one here.",
  writeWish: "Write a wish",
  deleteWish: "Delete wish",
  wishesPrivate: "Wishes stay on this device only.",
  galaxyLife: "Galaxy life",
  lifeExpansion: "Extra worlds & satellites",
  lifeUfo: "Visitors",
  lifeFalling: "Falling stars",
  lifeDiscoveries: "Discoveries",
  satelliteOf: (n: number, total: number, title: string) => `Satellite ${n} of ${total}: ${title}`,
};
