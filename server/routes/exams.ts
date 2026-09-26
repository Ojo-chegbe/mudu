import { db, nowIso } from "../db";
import { apiError, badRequest, json, notFound } from "../http";
import { formatGap } from "../network";
import { extendSessionTime, submitSession } from "../repositories/sessions";

type ActionType = "extend_time" | "force_submit" | "dismiss_flags";

export function findStudentForExam(examId: string, matric: string) {
  return db
    .query(
      `SELECT rs.id AS studentId, rs.full_name AS fullName, e.id AS examId, e.title AS examTitle, e.status AS examStatus, e.duration_minutes AS durationMinutes
       FROM exams e
       JOIN roster_students rs ON rs.roster_id = e.roster_id
       WHERE e.id = ? AND rs.matric_number = ?
       LIMIT 1`
    )
    .get(examId, matric) as
    | { studentId: string; fullName: string; examId: string; examTitle: string; examStatus: string; durationMinutes: number }
    | null;
}

export async function handleExamRoutes(request: Request, pathname: string): Promise<Response | null> {
  return null;
}

export function studentExamStateError(status: string): Response | null {
  if (status === "Completed") {
    return apiError(409, "EXAM_ENDED", "This exam has ended.");
  }

  if (status === "Draft" || status === "Published") {
    return apiError(409, "EXAM_NOT_STARTED", "The exam has not started yet.");
  }

  return null;
}
