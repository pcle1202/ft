import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { Friend } from "@/types/friend";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const friend: Friend = await req.json();

    await sql`
      UPDATE friends SET
        name = ${friend.name},
        category = ${friend.category},
        notes = ${friend.notes ?? null},
        bio = ${friend.bio ?? null},
        lives_in = ${friend.livesIn ?? null},
        birthday = ${friend.birthday ?? null},
        met_at = ${friend.metAt ?? null},
        color = ${friend.color ?? null},
        photo_url = ${friend.photoUrl ?? null},
        next_topics = ${friend.nextTopics ?? []},
        text_frequency_days = ${friend.textFrequencyDays},
        hangout_frequency_days = ${friend.hangoutFrequencyDays},
        last_texted = ${friend.lastTexted ?? null},
        last_hung_out = ${friend.lastHungOut ?? null}
      WHERE id = ${id} AND user_id = ${userId}
    `;

    // Sync interactions: delete removed ones, upsert existing/new
    const incoming = friend.interactions ?? [];
    const incomingIds = incoming.map((i) => i.id);

    // Delete interactions no longer present
    if (incomingIds.length > 0) {
      await sql`
        DELETE FROM interactions
        WHERE friend_id = ${id} AND user_id = ${userId}
        AND id != ALL(${incomingIds})
      `;
    } else {
      await sql`DELETE FROM interactions WHERE friend_id = ${id} AND user_id = ${userId}`;
    }

    // Upsert each interaction
    for (const i of incoming) {
      await sql`
        INSERT INTO interactions (id, friend_id, user_id, type, date, notes, location, mood, topics)
        VALUES (
          ${i.id}, ${id}, ${userId}, ${i.type}, ${i.date},
          ${i.notes ?? null}, ${i.location ?? null}, ${i.mood ?? null},
          ${i.topics ?? null}
        )
        ON CONFLICT (id) DO UPDATE SET
          type = EXCLUDED.type,
          date = EXCLUDED.date,
          notes = EXCLUDED.notes,
          location = EXCLUDED.location,
          mood = EXCLUDED.mood,
          topics = EXCLUDED.topics
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/friends/[id] error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await sql`DELETE FROM friends WHERE id = ${id} AND user_id = ${userId}`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/friends/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
