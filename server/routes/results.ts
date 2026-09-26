import { db } from "../db";
import { apiError, json } from "../http";
import { requireLecturer } from "../services/auth";
import { getRunById } from "../repositories/runs";
import { getResultById, listResultsByRun, getScoreBandsByRun, getRunQuestionInsights, updateEssayScore } from "../repositories/results";
import { gradeObjectiveSubmission } from "../services/grading";

async function handleGradeRun(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) return auth;

  const run = getRunById(runId);
  if (!run) return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");

  // Find all active sessions for this run
  const sessions = db
    .query("SELECT id FROM student_sessions WHERE run_id = ? AND status != 'Submitted'")
    .all(runId) as Array<{ id: string }>;

  for (const session of sessions) {
    gradeObjectiveSubmission(session.id);
  }

  // Also regrade already submitted sessions
  const submittedSessions = db
    .query("SELECT id FROM student_sessions WHERE run_id = ? AND status = 'Submitted'")
    .all(runId) as Array<{ id: string }>;

  for (const session of submittedSessions) {
    gradeObjectiveSubmission(session.id);
  }

  return json({ status: "ok", gradedSessions: sessions.length + submittedSessions.length });
}

async function handleGetRunResults(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) return auth;

  const run = getRunById(runId);
  if (!run) return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");

  const results = listResultsByRun(runId);
  
  // Extend results with student name and matric
  const studentData = db
    .query(
      `SELECT
        ss.id AS sessionId,
        rs.full_name AS name,
        rs.matric_number AS matric
       FROM student_sessions ss
       JOIN roster_students rs ON rs.id = ss.student_id
       WHERE ss.run_id = ?`
    )
    .all(runId) as Array<{ sessionId: string; name: string; matric: string }>;
    
  const studentMap = new Map(studentData.map((s) => [s.sessionId, s]));

  const enrichedResults = results.map((r) => {
    const student = studentMap.get(r.studentSessionId);
    return {
      ...r,
      name: student?.name ?? "Unknown",
      matric: student?.matric ?? "Unknown"
    };
  });

  const averageScore = enrichedResults.length > 0 
    ? Math.round(enrichedResults.reduce((sum, r) => sum + r.percentage, 0) / enrichedResults.length) 
    : 0;
    
  const passRate = enrichedResults.length > 0
    ? Math.round((enrichedResults.filter((r) => r.percentage >= 50).length / enrichedResults.length) * 100)
    : 0;

  const flaggedScriptsCount = db
    .query("SELECT COUNT(*) AS count FROM student_sessions WHERE run_id = ? AND flag_count > 0")
    .get(runId) as { count: number };

  const scoreBands = getScoreBandsByRun(runId);
  const questionInsights = getRunQuestionInsights(runId);

  return json({
    results: enrichedResults,
    averageScore,
    passRate,
    flaggedScriptsCount: flaggedScriptsCount.count,
    scoreBands,
    questionInsights
  });
}

async function handleUpdateEssayScore(request: Request, resultId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) return auth;

  const body = (await request.json().catch(() => null)) as { score?: number } | null;
  if (typeof body?.score !== "number" || body.score < 0) {
    return apiError(400, "INVALID_SCORE", "A valid non-negative essay score is required.");
  }

  const result = getResultById(resultId);
  if (!result) return apiError(404, "RESULT_NOT_FOUND", "Result not found.");

  const updated = updateEssayScore(resultId, body.score);
  if (!updated) return apiError(500, "UPDATE_FAILED", "Failed to update essay score.");

  return json(updated);
}

async function handleExportResultsCsv(request: Request, runId: string): Promise<Response> {
  const auth = await requireLecturer(request);
  if (auth instanceof Response) return auth;

  const run = getRunById(runId);
  if (!run) return apiError(404, "RUN_NOT_FOUND", "Exam run not found.");

  const results = listResultsByRun(runId);
  
  const studentData = db
    .query(
      `SELECT
        ss.id AS sessionId,
        rs.full_name AS name,
        rs.matric_number AS matric
       FROM student_sessions ss
       JOIN roster_students rs ON rs.id = ss.student_id
       WHERE ss.run_id = ?`
    )
    .all(runId) as Array<{ sessionId: string; name: string; matric: string }>;
    
  const studentMap = new Map(studentData.map((s) => [s.sessionId, s]));

  let csv = "Name,Matric,Objective Score,Essay Score,Total Score,Max Score,Percentage,Status\n";
  for (const r of results) {
    const student = studentMap.get(r.studentSessionId);
    csv += `"${student?.name ?? ""}","${student?.matric ?? ""}",${r.objectiveScore},${r.essayScore ?? 0},${r.totalScore},${r.maxScore},${r.percentage},"${r.status}"\n`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="run_${runId}_results.csv"`
    }
  });
}

export async function handleResultRoutes(request: Request, pathname: string): Promise<Response | null> {
  const gradeMatch = pathname.match(/^\/api\/runs\/([^/]+)\/grade$/);
  if (gradeMatch && request.method === "POST") {
    return handleGradeRun(request, decodeURIComponent(gradeMatch[1]));
  }

  const exportMatch = pathname.match(/^\/api\/runs\/([^/]+)\/results\/export$/);
  if (exportMatch && request.method === "GET") {
    return handleExportResultsCsv(request, decodeURIComponent(exportMatch[1]));
  }

  const resultsMatch = pathname.match(/^\/api\/runs\/([^/]+)\/results$/);
  if (resultsMatch && request.method === "GET") {
    return handleGetRunResults(request, decodeURIComponent(resultsMatch[1]));
  }

  const essayScoreMatch = pathname.match(/^\/api\/results\/([^/]+)\/essay-score$/);
  if (essayScoreMatch && request.method === "PATCH") {
    return handleUpdateEssayScore(request, decodeURIComponent(essayScoreMatch[1]));
  }

  return null;
}
