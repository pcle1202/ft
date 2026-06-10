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

    const prompt = `Write exactly two short sentences about this person's social activity for ${monthName}. Use this format: "[Name] showed up the most. [Other name] has been quiet." Use first names only. Be specific. American English. No em dashes. No "I". Return only the two sentences, nothing else.

Friend interactions:\n${lines}`;

    const report = await generateAIResponse(prompt);
    return NextResponse.json({ report: report.trim() });
  } catch (err) {
    console.error("AI /monthly error:", err);
    return NextResponse.json({ report: null });
  }
}
