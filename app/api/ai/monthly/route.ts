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

    const prompt = `Friend interactions in ${monthName}:\n${lines}\n\nYou are a warm, encouraging friendship coach. Based on these interactions from this month, write a personal 3-4 sentence monthly recap. Mention specific friends by name. Note highlights, who they connected with most, and one gentle suggestion. Keep it warm and human, not clinical.`;

    const report = await generateAIResponse(prompt);
    return NextResponse.json({ report: report.trim() });
  } catch {
    return NextResponse.json({ report: null });
  }
}
