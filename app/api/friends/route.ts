import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { Friend } from "@/types/friend";

function rowToFriend(row: Record<string, unknown>, interactions: Record<string, unknown>[]): Friend {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as Friend["category"],
    notes: (row.notes as string) ?? undefined,
    bio: (row.bio as string) ?? undefined,
    livesIn: (row.lives_in as string) ?? undefined,
    birthday: (row.birthday as string) ?? undefined,
    metAt: (row.met_at as string) ?? undefined,
    color: (row.color as string) ?? undefined,
    photoUrl: (row.photo_url as string) ?? undefined,
    nextTopics: (row.next_topics as string[]) ?? [],
    textFrequencyDays: row.text_frequency_days as number,
    hangoutFrequencyDays: row.hangout_frequency_days as number,
    lastTexted: row.last_texted ? new Date(row.last_texted as string).toISOString() : undefined,
    lastHungOut: row.last_hung_out ? new Date(row.last_hung_out as string).toISOString() : undefined,
    createdAt: new Date(row.created_at as string).toISOString(),
    interactions: interactions.map((i) => ({
      id: i.id as string,
      type: i.type as "text" | "hangout" | "note",
      date: new Date(i.date as string).toISOString(),
      notes: (i.notes as string) ?? undefined,
      location: (i.location as string) ?? undefined,
      mood: (i.mood as string) ?? undefined,
      topics: (i.topics as string[]) ?? undefined,
    })),
  };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const friends = await sql`
      SELECT * FROM friends WHERE user_id = ${userId} ORDER BY created_at ASC
    `;
    const interactions = await sql`
      SELECT * FROM interactions WHERE user_id = ${userId} ORDER BY date DESC
    `;

    const byFriend = new Map<string, Record<string, unknown>[]>();
    for (const i of interactions) {
      const fid = i.friend_id as string;
      if (!byFriend.has(fid)) byFriend.set(fid, []);
      byFriend.get(fid)!.push(i as Record<string, unknown>);
    }

    const result = friends.map((f) =>
      rowToFriend(f as Record<string, unknown>, byFriend.get(f.id as string) ?? [])
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/friends error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    console.log("[POST /api/friends] userId:", userId);
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const friend: Friend = await req.json();
    console.log("[POST /api/friends] inserting friend:", friend.id, friend.name);

    await sql`
      INSERT INTO friends (
        id, user_id, name, category, notes, bio, lives_in, birthday, met_at,
        color, photo_url, next_topics, text_frequency_days, hangout_frequency_days,
        last_texted, last_hung_out, created_at
      ) VALUES (
        ${friend.id}, ${userId}, ${friend.name}, ${friend.category},
        ${friend.notes ?? null}, ${friend.bio ?? null}, ${friend.livesIn ?? null},
        ${friend.birthday ?? null}, ${friend.metAt ?? null}, ${friend.color ?? null},
        ${friend.photoUrl ?? null}, ${friend.nextTopics ?? []},
        ${friend.textFrequencyDays}, ${friend.hangoutFrequencyDays},
        ${friend.lastTexted ?? null}, ${friend.lastHungOut ?? null},
        ${friend.createdAt}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // Insert interactions if any (bulk import case)
    if (friend.interactions?.length) {
      for (const i of friend.interactions) {
        await sql`
          INSERT INTO interactions (id, friend_id, user_id, type, date, notes, location, mood, topics)
          VALUES (
            ${i.id}, ${friend.id}, ${userId}, ${i.type}, ${i.date},
            ${i.notes ?? null}, ${i.location ?? null}, ${i.mood ?? null},
            ${i.topics ?? null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/friends error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
