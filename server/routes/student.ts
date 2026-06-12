import { db, nowIso } from "../db";
import { apiError, json } from "../http";
import { listAnswersBySession, upsertAnswer } from "../repositories/answers";
import { getAppConfig } from "../repositories/config";
import { getRunById } from "../repositories/runs";
import { gradeObjectiveSubmission } from "../services/grading";
import { computeSessionEndsAt, deriveRemainingSeconds, syncManagedSessionTimer } from "../services/timers";
import { findStudentForExam, studentExamStateError } from "./exams";

function hashStudentToken(token: string): string {
  return new Bun.CryptoHasher("sha256").update(token).digest("hex");
}

function extractStudentToken(request: Request, fallbackToken?: string | null): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }

  const headerToken = request.headers.get("x-student-token")?.trim();
  return headerToken || fallbackToken || null;
}

function issueStudentToken(input: { runId: string; studentId: string; status: string; currentQuestion: number; endsAt: string }) {
  const token = `st_${crypto.randomUUID().replace(/-/g, "")}`;
  const tokenHash = hashStudentToken(token);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  db.query(
    `INSERT INTO student_sessions
      (id, run_id, student_id, token_hash, status, current_question_index, joined_at, last_seen_at, submitted_at, revoked_at, expires_at, ends_at, extra_time_seconds, flag_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 0, 0)`
  ).run(`ss_${crypto.randomUUID()}`, input.runId, input.studentId, tokenHash, input.status, Math.max(0, input.currentQuestion - 1), now, now, expiresAt, input.endsAt);

  return token;
}

function rotateStudentToken(sessionId: string): string {
  const token = `st_${crypto.randomUUID().replace(/-/g, "")}`;
  const tokenHash = hashStudentToken(token);
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  db.query("UPDATE student_sessions SET token_hash = ?, expires_at = ?, last_seen_at = ? WHERE id = ?")
    .run(tokenHash, expiresAt, nowIso(), sessionId);
  return token;
}

type ValidStudentSession = {
  id: string;
  runId: string;
  examId: string;
  studentId: string;
  status: string;
  currentQuestionIndex: number;
  submittedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  endsAt: string;
  flagCount: number;
};

type StudentEventType =
  | "fullscreen_exit"
  | "tab_hidden"
  | "visibility_lost"
  | "tab_visible"
  | "reconnect"
  | "client_disconnect";

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString();
}

function logSessionEvent(input: {
  runId: string;
  studentSessionId: string | null;
  eventType: string;
  severity: string;
  payload?: Record<string, unknown>;
}): void {
  db.query(
    `INSERT INTO session_events
      (id, run_id, student_session_id, event_type, severity, payload_json, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    `se_${crypto.randomUUID()}`,
    input.runId,
    input.studentSessionId,
    input.eventType,
    input.severity,
    JSON.stringify(input.payload ?? {}),
    nowIso()
  );
}

function isWithinRecoveryWindow(lastSeenAt: string | null, recoveryWindowMinutes: number): boolean {
  if (!lastSeenAt) {
    return true;
  }
  return lastSeenAt >= minutesAgoIso(recoveryWindowMinutes);
}

function recoveryWindowExpiredResponse(recoveryWindowMinutes: number): Response {
  return apiError(
    409,
    "RECOVERY_WINDOW_EXPIRED",
    "This session can no longer be recovered. Contact your invigilator.",
    { recoveryWindowMinutes }
  );
}

function logAutosaveFailure(input: {
  code: string;
  message: string;
  session?: ValidStudentSession | null;
  questionId?: string;
  currentQuestion?: number;
  details?: Record<string, unknown>;
}): void {
  const payload = {
    code: input.code,
    message: input.message,
    questionId: input.questionId ?? null,
    currentQuestion: input.currentQuestion ?? null,
    ...input.details
  };

  if (input.session) {
    logSessionEvent({
      runId: input.session.runId,
      studentSessionId: input.session.id,
      eventType: "autosave_error",
      severity: "warning",
      payload
    });
  }

  console.error(
    "[student_autosave_error]",
    JSON.stringify({
      runId: input.session?.runId ?? null,
      studentSessionId: input.session?.id ?? null,
      studentId: input.session?.studentId ?? null,
      ...payload
    })
  );
}

function warningMessageForSession(flagCount: number, status: string): string | null {
  if (status === "Disconnected") {
    return "Connection interruption detected. Return to the exam immediately.";
  }
  if (status === "Flagged" || flagCount > 0) {
    return "Suspicious activity was detected and logged. Continue your exam.";
  }
  return null;
}

function getValidStudentSessionByToken(token: string): ValidStudentSession | Response {
  const tokenHash = hashStudentToken(token);
  const row = db
    .query(
      `SELECT
          ss.id,
          ss.run_id AS runId,
          er.exam_id AS examId,
          ss.student_id AS studentId,
          ss.status,
          ss.current_question_index AS currentQuestionIndex,
          ss.submitted_at AS submittedAt,
          ss.expires_at AS expiresAt,
          ss.revoked_at AS revokedAt,
          ss.ends_at AS endsAt,
          ss.flag_count AS flagCount
       FROM student_sessions ss
       JOIN exam_runs er ON er.id = ss.run_id
       WHERE ss.token_hash = ?
       LIMIT 1`
    )
    .get(tokenHash) as ValidStudentSession | null;

  if (!row) {
    return apiError(401, "STUDENT_SESSION_INVALID", "Student session token is invalid.");
  }

  if (row.revokedAt && row.status !== "Submitted") {
    return apiError(401, "STUDENT_SESSION_REVOKED", "Student session has been revoked.");
  }

  if (row.expiresAt && row.expiresAt <= nowIso()) {
    return apiError(401, "STUDENT_SESSION_EXPIRED", "Student session has expired.");
  }

  return syncManagedSessionTimer({
    id: row.id,
    examId: row.examId,
    studentId: row.studentId,
    runId: row.runId,
    status: row.status,
    currentQuestionIndex: row.currentQuestionIndex,
    submittedAt: row.submittedAt,
    revokedAt: row.revokedAt,
    expiresAt: row.expiresAt,
    endsAt: row.endsAt,
    flagCount: row.flagCount
  });
}

function lastGapSecondsSinceEvent(studentSessionId: string): number {
  const row = db
    .query(
      `SELECT occurred_at AS occurredAt
       FROM session_events
       WHERE student_session_id = ?
         AND event_type IN ('client_disconnect', 'tab_hidden', 'visibility_lost')
       ORDER BY occurred_at DESC
       LIMIT 1`
    )
    .get(studentSessionId) as { occurredAt: string } | null;
  if (!row?.occurredAt) {
    return 0;
  }

  const gapMs = Date.now() - new Date(row.occurredAt).getTime();
  return Math.max(0, Math.floor(gapMs / 1000));
}

function eventBehavior(eventType: StudentEventType): {
  severity: "info" | "warning";
  incrementsFlag: boolean;
  sessionStatus: "Active" | "Flagged" | "Disconnected";
} {
  switch (eventType) {
    case "fullscreen_exit":
    case "tab_hidden":
    case "visibility_lost":
      return { severity: "warning", incrementsFlag: true, sessionStatus: "Flagged" };
    case "client_disconnect":
      return { severity: "warning", incrementsFlag: false, sessionStatus: "Disconnected" };
    case "tab_visible":
    case "reconnect":
    default:
      return { severity: "info", incrementsFlag: false, sessionStatus: "Active" };
  }
}

function getValidStudentSession(request: Request, fallbackToken?: string | null): ValidStudentSession | Response {
  const token = extractStudentToken(request, fallbackToken);
  if (!token) {
    return apiError(401, "STUDENT_SESSION_MISSING", "Student session token is missing.");
  }

  return getValidStudentSessionByToken(token);
}

function ensureRunForExam(runId: string, examId: string): void {
  const existing = db.query("SELECT id FROM exam_runs WHERE id = ? LIMIT 1").get(runId) as { id: string } | null;
  if (existing) {
    return;
  }

  const exam = db
    .query("SELECT roster_id AS rosterId FROM exams WHERE id = ? LIMIT 1")
    .get(examId) as { rosterId: string } | null;
  if (!exam) {
    return;
  }

  const now = nowIso();
  db.query(
    `INSERT INTO exam_runs (id, exam_id, roster_id, status, join_code, started_at, ended_at, created_at, updated_at)
     VALUES (?, ?, ?, 'Running', NULL, ?, NULL, ?, ?)`
  ).run(runId, examId, exam.rosterId, now, now, now);
}

function findStudentForRun(runId: string, matric: string) {
  return db
    .query(
      `SELECT
          er.id AS runId,
          er.exam_id AS examId,
          er.roster_id AS rosterId,
          er.status AS runStatus,
          er.started_at AS runStartedAt,
          er.ended_at AS runEndedAt,
          rs.id AS studentId,
          rs.full_name AS fullName,
          e.title AS examTitle,
          e.status AS examStatus,
          e.duration_minutes AS durationMinutes
       FROM exam_runs er
       JOIN exams e ON e.id = er.exam_id
       JOIN roster_students rs ON rs.roster_id = er.roster_id
       WHERE er.id = ? AND rs.matric_number = ?
       LIMIT 1`
    )
    .get(runId, matric) as
    | {
        runId: string;
        examId: string;
        rosterId: string;
        runStatus: string;
        runStartedAt: string | null;
        runEndedAt: string | null;
        studentId: string;
        fullName: string;
        examTitle: string;
        examStatus: string;
        durationMinutes: number;
      }
    | null;
}

async function joinStudentRun(runId: string, request: Request): Promise<Response> {
  const appConfig = getAppConfig();
  const payload = (await request.json().catch(() => null)) as { matric?: string } | null;
  const matric = payload?.matric?.trim();

  if (!matric) {
    return apiError(400, "MISSING_MATRIC", "Matric number is required.", { field: "matric" });
  }

  const run = getRunById(runId);
  if (!run) {
    return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");
  }

  if (run.status === "Ended") {
    return apiError(409, "EXAM_ENDED", "This exam run has ended.");
  }

  if (run.status === "Draft") {
    return apiError(409, "EXAM_NOT_STARTED", "The exam lobby is not open yet.");
  }

  const student = findStudentForRun(runId, matric);
  if (!student) {
    return apiError(404, "INVALID_MATRIC", "This matric number is not on the roster for this exam.");
  }

  if (student.examStatus === "Archived" || student.examStatus === "Completed") {
    return apiError(409, "EXAM_ENDED", "This exam has ended.");
  }

  const existingSession = db
    .query(
      `SELECT id, status, current_question AS currentQuestion, time_remaining_seconds AS timeRemaining
       FROM exam_sessions
       WHERE exam_id = ? AND student_id = ?
       LIMIT 1`
    )
    .get(student.examId, student.studentId) as { id: string; status: string; currentQuestion: number; timeRemaining: number } | null;

  if (existingSession?.status === "Submitted") {
    return apiError(409, "ALREADY_SUBMITTED", "This matric number has already submitted this exam.");
  }

  const activeTokenSession = db
    .query(
      `SELECT id, status, current_question_index AS currentQuestionIndex, ends_at AS endsAt, last_seen_at AS lastSeenAt
       FROM student_sessions
       WHERE run_id = ?
         AND student_id = ?
         AND status IN ('Connected', 'Active', 'Flagged')
         AND submitted_at IS NULL
         AND revoked_at IS NULL
         AND (expires_at IS NULL OR expires_at > ?)
       LIMIT 1`
    )
    .get(runId, student.studentId, nowIso()) as {
      id: string;
      status: string;
      currentQuestionIndex: number;
      endsAt: string;
      lastSeenAt: string | null;
    } | null;

  if (activeTokenSession) {
    if (!isWithinRecoveryWindow(activeTokenSession.lastSeenAt, appConfig.recoveryWindowMinutes)) {
      logSessionEvent({
        runId,
        studentSessionId: activeTokenSession.id,
        eventType: "recovery_window_expired",
        severity: "warning",
        payload: {
          matric,
          recoveryWindowMinutes: appConfig.recoveryWindowMinutes,
          lastSeenAt: activeTokenSession.lastSeenAt
        }
      });
      return recoveryWindowExpiredResponse(appConfig.recoveryWindowMinutes);
    }

    const token = rotateStudentToken(activeTokenSession.id);
    logSessionEvent({
      runId,
      studentSessionId: activeTokenSession.id,
      eventType: "student_reconnected",
      severity: "info",
      payload: {
        matric,
        currentQuestion: activeTokenSession.currentQuestionIndex + 1,
        recoveryWindowMinutes: appConfig.recoveryWindowMinutes
      }
    });
    return json({
      code: "SESSION_RECOVERED",
      sessionToken: token,
      examTitle: student.examTitle,
      studentName: student.fullName,
      currentQuestion: activeTokenSession.currentQuestionIndex + 1,
      timeRemainingSeconds: deriveRemainingSeconds(activeTokenSession.endsAt)
    });
  }

  const durationSeconds = Math.max(0, Math.floor(student.durationMinutes * 60));
  const endsAt = computeSessionEndsAt({
    runStartedAt: student.runStartedAt,
    durationSeconds,
    fallbackBase: nowIso()
  });

  if (existingSession) {
    const examSessionMeta = db
      .query(
        `SELECT
            last_autosave_at AS lastAutosaveAt,
            time_remaining_seconds AS timeRemaining,
            current_question AS currentQuestion
         FROM exam_sessions
         WHERE exam_id = ? AND student_id = ?
         LIMIT 1`
      )
      .get(student.examId, student.studentId) as {
        lastAutosaveAt: string | null;
        timeRemaining: number;
        currentQuestion: number;
      } | null;

    if (!isWithinRecoveryWindow(examSessionMeta?.lastAutosaveAt ?? null, appConfig.recoveryWindowMinutes)) {
      logSessionEvent({
        runId,
        studentSessionId: null,
        eventType: "recovery_window_expired",
        severity: "warning",
        payload: {
          matric,
          recoveryWindowMinutes: appConfig.recoveryWindowMinutes,
          lastSeenAt: examSessionMeta?.lastAutosaveAt ?? null
        }
      });
      return recoveryWindowExpiredResponse(appConfig.recoveryWindowMinutes);
    }

    const token = issueStudentToken({
      runId,
      studentId: student.studentId,
      status: existingSession.status,
      currentQuestion: existingSession.currentQuestion,
      endsAt
    });
    const createdSession = db
      .query(
        `SELECT id
         FROM student_sessions
         WHERE run_id = ? AND student_id = ?
         ORDER BY joined_at DESC
         LIMIT 1`
      )
      .get(runId, student.studentId) as { id: string } | null;
    logSessionEvent({
      runId,
      studentSessionId: createdSession?.id ?? null,
      eventType: "student_reconnected",
      severity: "info",
      payload: {
        matric,
        currentQuestion: existingSession.currentQuestion,
        recoveryWindowMinutes: appConfig.recoveryWindowMinutes
      }
    });
    return json({
      code: "SESSION_RECOVERED",
      sessionToken: token,
      examTitle: student.examTitle,
      studentName: student.fullName,
      currentQuestion: existingSession.currentQuestion,
      timeRemainingSeconds: deriveRemainingSeconds(endsAt)
    });
  }

  const now = nowIso();
  db.query(
    `INSERT INTO exam_sessions
      (id, exam_id, student_id, status, current_question, flags_count, reconnect_gap_seconds, time_remaining_seconds, last_autosave_at, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, 'Connected', 1, 0, 0, ?, ?, NULL, ?, ?)`
  ).run(`sess_${crypto.randomUUID()}`, student.examId, student.studentId, student.durationMinutes * 60, now, now, now);
  const token = issueStudentToken({
    runId,
    studentId: student.studentId,
    status: "Connected",
    currentQuestion: 1,
    endsAt
  });

  return json({
    code: "JOINED",
    sessionToken: token,
    examTitle: student.examTitle,
    studentName: student.fullName,
    currentQuestion: 1,
    timeRemainingSeconds: student.durationMinutes * 60
  });
}

async function handleStudentLogin(examId: string, request: Request): Promise<Response> {
  const payload = (await request.clone().json().catch(() => null)) as { matric?: string } | null;
  const matric = payload?.matric?.trim();
  if (!matric) {
    return apiError(400, "MISSING_MATRIC", "Matric number is required.", { field: "matric" });
  }

  const student = findStudentForExam(examId, matric);
  if (!student) {
    return apiError(404, "INVALID_MATRIC", "This matric number is not on the roster for this exam.");
  }

  const stateError = studentExamStateError(student.examStatus);
  if (stateError) {
    return stateError;
  }

  const activeRun = db
    .query(
      "SELECT id FROM exam_runs WHERE exam_id = ? AND status = 'Running' ORDER BY started_at DESC, updated_at DESC LIMIT 1"
    )
    .get(examId) as { id: string } | null;

  const runId = activeRun?.id ?? `run_${examId}`;
  ensureRunForExam(runId, examId);
  return joinStudentRun(runId, request);
}

async function handleStudentSession(request: Request): Promise<Response> {
  const session = getValidStudentSession(request);
  if (session instanceof Response) {
    return session;
  }

  return json({
    sessionId: session.id,
    status: session.status,
    currentQuestion: session.currentQuestionIndex + 1,
    endsAt: session.endsAt,
    remainingSeconds: deriveRemainingSeconds(session.endsAt),
    flagCount: session.flagCount,
    warningMessage: warningMessageForSession(session.flagCount, session.status)
  });
}

async function handleStudentExam(request: Request): Promise<Response> {
  const session = getValidStudentSession(request);
  if (session instanceof Response) {
    return session;
  }
  if (session.status === "Submitted") {
    return apiError(409, "EXAM_TIME_EXPIRED", "Exam time has expired.");
  }

  const exam = db
    .query("SELECT id, title, duration_minutes AS durationMinutes FROM exams WHERE id = ? LIMIT 1")
    .get(session.examId) as { id: string; title: string; durationMinutes: number } | null;
  if (!exam) {
    return apiError(404, "EXAM_NOT_FOUND", "Exam not found.");
  }

  const questions = db
    .query(
      `SELECT id, type, text, options_json AS optionsJson, points, order_index AS orderIndex
       FROM questions
       WHERE exam_id = ? AND status = 'Approved'
       ORDER BY order_index ASC`
    )
    .all(session.examId) as Array<{
      id: string;
      type: string;
      text: string;
      optionsJson: string | null;
      points: number;
      orderIndex: number;
    }>;

  const savedAnswers = listAnswersBySession(session.id).reduce<Record<string, string>>((acc, answer) => {
    acc[answer.questionId] = answer.selectedOption ?? answer.responseText ?? "";
    return acc;
  }, {});

  return json({
    session: {
      id: session.id,
      status: session.status,
      currentQuestion: session.currentQuestionIndex + 1,
      endsAt: session.endsAt,
      remainingSeconds: deriveRemainingSeconds(session.endsAt),
      flagCount: session.flagCount,
      warningMessage: warningMessageForSession(session.flagCount, session.status)
    },
    exam: {
      id: exam.id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      questions: questions.map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        options: question.optionsJson ? JSON.parse(question.optionsJson) : [],
        points: question.points,
        orderIndex: question.orderIndex
      }))
    },
    answers: savedAnswers
  });
}

async function handleStudentAnswer(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    studentToken?: string;
    questionId?: string;
    value?: string;
    currentQuestion?: number;
  } | null;
  const session = getValidStudentSession(request, body?.studentToken?.trim() ?? null);
  if (session instanceof Response) {
    return session;
  }
  const questionId = body?.questionId?.trim() ?? "";
  const value = String(body?.value ?? "");
  const currentQuestion = Number(body?.currentQuestion ?? session.currentQuestionIndex + 1);

  if (session.status === "Submitted") {
    logAutosaveFailure({
      code: "EXAM_TIME_EXPIRED",
      message: "Exam time has expired.",
      session,
      questionId,
      currentQuestion
    });
    return apiError(409, "EXAM_TIME_EXPIRED", "Exam time has expired.");
  }

  if (!questionId) {
    logAutosaveFailure({
      code: "MISSING_ANSWER_FIELDS",
      message: "questionId is required.",
      session,
      currentQuestion
    });
    return apiError(400, "MISSING_ANSWER_FIELDS", "questionId is required.");
  }

  const question = db
    .query("SELECT id, type FROM questions WHERE id = ? AND exam_id = ? LIMIT 1")
    .get(questionId, session.examId) as { id: string; type: string } | null;
  if (!question) {
    logAutosaveFailure({
      code: "QUESTION_NOT_FOUND",
      message: "Question does not belong to this exam session.",
      session,
      questionId,
      currentQuestion
    });
    return apiError(404, "QUESTION_NOT_FOUND", "Question does not belong to this exam session.");
  }

  const currentQuestionIndex = Math.max(0, Math.floor(Number(body?.currentQuestion ?? session.currentQuestionIndex + 1)) - 1);

  try {
    const answer = upsertAnswer({
      studentSessionId: session.id,
      questionId,
      selectedOption: question.type === "MCQ" ? value : null,
      responseText: question.type === "MCQ" ? null : value
    });

    const now = nowIso();
    db.query("UPDATE student_sessions SET current_question_index = ?, last_seen_at = ?, status = CASE WHEN status = 'Connected' THEN 'Active' ELSE status END WHERE id = ?")
      .run(currentQuestionIndex, now, session.id);
    db.query(
      `UPDATE exam_sessions
       SET current_question = ?, last_autosave_at = ?, updated_at = ?
       WHERE student_id = ? AND exam_id = ?`
    ).run(currentQuestionIndex + 1, now, now, session.studentId, session.examId);

    return json({ savedAt: answer.savedAt });
  } catch (error) {
    logAutosaveFailure({
      code: "AUTOSAVE_WRITE_FAILED",
      message: "Failed to persist answer autosave.",
      session,
      questionId,
      currentQuestion: currentQuestionIndex + 1,
      details: {
        cause: error instanceof Error ? error.message : "unknown_error"
      }
    });
    return apiError(500, "AUTOSAVE_WRITE_FAILED", "Failed to persist answer autosave.");
  }
}

async function handleStudentEvent(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    studentToken?: string;
    eventType?: StudentEventType;
    details?: Record<string, unknown>;
  } | null;

  const session = getValidStudentSession(request, body?.studentToken?.trim() ?? null);
  if (session instanceof Response) {
    return session;
  }
  if (session.status === "Submitted") {
    return apiError(409, "EXAM_TIME_EXPIRED", "Exam time has expired.");
  }

  const eventType = body?.eventType;
  if (!eventType) {
    return apiError(400, "MISSING_EVENT_TYPE", "eventType is required.");
  }

  const allowedEventTypes: StudentEventType[] = [
    "fullscreen_exit",
    "tab_hidden",
    "visibility_lost",
    "tab_visible",
    "reconnect",
    "client_disconnect"
  ];
  if (!allowedEventTypes.includes(eventType)) {
    return apiError(400, "UNSUPPORTED_EVENT_TYPE", "Unsupported student event type.");
  }

  const behavior = eventBehavior(eventType);
  const nextFlagCount = session.flagCount + (behavior.incrementsFlag ? 1 : 0);
  const nextStudentStatus =
    behavior.sessionStatus === "Active"
      ? nextFlagCount > 0
        ? "Flagged"
        : "Active"
      : behavior.sessionStatus;
  const nextExamStatus =
    behavior.sessionStatus === "Disconnected"
      ? "Disconnected"
      : nextFlagCount > 0
        ? "Flagged"
        : "Active";
  const now = nowIso();
  const reconnectGapSeconds =
    eventType === "tab_visible" || eventType === "reconnect"
      ? lastGapSecondsSinceEvent(session.id)
      : 0;

  db.query(
    `UPDATE student_sessions
     SET flag_count = ?,
         status = ?,
         last_seen_at = ?
     WHERE id = ?`
  ).run(nextFlagCount, nextStudentStatus, now, session.id);

  db.query(
    `UPDATE exam_sessions
     SET flags_count = ?,
         status = ?,
         reconnect_gap_seconds = ?,
         updated_at = ?
     WHERE exam_id = ? AND student_id = ?`
  ).run(nextFlagCount, nextExamStatus, reconnectGapSeconds, now, session.examId, session.studentId);

  logSessionEvent({
    runId: session.runId,
    studentSessionId: session.id,
    eventType,
    severity: behavior.severity,
    payload: {
      ...body?.details,
      flagCount: nextFlagCount,
      reconnectGapSeconds
    }
  });

  return json({
    status: "ok",
    eventType,
    flagCount: nextFlagCount,
    warningMessage: warningMessageForSession(nextFlagCount, nextStudentStatus)
  });
}

async function handleStudentSubmit(request: Request): Promise<Response> {
  const session = getValidStudentSession(request);
  if (session instanceof Response) {
    return session;
  }
  if (session.status === "Submitted") {
    return apiError(409, "EXAM_TIME_EXPIRED", "Exam time has expired.");
  }

  const now = nowIso();
  db.query(
    "UPDATE student_sessions SET status = 'Submitted', submitted_at = ?, revoked_at = ?, last_seen_at = ? WHERE id = ?"
  ).run(now, now, now, session.id);
  db.query(
    "UPDATE exam_sessions SET status = 'Submitted', submitted_at = ?, updated_at = ? WHERE student_id = ? AND exam_id = ?"
  ).run(now, now, session.studentId, session.examId);
  gradeObjectiveSubmission(session.id);

  return json({ status: "submitted", submittedAt: now });
}

export async function handleStudentRoutes(request: Request, pathname: string): Promise<Response | null> {
  const joinMatch = pathname.match(/^\/api\/runs\/([^/]+)\/student\/join$/);
  if (joinMatch && request.method === "POST") {
    return joinStudentRun(decodeURIComponent(joinMatch[1]), request);
  }

  const loginMatch = pathname.match(/^\/api\/exams\/([^/]+)\/student\/login$/);
  if (loginMatch && request.method === "POST") {
    return handleStudentLogin(decodeURIComponent(loginMatch[1]), request);
  }

  if (pathname === "/api/student/session" && request.method === "GET") {
    return handleStudentSession(request);
  }

  if (pathname === "/api/student/exam" && request.method === "GET") {
    return handleStudentExam(request);
  }

  if (pathname === "/api/student/answers" && request.method === "POST") {
    return handleStudentAnswer(request);
  }

  if (pathname === "/api/student/events" && request.method === "POST") {
    return handleStudentEvent(request);
  }

  if (pathname === "/api/student/submit" && request.method === "POST") {
    return handleStudentSubmit(request);
  }

  return null;
}
