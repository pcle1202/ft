import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

type MonthlyFriend = {
  name: string;
  interactions: Array<{ type: string; date: string; notes?: string }>;
};

export async function POST(request: NextRequest) {
  try {
    const { friends, monthName } = await request.json() as {
      friends: MonthlyFriend[];
      monthName: string;
    };

    const active = (friends ?? []).filter((f) => f.interactions.length > 0);
    if (!active.length) return NextResponse.json({ report: null });

    const lines = active
      .map((f) => {
        const items = f.interactions
          .map((i) => {
            const d = new Date(i.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return `${i.type} on ${d}${i.notes ? ` (${i.notes})` : ""}`;
          })
          .join("; ");
        return `${f.name}: ${items}`;
      })
      .join("\n");

    const prompt = `You are summarizing someone's social activity for ${monthName}. Write 2-3 sentences in SECOND PERSON ONLY ("you", "your"). STRICT RULES — violating any of these is a failure:
- Never start with "Dear" or any greeting
- Never use the word "I" or "I've" or "I'm" anywhere
- No em dashes
- No sentimental or flowery language
- Start directly with a factual observation
- Use American double quotation marks (" ") not single quotes (' ')

Friend interactions:\n${lines}\n\nMention specific friends by name. Note who got the most attention and who got less. Keep it plain and direct.`;

    const report = await generateAIResponse(prompt);
    return NextResponse.json({ report: report.trim() });
  } catch (err) {
    console.error("AI /monthly error:", err);
    return NextResponse.json({ report: null });
  }
}
