# friendkeeper — friendship tracker

Next.js app with Supabase (PostgreSQL), Anthropic API for AI features, deployed on Vercel.

## stack
- Frontend: React / Next.js (App Router)
- Backend: Next.js API routes
- Database: Supabase (PostgreSQL)
- AI: Anthropic API (claude-sonnet-4-20250514)
- Auth: Clerk
- Styling: Tailwind CSS

## commands
- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — lint check
- `npx supabase db push` — push schema changes

## project structure
- `/app` — Next.js App Router pages
- `/app/api` — backend API routes
- `/components` — reusable UI components
- `/lib/supabase.ts` — db client
- `/lib/anthropic.ts` — AI client
- `/types` — shared TypeScript types

## key conventions
- Use TypeScript strictly — no `any` types
- API routes go in `/app/api/[route]/route.ts`
- All DB calls go through `/lib/supabase.ts`, never inline
- Anthropic calls go through `/lib/anthropic.ts` only
- Use named exports for components, default exports for pages

## data model (key tables)
- `friends` — id, user_id, name, preferred_contact, frequency_days
- `interactions` — id, friend_id, type (text/hangout), notes, mood, topics[], date
- `users` — managed by Clerk

## warnings
- Never commit `.env.local` — it has the Anthropic + Supabase keys
- Supabase RLS (row-level security) is enabled — always filter by user_id
- Anthropic calls are in API routes only, never in client components (hides the key)