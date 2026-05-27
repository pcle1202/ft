import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { note } = await request.json() as { note: string };
    if (!note?.trim()) {
      return NextResponse.json({ topics: [] });
    }

    const prompt = `Extract 3-5 topic tags from this interaction note. Return only a JSON array of short lowercase tags (1-3 words each), no explanations.\nNote: "${note}"\nExample: ["new job", "dog", "career change"]\nReturn only the JSON array.`;

    const response = await generateAIResponse(prompt);
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) return NextResponse.json({ topics: [] });
    const topics = JSON.parse(match[0]) as unknown;
    if (!Array.isArray(topics)) return NextResponse.json({ topics: [] });
    const cleaned = topics.filter((t): t is string => typeof t === "string").slice(0, 5);
    return NextResponse.json({ topics: cleaned });
  } catch {
    return NextResponse.json({ topics: [] });
  }
}
