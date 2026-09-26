import { GoogleGenAI, Type } from "@google/genai";
import { config } from "../../config";

export async function generateWithGoogle(prompt: string): Promise<any[]> {
  const apiKey = config.ai.googleApiKey;
  if (!apiKey) {
    throw new Error("MUDU_GOOGLE_AI_API_KEY is not set in environment.");
  }

  const modelName = config.ai.model || "gemini-1.5-flash";

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              enum: ["MCQ", "FILL", "ESSAY"],
              description: "The type of question"
            },
            text: {
              type: Type.STRING,
              description: "The question text"
            },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of exactly 4 options if MCQ, empty otherwise"
            },
            correctAnswer: {
              type: Type.STRING,
              description: "The correct option exactly matching an element in options (if MCQ), or the word to fill (if FILL)"
            },
            points: {
              type: Type.INTEGER,
              description: "Points to award for this question"
            }
          },
          required: ["type", "text", "options", "correctAnswer", "points"]
        }
      }
    }
  });

  if (!response.text) {
    throw new Error("Empty response from Google AI.");
  }

  let rawText = response.text;
  
  // Strip conversational text by finding the bounds of the JSON array
  const firstBracket = rawText.indexOf('[');
  const lastBracket = rawText.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    rawText = rawText.substring(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(rawText);
  } catch (err) {
    throw new Error("Failed to parse JSON response from Google AI: " + rawText.substring(0, 50) + "...");
  }
}
