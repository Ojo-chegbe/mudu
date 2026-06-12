import { db, nowIso } from "../db";

export type AnswerRecord = {
  id: string;
  studentSessionId: string;
  questionId: string;
  responseText: string | null;
  selectedOption: string | null;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
};

type AnswerRow = {
  id: string;
  studentSessionId: string;
  questionId: string;
  responseText: string | null;
  selectedOption: string | null;
  savedAt: string;
  createdAt: string;
  updatedAt: string;
};

function mapAnswer(row: AnswerRow): AnswerRecord {
  return { ...row };
}

export function upsertAnswer(input: {
  studentSessionId: string;
  questionId: string;
  responseText?: string | null;
  selectedOption?: string | null;
}): AnswerRecord {
  const existing = db
    .query(
      `SELECT
        id,
        student_session_id AS studentSessionId,
        question_id AS questionId,
        response_text AS responseText,
        selected_option AS selectedOption,
        saved_at AS savedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM answers
       WHERE student_session_id = ? AND question_id = ?
       LIMIT 1`
    )
    .get(input.studentSessionId, input.questionId) as AnswerRow | null;

  const now = nowIso();
  if (!existing) {
    const id = `ans_${crypto.randomUUID()}`;
    db.query(
      `INSERT INTO answers
        (id, student_session_id, question_id, response_text, selected_option, saved_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, input.studentSessionId, input.questionId, input.responseText ?? null, input.selectedOption ?? null, now, now, now);
  } else {
    db.query(
      `UPDATE answers
       SET response_text = ?, selected_option = ?, saved_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(input.responseText ?? null, input.selectedOption ?? null, now, now, existing.id);
  }

  return listAnswersBySession(input.studentSessionId).find((a) => a.questionId === input.questionId)!;
}

export function listAnswersBySession(studentSessionId: string): AnswerRecord[] {
  const rows = db
    .query(
      `SELECT
        id,
        student_session_id AS studentSessionId,
        question_id AS questionId,
        response_text AS responseText,
        selected_option AS selectedOption,
        saved_at AS savedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM answers
       WHERE student_session_id = ?
       ORDER BY updated_at ASC`
    )
    .all(studentSessionId) as AnswerRow[];
  return rows.map(mapAnswer);
}
