import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { db, initDatabase, nowIso, seedIfEmpty } from "./db";
import { formatGap, getLocalIPv4 } from "./network";

type ActionType = "extend_time" | "force_submit" | "dismiss_flags";

const port = Number(Bun.env.MUDU_PORT ?? 3000);
const host = Bun.env.MUDU_HOST ?? "0.0.0.0";

initDatabase();
const seed = seedIfEmpty();

const defaultHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...defaultHeaders,
      "Content-Type": "application/json"
    }
  });
}

function notFound(message = "Not found"): Response {
  return json({ error: message }, 404);
}

function getDashboard() {
  const published = (db.query("SELECT COUNT(*) AS count FROM exams WHERE status IN ('Published','Running','Completed')").get() as { count: number }).count;
  const connected = (db.query("SELECT COUNT(*) AS count FROM exam_sessions WHERE status IN ('Connected','Active')").get() as { count: number }).count;
  const unsynced = (db.query("SELECT COUNT(*) AS count FROM sync_queue WHERE status IN ('Pending','Error')").get() as { count: number }).count;

  const exams = db
    .query(
      `SELECT
          e.id,
          e.title,
          COALESCE(e.course_code, '') AS course,
          r.name AS rosterName,
          e.status,
          printf('%d / %d',
            (SELECT COUNT(*) FROM exam_sessions s WHERE s.exam_id = e.id AND s.status = 'Submitted'),
            (SELECT COUNT(*) FROM roster_students rs WHERE rs.roster_id = e.roster_id)
          ) AS submissions,
          COALESCE((SELECT sq.status FROM sync_queue sq WHERE sq.exam_id = e.id ORDER BY sq.updated_at DESC LIMIT 1), 'Synced') AS sync
       FROM exams e
       JOIN rosters r ON r.id = e.roster_id
       ORDER BY e.updated_at DESC`
    )
    .all() as Array<{ id: string; title: string; course: string; rosterName: string; status: string; submissions: string; sync: string }>;

  return {
    metrics: [
      { label: "Published Exams", value: String(published) },
      { label: "Connected Students", value: String(connected) },
      { label: "Auto-save Health", value: "99.9%" },
      { label: "Unsynced Exams", value: String(unsynced) }
    ],
    exams
  };
}

function getSessions(examId: string) {
  const rows = db
    .query(
      `SELECT
          rs.full_name AS name,
          rs.matric_number AS matric,
          es.status,
          es.current_question,
          es.flags_count AS flags,
          es.reconnect_gap_seconds AS gap
       FROM exam_sessions es
       JOIN roster_students rs ON rs.id = es.student_id
       WHERE es.exam_id = ?
       ORDER BY rs.full_name ASC`
    )
    .all(examId) as Array<{ name: string; matric: string; status: string; current_question: number; flags: number; gap: number }>;

  return {
    sessions: rows.map((row) => ({
      name: row.name,
      matric: row.matric,
      status: row.status,
      question: row.status === "Submitted" ? "Done" : `Q${row.current_question}`,
      flags: row.flags,
      reconnectGap: formatGap(row.gap)
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

function syncPendingExams() {
  const now = nowIso();
  const result = db
    .query("UPDATE sync_queue SET status = 'Synced', error_message = NULL, updated_at = ?, last_attempt_at = ? WHERE status IN ('Pending','Error')")
    .run(now, now);

  return {
    status: "ok",
    syncedExams: Number(result.changes ?? 0)
  };
}

function findStudentForExam(examId: string, matric: string) {
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

async function handleStudentLogin(examId: string, request: Request): Promise<Response> {
  const payload = (await request.json().catch(() => null)) as { matric?: string } | null;
  const matric = payload?.matric?.trim();

  if (!matric) {
    return json({ code: "MISSING_MATRIC", message: "Matric number is required." }, 400);
  }

  const student = findStudentForExam(examId, matric);
  if (!student) {
    return json(
      {
        code: "INVALID_MATRIC",
        message: "This matric number is not on the roster for this exam."
      },
      404
    );
  }

  if (student.examStatus === "Completed") {
    return json({ code: "EXAM_ENDED", message: "This exam has ended." }, 409);
  }

  if (student.examStatus === "Draft" || student.examStatus === "Published") {
    return json({ code: "EXAM_NOT_STARTED", message: "The exam has not started yet." }, 409);
  }

  const existingSession = db
    .query(
      `SELECT id, status, current_question AS currentQuestion, time_remaining_seconds AS timeRemaining
       FROM exam_sessions
       WHERE exam_id = ? AND student_id = ?
       LIMIT 1`
    )
    .get(examId, student.studentId) as { id: string; status: string; currentQuestion: number; timeRemaining: number } | null;

  if (existingSession?.status === "Submitted") {
    return json({ code: "ALREADY_SUBMITTED", message: "This matric number has already submitted this exam." }, 409);
  }

  if (existingSession) {
    return json({
      code: "SESSION_RECOVERED",
      examTitle: student.examTitle,
      studentName: student.fullName,
      currentQuestion: existingSession.currentQuestion,
      timeRemainingSeconds: existingSession.timeRemaining
    });
  }

  const now = nowIso();
  db.query(
    `INSERT INTO exam_sessions
      (id, exam_id, student_id, status, current_question, flags_count, reconnect_gap_seconds, time_remaining_seconds, last_autosave_at, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, 'Connected', 1, 0, 0, ?, ?, NULL, ?, ?)`
  ).run(`sess_${crypto.randomUUID()}`, examId, student.studentId, student.durationMinutes * 60, now, now, now);

  return json({
    code: "JOINED",
    examTitle: student.examTitle,
    studentName: student.fullName,
    currentQuestion: 1,
    timeRemainingSeconds: student.durationMinutes * 60
  });
}

async function handleSessionAction(examId: string, matric: string, request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { action?: ActionType } | null;
  const action = body?.action;
  if (!action) {
    return json({ error: "Action is required." }, 400);
  }

  const student = findStudentForExam(examId, matric);
  if (!student) {
    return notFound("Student not found for exam.");
  }

  const now = nowIso();

  if (action === "extend_time") {
    db.query(
      "UPDATE exam_sessions SET time_remaining_seconds = time_remaining_seconds + 600, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, examId, student.studentId);
  } else if (action === "force_submit") {
    db.query(
      "UPDATE exam_sessions SET status = 'Submitted', submitted_at = ?, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, now, examId, student.studentId);
  } else if (action === "dismiss_flags") {
    db.query(
      "UPDATE exam_sessions SET flags_count = 0, status = CASE WHEN status = 'Flagged' THEN 'Active' ELSE status END, updated_at = ? WHERE exam_id = ? AND student_id = ?"
    ).run(now, examId, student.studentId);
  } else {
    return json({ error: "Unsupported action." }, 400);
  }

  return json({ status: "ok" });
}

function serveFrontend(pathname: string): Response {
  const distDir = resolve(process.cwd(), "dist");
  const assetPath = resolve(process.cwd(), "dist", `.${pathname}`.replace("..", ""));

  if (pathname.startsWith("/assets/") && existsSync(assetPath)) {
    return new Response(Bun.file(assetPath));
  }

  if (!existsSync(distDir)) {
    return new Response(
      "Frontend build not found. Run `npm run build` first, then restart the Bun server.",
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }

  return new Response(Bun.file(resolve(distDir, "index.html")));
}

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: defaultHeaders });
    }

    if (pathname === "/api/health") {
      return json({ status: "ok" });
    }

    if (pathname === "/api/network") {
      const localIp = getLocalIPv4();
      return json({
        host,
        port,
        localIp,
        joinUrl: `http://${localIp}:${port}`,
        note: "Students should connect from a browser on the same WiFi network as the lecturer laptop."
      });
    }

    if (pathname === "/api/dashboard") {
      return json(getDashboard());
    }

    if (pathname === "/api/sync" && request.method === "POST") {
      return json(syncPendingExams());
    }

    const sessionsMatch = pathname.match(/^\/api\/exams\/([^/]+)\/sessions$/);
    if (sessionsMatch && request.method === "GET") {
      return json(getSessions(decodeURIComponent(sessionsMatch[1])));
    }

    const resultsMatch = pathname.match(/^\/api\/exams\/([^/]+)\/results$/);
    if (resultsMatch && request.method === "GET") {
      return json(getResults(decodeURIComponent(resultsMatch[1])));
    }

    const loginMatch = pathname.match(/^\/api\/exams\/([^/]+)\/student\/login$/);
    if (loginMatch && request.method === "POST") {
      return handleStudentLogin(decodeURIComponent(loginMatch[1]), request);
    }

    const actionMatch = pathname.match(/^\/api\/exams\/([^/]+)\/sessions\/([^/]+)\/actions$/);
    if (actionMatch && request.method === "POST") {
      return handleSessionAction(decodeURIComponent(actionMatch[1]), decodeURIComponent(actionMatch[2]), request);
    }

    if (pathname.startsWith("/api/")) {
      return notFound("API route not found.");
    }

    return serveFrontend(pathname);
  }
});

console.log(`MUDU local server running on http://${getLocalIPv4()}:${server.port}`);
console.log(`Student browser entry: http://<lecturer-ip>:${server.port}`);
console.log(`Seed exam id: ${seed.examId}`);
