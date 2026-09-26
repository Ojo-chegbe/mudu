import { db, makeId, nowIso } from "../db";

export type AiGenerationJob = {
  id: string;
  lecturerId: string | null;
  examId: string | null;
  sourceType: string;
  sourceName: string | null;
  sourceTextHash: string | null;
  difficulty: string;
  requestedCount: number;
  model: string;
  status: "Pending" | "Running" | "Complete" | "Failed";
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export function createAiJob(job: Omit<AiGenerationJob, "id" | "createdAt" | "updatedAt">): AiGenerationJob {
  const id = makeId("job");
  const now = nowIso();

  db.query(
    `INSERT INTO ai_generation_jobs 
      (id, lecturer_id, exam_id, source_type, source_name, source_text_hash, difficulty, requested_count, model, status, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    job.lecturerId,
    job.examId,
    job.sourceType,
    job.sourceName,
    job.sourceTextHash,
    job.difficulty,
    job.requestedCount,
    job.model,
    job.status,
    job.errorMessage,
    now,
    now
  );

  return { ...job, id, createdAt: now, updatedAt: now };
}

export function updateAiJobStatus(id: string, status: AiGenerationJob["status"], errorMessage: string | null = null): void {
  db.query(
    "UPDATE ai_generation_jobs SET status = ?, error_message = ?, updated_at = ? WHERE id = ?"
  ).run(status, errorMessage, nowIso(), id);
}

export function getAiJobById(id: string): AiGenerationJob | null {
  const row = db.query("SELECT * FROM ai_generation_jobs WHERE id = ?").get(id) as any;
  if (!row) return null;

  return {
    id: row.id,
    lecturerId: row.lecturer_id,
    examId: row.exam_id,
    sourceType: row.source_type,
    sourceName: row.source_name,
    sourceTextHash: row.source_text_hash,
    difficulty: row.difficulty,
    requestedCount: row.requested_count,
    model: row.model,
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
