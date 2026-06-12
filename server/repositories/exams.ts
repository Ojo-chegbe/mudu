import { db, nowIso } from "../db";

export type Exam = {
  id: string;
  title: string;
  courseCode: string;
  rosterName?: string | null;
  date: string;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
  status: string;
  syncStatus?: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  rosterStudentCount?: number;
  submittedCount?: number;
  activeRunId?: string | null;
};

export type Question = {
  id: string;
  examId: string;
  type: "MCQ" | "FILL" | "ESSAY";
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  status: "Pending" | "Approved" | "Discarded";
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  examTitle?: string;
  courseCode?: string;
  source?: string;
  reviewStatus?: string;
};

type ExamRow = {
  id: string;
  title: string;
  courseCode: string;
  date: string | null;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
  rosterName?: string | null;
  status: string;
  syncStatus?: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  rosterStudentCount?: number;
  submittedCount?: number;
  activeRunId?: string | null;
};

type QuestionRow = {
  id: string;
  examId: string;
  type: "MCQ" | "FILL" | "ESSAY";
  text: string;
  optionsJson: string | null;
  correctAnswer: string | null;
  points: number;
  status: "Pending" | "Approved" | "Discarded";
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  examTitle?: string;
  courseCode?: string;
  source?: string;
  reviewStatus?: string;
};

function mapExam(row: ExamRow): Exam {
  return {
    id: row.id,
    title: row.title,
    courseCode: row.courseCode ?? "",
    rosterName: row.rosterName ?? null,
    date: row.date ?? new Date().toISOString().slice(0, 10),
    durationMinutes: row.durationMinutes,
    passingScore: row.passingScore,
    rosterId: row.rosterId,
    status: row.status,
    syncStatus: row.syncStatus ?? "Synced",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    questionCount: Number(row.questionCount ?? 0),
    rosterStudentCount: Number(row.rosterStudentCount ?? 0),
    submittedCount: Number(row.submittedCount ?? 0),
    activeRunId: row.activeRunId ?? null
  };
}

function mapQuestion(row: QuestionRow): Question {
  let options: string[] = [];
  if (row.optionsJson) {
    try {
      const parsed = JSON.parse(row.optionsJson);
      if (Array.isArray(parsed)) {
        options = parsed.map((v) => String(v));
      }
    } catch {
      options = [];
    }
  }
  return {
    id: row.id,
    examId: row.examId,
    type: row.type,
    text: row.text,
    options,
    correctAnswer: row.correctAnswer ?? "",
    points: row.points,
    status: row.status,
    orderIndex: row.orderIndex,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    examTitle: row.examTitle,
    courseCode: row.courseCode,
    source: row.source ?? "manual",
    reviewStatus: row.reviewStatus ?? row.status
  };
}

export function listQuestionBank(filters?: {
  status?: string;
  course?: string;
  type?: "MCQ" | "FILL" | "ESSAY";
  q?: string;
}): Question[] {
  const status = filters?.status?.trim();
  const course = filters?.course?.trim().toLowerCase();
  const type = filters?.type?.trim();
  const q = filters?.q?.trim().toLowerCase();

  const rows = db
    .query(
      `SELECT
        q.id AS id,
        q.exam_id AS examId,
        q.type AS type,
        q.text AS text,
        q.options_json AS optionsJson,
        q.correct_answer AS correctAnswer,
        q.points AS points,
        q.status AS status,
        q.order_index AS orderIndex,
        q.created_at AS createdAt,
        q.updated_at AS updatedAt,
        q.source AS source,
        q.review_status AS reviewStatus,
        e.title AS examTitle,
        COALESCE(e.course_code, '') AS courseCode
      FROM questions q
      JOIN exams e ON e.id = q.exam_id
      ORDER BY q.updated_at DESC`
    )
    .all() as QuestionRow[];

  return rows
    .map(mapQuestion)
    .filter((row) => (status ? row.status === status : true))
    .filter((row) => (course ? (row.courseCode ?? "").toLowerCase() === course : true))
    .filter((row) => (type ? row.type === type : true))
    .filter((row) =>
      q
        ? row.text.toLowerCase().includes(q) ||
          (row.examTitle ?? "").toLowerCase().includes(q) ||
          (row.courseCode ?? "").toLowerCase().includes(q)
        : true
    );
}

export function duplicateQuestionToExam(questionId: string, targetExamId: string): Question | null {
  const row = db
    .query(
      `SELECT
        id,
        exam_id AS examId,
        type,
        text,
        options_json AS optionsJson,
        correct_answer AS correctAnswer,
        points,
        status,
        order_index AS orderIndex,
        created_at AS createdAt,
        updated_at AS updatedAt,
        source,
        review_status AS reviewStatus
      FROM questions
      WHERE id = ?
      LIMIT 1`
    )
    .get(questionId) as QuestionRow | null;

  if (!row) return null;
  const sourceQuestion = mapQuestion(row);

  return createQuestion(targetExamId, {
    type: sourceQuestion.type,
    text: sourceQuestion.text,
    options: sourceQuestion.options,
    correctAnswer: sourceQuestion.correctAnswer,
    points: sourceQuestion.points,
    status: sourceQuestion.status
  });
}

export function listExams(filters?: { status?: string; q?: string }): Exam[] {
  const status = filters?.status?.trim();
  const q = filters?.q?.trim().toLowerCase();
  const rows = db
    .query(
      `SELECT
        exams.id AS id,
        exams.title AS title,
        COALESCE(exams.course_code, '') AS courseCode,
        exams.exam_date AS date,
        exams.duration_minutes AS durationMinutes,
        exams.passing_score AS passingScore,
        exams.roster_id AS rosterId,
        r.name AS rosterName,
        exams.status AS status,
        COALESCE(
          (SELECT sj.status FROM sync_jobs sj WHERE sj.entity_type = 'exam' AND sj.entity_id = exams.id ORDER BY sj.updated_at DESC LIMIT 1),
          (SELECT sq.status FROM sync_queue sq WHERE sq.exam_id = exams.id ORDER BY sq.updated_at DESC LIMIT 1),
          'Synced'
        ) AS syncStatus,
        exams.created_at AS createdAt,
        exams.updated_at AS updatedAt,
        (SELECT COUNT(*) FROM questions q WHERE q.exam_id = exams.id) AS questionCount,
        (SELECT COUNT(*) FROM roster_students rs WHERE rs.roster_id = exams.roster_id) AS rosterStudentCount,
        (SELECT COUNT(*) FROM exam_sessions es WHERE es.exam_id = exams.id AND es.status = 'Submitted') AS submittedCount,
        (SELECT er.id FROM exam_runs er WHERE er.exam_id = exams.id AND er.status = 'Running' ORDER BY er.started_at DESC, er.updated_at DESC LIMIT 1) AS activeRunId
      FROM exams
      LEFT JOIN rosters r ON r.id = exams.roster_id
      ORDER BY exams.created_at DESC`
    )
    .all() as ExamRow[];

  return rows
    .filter((row) => (status ? row.status === status : true))
    .filter((row) =>
      q
        ? row.title.toLowerCase().includes(q) ||
          (row.courseCode ?? "").toLowerCase().includes(q)
        : true
    )
    .map(mapExam);
}

export function createExam(input: {
  title: string;
  courseCode: string;
  date: string;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
  status?: string;
}): Exam {
  const id = `exam_${crypto.randomUUID()}`;
  const now = nowIso();
  db.query(
    `INSERT INTO exams
      (id, title, course_code, exam_date, roster_id, status, duration_minutes, passing_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    input.title,
    input.courseCode,
    input.date,
    input.rosterId,
    input.status ?? "Draft",
    input.durationMinutes,
    input.passingScore,
    now,
    now
  );

  return getExamById(id)!;
}

export function getExamById(examId: string): Exam | null {
  const row = db
    .query(
      `SELECT
        exams.id AS id,
        exams.title AS title,
        COALESCE(exams.course_code, '') AS courseCode,
        exams.exam_date AS date,
        exams.duration_minutes AS durationMinutes,
        exams.passing_score AS passingScore,
        exams.roster_id AS rosterId,
        r.name AS rosterName,
        exams.status AS status,
        COALESCE(
          (SELECT sj.status FROM sync_jobs sj WHERE sj.entity_type = 'exam' AND sj.entity_id = exams.id ORDER BY sj.updated_at DESC LIMIT 1),
          (SELECT sq.status FROM sync_queue sq WHERE sq.exam_id = exams.id ORDER BY sq.updated_at DESC LIMIT 1),
          'Synced'
        ) AS syncStatus,
        exams.created_at AS createdAt,
        exams.updated_at AS updatedAt
      FROM exams
      LEFT JOIN rosters r ON r.id = exams.roster_id
      WHERE exams.id = ?
      LIMIT 1`
    )
    .get(examId) as ExamRow | null;
  return row ? mapExam(row) : null;
}

export function updateExam(
  examId: string,
  updates: Partial<Omit<Exam, "id" | "createdAt" | "updatedAt">>
): Exam | null {
  const current = getExamById(examId);
  if (!current) {
    return null;
  }

  const now = nowIso();
  db.query(
    `UPDATE exams
     SET title = ?, course_code = ?, exam_date = ?, duration_minutes = ?, passing_score = ?, roster_id = ?, status = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.title ?? current.title,
    updates.courseCode ?? current.courseCode,
    updates.date ?? current.date,
    updates.durationMinutes ?? current.durationMinutes,
    updates.passingScore ?? current.passingScore,
    updates.rosterId ?? current.rosterId,
    updates.status ?? current.status,
    now,
    examId
  );

  return getExamById(examId);
}

export function deleteExam(examId: string): boolean {
  const result = db.query("DELETE FROM exams WHERE id = ?").run(examId);
  return Number(result.changes ?? 0) > 0;
}

export function duplicateExam(examId: string): Exam | null {
  const source = getExamById(examId);
  if (!source) {
    return null;
  }

  const copied = createExam({
    title: `${source.title} (Copy)`,
    courseCode: source.courseCode,
    date: source.date,
    durationMinutes: source.durationMinutes,
    passingScore: source.passingScore,
    rosterId: source.rosterId,
    status: "Draft"
  });

  const sourceQuestions = listQuestionsByExam(examId);
  for (const question of sourceQuestions) {
    createQuestion(copied.id, {
      type: question.type,
      text: question.text,
      options: question.options,
      correctAnswer: question.correctAnswer,
      points: question.points,
      status: question.status,
      orderIndex: question.orderIndex
    });
  }

  return getExamById(copied.id);
}

export function listQuestionsByExam(examId: string): Question[] {
  const rows = db
    .query(
      `SELECT
        id,
        exam_id AS examId,
        type,
        text,
        options_json AS optionsJson,
        correct_answer AS correctAnswer,
        points,
        status,
        order_index AS orderIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM questions
      WHERE exam_id = ?
      ORDER BY order_index ASC, created_at ASC`
    )
    .all(examId) as QuestionRow[];
  return rows.map(mapQuestion);
}

export function createQuestion(
  examId: string,
  input: {
    type: "MCQ" | "FILL" | "ESSAY";
    text: string;
    options?: string[];
    correctAnswer?: string;
    points: number;
    status?: "Pending" | "Approved" | "Discarded";
    orderIndex?: number;
  }
): Question {
  const now = nowIso();
  const id = `q_${crypto.randomUUID()}`;
  const orderIndex =
    input.orderIndex ??
    ((db.query("SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM questions WHERE exam_id = ?").get(examId) as { next: number })
      .next ?? 0);

  db.query(
    `INSERT INTO questions
      (id, exam_id, type, text, options_json, correct_answer, points, status, order_index, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    examId,
    input.type,
    input.text,
    JSON.stringify(input.options ?? []),
    input.correctAnswer ?? "",
    input.points,
    input.status ?? "Pending",
    orderIndex,
    now,
    now
  );

  return listQuestionsByExam(examId).find((q) => q.id === id)!;
}

export function updateQuestion(
  questionId: string,
  updates: Partial<Pick<Question, "text" | "options" | "correctAnswer" | "points" | "status" | "orderIndex">>
): Question | null {
  const row = db
    .query(
      `SELECT
        id,
        exam_id AS examId,
        type,
        text,
        options_json AS optionsJson,
        correct_answer AS correctAnswer,
        points,
        status,
        order_index AS orderIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM questions
      WHERE id = ?
      LIMIT 1`
    )
    .get(questionId) as QuestionRow | null;

  if (!row) {
    return null;
  }

  const current = mapQuestion(row);
  const now = nowIso();
  db.query(
    `UPDATE questions
     SET text = ?, options_json = ?, correct_answer = ?, points = ?, status = ?, order_index = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    updates.text ?? current.text,
    JSON.stringify(updates.options ?? current.options),
    updates.correctAnswer ?? current.correctAnswer,
    updates.points ?? current.points,
    updates.status ?? current.status,
    updates.orderIndex ?? current.orderIndex,
    now,
    questionId
  );

  return listQuestionsByExam(current.examId).find((q) => q.id === questionId) ?? null;
}

export function deleteQuestion(questionId: string): boolean {
  const result = db.query("DELETE FROM questions WHERE id = ?").run(questionId);
  return Number(result.changes ?? 0) > 0;
}
