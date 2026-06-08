import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { sql } from "@/lib/db";
import { Interaction } from "@/types/friend";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { friendId, interaction }: { friendId: string; interaction: Interaction } = await req.json();

    await sql`
      INSERT INTO interactions (id, friend_id, user_id, type, date, notes, location, mood, topics)
      VALUES (
        ${interaction.id}, ${friendId}, ${userId}, ${interaction.type}, ${interaction.date},
        ${interaction.notes ?? null}, ${interaction.location ?? null},
        ${interaction.mood ?? null}, ${interaction.topics ?? null}
      )
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/interactions error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
