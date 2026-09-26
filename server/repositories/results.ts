import { db, nowIso } from "../db";

export type ResultRecord = {
  id: string;
  runId: string;
  studentSessionId: string;
  objectiveScore: number;
  essayScore: number | null;
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: string;
  gradedAt: string;
};

type ResultRow = {
  id: string;
  runId: string;
  studentSessionId: string;
  objectiveScore: number;
  essayScore: number | null;
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: string;
  gradedAt: string;
};

function mapResult(row: ResultRow): ResultRecord {
  return { ...row };
}

export function upsertResult(input: {
  runId: string;
  studentSessionId: string;
  objectiveScore: number;
  essayScore?: number | null;
  totalScore: number;
  maxScore: number;
  percentage: number;
  status: string;
}): ResultRecord {
  const existing = db
    .query("SELECT id FROM results WHERE run_id = ? AND student_session_id = ? LIMIT 1")
    .get(input.runId, input.studentSessionId) as { id: string } | null;
  const now = nowIso();

  if (!existing) {
    const id = `res_${crypto.randomUUID()}`;
    db.query(
      `INSERT INTO results
        (id, run_id, student_session_id, objective_score, essay_score, total_score, max_score, percentage, status, graded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.runId, input.studentSessionId, input.objectiveScore, input.essayScore ?? null, input.totalScore, input.maxScore, input.percentage, input.status, now);
  } else {
    db.query(
      `UPDATE results
       SET objective_score = ?, essay_score = ?, total_score = ?, max_score = ?, percentage = ?, status = ?, graded_at = ?
       WHERE id = ?`
    ).run(input.objectiveScore, input.essayScore ?? null, input.totalScore, input.maxScore, input.percentage, input.status, now, existing.id);
  }

  return getResultByRunAndSession(input.runId, input.studentSessionId)!;
}

export function updateEssayScore(resultId: string, essayScore: number): ResultRecord | null {
  const result = getResultById(resultId);
  if (!result) return null;

  const totalScore = result.objectiveScore + essayScore;
  const percentage = result.maxScore > 0 ? Number(((totalScore / result.maxScore) * 100).toFixed(2)) : 0;

  db.query(
    `UPDATE results 
     SET essay_score = ?, total_score = ?, percentage = ?, status = 'Completed', graded_at = ? 
     WHERE id = ?`
  ).run(essayScore, totalScore, percentage, nowIso(), resultId);

  return getResultById(resultId);
}

export function getResultById(resultId: string): ResultRecord | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_session_id AS studentSessionId,
        objective_score AS objectiveScore,
        essay_score AS essayScore,
        total_score AS totalScore,
        max_score AS maxScore,
        percentage,
        status,
        graded_at AS gradedAt
       FROM results
       WHERE id = ?
       LIMIT 1`
    )
    .get(resultId) as ResultRow | null;
  return row ? mapResult(row) : null;
}

export function getResultByRunAndSession(runId: string, studentSessionId: string): ResultRecord | null {
  const row = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_session_id AS studentSessionId,
        objective_score AS objectiveScore,
        essay_score AS essayScore,
        total_score AS totalScore,
        max_score AS maxScore,
        percentage,
        status,
        graded_at AS gradedAt
       FROM results
       WHERE run_id = ? AND student_session_id = ?
       LIMIT 1`
    )
    .get(runId, studentSessionId) as ResultRow | null;
  return row ? mapResult(row) : null;
}

export function listResultsByRun(runId: string): ResultRecord[] {
  const rows = db
    .query(
      `SELECT
        id,
        run_id AS runId,
        student_session_id AS studentSessionId,
        objective_score AS objectiveScore,
        essay_score AS essayScore,
        total_score AS totalScore,
        max_score AS maxScore,
        percentage,
        status,
        graded_at AS gradedAt
       FROM results
       WHERE run_id = ?
       ORDER BY percentage DESC`
    )
    .all(runId) as ResultRow[];
  return rows.map(mapResult);
}

export function getScoreBandsByRun(runId: string): Array<{ range: string; count: number }> {
  const rows = db
    .query(
      `SELECT
        CASE
          WHEN percentage >= 80 THEN '80-100'
          WHEN percentage >= 70 THEN '70-79'
          WHEN percentage >= 60 THEN '60-69'
          WHEN percentage >= 50 THEN '50-59'
          ELSE '0-49'
        END AS range,
        COUNT(*) AS count
       FROM results
       WHERE run_id = ?
       GROUP BY range
       ORDER BY range DESC`
    )
    .all(runId) as Array<{ range: string; count: number }>;
  return rows;
}

export function getRunQuestionInsights(runId: string): Array<{ id: string; type: string; successRate: string; issue: string }> {
  // Fetch questions
  const questions = db
    .query(
      `SELECT q.id, q.type, q.correct_answer AS correctAnswer
       FROM questions q
       JOIN exam_runs r ON r.exam_id = q.exam_id
       WHERE r.id = ?
       ORDER BY q.order_index ASC`
    )
    .all(runId) as Array<{ id: string; type: string; correctAnswer: string | null }>;

  // Fetch answers
  const answers = db
    .query(
      `SELECT a.question_id AS questionId, a.response_text AS responseText, a.selected_option AS selectedOption
       FROM answers a
       JOIN student_sessions ss ON ss.id = a.student_session_id
       WHERE ss.run_id = ?`
    )
    .all(runId) as Array<{ questionId: string; responseText: string | null; selectedOption: string | null }>;

  const insights = questions.map((q) => {
    const qAnswers = answers.filter((a) => a.questionId === q.id);
    if (qAnswers.length === 0 || q.type === "ESSAY") {
      return { id: q.id, type: q.type, successRate: "N/A", issue: q.type === "ESSAY" ? "Manual grading required" : "No answers yet" };
    }

    let correctCount = 0;
    for (const ans of qAnswers) {
      const submittedValue = (q.type === "MCQ" ? ans.selectedOption : ans.responseText) ?? "";
      const rawCorrect = q.correctAnswer ?? "";
      
      const normSubmitted = q.type === "FILL" ? submittedValue.trim().toLowerCase() : submittedValue.trim();
      const normCorrect = q.type === "FILL" ? rawCorrect.trim().toLowerCase() : rawCorrect.trim();
      
      if (normSubmitted !== "" && normSubmitted === normCorrect) {
        correctCount++;
      }
    }

    const percentage = Math.round((correctCount / qAnswers.length) * 100);
    let issue = "None";
    if (percentage < 30) issue = "Too hard / Confusing";
    if (percentage > 90) issue = "Too easy";

    return { id: q.id, type: q.type, successRate: `${percentage}%`, issue };
  });

  return insights;
}
