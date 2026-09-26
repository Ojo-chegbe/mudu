export type QuestionType = "MCQ" | "FILL" | "ESSAY";

export type GeneratedQuestion = {
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
};

export function validateGeneratedQuestions(data: any): GeneratedQuestion[] {
  if (!Array.isArray(data)) {
    throw new Error("Expected an array of questions from AI.");
  }

  const valid: GeneratedQuestion[] = [];

  for (const item of data) {
    try {
      if (!item.type || !["MCQ", "FILL", "ESSAY"].includes(item.type)) continue;
      if (typeof item.text !== "string" || !item.text.trim()) continue;
      
      const points = typeof item.points === "number" ? Math.floor(item.points) : 1;
      if (points <= 0) continue;

      let options: string[] = Array.isArray(item.options) ? item.options.map((o: any) => String(o).trim()) : [];
      let correctAnswer = String(item.correctAnswer || "").trim();

      if (item.type === "MCQ") {
        if (options.length < 2) continue;
        if (!options.includes(correctAnswer)) {
          // If the exact match fails, try to see if it's identical case-insensitive
          const match = options.find(o => o.toLowerCase() === correctAnswer.toLowerCase());
          if (match) {
            correctAnswer = match;
          } else {
            continue; // Cannot resolve correct answer
          }
        }
      } else if (item.type === "FILL") {
        if (!correctAnswer) continue;
        options = [];
      } else if (item.type === "ESSAY") {
        options = [];
      }

      valid.push({
        type: item.type as QuestionType,
        text: item.text.trim(),
        options,
        correctAnswer,
        points: Math.max(1, points)
      });
    } catch {
      // Safely ignore individual hallucinated items
      continue;
    }
  }

  return valid;
}
