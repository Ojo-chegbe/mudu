import { db, makeId, nowIso } from "../db";
import { apiError, json } from "../http";

type QuestionType = "MCQ" | "FILL" | "ESSAY";

function buildDraftQuestions(sourceText: string, count: number): Array<{
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
}> {
  const words = sourceText
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const safeCount = Math.max(1, Math.min(30, count));
  const items = [];

  for (let i = 0; i < safeCount; i += 1) {
    const base = words[(i * 5) % Math.max(words.length, 1)] ?? "concept";
    const normalized = base.replace(/[^a-z0-9]/gi, "").toLowerCase() || "concept";
    const type: QuestionType = i % 5 === 0 ? "ESSAY" : i % 2 === 0 ? "FILL" : "MCQ";

    if (type === "MCQ") {
      items.push({
        type,
        text: `Which statement best relates to ${normalized}?`,
        options: [`Core ${normalized}`, `Extended ${normalized}`, `Applied ${normalized}`, `Irrelevant ${normalized}`],
        correctAnswer: `Core ${normalized}`,
        points: 1
      });
      continue;
    }

    if (type === "FILL") {
      items.push({
        type,
        text: `Complete: ${normalized} is essential for _____.`,
        options: [],
        correctAnswer: normalized,
        points: 1
      });
      continue;
    }

    items.push({
      type,
      text: `Explain the role of ${normalized} in this course context.`,
      options: [],
      correctAnswer: "",
      points: 5
    });
  }

  return items;
}

export async function handleAiRoutes(request: Request, pathname: string): Promise<Response | null> {
  if (pathname !== "/api/ai/generate-from-text" || request.method !== "POST") {
    return null;
  }

  let body: {
    examId?: string;
    sourceText?: string;
    count?: number;
  };
  try {
    body = await request.json();
  } catch {
    return apiError(400, "INVALID_BODY", "Request body must be valid JSON.");
  }

  const examId = body.examId?.trim();
  const sourceText = body.sourceText?.trim() ?? "";
  const count = Number(body.count ?? 5);

  if (!examId || !sourceText) {
    return apiError(400, "MISSING_AI_INPUT", "examId and sourceText are required.");
  }

  const examExists = db.query("SELECT 1 AS ok FROM exams WHERE id = ? LIMIT 1").get(examId) as { ok: number } | null;
  if (!examExists) {
    return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  }

  const now = nowIso();
  const generated = buildDraftQuestions(sourceText, count);

  const nextOrder = db
    .query("SELECT COALESCE(MAX(order_index), -1) AS max_order FROM questions WHERE exam_id = ?")
    .get(examId) as { max_order: number };

  const insert = db.query(
    `INSERT INTO questions
      (id, exam_id, type, text, options_json, correct_answer, points, status, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`
  );

  const created = generated.map((item, index) => {
    const id = makeId("q");
    const orderIndex = Number(nextOrder.max_order ?? -1) + index + 1;
    insert.run(
      id,
      examId,
      item.type,
      item.text,
      JSON.stringify(item.options),
      item.correctAnswer,
      item.points,
      orderIndex,
      now,
      now
    );

    return {
      id,
      examId,
      type: item.type,
      text: item.text,
      options: item.options,
      correctAnswer: item.correctAnswer,
      points: item.points,
      status: "Pending",
      orderIndex,
      createdAt: now,
      updatedAt: now
    };
  });

  return json({ questions: created });
}
