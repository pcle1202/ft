import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

type FriendSummaryInput = {
  name: string;
  category: string;
  healthLabel: string;
  lastContact: string;
};

export async function POST(request: NextRequest) {
  try {
    const { friends } = await request.json() as { friends: FriendSummaryInput[] };
    if (!friends?.length) {
      return NextResponse.json({ summary: null });
    }

    const lines = friends
      .map((f) => `${f.name} (${f.category}): ${f.healthLabel}, last contact ${f.lastContact}`)
      .join("\n");

    const prompt = `Friend circle data:\n${lines}\n\nWrite 2-3 short bullet points with specific, actionable observations. No "I" pronouns. No intro sentence. Just bullets starting with "-". Be direct and specific, not conversational.\nExample:\n- Maya and Jordan are healthy, reach out to Priya soon\n- Leo hasn't been contacted in 45 days, overdue by 24`;

    const summary = await generateAIResponse(prompt);
    return NextResponse.json({ summary: summary.trim() });
  } catch {
    return NextResponse.json({ summary: null });
  }
}
