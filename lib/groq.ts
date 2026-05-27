import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function generateAIResponse(prompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
  });
  return completion.choices[0]?.message?.content ?? "";
}
