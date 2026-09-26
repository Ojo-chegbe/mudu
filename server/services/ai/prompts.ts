export function buildGenerationPrompt(
  sourceText: string,
  difficulty: string,
  requestedCount: number
): string {
  return `
You are an expert exam generator for MUDU, a local-first exam delivery system.
Your task is to generate EXACTLY ${requestedCount} high-quality questions based on the source text provided below.

The target difficulty is: ${difficulty}.
Mix the questions to include multiple choice (MCQ), fill-in-the-blank (FILL), and essay (ESSAY) types. 
Aim for roughly 60% MCQ, 20% FILL, and 20% ESSAY if possible.

RULES FOR EACH QUESTION TYPE:

For MCQ (Multiple Choice Question):
- Provide exactly 4 plausible options.
- The 'correctAnswer' MUST be exactly equal to one of the string items in the 'options' array.
- Points: 1 or 2.

For FILL (Fill-in-the-blank):
- The question 'text' MUST contain a blank indicated by "_____" where the missing word should go.
- The 'options' array MUST be completely empty [].
- The 'correctAnswer' MUST be exactly the missing word or short phrase.
- Points: 1 to 3.

For ESSAY:
- The 'options' array MUST be completely empty [].
- The 'correctAnswer' MUST be empty string or a very brief grading rubric hint.
- Points: 5 to 10.

Source Text:
"""
${sourceText}
"""
`;
}
