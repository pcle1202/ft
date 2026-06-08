import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS friends (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        notes TEXT,
        bio TEXT,
        lives_in TEXT,
        birthday TEXT,
        met_at TEXT,
        color TEXT,
        photo_url TEXT,
        next_topics TEXT[],
        text_frequency_days INTEGER NOT NULL DEFAULT 14,
        hangout_frequency_days INTEGER NOT NULL DEFAULT 30,
        last_texted TIMESTAMPTZ,
        last_hung_out TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS interactions (
        id TEXT PRIMARY KEY,
        friend_id TEXT NOT NULL REFERENCES friends(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        date TIMESTAMPTZ NOT NULL,
        notes TEXT,
        location TEXT,
        mood TEXT,
        topics TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_interactions_friend_id ON interactions(friend_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id)`;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("db-init error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
