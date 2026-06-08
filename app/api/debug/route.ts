import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json({
      userId: session.userId,
      sessionId: session.sessionId ?? null,
      hasUser: !!session.userId,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
