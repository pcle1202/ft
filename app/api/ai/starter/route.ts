import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

export async function POST(request: NextRequest) {
  try {
    const { name, notes, interactions } = await request.json() as {
      name: string;
      notes?: string;
      interactions: Array<{ type: string; date: string; notes?: string }>;
    };

    if (!name) return NextResponse.json({ starter: null });

    const historyLines = (interactions ?? [])
      .slice(0, 6)
      .map((i) => {
        const d = new Date(i.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `- ${i.type} on ${d}${i.notes ? `: ${i.notes}` : ""}`;
      })
      .join("\n");

    const aboutLine = notes ? `About ${name}: ${notes}\n\n` : "";
    const prompt = `Use American English spelling and punctuation throughout. Use double quotation marks, not single. Write "organize" not "organise", "favorite" not "favourite", etc.\n${aboutLine}Recent history with ${name}:\n${historyLines}\n\nBased on this friendship history, write one warm and specific conversation starter the user could send right now. Reference something real from their history. Keep it to 1-2 sentences, casual and friendly. Do not wrap the message in quotation marks. If you use any quotes inside the text, use American double quotes (" ") not single quotes (' ').`;

    const starter = await generateAIResponse(prompt);
    return NextResponse.json({ starter: starter.trim() });
  } catch (err) {
    console.error("AI /starter error:", err);
    return NextResponse.json({ starter: null });
  }
}
