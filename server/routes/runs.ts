import { db } from "../db";
import { apiError, json } from "../http";
import { getExamById, updateExam } from "../repositories/exams";
import { findRosterById } from "../repositories/rosters";
import { submitSession, extendSessionTime } from "../repositories/sessions";
import { createExamRun, endRun, getRunById, openRunLobby, startRun } from "../repositories/runs";
import { requireLecturer } from "../services/auth";
import { gradeObjectiveSubmission } from "../services/grading";
import { deriveRemainingSeconds, syncManagedSessionTimer } from "../services/timers";
import { formatGap } from "../network";

const CREATE_EXAM_RUN_RE = /^\/api\/exams\/([^/]+)\/runs$/;
const OPEN_RUN_LOBBY_RE = /^\/api\/runs\/([^/]+)\/open-lobby$/;
const START_RUN_RE = /^\/api\/runs\/([^/]+)\/start$/;
const END_RUN_RE = /^\/api\/runs\/([^/]+)\/end$/;
const RUN_SESSIONS_RE = /^\/api\/runs\/([^/]+)\/sessions$/;
const RUN_EXTEND_TIME_RE = /^\/api\/runs\/([^/]+)\/sessions\/([^/]+)\/extend-time$/;
const RUN_DISMISS_FLAGS_RE = /^\/api\/runs\/([^/]+)\/sessions\/([^/]+)\/dismiss-flags$/;
const RUN_FORCE_SUBMIT_RE = /^\/api\/runs\/([^/]+)\/sessions\/([^/]+)\/force-submit$/;
const JOIN_CODE_MAX_ATTEMPTS = 6;

type MonitoringSessionRecord = {
  id: string;
  name: string;
  matric: string;
  status: string;
  question: string;
  currentQuestion: number;
  flags: number;
  reconnectGap: string;
  reconnectGapSeconds: number;
  timeRemaining: number;
};

type RunSessionContext = {
  sessionId: string;
  runId: string;
  examId: string;
  studentId: string;
  matric: string;
  name: string;
  status: string;
  currentQuestionIndex: number;
  submittedAt: string | null;
  revokedAt: string | null;
  endsAt: string;
  flagCount: number;
};

function generateJoinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function isJoinCodeConflictError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return error.message.toLowerCase().includes("exam_runs.join_code");
}

function logMonitoringEvent(input: {
  runId: string;
  studentSessionId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}): void {
  const occurredAt = new Date().toISOString();
  db.query(
    `INSERT INTO session_events
      (id, run_id, student_session_id, event_type, severity, payload_json, occurred_at)
     VALUES (?, ?, ?, ?, 'info', ?, ?)`
  ).run(
    `se_${crypto.randomUUID()}`,
    input.runId,
    input.studentSessionId,
    input.eventType,
    JSON.stringify(input.payload ?? {}),
    occurredAt
  );
}

function getRunSessionContext(runId: string, sessionId: string): RunSessionContext | null {
  const row = db
    .query(
      `SELECT
          ss.id AS sessionId,
          ss.run_id AS runId,
          er.exam_id AS examId,
          ss.student_id AS studentId,
          rs.matric_number AS matric,
          rs.full_name AS name,
          ss.status AS status,
          ss.current_question_index AS currentQuestionIndex,
          ss.submitted_at AS submittedAt,
          ss.revoked_at AS revokedAt,
          ss.ends_at AS endsAt,
          ss.flag_count AS flagCount
       FROM student_sessions ss
       JOIN exam_runs er ON er.id = ss.run_id
       JOIN roster_students rs ON rs.id = ss.student_id
       WHERE ss.run_id = ? AND ss.id = ?
       LIMIT 1`
    )
    .get(runId, sessionId) as RunSessionContext | null;
  if (!row) {
    return null;
  }

  const synced = syncManagedSessionTimer({
    id: row.sessionId,
    examId: row.examId,
    studentId: row.studentId,
    runId: row.runId,
    status: row.status,
    currentQuestionIndex: row.currentQuestionIndex,
    submittedAt: row.submittedAt,
    revokedAt: row.revokedAt,
    endsAt: row.endsAt,
    flagCount: row.flagCount
  });

  return {
    ...row,
    status: synced.status,
    currentQuestionIndex: Number(synced.currentQuestionIndex ?? row.currentQuestionIndex),
    submittedAt: synced.submittedAt,
    revokedAt: synced.revokedAt,
    endsAt: synced.endsAt,
    flagCount: Number(synced.flagCount ?? row.flagCount)
  };
}

function listRunSessions(runId: string): MonitoringSessionRecord[] {
  const run = getRunById(runId);
  if (!run) {
    return [];
  }

  const rows = db
    .query(
      `SELECT
          ss.id AS sessionId,
          ss.run_id AS runId,
          er.exam_id AS examId,
          ss.student_id AS studentId,
          rs.full_name AS name,
          rs.matric_number AS matric,
          ss.status AS status,
          ss.current_question_index AS currentQuestionIndex,
          ss.submitted_at AS submittedAt,
          ss.revoked_at AS revokedAt,
          ss.ends_at AS endsAt,
          ss.flag_count AS flagCount,
          COALESCE(es.reconnect_gap_seconds, 0) AS reconnectGapSeconds
       FROM student_sessions ss
       JOIN exam_runs er ON er.id = ss.run_id
       JOIN roster_students rs ON rs.id = ss.student_id
       LEFT JOIN exam_sessions es
         ON es.exam_id = er.exam_id
        AND es.student_id = ss.student_id
       WHERE ss.run_id = ?
       ORDER BY rs.full_name ASC`
    )
    .all(runId) as Array<RunSessionContext & { reconnectGapSeconds: number }>;

  return rows.map((row) => {
    const synced = syncManagedSessionTimer({
      id: row.sessionId,
      examId: row.examId,
      studentId: row.studentId,
      runId: row.runId,
      status: row.status,
      currentQuestionIndex: row.currentQuestionIndex,
      submittedAt: row.submittedAt,
      revokedAt: row.revokedAt,
      endsAt: row.endsAt,
      flagCount: row.flagCount
    }) as RunSessionContext;
    const currentQuestion = Number(synced.currentQuestionIndex ?? 0) + 1;
    const reconnectGapSeconds = Number(row.reconnectGapSeconds ?? 0);

    return {
      id: row.sessionId,
      name: row.name,
      matric: row.matric,
      status: synced.status,
      question: synced.status === "Submitted" ? "Done" : `Q${currentQuestion}`,
      currentQuestion,
      flags: Number(synced.flagCount ?? 0),
      reconnectGap: formatGap(reconnectGapSeconds),
      reconnectGapSeconds,
      timeRemaining: synced.status === "Submitted" ? 0 : deriveRemainingSeconds(synced.endsAt)
    };
  });
}

async function createRun(request: Request, examId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const exam = getExamById(examId);
  if (!exam) {
    return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  }

  const rosterId = exam.rosterId?.trim();
  if (!rosterId) {
    return apiError(400, "EXAM_ROSTER_REQUIRED", "Exam must be linked to a roster before creating a run.");
  }

  const roster = findRosterById(rosterId);
  if (!roster) {
    return apiError(404, "ROSTER_NOT_FOUND", "Linked roster not found.");
  }

  for (let attempt = 0; attempt < JOIN_CODE_MAX_ATTEMPTS; attempt += 1) {
    const joinCode = generateJoinCode();
    try {
      const run = createExamRun({
        examId: exam.id,
        rosterId: roster.id,
        joinCode
      });
      return json(run, 201);
    } catch (error) {
      if (isJoinCodeConflictError(error)) {
        continue;
      }
      throw error;
    }
  }

  return apiError(409, "JOIN_CODE_COLLISION", "Could not allocate a unique run join code. Please try again.", {
    attempts: JOIN_CODE_MAX_ATTEMPTS
  });
}

async function openLobby(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const run = getRunById(runId);
  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");
  }

  if (run.status !== "Draft") {
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be moved to lobby from its current state.", {
      currentStatus: run.status,
      expectedStatus: "Draft"
    });
  }

  const updated = openRunLobby(runId);
  if (!updated) {
    const latest = getRunById(runId);
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be moved to lobby from its current state.", {
      currentStatus: latest?.status ?? "Unknown",
      expectedStatus: "Draft"
    });
  }

  return json(updated, 200);
}

async function startExamRun(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const run = getRunById(runId);
  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");
  }

  const exam = getExamById(run.examId);
  if (!exam) {
    return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  }

  if (exam.status !== "Published") {
    return apiError(409, "EXAM_NOT_PUBLISHED", "Only published exams can be started.");
  }

  if (run.status !== "Lobby") {
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be started from its current state.", {
      currentStatus: run.status,
      expectedStatus: "Lobby"
    });
  }

  const durationSeconds = Math.floor(exam.durationMinutes * 60);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || !Number.isInteger(durationSeconds)) {
    return apiError(400, "INVALID_EXAM_DURATION", "Exam duration must be a positive number of seconds.");
  }

  const updated = startRun(runId, durationSeconds);
  if (!updated) {
    const latest = getRunById(runId);
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be started from its current state.", {
      currentStatus: latest?.status ?? "Unknown",
      expectedStatus: "Lobby"
    });
  }

  updateExam(exam.id, { status: "Running" });
  return json(updated, 200);
}

async function endExamRun(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const run = getRunById(runId);
  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");
  }

  if (run.status !== "Running") {
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be ended from its current state.", {
      currentStatus: run.status,
      expectedStatus: "Running"
    });
  }

  const updated = endRun(runId);
  if (!updated) {
    const latest = getRunById(runId);
    return apiError(409, "INVALID_RUN_TRANSITION", "Exam run cannot be ended from its current state.", {
      currentStatus: latest?.status ?? "Unknown",
      expectedStatus: "Running"
    });
  }

  updateExam(run.examId, { status: "Completed" });
  return json(updated, 200);
}

async function getMonitoringSessions(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const run = getRunById(runId);
  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");
  }

  return json({ sessions: listRunSessions(runId) });
}

async function extendRunSessionTime(request: Request, runId: string, sessionId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const context = getRunSessionContext(runId, sessionId);
  if (!context) {
    return apiError(404, "SESSION_NOT_FOUND", "Student session not found for this run.");
  }
  if (context.submittedAt || context.status === "Submitted") {
    return apiError(409, "INVALID_STATE_TRANSITION", "Cannot extend time for a submitted session.");
  }

  const body = (await request.json().catch(() => null)) as { minutes?: number } | null;
  const minutes = Math.max(1, Math.floor(Number(body?.minutes ?? 10)));
  const addedSeconds = minutes * 60;
  const updated = extendSessionTime(sessionId, addedSeconds);
  if (!updated) {
    return apiError(500, "SESSION_UPDATE_FAILED", "Failed to extend student session time.");
  }

  db.query(
    `UPDATE exam_sessions
     SET time_remaining_seconds = time_remaining_seconds + ?,
         updated_at = ?
     WHERE exam_id = ? AND student_id = ?`
  ).run(addedSeconds, new Date().toISOString(), context.examId, context.studentId);

  logMonitoringEvent({
    runId,
    studentSessionId: sessionId,
    eventType: "session.extend_time",
    payload: { addedSeconds, minutes, matric: context.matric }
  });

  return json({ status: "ok", session: updated });
}

async function dismissRunSessionFlags(request: Request, runId: string, sessionId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const context = getRunSessionContext(runId, sessionId);
  if (!context) {
    return apiError(404, "SESSION_NOT_FOUND", "Student session not found for this run.");
  }
  if (context.submittedAt || context.status === "Submitted") {
    return apiError(409, "INVALID_STATE_TRANSITION", "Cannot dismiss flags after submission.");
  }

  const now = new Date().toISOString();
  db.query(
    `UPDATE student_sessions
     SET flag_count = 0,
         status = CASE
           WHEN status = 'Flagged' THEN 'Active'
           ELSE status
         END,
         last_seen_at = ?
     WHERE id = ?`
  ).run(now, sessionId);
  db.query(
    `UPDATE exam_sessions
     SET flags_count = 0,
         status = CASE
           WHEN status = 'Flagged' THEN 'Active'
           ELSE status
         END,
         updated_at = ?
     WHERE exam_id = ? AND student_id = ?`
  ).run(now, context.examId, context.studentId);

  logMonitoringEvent({
    runId,
    studentSessionId: sessionId,
    eventType: "session.dismiss_flags",
    payload: { matric: context.matric }
  });

  return json({ status: "ok" });
}

async function forceSubmitRunSession(request: Request, runId: string, sessionId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) {
    return auth;
  }

  const context = getRunSessionContext(runId, sessionId);
  if (!context) {
    return apiError(404, "SESSION_NOT_FOUND", "Student session not found for this run.");
  }
  if (context.submittedAt || context.status === "Submitted") {
    return apiError(409, "INVALID_STATE_TRANSITION", "Session is already submitted.");
  }

  const submitted = submitSession(sessionId);
  if (!submitted) {
    return apiError(500, "SESSION_UPDATE_FAILED", "Failed to submit student session.");
  }

  const now = new Date().toISOString();
  db.query(
    `UPDATE exam_sessions
     SET status = 'Submitted',
         submitted_at = ?,
         updated_at = ?
     WHERE exam_id = ? AND student_id = ?`
  ).run(now, now, context.examId, context.studentId);
  gradeObjectiveSubmission(sessionId);

  logMonitoringEvent({
    runId,
    studentSessionId: sessionId,
    eventType: "session.force_submit",
    payload: { matric: context.matric }
  });

  return json({ status: "ok", session: submitted });
}

export async function handleRunRoutes(request: Request, pathname: string): Promise<Response | null> {
  const createMatch = pathname.match(CREATE_EXAM_RUN_RE);
  if (createMatch && request.method === "POST") {
    const examId = decodeURIComponent(createMatch[1]);
    return createRun(request, examId);
  }

  const openLobbyMatch = pathname.match(OPEN_RUN_LOBBY_RE);
  if (openLobbyMatch && request.method === "POST") {
    const runId = decodeURIComponent(openLobbyMatch[1]);
    return openLobby(request, runId);
  }

  const startMatch = pathname.match(START_RUN_RE);
  if (startMatch && request.method === "POST") {
    const runId = decodeURIComponent(startMatch[1]);
    return startExamRun(request, runId);
  }

  const endMatch = pathname.match(END_RUN_RE);
  if (endMatch && request.method === "POST") {
    const runId = decodeURIComponent(endMatch[1]);
    return endExamRun(request, runId);
  }

  const sessionsMatch = pathname.match(RUN_SESSIONS_RE);
  if (sessionsMatch && request.method === "GET") {
    const runId = decodeURIComponent(sessionsMatch[1]);
    return getMonitoringSessions(request, runId);
  }

  const extendMatch = pathname.match(RUN_EXTEND_TIME_RE);
  if (extendMatch && request.method === "POST") {
    return extendRunSessionTime(request, decodeURIComponent(extendMatch[1]), decodeURIComponent(extendMatch[2]));
  }

  const dismissMatch = pathname.match(RUN_DISMISS_FLAGS_RE);
  if (dismissMatch && request.method === "POST") {
    return dismissRunSessionFlags(request, decodeURIComponent(dismissMatch[1]), decodeURIComponent(dismissMatch[2]));
  }

  const forceSubmitMatch = pathname.match(RUN_FORCE_SUBMIT_RE);
  if (forceSubmitMatch && request.method === "POST") {
    return forceSubmitRunSession(request, decodeURIComponent(forceSubmitMatch[1]), decodeURIComponent(forceSubmitMatch[2]));
  }

  return null;
}
