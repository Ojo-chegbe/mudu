import { apiError, badRequest, json, notFound } from "../http";
import {
  createExam,
  createQuestion,
  deleteExam,
  deleteQuestion,
  duplicateExam,
  duplicateQuestionToExam,
  getExamById,
  listExams,
  listQuestionBank,
  listQuestionsByExam,
  updateExam,
  updateQuestion
} from "../repositories/exams";

type CreateExamBody = {
  title?: string;
  courseCode?: string;
  date?: string;
  durationMinutes?: number;
  passingScore?: number;
  rosterId?: string;
  status?: string;
};

type CreateQuestionBody = {
  type?: "MCQ" | "FILL" | "ESSAY";
  text?: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
  status?: "Pending" | "Approved" | "Discarded";
  orderIndex?: number;
};

type DuplicateQuestionBody = {
  targetExamId?: string;
};

export async function handleExamCrudRoutes(request: Request, pathname: string, url: URL): Promise<Response | null> {
  if (pathname === "/api/questions" && request.method === "GET") {
    const status = url.searchParams.get("status") ?? undefined;
    const course = url.searchParams.get("course") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;

    return json({
      questions: listQuestionBank({
        status,
        course,
        type: type as "MCQ" | "FILL" | "ESSAY" | undefined,
        q
      })
    });
  }

  if (pathname === "/api/exams" && request.method === "GET") {
    const status = url.searchParams.get("status") ?? undefined;
    const q = url.searchParams.get("q") ?? undefined;
    return json({ exams: listExams({ status, q }) });
  }

  if (pathname === "/api/exams" && request.method === "POST") {
    const body = (await request.json().catch(() => null)) as CreateExamBody | null;
    const title = body?.title?.trim() ?? "";
    const rosterId = body?.rosterId?.trim() ?? "";
    if (!title || !rosterId) {
      return apiError(400, "MISSING_EXAM_FIELDS", "Exam title and rosterId are required.");
    }

    const exam = createExam({
      title,
      courseCode: body?.courseCode?.trim() ?? "",
      date: body?.date?.trim() ?? new Date().toISOString().slice(0, 10),
      durationMinutes: Math.max(1, Number(body?.durationMinutes ?? 60)),
      passingScore: Math.max(0, Math.min(100, Number(body?.passingScore ?? 50))),
      rosterId,
      status: body?.status?.trim() || "Draft"
    });

    return json({ exam }, 201);
  }

  const examMatch = pathname.match(/^\/api\/exams\/([^/]+)$/);
  if (examMatch && request.method === "GET") {
    const examId = decodeURIComponent(examMatch[1]);
    const exam = getExamById(examId);
    if (!exam) {
      return notFound("Exam not found.");
    }
    const questions = listQuestionsByExam(examId);
    return json({ exam: { ...exam, questions } });
  }

  if (examMatch && request.method === "PATCH") {
    const examId = decodeURIComponent(examMatch[1]);
    const body = (await request.json().catch(() => null)) as Partial<CreateExamBody> | null;
    if (!body) {
      return apiError(400, "INVALID_BODY", "Request body must be an object.");
    }

    const updated = updateExam(examId, {
      title: body.title?.trim(),
      courseCode: body.courseCode?.trim(),
      date: body.date?.trim(),
      durationMinutes: body.durationMinutes,
      passingScore: body.passingScore,
      rosterId: body.rosterId?.trim(),
      status: body.status?.trim()
    });

    if (!updated) {
      return notFound("Exam not found.");
    }
    return json({ exam: updated });
  }

  if (examMatch && request.method === "DELETE") {
    const examId = decodeURIComponent(examMatch[1]);
    const ok = deleteExam(examId);
    if (!ok) {
      return notFound("Exam not found.");
    }
    return json({ status: "ok" });
  }

  const archiveMatch = pathname.match(/^\/api\/exams\/([^/]+)\/archive$/);
  if (archiveMatch && request.method === "POST") {
    const examId = decodeURIComponent(archiveMatch[1]);
    const updated = updateExam(examId, { status: "Archived" });
    if (!updated) {
      return notFound("Exam not found.");
    }
    return json({ exam: updated });
  }

  const publishMatch = pathname.match(/^\/api\/exams\/([^/]+)\/publish$/);
  if (publishMatch && request.method === "POST") {
    const examId = decodeURIComponent(publishMatch[1]);
    const exam = getExamById(examId);
    if (!exam) {
      return notFound("Exam not found.");
    }

    const approvedQuestions = listQuestionsByExam(examId).filter((question) => question.status === "Approved");
    if (!exam.title.trim() || exam.durationMinutes < 1 || !exam.rosterId || approvedQuestions.length < 1) {
      return apiError(
        409,
        "EXAM_NOT_READY_FOR_PUBLISH",
        "Exam must have title, duration, roster, and at least one approved question before publish.",
        {
          hasTitle: Boolean(exam.title.trim()),
          hasDuration: exam.durationMinutes >= 1,
          hasRoster: Boolean(exam.rosterId),
          approvedQuestionCount: approvedQuestions.length
        }
      );
    }

    const updated = updateExam(examId, { status: "Published" });
    if (!updated) {
      return notFound("Exam not found.");
    }
    return json({ exam: updated });
  }

  const duplicateMatch = pathname.match(/^\/api\/exams\/([^/]+)\/duplicate$/);
  if (duplicateMatch && request.method === "POST") {
    const examId = decodeURIComponent(duplicateMatch[1]);
    const duplicated = duplicateExam(examId);
    if (!duplicated) {
      return notFound("Exam not found.");
    }
    return json({ exam: duplicated }, 201);
  }

  const addQuestionMatch = pathname.match(/^\/api\/exams\/([^/]+)\/questions$/);
  if (addQuestionMatch && request.method === "POST") {
    const examId = decodeURIComponent(addQuestionMatch[1]);
    const exam = getExamById(examId);
    if (!exam) {
      return notFound("Exam not found.");
    }

    const body = (await request.json().catch(() => null)) as CreateQuestionBody | null;
    const type = body?.type;
    const text = body?.text?.trim() ?? "";
    const points = Number(body?.points ?? 1);
    if (!type || !text || !Number.isFinite(points) || points < 1) {
      return apiError(400, "INVALID_QUESTION_FIELDS", "Question type, text, and points are required.");
    }

    const question = createQuestion(examId, {
      type,
      text,
      options: body?.options ?? [],
      correctAnswer: body?.correctAnswer ?? "",
      points,
      status: body?.status,
      orderIndex: body?.orderIndex
    });
    return json({ question }, 201);
  }

  const questionMatch = pathname.match(/^\/api\/questions\/([^/]+)$/);
  if (questionMatch && request.method === "PATCH") {
    const questionId = decodeURIComponent(questionMatch[1]);
    const body = (await request.json().catch(() => null)) as Partial<CreateQuestionBody> | null;
    if (!body) {
      return apiError(400, "INVALID_BODY", "Request body must be an object.");
    }

    const updated = updateQuestion(questionId, {
      text: body.text?.trim(),
      options: body.options,
      correctAnswer: body.correctAnswer,
      points: body.points,
      status: body.status,
      orderIndex: body.orderIndex
    });
    if (!updated) {
      return notFound("Question not found.");
    }
    return json({ question: updated });
  }

  if (questionMatch && request.method === "DELETE") {
    const questionId = decodeURIComponent(questionMatch[1]);
    const ok = deleteQuestion(questionId);
    if (!ok) {
      return notFound("Question not found.");
    }
    return json({ status: "ok" });
  }

  const duplicateQuestionMatch = pathname.match(/^\/api\/questions\/([^/]+)\/duplicate-to-exam$/);
  if (duplicateQuestionMatch && request.method === "POST") {
    const questionId = decodeURIComponent(duplicateQuestionMatch[1]);
    const body = (await request.json().catch(() => null)) as DuplicateQuestionBody | null;
    const targetExamId = body?.targetExamId?.trim() ?? "";
    if (!targetExamId) {
      return apiError(400, "MISSING_TARGET_EXAM_ID", "targetExamId is required.");
    }

    const targetExam = getExamById(targetExamId);
    if (!targetExam) {
      return notFound("Target exam not found.");
    }

    const created = duplicateQuestionToExam(questionId, targetExamId);
    if (!created) {
      return notFound("Question not found.");
    }

    return json({ question: created }, 201);
  }

  return null;
}
