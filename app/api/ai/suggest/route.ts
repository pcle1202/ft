import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { name, notes } = await request.json() as { name: string; notes: string[] };
    if (!name || !notes?.length) {
      return NextResponse.json({ suggestions: [] });
    }

    const recentNotes = notes.slice(0, 5).map((n) => `- ${n}`).join("\n");
    const prompt = `Recent notes about ${name}:\n${recentNotes}\n\nSuggest 2-3 short topic phrases to bring up next time (like "how the exhibit went" or "marathon training"). Reference specific details from the notes. Return only a JSON array of short phrases.\nExample: ["how the exhibit went", "kitten update"]\nReturn only the JSON array.`;

    const response = await generateAIResponse(prompt);
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ suggestions: [] });
    const parsed = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(parsed)) return NextResponse.json({ suggestions: [] });
    const suggestions = parsed.filter((s): s is string => typeof s === "string").slice(0, 3);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
