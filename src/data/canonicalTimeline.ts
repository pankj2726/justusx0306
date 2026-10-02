/* =========================================================================
   src/data/canonicalTimeline.ts
   The operator's complete timeline, entered as given.
   Titles, dates, descriptions, chapter lines and the 588-day gap are copied,
   not rewritten. Visual colours on chapters are the only addition.
   ========================================================================= */

export const DATA_PROVENANCE = {
  status: "OPERATOR_TIMELINE" as const,
  expectedSource: "Operator complete timeline, entered in full",
  note: "52 records, 7 chapters, relationship start 2021-10-09. The 588-day gap runs 2024-08-29 → 2026-04-09.",
  importedAt: "2026-04-09",
};

export type ChapterId = string;

export type MediaAsset = {
  id: string;
  src: string;
  alt: string;
  caption?: string;
  kind: "photo" | "video" | "audio";
};

export type Provider = "local" | "spotify" | "youtube" | "youtube-music";

export type Track = {
  title: string;
  artist: string;
  provider: Provider;
  src?: string;
  spotifyId?: string;
  spotifyUrl?: string;
  lyrics?: string[];
};

export type PlatePresentation = "spotify" | "collage" | "both";

export type GalaxyEvent = {
  id: string;
  title: string;
  date: string;
  description: string;
  chapterId: ChapterId;
  location?: string;
  media?: MediaAsset[];
  music?: Track;
  presentation?: PlatePresentation;
  galaxyObjectId: string;
};

export type Chapter = {
  id: ChapterId;
  index: number;
  title: string;
  summary: string;
  visual: {
    base: string;
    atmosphere: string;
    ring?: string;
    moons: number;
    glow: number;
    nebula: string;
  };
};

const DAY = 86_400_000;

export function parseISO(d: string): number {
  const [y, m, dd] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, dd);
}

export function addDaysISO(start: string, days: number): string {
  const t = new Date(parseISO(start) + days * DAY);
  return t.toISOString().slice(0, 10);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b) - parseISO(a)) / DAY);
}

export const RELATIONSHIP_START = "2021-10-09";

/* The last meeting before the gap, plus 588 days, is the reunion. */
export const SILENCE_DAYS = 588;
export const SILENCE_START = "2024-08-29";
export const SILENCE_END = addDaysISO(SILENCE_START, SILENCE_DAYS);
export const SILENCE_OPENING_EVENT = `event-${SILENCE_START}`;
export const REUNION_EVENT = `event-${SILENCE_END}`;

export const CHAPTERS: Chapter[] = [
  {
    id: "ch-01",
    index: 1,
    title: "Where It All Began",
    summary: "A pizza shop, a proposal that didn’t land, and a pendant that finally did.",
    visual: { base: "#c9843a", atmosphere: "#ffb74b", ring: "#ffd27a", moons: 1, glow: 0.72, nebula: "#a85a28" },
  },
  {
    id: "ch-02",
    index: 2,
    title: "Holding On Through The Distance",
    summary: "A yes, a misunderstanding, three months of silence, and the hug that undid all of it.",
    visual: { base: "#3a6ea8", atmosphere: "#7ec8ff", moons: 2, glow: 0.58, nebula: "#245080" },
  },
  {
    id: "ch-03",
    index: 3,
    title: "Falling Deeper",
    summary: "The first time I saw you cry, the first kiss, the longest one yet.",
    visual: { base: "#c43d6e", atmosphere: "#ff5fa2", ring: "#ff8ab8", moons: 1, glow: 0.86, nebula: "#8a2450" },
  },
  {
    id: "ch-04",
    index: 4,
    title: "Growing Pains",
    summary: "The fights started here — but so did the routine that would carry us through the next two years.",
    visual: { base: "#b85a3a", atmosphere: "#ff8a5b", moons: 2, glow: 0.62, nebula: "#7a3828" },
  },
  {
    id: "ch-05",
    index: 5,
    title: "Us Against Everything",
    summary: "Regular meet-ups, a mother’s slap, verbally abusive nights — and we kept showing up for each other anyway.",
    visual: { base: "#5a3d9a", atmosphere: "#b45cff", ring: "#d4a0ff", moons: 3, glow: 0.74, nebula: "#3a2070" },
  },
  {
    id: "ch-06",
    index: 6,
    title: "Trying to Fix Us",
    summary: "A ruined birthday, a trip to Dankaur that didn’t fix anything, and one more try outside her college.",
    visual: { base: "#3d4a62", atmosphere: "#8aa0c0", moons: 1, glow: 0.32, nebula: "#1e2838" },
  },
  {
    id: "ch-07",
    index: 7,
    title: "Finding Our Way Back",
    summary: "588 days apart. Then we found each other again.",
    visual: { base: "#e07a3a", atmosphere: "#ffb74b", ring: "#ff5fa2", moons: 2, glow: 0.96, nebula: "#c44878" },
  },
];

function ev(date: string, title: string, chapterId: ChapterId, description: string, location?: string): GalaxyEvent {
  return {
    id: `event-${date}`,
    galaxyObjectId: `memory-${date}`,
    title,
    date,
    chapterId,
    description,
    location,
  };
}

export const EVENTS: GalaxyEvent[] = [
  ev("2021-10-09", "The Pizza Shop Meeting 🍕", "ch-01", "I met you at a pizza shop during your sister’s birthday celebration.", "Pizza shop"),
  ev("2021-10-23", "You Said No 💔", "ch-01", "Archu, you turned down my proposal."),
  ev("2021-10-25", "The Pendant 📿", "ch-01", "At least I managed to convince you to accept the pendant I bought for you with all my heart."),
  ev("2021-11-02", "The First Gift 🎁", "ch-01", "This was the day I met you at a pizza shop a few days before Diwali — and it was the first time anyone had ever gifted me something.", "Pizza shop"),

  ev("2022-01-03", "You Said Yes", "ch-02", "The first time we celebrated your birthday. Birthday Aapka Tha Lekin Sabse Pyara Gift To Mujhe Hi Mila Tha. That Was You, Meri Jaan. You Accepted My Proposal."),
  ev("2022-02-25", "The Misunderstanding 🤯", "ch-02", "I had a misunderstanding that you were in a physical relationship with someone else, and it completely messed with my head."),
  ev("2022-04-30", "Three Months Apart 📵", "ch-02", "Your family caught you chatting with me. As a result, I had to live without you for three months, and I lost hope that you would ever come back."),
  ev("2022-05-06", "Our First Hug 🫂", "ch-02", "Our first hug. It felt like the entire world just melted away around us. All the nerves and waiting disappeared the second I held you, replaced by an overwhelming sense of sukoon and warmth — like I was finally exactly where I was always meant to be."),
  ev("2022-05-11", "A Way to Talk Again 🤫", "ch-02", "You finally found a way to chat with me, through your sister’s Instagram account."),
  ev("2022-07-06", "My First Birthday Ever Celebrated 😚", "ch-02", "It was my birthday, and the very first time in my life that it was ever celebrated. We met at Quseen Plaza in Sikandrabad, making it the best birthday of my life. You kissed my cheek — the first time anyone had ever kissed me — and I kissed you on the forehead.", "Quseen Plaza, Sikandrabad"),
  ev("2022-07-31", "Chatting Again 📱", "ch-02", "Finally, your parents allowed you to use the phone, and we started chatting again."),

  ev("2022-09-26", "The First Time I Saw You Cry ❤️‍🩹", "ch-03", "We met on the first day of Navratri. Do you remember that day? You laid your head on my shoulder and cried. It was the first time I had ever seen you cry."),
  ev("2022-11-02", "That First Kiss 💋", "ch-03", "That first kiss."),
  ev("2022-12-10", "Our Longest Kiss ❤️‍🔥", "ch-03", "We shared our longest kiss, and a lot of moments leading into passionate foreplay."),

  ev("2023-01-02", "First Fight of 2023 💢", "ch-04", "We had our first argument of 2023."),
  ev("2023-01-03", "Your Birthday, 2023 ❤️", "ch-04", "It was your birthday, and my happiness was at an absolute peak! Sadly, though, you were on your period."),
  ev("2023-02-11", "Second Fight of 2023 ⚡", "ch-04", "We had our second fight of 2023, and it was even worse than the first."),
  ev("2023-03-02", "A Room Together 🏨", "ch-04", "We met in a room together.", "A room"),
  ev("2023-03-07", "Holi at the Pizza Shop 🎨", "ch-04", "We celebrated Holi together at a pizza shop.", "Pizza shop"),
  ev("2023-04-18", "Time in the Room 🏠", "ch-04", "We spent some time together in a room.", "A room"),
  ev("2023-04-25", "Back at the Pizza Shop 🍕", "ch-04", "We met up again at the pizza shop.", "Pizza shop"),
  ev("2023-05-18", "Time in the Room 🗝️", "ch-04", "We met up and spent time together in the room.", "The room"),
  ev("2023-05-20", "Pizza Shop Meetup 🍕", "ch-04", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-05-29", "Pizza Shop Meetup 🍕", "ch-04", "We met up at the pizza shop.", "Pizza shop"),

  ev("2023-06-22", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-07-06", "Our First Rain Together ❤️🌧️", "ch-05", "It was my birthday, and we experienced our very first rain together."),
  ev("2023-07-13", "First Time in a Car 🚗💨", "ch-05", "We were together in a car for the first time. We smoked a cigarette together — you were on your period.", "A car"),
  ev("2023-08-01", "Pizza Shop Meetup 🍕", "ch-05", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-08-02", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-08-09", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-09-07", "Disconnected 🛡️🚫", "ch-05", "We became disconnected because your mother slapped you for going to Beena’s birthday party the day before. You took that hit to your self-respect and, in response, stopped using your phone entirely."),
  ev("2023-09-13", "Period Pain and Harsh Words 💔", "ch-05", "We met up at the pizza shop. You were suffering through period pain, and it was so hard to see you like that — especially with your mother being so verbally abusive toward you. That was the point where I really started to dislike your family, because of how they treated you.", "Pizza shop"),
  ev("2023-09-20", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-09-30", "Pizza Shop Meetup 🍕", "ch-05", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-10-10", "Pizza Shop Meetup 🍕", "ch-05", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-10-17", "Pizza Shop Meetup 🍕", "ch-05", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-10-23", "Another Bad Fight ⚡", "ch-05", "We had another one of our worst fights."),
  ev("2023-10-30", "A Cigarette in the Room 🏠🚬", "ch-05", "We met up in the room and shared a cigarette together.", "The room"),
  ev("2023-11-01", "Pizza Shop Meetup 🍕", "ch-05", "We met up at the pizza shop.", "Pizza shop"),
  ev("2023-11-29", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-12-06", "Time in the Room 🏠", "ch-05", "We met up and spent time together in the room.", "The room"),
  ev("2023-12-28", "Last Meet-Up of 2023 🍕✨", "ch-05", "We met up at the pizza shop and also went to a restaurant nearby. It was a significant day, marking our very last meet-up of 2023.", "Pizza shop"),

  ev("2024-01-03", "I Ruined Your Birthday ❤️‍🩹🎂", "ch-06", "I ruined your birthday."),
  ev("2024-01-19", "Dankaur, Trying to Fix Things ⚡️⛈️", "ch-06", "We went to Dankaur together, hoping to talk and finally fix things between us. Unfortunately, nothing changed — it just turned into a lot of fighting.", "Dankaur"),
  ev("2024-03-01", "Bringing Kapil Along 🍕🤝", "ch-06", "I went to the pizza shop in Dankaur and brought Kapil along, hoping that seeing an old school friend would make you feel good.", "Dankaur"),
  ev("2024-08-29", "Outside Your College 🍕🎓", "ch-06", "I met you at the pizza shop right in front of your college. You came along with Mannat, one of your best friends back then.", "In front of your college"),

  ev("2026-04-09", "588 Days Later 🥺❤️‍🩹", "ch-07", "I met my babe after 588 fuxking days."),
  ev("2026-05-04", "Your School, Bubu Haroo 🥵", "ch-07", "I met you at your school, Bubu Haroo.", "Your school"),
  ev("2026-05-14", "The Room Again 😇🤭", "ch-07", "I met you in the room.", "The room"),
  ev("2026-05-25", "Before the School Holidays", "ch-07", "The day we last met before your school holidays."),
  ev("2026-07-17", "Bubuuuuu, Room Mein Mile The 🤭", "ch-07", "Bubuuuuu 🤭 room mein mile the.", "The room"),
  ev("2026-07-31", "Met in Dankaur", "ch-07", "Met in Dankaur.", "Dankaur"),
];

export const CHAPTER_BY_ID: Record<ChapterId, Chapter> = CHAPTERS.reduce(
  (acc, c) => ({ ...acc, [c.id]: c }),
  {} as Record<ChapterId, Chapter>
);

export const EVENT_BY_ID: Record<string, GalaxyEvent> = EVENTS.reduce(
  (acc, e) => ({ ...acc, [e.id]: e }),
  {} as Record<string, GalaxyEvent>
);

export function eventsOfChapter(id: ChapterId): GalaxyEvent[] {
  return EVENTS.filter((e) => e.chapterId === id).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export const FIRST_DATE = EVENTS[0].date;
export const LAST_DATE = EVENTS[EVENTS.length - 1].date;

export const EVENTS_IN_SILENCE = EVENTS.filter((e) => e.date > SILENCE_START && e.date < SILENCE_END);
