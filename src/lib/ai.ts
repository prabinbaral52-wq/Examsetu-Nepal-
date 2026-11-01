import { generatedMcqListSchema, type GeneratedMcq } from "@/lib/mcq";

export interface McqProvider {
  generateMcqs(input: { sourceText: string; count: number; language: "en" | "ne" | "both" }): Promise<GeneratedMcq[]>;
}

class GeminiMcqProvider implements McqProvider {
  async generateMcqs(input: { sourceText: string; count: number; language: "en" | "ne" | "both" }) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const prompt = [
      "Generate grounded multiple-choice questions only from the supplied source.",
      `Return strict JSON array with exactly ${input.count} items.`,
      `Language: ${input.language}. Each item must include question, options (4), correct_option_index, explanation, difficulty, topic, source_page, source_text.`,
      "Do not invent facts and do not copy long passages.",
      `SOURCE:\n${input.sourceText}`,
    ].join("\n\n");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json" } }),
    });
    if (!response.ok) throw new Error(`AI provider request failed with status ${response.status}.`);
    const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("AI provider returned no generated content.");
    let decoded: unknown;
    try {
      decoded = JSON.parse(text);
    } catch {
      throw new Error("AI provider returned malformed JSON.");
    }
    const parsed = generatedMcqListSchema.safeParse(decoded);
    if (!parsed.success) throw new Error("AI provider returned invalid MCQ JSON.");
    return parsed.data;
  }
}

export const mcqProvider: McqProvider = new GeminiMcqProvider();
