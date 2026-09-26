import { buildGenerationPrompt } from "./prompts";
import { generateWithGoogle } from "./googleGemmaProvider";
import { validateGeneratedQuestions, GeneratedQuestion } from "./validators";

export { extractText, generateTextHash } from "./textExtraction";

export async function generateQuestions(
  sourceText: string,
  difficulty: string,
  requestedCount: number
): Promise<GeneratedQuestion[]> {
  const prompt = buildGenerationPrompt(sourceText, difficulty, requestedCount);
  const rawData = await generateWithGoogle(prompt);
  const validated = validateGeneratedQuestions(rawData);

  if (validated.length === 0) {
    throw new Error("AI provider returned no valid questions.");
  }

  return validated;
}
