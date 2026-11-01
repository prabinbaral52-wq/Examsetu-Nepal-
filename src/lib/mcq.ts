import { z } from "zod";

export const generatedMcqSchema = z.object({
  question: z.string().trim().min(10).max(2000),
  options: z.array(z.string().trim().min(1).max(500)).length(4),
  correct_option_index: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1).max(2000),
  difficulty: z.enum(["easy", "medium", "hard"]),
  topic: z.string().trim().min(1).max(200),
  source_page: z.number().int().positive().nullable(),
  source_text: z.string().trim().min(1).max(5000),
});

export const generatedMcqListSchema = z.array(generatedMcqSchema).min(1).max(50);
export type GeneratedMcq = z.infer<typeof generatedMcqSchema>;

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 nepali]/g, "").replace(/\s+/g, " ").trim();
}

export function findDuplicateMcqs(questions: GeneratedMcq[]) {
  const seen = new Map<string, number>();
  const duplicates: number[] = [];
  questions.forEach((question, index) => {
    const key = normalize(question.question);
    if (seen.has(key)) duplicates.push(index);
    else seen.set(key, index);
  });
  return duplicates;
}

export function assertGroundedMcq(question: GeneratedMcq) {
  const source = normalize(question.source_text);
  const explanation = normalize(question.explanation);
  if (!source.includes(normalize(question.topic)) && !explanation.includes(normalize(question.topic))) {
    throw new Error("Question topic is not supported by the supplied source text.");
  }
  if (new Set(question.options.map(normalize)).size !== 4) {
    throw new Error("Question options must be unique.");
  }
}
