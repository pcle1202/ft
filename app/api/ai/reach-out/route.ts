import { NextRequest, NextResponse } from "next/server";
import { generateAIResponse } from "@/lib/groq";

type ReachOutFriend = {
  name: string;
  category: string;
  daysSince: number;
  frequencyDays: number;
  overdueBy: number;
  healthScore: number;
};

export async function POST(request: NextRequest) {
  try {
    const { friends } = await request.json() as { friends: ReachOutFriend[] };
    if (!friends?.length) return NextResponse.json({ reasons: [] });

    const reasons = await Promise.all(
      friends.map(async (f) => {
        const contactInfo =
          f.daysSince >= 9999
            ? "never been contacted"
            : `last contact ${f.daysSince} days ago`;
        const overdueInfo =
          f.overdueBy > 0
            ? `, ${f.overdueBy} days behind their contact goal (goal: every ${f.frequencyDays} days)`
            : `, within frequency goal of every ${f.frequencyDays} days`;
        const data = `${f.name} (${f.category}): ${contactInfo}${overdueInfo}, health score ${f.healthScore}/100`;

        const prompt = `In one casual sentence, explain why the user should reach out to ${f.name} based on this data: ${data}. Be specific and warm, not robotic. Don't start with "You should" — be more conversational.`;

        try {
          const reason = await generateAIResponse(prompt);
          return { name: f.name, reason: reason.trim() };
        } catch {
          return {
            name: f.name,
            reason: `It's been a while since you connected with ${f.name}.`,
          };
        }
      })
    );

    return NextResponse.json({ reasons });
  } catch {
    return NextResponse.json({ reasons: [] });
  }
}
