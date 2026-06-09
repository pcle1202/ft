import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

const VALID_MOODS = ["warm", "deep", "fun", "awkward"] as const;

export async function POST(request: NextRequest) {
  try {
    const { note } = await request.json() as { note: string };
    if (!note?.trim()) {
      return NextResponse.json({ mood: null });
    }

    const prompt = `Classify the mood of this interaction as exactly one of: warm, deep, fun, awkward.\nwarm = caring and supportive, deep = serious or emotional, fun = lighthearted and playful, awkward = uncomfortable or distant.\nInteraction note: "${note}"\nRespond with only the single lowercase word.`;

    const response = await generateAIResponse(prompt);
    const mood = response.trim().toLowerCase().replace(/[^a-z]/g, "");
    const valid = VALID_MOODS.find((m) => mood.includes(m));
    return NextResponse.json({ mood: valid ?? null });
  } catch (err) {
    console.error("AI /mood error:", err);
    return NextResponse.json({ mood: null });
  }
}
