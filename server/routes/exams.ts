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

function getSessions(examId: string) {
  const rows = db
    .query(
      `SELECT
          rs.id AS studentId,
          rs.full_name AS name,
          rs.matric_number AS matric,
          es.status,
          es.current_question,
          es.flags_count AS flags,
          es.reconnect_gap_seconds AS gap,
          es.time_remaining_seconds AS timeRemaining
       FROM exam_sessions es
       JOIN roster_students rs ON rs.id = es.student_id
       WHERE es.exam_id = ?
       ORDER BY rs.full_name ASC`
    )
    .all(examId) as Array<{
      studentId: string;
      name: string;
      matric: string;
      status: string;
      current_question: number;
      flags: number;
      gap: number;
      timeRemaining: number;
    }>;

  return {
    sessions: rows.map((row) => ({
      id: row.studentId,
      name: row.name,
      matric: row.matric,
      status: row.status,
      question: row.status === "Submitted" ? "Done" : `Q${row.current_question}`,
      currentQuestion: row.current_question,
      flags: row.flags,
      reconnectGap: formatGap(row.gap),
      reconnectGapSeconds: row.gap,
      timeRemaining: row.timeRemaining
    }))
  };
}

function getResults(examId: string) {
  const scoreBands = db
    .query("SELECT label AS range, count FROM score_bands WHERE exam_id = ? ORDER BY id ASC")
    .all(examId) as Array<{ range: string; count: number }>;

  const questionInsights = db
    .query(
      `SELECT question_ref AS id, question_type AS type, success_rate AS successRate, issue
       FROM question_insights
       WHERE exam_id = ?
       ORDER BY id ASC`
    )
    .all(examId) as Array<{ id: string; type: string; successRate: string; issue: string }>;

  return {
    scoreBands,
    questionInsights
  };
}

async function handleSessionAction(examId: string, matric: string, request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { action?: ActionType } | null;
  const action = body?.action;
  if (!action) {
    return apiError(400, "MISSING_ACTION", "Action is required.", { field: "action" });
  }

  const student = findStudentForExam(examId, matric);
  if (!student) {
    return notFound("Student not found for exam.");
  }

  const session = db
    .query("SELECT status FROM exam_sessions WHERE exam_id = ? AND student_id = ? LIMIT 1")
    .get(examId, student.studentId) as { status: string } | null;

  if (!session) {
    return notFound("Student session not found.");
  }

  const now = nowIso();
  const activeStudentSession = db
    .query(
      `SELECT ss.id AS sessionId, ss.run_id AS runId
       FROM student_sessions ss
       JOIN exam_runs er ON er.id = ss.run_id
       WHERE er.exam_id = ?
         AND ss.student_id = ?
         AND ss.submitted_at IS NULL
         AND ss.revoked_at IS NULL
       ORDER BY ss.joined_at DESC
       LIMIT 1`
    )
    .get(examId, student.studentId) as { sessionId: string; runId: string } | null;

  if (action === "extend_time") {
    if (session.status === "Submitted") {
      return apiError(409, "INVALID_STATE_TRANSITION", "Cannot extend time for a submitted session.");
    }
    db.query(
      "UPDATE exam_sessions SET time_remaining_seconds = time_remaining_seconds + 600, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, examId, student.studentId);
    if (activeStudentSession) {
      extendSessionTime(activeStudentSession.sessionId, 600);
      db.query(
        `INSERT INTO session_events
          (id, run_id, student_session_id, event_type, severity, payload_json, occurred_at)
         VALUES (?, ?, ?, 'time_extended', 'info', ?, ?)`
      ).run(
        `se_${crypto.randomUUID()}`,
        activeStudentSession.runId,
        activeStudentSession.sessionId,
        JSON.stringify({ addedSeconds: 600, matric }),
        now
      );
    }
  } else if (action === "force_submit") {
    if (session.status === "Submitted") {
      return apiError(409, "INVALID_STATE_TRANSITION", "Session is already submitted.");
    }
    db.query(
      "UPDATE exam_sessions SET status = 'Submitted', submitted_at = ?, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, now, examId, student.studentId);
    if (activeStudentSession) {
      submitSession(activeStudentSession.sessionId);
    }
  } else if (action === "dismiss_flags") {
    if (session.status === "Submitted") {
      return apiError(409, "INVALID_STATE_TRANSITION", "Cannot dismiss flags after submission.");
    }
    db.query(
      "UPDATE exam_sessions SET flags_count = 0, status = CASE WHEN status = 'Flagged' THEN 'Active' ELSE status END, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, examId, student.studentId);
    if (activeStudentSession) {
      db.query(
        `UPDATE student_sessions
         SET flag_count = 0,
             status = CASE WHEN status = 'Flagged' THEN 'Active' ELSE status END,
             last_seen_at = ?
         WHERE id = ?`
      ).run(now, activeStudentSession.sessionId);
      db.query(
        `INSERT INTO session_events
          (id, run_id, student_session_id, event_type, severity, payload_json, occurred_at)
         VALUES (?, ?, ?, 'flags_dismissed', 'info', ?, ?)`
      ).run(
        `se_${crypto.randomUUID()}`,
        activeStudentSession.runId,
        activeStudentSession.sessionId,
        JSON.stringify({ matric }),
        now
      );
    }
  } else {
    return apiError(400, "UNSUPPORTED_ACTION", "Unsupported action.");
  }

  return json({ status: "ok" });
}

export async function handleExamRoutes(request: Request, pathname: string): Promise<Response | null> {
  const sessionsMatch = pathname.match(/^\/api\/exams\/([^/]+)\/sessions$/);
  if (sessionsMatch && request.method === "GET") {
    return json(getSessions(decodeURIComponent(sessionsMatch[1])));
  }

  const resultsMatch = pathname.match(/^\/api\/exams\/([^/]+)\/results$/);
  if (resultsMatch && request.method === "GET") {
    return json(getResults(decodeURIComponent(resultsMatch[1])));
  }

  const actionMatch = pathname.match(/^\/api\/exams\/([^/]+)\/sessions\/([^/]+)\/actions$/);
  if (actionMatch && request.method === "POST") {
    return handleSessionAction(decodeURIComponent(actionMatch[1]), decodeURIComponent(actionMatch[2]), request);
  }

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
