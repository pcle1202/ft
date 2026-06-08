# friendkeeper — friendship tracker

Next.js app that helps you stay in touch with people you care about. Dual storage: localStorage for guests, Neon (PostgreSQL) for signed-in users. Groq AI for enrichment features.

## stack
- Frontend: React 19 / Next.js 16 (App Router)
- Backend: Next.js API routes
- Database: Neon serverless PostgreSQL (`@neondatabase/serverless`)
- AI: Groq API — model `llama-3.1-8b-instant` (via `lib/groq.ts`)
- Auth: Clerk v7
- Charts: Recharts
- Styling: Tailwind CSS v4 + inline styles (no CSS-in-JS)

## commands
- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — lint check
- `POST /api/db-init` — creates tables if they don't exist (idempotent; called automatically on every sign-in)

## environment variables
```
DATABASE_URL=            # Neon connection string (required)
GROQ_API_KEY=            # Groq AI key (required for AI features)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL=/sign-in
```

## project structure
```
app/
  page.tsx                  — Friends page (main view, sidebar + detail pane)
  dashboard/page.tsx         — Analytics (heatmap, health, monthly report)
  sign-in/[[...sign-in]]/   — Clerk SignIn + "Continue as guest" button
  sign-up/[[...sign-up]]/   — Clerk SignUp
  layout.tsx                 — ClerkProvider, global fonts
  globals.css                — Design tokens, custom component classes
  api/
    db-init/route.ts         — CREATE TABLE IF NOT EXISTS (no auth required)
    debug/route.ts           — Returns Clerk session info (dev utility)
    friends/route.ts         — GET all, POST new
    friends/[id]/route.ts    — PUT update + sync interactions, DELETE
    interactions/route.ts    — POST single interaction
    interactions/[id]/route.ts — DELETE single interaction
    ai/mood/route.ts         — Classify note mood (warm/deep/fun/awkward)
    ai/topics/route.ts       — Extract 3–5 topic tags from note
    ai/suggest/route.ts      — 2–3 conversation starters for a friend
    ai/starter/route.ts      — Opening message based on interaction history
    ai/monthly/route.ts      — Monthly activity summary (previous month)
    ai/reach-out/route.ts    — One-sentence reason to reach out (per friend)
    ai/summary/route.ts      — 2–3 bullet-point circle observations
components/
  AppNav.tsx                 — Top nav: brand, links, Clerk UserButton
  Avatar.tsx                 — FriendAvatar (photo or initials circle, 4 sizes)
  FriendCard.tsx             — Full friend detail: goals, timeline, topics, edit
  FriendForm.tsx             — Add/edit form with validation and photo upload
lib/
  db.ts                      — exports `sql` (Neon client); throws if DATABASE_URL missing
  storage.ts                 — Transparent CRUD: localStorage for guests, API for auth users
  sampleData.ts              — 5 hardcoded sample friends; loads to Neon (auth) or localStorage (guest)
  groq.ts                    — exports `generateAIResponse(prompt)`; uses GROQ_API_KEY
  date.ts                    — daysSince(), getStatus(), formatLastInteraction()
types/
  friend.ts                  — Friend, Interaction, InteractionType, FriendCategory
proxy.ts                     — Clerk middleware (Next.js picks this up as middleware)
```

## key conventions
- TypeScript strict — no `any` types
- API routes in `/app/api/[route]/route.ts`
- All DB calls via `sql` from `lib/db.ts` — never inline SQL elsewhere
- All AI calls via `generateAIResponse` from `lib/groq.ts` — never call Groq SDK directly in routes
- Storage is abstracted in `lib/storage.ts` — components never call `/api/friends` directly
- Named exports for components, default exports for pages

## data model

### friends
| column | type | notes |
|---|---|---|
| id | TEXT PK | UUID |
| user_id | TEXT NOT NULL | Clerk user ID |
| name | TEXT NOT NULL | |
| category | TEXT NOT NULL | close friend / family / classmate / coworker / other |
| notes | TEXT | free-form description |
| bio | TEXT | short bio line |
| lives_in | TEXT | city/country |
| birthday | TEXT | e.g. "Jun 12" |
| met_at | TEXT | how you met |
| color | TEXT | hex color for avatar |
| photo_url | TEXT | base64 image string |
| next_topics | TEXT[] | talking points |
| text_frequency_days | INTEGER DEFAULT 14 | |
| hangout_frequency_days | INTEGER DEFAULT 30 | |
| last_texted | TIMESTAMPTZ | |
| last_hung_out | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

Indexes: `idx_friends_user_id`

### interactions
| column | type | notes |
|---|---|---|
| id | TEXT PK | UUID |
| friend_id | TEXT NOT NULL REFERENCES friends(id) ON DELETE CASCADE | |
| user_id | TEXT NOT NULL | Clerk user ID |
| type | TEXT NOT NULL | text / hangout / note |
| date | TIMESTAMPTZ NOT NULL | |
| notes | TEXT | |
| location | TEXT | for hangouts |
| mood | TEXT | warm / deep / fun / awkward |
| topics | TEXT[] | |
| created_at | TIMESTAMPTZ DEFAULT NOW() | |

Indexes: `idx_interactions_friend_id`, `idx_interactions_user_id`

## TypeScript types

```ts
type FriendCategory = "close friend" | "family" | "classmate" | "coworker" | "other"

type Friend = {
  id: string
  name: string
  category: FriendCategory
  textFrequencyDays: number
  hangoutFrequencyDays: number
  createdAt: string           // ISO
  interactions: Interaction[] // always an array, never undefined
  notes?: string
  bio?: string
  livesIn?: string
  birthday?: string           // e.g. "Jun 12"
  metAt?: string
  color?: string              // hex, used as avatar background
  photoUrl?: string           // base64 data URL
  nextTopics?: string[]
  lastTexted?: string         // ISO
  lastHungOut?: string        // ISO
}

type Interaction = {
  id: string
  type: "text" | "hangout" | "note"
  date: string                // ISO
  notes?: string
  location?: string
  mood?: string               // warm | deep | fun | awkward
  topics?: string[]
}
```

## auth & routing

Middleware is in `proxy.ts` (not `middleware.ts`) — Turbopack picks it up correctly. **Do not rename it.**

Public routes (no auth required): `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/dashboard(.*)`  
Protected routes: everything else (including all `/api/*`), redirected to `/sign-in`

In pages: `useUser()` from `@clerk/nextjs` with client-side redirect if not signed in.  
In API routes: `auth()` from `@clerk/nextjs/server` — always check `userId` and return 401 if null.

### guest mode
- App-level feature, not a Clerk concept
- Flag: `localStorage.setItem("friendkeeper-guest", "1")`
- When signed in, the flag is cleared automatically (`localStorage.removeItem("friendkeeper-guest")`)
- Guest data lives in localStorage; auth user data lives in Neon

## storage abstraction (`lib/storage.ts`)

`getFriends / addFriend / updateFriend / deleteFriend` — these are the only functions components should call.

| condition | storage backend |
|---|---|
| `userId === "guest"` | localStorage at `friendkeeper-friends-guest` |
| any other userId | `/api/friends` → Neon |

**localStorage keys:**
- `friendkeeper-friends-{userId}` — Friend[] JSON
- `friendkeeper-guest` — `"1"` when in guest mode
- `friendkeeper-sample-{userId}` — `"1"` when sample data is active
- `friendkeeper-sample-version-{userId}` — `"v4"` (version sentinel)
- `friendkeeper-monthly-report-v2-{YYYY-MM}-{userId}` — cached AI monthly report

**Migration banner:** shown when a signed-in user has local data (checks both `friendkeeper-friends-{userId}` and `friendkeeper-friends-guest`). `handleMigrateData` in `page.tsx` loops and calls `addFriend` for each, then calls `clearLocalData`.

## sample data (`lib/sampleData.ts`)

5 profiles: Maya Chen, Jordan Park, Sam Rivera, Priya Nair, Leo Kim — each with 5 interactions, full metadata, and nextTopics.

- **Auth users:** `handleToggleSample` in `page.tsx` calls `addFriend`/`deleteFriend` for each sample — data goes to Neon
- **Guest users:** `loadSampleData`/`clearSampleData` write to localStorage only
- `SAMPLE_IDS` is a fixed UUID array — used to detect and remove samples
- `SAMPLE_VERSION = "v4"` — bump to force refresh of stale sample data

## AI features (Groq)

All AI routes use `generateAIResponse(prompt)` from `lib/groq.ts` (model: `llama-3.1-8b-instant`, 512 tokens).  
None of the AI routes enforce Clerk auth — they're open endpoints.

| route | trigger | output |
|---|---|---|
| `/api/ai/mood` | note text ≥ 15 chars (debounced) | mood tag string or null |
| `/api/ai/topics` | same as mood | string[] of 3–5 tags |
| `/api/ai/suggest` | FriendCard mount | string[] of 2–3 convo starters |
| `/api/ai/starter` | manual button tap | one opening message string |
| `/api/ai/monthly` | dashboard load (previous month) | 2–3 sentence summary, cached |
| `/api/ai/reach-out` | dashboard load | { name, reason }[] per friend |
| `/api/ai/summary` | dashboard load | 2–3 bullet-point string |

## components

### FriendAvatar
Renders `friend.photoUrl` as a circular `<img>` if present; falls back to a colored circle with initials derived from `friend.name`. Color source: `friend.color ?? "#7A5A3F"`. Sizes: `sm`=26px, `md`=30px, `reach`=38px, `lg`=56px.

### FriendCard
Full detail pane. Calls `onUpdateFriend(friend)` (typed `void`, not async) for every change — the parent (`page.tsx`) handles the async API call and reload. Calls AI routes directly via `fetch` for mood, topics, and suggestions.

### FriendForm
Used for both add and edit (`isEdit = !!initial`).  
Required fields (validated in JS, red asterisk in label): **Name**, **Category**, **Text every**.  
Optional: notes, livesIn, birthday, metAt, hangout frequency, photo.  
Photo: base64 via FileReader; warns if > 2MB; stored in `friend.photoUrl`.  
Validation: `errors` state object, `useRef` focus management, `noValidate` on the form.

### AppNav
Top bar with brand name, Friends/Dashboard nav links, and Clerk `UserButton` when signed in.

## design tokens (globals.css)
```
--bg:     #FAF7F2   (cream background)
--paper:  #F3EDE3
--ink:    #2E2A24   (dark brown text)
--accent: #A68B50   (gold — buttons, links)
--hint:   #9A8F82   (muted labels)
--muted:  #6B6259
--serif:  Newsreader
--sans:   Geist
--mono:   Geist Mono

Status colors:
  healthy:   #6BAF85 (sage green)
  attention: #D4A855 (amber)
  overdue:   #C46060 (rust red)
```

## warnings
- Never commit `.env.local` — contains Neon, Groq, and Clerk credentials
- All DB queries must filter by `user_id` from `auth()` — never query without it
- Middleware is in `proxy.ts`, not `middleware.ts` — do not rename
- AI routes (Groq) have no auth guard — do not put sensitive data in prompts
- `interactions` on `Friend` is always `Interaction[]` (never undefined) — the GET route always populates it
- Photo stored as base64 in Neon `TEXT` column — large photos inflate DB row size and localStorage
- `handleToggleSample` in `page.tsx` is async — it awaits Neon calls for auth users
