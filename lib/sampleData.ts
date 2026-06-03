import { Friend } from "@/types/friend";

export const SAMPLE_IDS = [
  "11111111-1111-1111-1111-111111111111",
  "22222222-2222-2222-2222-222222222222",
  "33333333-3333-3333-3333-333333333333",
  "44444444-4444-4444-4444-444444444444",
  "55555555-5555-5555-5555-555555555555",
];

function ago(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function createSampleFriends(): Friend[] {
  return [
    {
      id: SAMPLE_IDS[0],
      name: "Maya Chen",
      category: "close friend",
      notes: "Ceramics MFA at RISD, exhibit opens June 18th. Cat Miso had kittens (she named one Kiln). Things with her mom are complicated.",
      textFrequencyDays: 7,
      hangoutFrequencyDays: 30,
      lastTexted: ago(3),
      lastHungOut: ago(18),
      createdAt: ago(180),
      livesIn: "Boston, MA",
      birthday: "Jun 12",
      metAt: "RISD MFA program, 2022",
      color: "#5E6E5A",
      nextTopics: ["How the exhibit went", "Kiln and the kittens", "The situation with her mom"],
      interactions: [
        {
          id: "m-int-1",
          type: "hangout",
          date: ago(52),
          location: "Her studio in Allston",
          notes: "First time seeing the studio. She showed the tidal vessel series. Got emotional talking about her mom.",
          mood: "deep",
          topics: ["ceramics", "family"],
        },
        {
          id: "m-int-2",
          type: "text",
          date: ago(38),
          notes: "Sent 40+ kitten photos. Named them Kiln, Bisque, Raku, and Crawl. Replied to my exhibit question with a skull emoji.",
          mood: "fun",
          topics: ["kittens", "exhibit prep"],
        },
        {
          id: "m-int-3",
          type: "text",
          date: ago(22),
          notes: "Called out of nowhere, anxious about her bio photo. Did an hour-long FaceTime photoshoot in her kitchen.",
          mood: "warm",
          topics: ["exhibit", "anxiety"],
        },
        {
          id: "m-int-4",
          type: "hangout",
          date: ago(18),
          location: "Cafe Madeleine, then her apartment",
          notes: "Brunch ran 3 hours. She showed me her artist statement.",
          mood: "deep",
          topics: ["exhibit", "artist statement"],
        },
        {
          id: "m-int-5",
          type: "text",
          date: ago(3),
          notes: "Sent a 6-second voice memo of herself saying 'I'm excited!!'",
          mood: "warm",
          topics: ["exhibit", "milestone"],
        },
      ],
    },

    {
      id: SAMPLE_IDS[1],
      name: "Jordan Park",
      category: "close friend",
      notes: "Started at Haven Climate (climate tech) in SF. Training for first half marathon in October. Been with Alex for a few months, going really well.",
      textFrequencyDays: 14,
      hangoutFrequencyDays: 30,
      lastTexted: ago(7),
      lastHungOut: ago(14),
      createdAt: ago(210),
      livesIn: "San Francisco, CA",
      birthday: "Oct 3",
      metAt: "Sophomore year of college, 2019",
      color: "#7A5A3F",
      nextTopics: ["Alex meeting their parents", "Half marathon training", "Whether SF feels permanent"],
      interactions: [
        {
          id: "j-int-1",
          type: "hangout",
          date: ago(55),
          location: "Dolores Park",
          notes: "First time since the move. Glowing about the new job. Mentioned 'A' once and changed the subject fast.",
          mood: "warm",
          topics: ["career change", "new city"],
        },
        {
          id: "j-int-2",
          type: "text",
          date: ago(42),
          notes: "Late-night voice memo about imposter syndrome. Talked them down over text for two hours.",
          mood: "deep",
          topics: ["work stress"],
        },
        {
          id: "j-int-3",
          type: "text",
          date: ago(28),
          notes: "Sent their 16-week marathon plan. Also mentioned 'A' again, apparently they cooked dinner. Still no details.",
          mood: "fun",
          topics: ["running", "mystery relationship"],
        },
        {
          id: "j-int-4",
          type: "hangout",
          date: ago(14),
          location: "Tartine Manufactory",
          notes: "Finally told me about Alex. 3 months in, clearly smitten. Said SF might feel permanent for the first time.",
          mood: "warm",
          topics: ["relationship", "running", "life direction"],
        },
        {
          id: "j-int-5",
          type: "text",
          date: ago(7),
          notes: "Alex met their parents on FaceTime. Sent a photo captioned 'don't make it weird'.",
          mood: "fun",
          topics: ["relationship milestone"],
        },
      ],
    },

    {
      id: SAMPLE_IDS[2],
      name: "Sam Rivera",
      category: "coworker",
      notes: "Senior designer on my team. Partner Dee moved out in March, going through it. Doesn't talk about feelings directly. Communicates through work chat and dark humor.",
      textFrequencyDays: 7,
      hangoutFrequencyDays: 45,
      lastTexted: ago(11),
      lastHungOut: ago(48),
      createdAt: ago(120),
      livesIn: "San Francisco, CA",
      birthday: "Sep 8",
      metAt: "Meridian rebrand project, 2023",
      color: "#A06A4A",
      nextTopics: ["Oaxaca residency application", "How they're actually doing"],
      interactions: [
        {
          id: "s-int-1",
          type: "hangout",
          date: ago(90),
          location: "Flour + Water",
          notes: "Celebratory dinner after the Meridian rebrand shipped.",
          mood: "warm",
          topics: ["project wrap"],
        },
        {
          id: "s-int-2",
          type: "hangout",
          date: ago(48),
          location: "Blue Bottle on Market",
          notes: "First time since Dee left. Didn't bring it up. Talked about fonts. Paid for my coffee without telling me.",
          mood: "deep",
          topics: ["quiet support"],
        },
        {
          id: "s-int-3",
          type: "text",
          date: ago(32),
          notes: "Sent a kerning meme. They replied 'I've been staring at this for 4 hours and I'm not ok' with no context.",
          mood: "awkward",
          topics: ["checking in"],
        },
        {
          id: "s-int-4",
          type: "text",
          date: ago(18),
          notes: "Slacked about applying to an artist residency in Oaxaca for September. First forward plan since Dee left.",
          mood: "warm",
          topics: ["residency", "future plans"],
        },
        {
          id: "s-int-5",
          type: "text",
          date: ago(11),
          notes: "Quick chat about Q3 roadmap.",
          mood: "deep",
          topics: ["work"],
        },
      ],
    },

    {
      id: SAMPLE_IDS[3],
      name: "Priya Nair",
      category: "family",
      notes: "My cousin. PhD in climate policy in London. We were close growing up, drifted since she moved. Always says she's fine.",
      textFrequencyDays: 14,
      hangoutFrequencyDays: 60,
      lastTexted: ago(28),
      lastHungOut: ago(65),
      createdAt: ago(365),
      livesIn: "London, UK",
      birthday: "Jan 28",
      metAt: "Family, grew up together",
      color: "#604838",
      nextTopics: ["PhD decision", "How she's actually doing", "Research paper"],
      interactions: [
        {
          id: "p-int-1",
          type: "hangout",
          date: ago(130),
          location: "Her flat in Hackney",
          notes: "She cooked her mum's dal. Talked until 2am about her advisor stealing credit for her work.",
          mood: "deep",
          topics: ["academia", "advisor conflict"],
        },
        {
          id: "p-int-2",
          type: "text",
          date: ago(100),
          notes: "She asked if I remembered the beach from when we were kids. Went through old photos for two hours. Mentioned the GP for fatigue, said it was nothing.",
          mood: "warm",
          topics: ["family memories", "health"],
        },
        {
          id: "p-int-3",
          type: "text",
          date: ago(75),
          notes: "She sent her draft paper intro. She replied 'my advisor will probably rewrite it' when I said it was good.",
          mood: "deep",
          topics: ["research", "self-worth"],
        },
        {
          id: "p-int-4",
          type: "text",
          date: ago(65),
          notes: "Voice memo exchange. She's thinking about leaving the PhD. Said I'm the one person who wouldn't panic.",
          mood: "deep",
          topics: ["PhD doubts", "life direction"],
        },
        {
          id: "p-int-5",
          type: "text",
          date: ago(28),
          notes: "She texted happy birthday. Called but she didn't pick up. Said 'miss you, call soon'.",
          mood: "awkward",
          topics: ["birthday", "guilt"],
        },
      ],
    },

    {
      id: SAMPLE_IDS[4],
      name: "Leo Kim",
      category: "classmate",
      notes: "MFA cohort friend. Moved back to Seoul to take care of his dad. Funny and sharp.",
      textFrequencyDays: 21,
      hangoutFrequencyDays: 60,
      lastTexted: ago(45),
      lastHungOut: ago(70),
      createdAt: ago(400),
      livesIn: "Seoul, South Korea",
      birthday: "Mar 5",
      metAt: "MFA cohort, 2020",
      color: "#4A5E7A",
      nextTopics: ["Short story he's writing", "His dad's health", "Visiting Seoul"],
      interactions: [
        {
          id: "l-int-1",
          type: "hangout",
          date: ago(160),
          location: "Going-away dinner at Babo",
          notes: "The whole cohort showed up. He gave a speech then pulled me aside. Said 'don't let this be the last time'.",
          mood: "deep",
          topics: ["farewell", "friendship"],
        },
        {
          id: "l-int-2",
          type: "text",
          date: ago(120),
          notes: "Sent cherry blossom photos near his dad's place. Said it was 'devastatingly pretty'.",
          mood: "warm",
          topics: ["Seoul", "family caregiving"],
        },
        {
          id: "l-int-3",
          type: "text",
          date: ago(90),
          notes: "Long back-and-forth about a Muriel Spark book. Mentioned he's writing short fiction again.",
          mood: "fun",
          topics: ["books", "writing"],
        },
        {
          id: "l-int-4",
          type: "hangout",
          date: ago(70),
          location: "Video call",
          notes: "First time seeing his face since he left. Tired but good. His dad had a rough week.",
          mood: "warm",
          topics: ["caregiving", "reconnection"],
        },
        {
          id: "l-int-5",
          type: "text",
          date: ago(45),
          notes: "Sent the opening page of his short story, set in a department store. Asked about his dad; he said 'it's hard some days'.",
          mood: "deep",
          topics: ["creative work", "caregiving"],
        },
      ],
    },
  ];
}

const STORAGE_KEY = (userId: string) => `friendkeeper-friends-${userId}`;
const SAMPLE_FLAG = (userId: string) => `friendkeeper-sample-${userId}`;
const SAMPLE_VERSION_KEY = (userId: string) => `friendkeeper-sample-version-${userId}`;
const SAMPLE_VERSION = "v4";

export function hasSampleData(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SAMPLE_FLAG(userId)) === "1";
}

export function isSampleDataCurrent(userId: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SAMPLE_VERSION_KEY(userId)) === SAMPLE_VERSION;
}

export function loadSampleData(userId: string, current: Friend[]): Friend[] {
  const samples = createSampleFriends();
  const withoutOld = current.filter((f) => !SAMPLE_IDS.includes(f.id));
  const merged = [...withoutOld, ...samples];
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(merged));
  localStorage.setItem(SAMPLE_FLAG(userId), "1");
  localStorage.setItem(SAMPLE_VERSION_KEY(userId), SAMPLE_VERSION);
  return merged;
}

export function clearSampleData(userId: string, current: Friend[]): Friend[] {
  const filtered = current.filter((f) => !SAMPLE_IDS.includes(f.id));
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(filtered));
  localStorage.removeItem(SAMPLE_FLAG(userId));
  localStorage.removeItem(SAMPLE_VERSION_KEY(userId));
  return filtered;
}
