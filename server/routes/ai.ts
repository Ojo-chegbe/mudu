import { db, makeId, nowIso } from "../db";
import { apiError, json } from "../http";
import { createAiJob, updateAiJobStatus, getAiJobById } from "../repositories/aiJobs";
import { config } from "../config";
import { extractText, generateTextHash, generateQuestions } from "../services/ai";

async function persistQuestions(examId: string, questions: any[]) {
  const now = nowIso();
  const nextOrder = db
    .query("SELECT COALESCE(MAX(order_index), -1) AS max_order FROM questions WHERE exam_id = ?")
    .get(examId) as { max_order: number };

  const insert = db.query(
    `INSERT INTO questions
      (id, exam_id, type, text, options_json, correct_answer, points, status, source, review_status, order_index, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', 'ai', 'Pending', ?, ?, ?)`
  );

  const created = questions.map((item, index) => {
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
      source: "ai",
      reviewStatus: "Pending",
      orderIndex,
      createdAt: now,
      updatedAt: now
    };
  });

  return created;
}

export async function handleAiRoutes(request: Request, pathname: string): Promise<Response | null> {
  // GET /api/ai/jobs/:jobId
  if (pathname.startsWith("/api/ai/jobs/") && request.method === "GET") {
    const jobId = pathname.split("/").pop();
    if (!jobId) return apiError(400, "MISSING_JOB_ID", "Job ID is required.");
    
    const job = getAiJobById(jobId);
    if (!job) return apiError(404, "JOB_NOT_FOUND", "AI Generation Job not found.");
    
    return json({ job });
  }

  // POST /api/ai/generate-from-text
  if (pathname === "/api/ai/generate-from-text" && request.method === "POST") {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "INVALID_BODY", "Request body must be valid JSON.");
    }

    const examId = body.examId?.trim();
    const sourceText = body.sourceText?.trim() ?? "";
    const difficulty = body.difficulty?.trim() || "Intermediate";
    const count = Number(body.count ?? 5);

    if (!examId || !sourceText) {
      return apiError(400, "MISSING_AI_INPUT", "examId and sourceText are required.");
    }

    const examExists = db.query("SELECT 1 AS ok FROM exams WHERE id = ? LIMIT 1").get(examId) as { ok: number } | null;
    if (!examExists) {
      return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
    }

    const sourceTextHash = generateTextHash(sourceText);
    const job = createAiJob({
      lecturerId: null, // Should link to session lecturer in future
      examId,
      sourceType: "text",
      sourceName: "Pasted Text",
      sourceTextHash,
      difficulty,
      requestedCount: count,
      model: config.ai.model,
      status: "Running",
      errorMessage: null
    });

    try {
      const generated = await generateQuestions(sourceText, difficulty, count);
      const saved = await persistQuestions(examId, generated);
      updateAiJobStatus(job.id, "Complete");
      return json({ job: { ...job, status: "Complete" }, questions: saved });
    } catch (err: any) {
      updateAiJobStatus(job.id, "Failed", err.message);
      return apiError(500, "AI_GENERATION_FAILED", err.message || "Failed to generate questions.");
    }
  }

  // POST /api/ai/generate-from-file
  if (pathname === "/api/ai/generate-from-file" && request.method === "POST") {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError(400, "INVALID_FORM_DATA", "Request must be valid multipart/form-data.");
    }

    const examId = String(formData.get("examId") || "").trim();
    const difficulty = String(formData.get("difficulty") || "Intermediate").trim();
    const count = Number(formData.get("count") || 5);
    const file = formData.get("file") as File | null;

    if (!examId || !file) {
      return apiError(400, "MISSING_AI_INPUT", "examId and file are required.");
    }

    const examExists = db.query("SELECT 1 AS ok FROM exams WHERE id = ? LIMIT 1").get(examId) as { ok: number } | null;
    if (!examExists) {
      return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
    }

    let sourceText = "";
    try {
      sourceText = await extractText(file);
    } catch (err: any) {
      return apiError(400, "TEXT_EXTRACTION_FAILED", err.message || "Failed to extract text from file.");
    }

    if (!sourceText.trim()) {
      return apiError(400, "EMPTY_DOCUMENT", "The extracted document text is empty.");
    }

    const sourceTextHash = generateTextHash(sourceText);
    const job = createAiJob({
      lecturerId: null,
      examId,
      sourceType: "file",
      sourceName: file.name,
      sourceTextHash,
      difficulty,
      requestedCount: count,
      model: config.ai.model,
      status: "Running",
      errorMessage: null
    });

    try {
      const generated = await generateQuestions(sourceText, difficulty, count);
      const saved = await persistQuestions(examId, generated);
      updateAiJobStatus(job.id, "Complete");
      return json({ job: { ...job, status: "Complete" }, questions: saved });
    } catch (err: any) {
      updateAiJobStatus(job.id, "Failed", err.message);
      return apiError(500, "AI_GENERATION_FAILED", err.message || "Failed to generate questions.");
    }
  }

  // POST /api/ai/questions/:questionId/approve
  if (pathname.startsWith("/api/ai/questions/") && pathname.endsWith("/approve") && request.method === "POST") {
    const questionId = pathname.split("/")[4];
    if (!questionId) return apiError(400, "MISSING_QUESTION_ID", "Question ID is required.");
    db.query("UPDATE questions SET review_status = 'Approved', status = 'Approved', updated_at = ? WHERE id = ? AND source = 'ai'").run(nowIso(), questionId);
    return json({ status: "ok" });
  }

  // POST /api/ai/questions/:questionId/discard
  if (pathname.startsWith("/api/ai/questions/") && pathname.endsWith("/discard") && request.method === "POST") {
    const questionId = pathname.split("/")[4];
    if (!questionId) return apiError(400, "MISSING_QUESTION_ID", "Question ID is required.");
    db.query("DELETE FROM questions WHERE id = ? AND source = 'ai' AND review_status = 'Pending'").run(questionId);
    return json({ status: "ok" });
  }

  return null;
}
