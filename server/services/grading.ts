import { db } from "../db";
import { listAnswersBySession } from "../repositories/answers";
import { findSessionById } from "../repositories/sessions";
import { upsertResult, type ResultRecord } from "../repositories/results";

type ObjectiveQuestionRow = {
  id: string;
  type: "MCQ" | "FILL" | "ESSAY";
  correctAnswer: string | null;
  points: number;
};

function normalizeAnswer(value: string | null | undefined, type: ObjectiveQuestionRow["type"]): string {
  const raw = String(value ?? "").trim();
  if (type === "FILL") {
    return raw.toLowerCase();
  }
  return raw;
}

export function gradeObjectiveSubmission(studentSessionId: string): ResultRecord | null {
  const session = findSessionById(studentSessionId);
  if (!session) {
    return null;
  }

  const run = db
    .query("SELECT exam_id AS examId FROM exam_runs WHERE id = ? LIMIT 1")
    .get(session.runId) as { examId: string } | null;
  if (!run) {
    return null;
  }

  const questions = db
    .query(
      `SELECT
          id,
          type,
          correct_answer AS correctAnswer,
          points
       FROM questions
       WHERE exam_id = ?
         AND status = 'Approved'
       ORDER BY order_index ASC`
    )
    .all(run.examId) as ObjectiveQuestionRow[];
  const answersByQuestionId = new Map(listAnswersBySession(studentSessionId).map((answer) => [answer.questionId, answer]));

  let objectiveScore = 0;
  let objectiveMaxScore = 0;
  let hasEssay = false;

  for (const question of questions) {
    if (question.type === "ESSAY") {
      hasEssay = true;
      continue;
    }

    objectiveMaxScore += Number(question.points ?? 0);
    const answer = answersByQuestionId.get(question.id);
    const submittedValue =
      question.type === "MCQ"
        ? normalizeAnswer(answer?.selectedOption, question.type)
        : normalizeAnswer(answer?.responseText, question.type);
    const correctValue = normalizeAnswer(question.correctAnswer, question.type);

    if (submittedValue !== "" && submittedValue === correctValue) {
      objectiveScore += Number(question.points ?? 0);
    }
  }

  const percentage = objectiveMaxScore > 0 ? Number(((objectiveScore / objectiveMaxScore) * 100).toFixed(2)) : 0;
  return upsertResult({
    runId: session.runId,
    studentSessionId,
    objectiveScore,
    essayScore: null,
    totalScore: objectiveScore,
    maxScore: objectiveMaxScore,
    percentage,
    status: hasEssay ? "PendingEssayReview" : "Completed"
  });
}
