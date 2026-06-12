import type { NetworkInfo } from "../types";

const API_ROOT = "/api";
const AUTH_TOKEN_KEY = "mudu_auth_token";
const STUDENT_TOKEN_KEY = "mudu_student_token";

export type LecturerProfile = {
  id: string;
  name: string;
  email: string;
  institution: string | null;
  department: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RosterStudent = {
  id: string;
  matric: string;
  name: string;
};

export type RosterRecord = {
  id: string;
  name: string;
  description: string | null;
  courseCode: string | null;
  lastUsedAt: string;
  students: RosterStudent[];
};

export type ExamStatus = "Draft" | "Published" | "Archived" | "Active" | "Running" | "Completed";
export type QuestionType = "MCQ" | "FILL" | "ESSAY";

export type ExamQuestionRecord = {
  id: string;
  examId: string;
  type: QuestionType;
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

export type AiGenerateQuestionsResponse = {
  questions: ExamQuestionRecord[];
};

export type ExamRecord = {
  id: string;
  title: string;
  courseCode: string | null;
  rosterName?: string | null;
  date: string;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
  status: ExamStatus;
  syncStatus?: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  rosterStudentCount?: number;
  submittedCount?: number;
  activeRunId?: string | null;
};

export type ExamSessionRecord = {
  id: string;
  name: string;
  matric: string;
  status: "Connected" | "Active" | "Submitted" | "Flagged" | "Disconnected";
  question: string;
  currentQuestion: number;
  flags: number;
  reconnectGap: string;
  reconnectGapSeconds: number;
  timeRemaining: number;
};

export type RunSessionRecord = ExamSessionRecord;

export type ExamRun = {
  id: string;
  examId: string;
  rosterId: string;
  status: "Draft" | "Lobby" | "Running" | "Ended";
  joinCode: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExamResultsRecord = {
  scoreBands: Array<{ range: string; count: number }>;
  questionInsights: Array<{ id: string; type: string; successRate: string; issue: string }>;
};

export type QuestionBankRecord = ExamQuestionRecord;

export type StudentLoginResponse = {
  code: "JOINED" | "SESSION_RECOVERED";
  sessionToken: string;
  examTitle: string;
  studentName: string;
  currentQuestion: number;
  timeRemainingSeconds: number;
};

export type StudentExamQuestionRecord = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  points: number;
  orderIndex: number;
};

export type StudentExamRecord = {
  session: {
    id: string;
    status: string;
    currentQuestion: number;
    endsAt: string;
    remainingSeconds: number;
    flagCount: number;
    warningMessage: string | null;
  };
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    questions: StudentExamQuestionRecord[];
  };
  answers: Record<string, string>;
};

export type StudentSessionRecord = {
  sessionId: string;
  status: string;
  currentQuestion: number;
  endsAt: string;
  remainingSeconds: number;
  flagCount: number;
  warningMessage: string | null;
};

export type StudentEventType =
  | "fullscreen_exit"
  | "tab_hidden"
  | "visibility_lost"
  | "tab_visible"
  | "reconnect"
  | "client_disconnect";

export type StudentEventResponse = {
  status: string;
  eventType: StudentEventType;
  flagCount: number;
  warningMessage: string | null;
};

export type DashboardRecord = {
  metrics: Array<{ label: string; value: string }>;
  exams: Array<{
    id: string;
    title: string;
    course: string;
    rosterName: string;
    status: string;
    submissions: string;
    sync: string;
  }>;
};

export type SyncStatusRecord = {
  localSourceOfTruth: boolean;
  cloudSyncDeferred: boolean;
  reason: string | null;
};

export async function fetchDashboardRequest(): Promise<DashboardRecord> {
  const response = await fetch(`${API_ROOT}/dashboard`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch dashboard.", "FETCH_DASHBOARD_FAILED");
  }
  return (await response.json()) as DashboardRecord;
}

export async function fetchSyncStatusRequest(): Promise<SyncStatusRecord> {
  const response = await fetch(`${API_ROOT}/sync/status`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch sync status.", "FETCH_SYNC_STATUS_FAILED");
  }
  return (await response.json()) as SyncStatusRecord;
}

export async function fetchExamsRequest(input?: { status?: string; q?: string }): Promise<ExamRecord[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.q) params.set("q", input.q);
  const query = params.toString();
  const response = await fetch(`${API_ROOT}/exams${query ? `?${query}` : ""}`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch exams.", "FETCH_EXAMS_FAILED");
  }
  const payload = (await response.json()) as { exams: ExamRecord[] };
  return payload.exams;
}

export async function deleteExamRequest(examId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to delete exam.", "DELETE_EXAM_FAILED");
  }
}

export async function archiveExamRequest(examId: string): Promise<ExamRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/archive`, {
    method: "POST"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to archive exam.", "ARCHIVE_EXAM_FAILED");
  }
  const payload = (await response.json()) as { exam: ExamRecord };
  return payload.exam;
}

export async function duplicateExamRequest(examId: string): Promise<ExamRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/duplicate`, {
    method: "POST"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to duplicate exam.", "DUPLICATE_EXAM_FAILED");
  }
  const payload = (await response.json()) as { exam: ExamRecord };
  return payload.exam;
}

export async function fetchExamSessionsRequest(examId: string): Promise<ExamSessionRecord[]> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/sessions`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch exam sessions.", "FETCH_EXAM_SESSIONS_FAILED");
  }
  const payload = (await response.json()) as { sessions: ExamSessionRecord[] };
  return payload.sessions;
}

export async function postExamSessionActionRequest(
  examId: string,
  matric: string,
  action: "extend_time" | "dismiss_flags" | "force_submit"
): Promise<void> {
  const response = await fetch(
    `${API_ROOT}/exams/${encodeURIComponent(examId)}/sessions/${encodeURIComponent(matric)}/actions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    }
  );
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to run session action.", "SESSION_ACTION_FAILED");
  }
}

export async function fetchExamResultsRequest(examId: string): Promise<ExamResultsRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/results`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch exam results.", "FETCH_EXAM_RESULTS_FAILED");
  }
  return (await response.json()) as ExamResultsRecord;
}

export async function fetchRunSessionsRequest(runId: string): Promise<RunSessionRecord[]> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/runs/${encodeURIComponent(runId)}/sessions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch run sessions.", "FETCH_RUN_SESSIONS_FAILED");
  }
  const payload = (await response.json()) as { sessions: RunSessionRecord[] };
  return payload.sessions;
}

export async function postRunSessionActionRequest(
  runId: string,
  sessionId: string,
  action: "extend_time" | "dismiss_flags" | "force_submit",
  input?: { minutes?: number }
): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const suffix =
    action === "extend_time"
      ? "extend-time"
      : action === "dismiss_flags"
        ? "dismiss-flags"
        : "force-submit";
  const response = await fetch(
    `${API_ROOT}/runs/${encodeURIComponent(runId)}/sessions/${encodeURIComponent(sessionId)}/${suffix}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input ?? {})
    }
  );
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to run monitoring action.", "RUN_SESSION_ACTION_FAILED");
  }
}

type AuthPayload = {
  token: string;
  profile: LecturerProfile;
};

export type AppSettings = {
  autosaveIntervalSeconds: number;
  recoveryWindowMinutes: number;
  aiProvider: string;
  aiModel: string;
  syncEnabled: boolean;
  defaultExamDurationMinutes: number;
  defaultPassingScore: number;
  fullscreenRequired: boolean;
  tabMonitoringEnabled: boolean;
  shuffleQuestions: boolean;
  showScoreToStudent: boolean;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

export class ApiClientError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
  }
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const payload = error as ApiErrorPayload;
    if (payload.message) {
      return payload.message;
    }
  }
  return fallback;
}

async function parseError(response: Response): Promise<ApiErrorPayload> {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return {};
  }
}

function toApiClientError(error: ApiErrorPayload, fallbackMessage: string, fallbackCode: string): ApiClientError {
  return new ApiClientError(error.code ?? fallbackCode, getErrorMessage(error, fallbackMessage));
}

function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function getStudentToken(): string | null {
  return localStorage.getItem(STUDENT_TOKEN_KEY);
}

function setStudentToken(token: string): void {
  localStorage.setItem(STUDENT_TOKEN_KEY, token);
}

function clearStudentToken(): void {
  localStorage.removeItem(STUDENT_TOKEN_KEY);
}

function getStudentHeaders(): HeadersInit {
  const token = getStudentToken();
  if (!token) {
    throw new ApiClientError("STUDENT_SESSION_MISSING", "Missing student session token.");
  }
  return { Authorization: `Bearer ${token}` };
}

export async function fetchNetwork(): Promise<NetworkInfo> {
  const fallback: NetworkInfo = {
    host: "0.0.0.0",
    port: 3000,
    localIp: "127.0.0.1",
    joinUrl: "http://127.0.0.1:3000",
    note: "Students should connect from browser on same WiFi as lecturer laptop."
  };

  try {
    const response = await fetch(`${API_ROOT}/network`);
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as NetworkInfo;
  } catch {
    return fallback;
  }
}

export async function signupLecturer(input: {
  name: string;
  email: string;
  password: string;
  institution?: string;
  department?: string;
}): Promise<AuthPayload> {
  const response = await fetch(`${API_ROOT}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to sign up.", "SIGNUP_FAILED");
  }

  const payload = (await response.json()) as AuthPayload;
  setAuthToken(payload.token);
  return payload;
}

export async function loginLecturer(input: { email: string; password: string }): Promise<AuthPayload> {
  const response = await fetch(`${API_ROOT}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to log in.", "LOGIN_FAILED");
  }

  const payload = (await response.json()) as AuthPayload;
  setAuthToken(payload.token);
  return payload;
}

export async function logoutLecturer(): Promise<void> {
  const token = getAuthToken();
  if (!token) {
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${API_ROOT}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
  } catch {
    throw new ApiClientError("LOGOUT_FAILED", "Failed to log out.");
  }

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to log out.", "LOGOUT_FAILED");
  }

  clearAuthToken();
}

export async function fetchLecturerProfile(): Promise<LecturerProfile | null> {
  const token = getAuthToken();
  if (!token) {
    return null;
  }

  const response = await fetch(`${API_ROOT}/settings/profile`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    clearAuthToken();
    return null;
  }

  return (await response.json()) as LecturerProfile;
}

export async function updateLecturerProfile(input: Partial<Pick<LecturerProfile, "name" | "institution" | "department">>): Promise<LecturerProfile> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/settings/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update profile.", "UPDATE_PROFILE_FAILED");
  }

  return (await response.json()) as LecturerProfile;
}

export async function fetchAppSettings(): Promise<AppSettings> {
  const response = await fetch(`${API_ROOT}/settings/app`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch app settings.", "FETCH_APP_SETTINGS_FAILED");
  }
  return (await response.json()) as AppSettings;
}

export async function updateAppSettings(input: Partial<AppSettings>): Promise<AppSettings> {
  const response = await fetch(`${API_ROOT}/settings/app`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update app settings.", "UPDATE_APP_SETTINGS_FAILED");
  }
  return (await response.json()) as AppSettings;
}

export async function fetchRosters(): Promise<RosterRecord[]> {
  const response = await fetch(`${API_ROOT}/rosters`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch rosters.", "FETCH_ROSTERS_FAILED");
  }
  const payload = (await response.json()) as { rosters: RosterRecord[] };
  return payload.rosters;
}

export async function createRosterRequest(input: {
  name: string;
  description?: string;
  courseCode?: string;
}): Promise<RosterRecord> {
  const response = await fetch(`${API_ROOT}/rosters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to create roster.", "CREATE_ROSTER_FAILED");
  }
  const payload = (await response.json()) as { roster: RosterRecord };
  return payload.roster;
}

export async function updateRosterRequest(
  rosterId: string,
  input: Partial<{ name: string; description: string | null; courseCode: string | null }>
): Promise<RosterRecord> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update roster.", "UPDATE_ROSTER_FAILED");
  }
  const payload = (await response.json()) as { roster: RosterRecord };
  return payload.roster;
}

export async function deleteRosterRequest(rosterId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to delete roster.", "DELETE_ROSTER_FAILED");
  }
}

export async function addRosterStudentRequest(
  rosterId: string,
  input: { matric: string; name: string }
): Promise<RosterStudent> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to add student.", "ADD_STUDENT_FAILED");
  }
  const payload = (await response.json()) as { student: RosterStudent };
  return payload.student;
}

export async function updateRosterStudentRequest(
  studentId: string,
  input: Partial<{ matric: string; name: string }>
): Promise<RosterStudent> {
  const response = await fetch(`${API_ROOT}/rosters/students/${encodeURIComponent(studentId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update student.", "UPDATE_STUDENT_FAILED");
  }
  const payload = (await response.json()) as { student: RosterStudent };
  return payload.student;
}

export async function deleteRosterStudentRequest(studentId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/rosters/students/${encodeURIComponent(studentId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to remove student.", "REMOVE_STUDENT_FAILED");
  }
}

export async function importRosterCsvRequest(
  rosterId: string,
  csvText: string
): Promise<{ created: number; duplicates: number; invalid: number }> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}/import-csv`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ csvText })
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to import roster CSV.", "IMPORT_ROSTER_CSV_FAILED");
  }
  return (await response.json()) as { created: number; duplicates: number; invalid: number };
}

export async function createRosterRegistrationLinkRequest(rosterId: string): Promise<{ token: string; link: string; expiresAt: string }> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}/registration-link`, {
    method: "POST"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to create registration link.", "CREATE_REGISTRATION_LINK_FAILED");
  }
  return (await response.json()) as { token: string; link: string; expiresAt: string };
}

export async function registerStudentByTokenRequest(
  token: string,
  input: { matric: string; name: string }
): Promise<{ student: RosterStudent; rosterId: string }> {
  const response = await fetch(`${API_ROOT}/registration/${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to register student.", "REGISTER_STUDENT_FAILED");
  }
  return (await response.json()) as { student: RosterStudent; rosterId: string };
}

export async function confirmRosterRegistrationsRequest(
  rosterId: string
): Promise<{ roster: RosterRecord }> {
  const response = await fetch(`${API_ROOT}/rosters/${encodeURIComponent(rosterId)}/confirm-registrations`, {
    method: "POST"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to confirm registrations.", "CONFIRM_REGISTRATIONS_FAILED");
  }
  return (await response.json()) as { roster: RosterRecord };
}

export async function createExamRequest(input: {
  title: string;
  courseCode?: string;
  date?: string;
  durationMinutes?: number;
  passingScore?: number;
  rosterId: string;
  status?: ExamStatus;
}): Promise<ExamRecord> {
  const response = await fetch(`${API_ROOT}/exams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to create exam.", "CREATE_EXAM_FAILED");
  }
  const payload = (await response.json()) as { exam: ExamRecord };
  return payload.exam;
}

export async function updateExamRequest(
  examId: string,
  input: Partial<{
    title: string;
    courseCode: string;
    date: string;
    durationMinutes: number;
    passingScore: number;
    rosterId: string;
    status: ExamStatus;
  }>
): Promise<ExamRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update exam.", "UPDATE_EXAM_FAILED");
  }
  const payload = (await response.json()) as { exam: ExamRecord };
  return payload.exam;
}

export async function createExamQuestionRequest(
  examId: string,
  input: {
    type: QuestionType;
    text: string;
    options?: string[];
    correctAnswer?: string;
    points?: number;
    status?: "Pending" | "Approved" | "Discarded";
    orderIndex?: number;
  }
): Promise<ExamQuestionRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to create question.", "CREATE_QUESTION_FAILED");
  }
  const payload = (await response.json()) as { question: ExamQuestionRecord };
  return payload.question;
}

export async function updateQuestionRequest(
  questionId: string,
  input: Partial<{
    text: string;
    options: string[];
    correctAnswer: string;
    points: number;
    status: "Pending" | "Approved" | "Discarded";
    orderIndex: number;
  }>
): Promise<ExamQuestionRecord> {
  const response = await fetch(`${API_ROOT}/questions/${encodeURIComponent(questionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to update question.", "UPDATE_QUESTION_FAILED");
  }
  const payload = (await response.json()) as { question: ExamQuestionRecord };
  return payload.question;
}

export async function fetchQuestionBankRequest(input?: {
  status?: "Pending" | "Approved" | "Discarded";
  course?: string;
  type?: QuestionType;
  q?: string;
}): Promise<QuestionBankRecord[]> {
  const params = new URLSearchParams();
  if (input?.status) params.set("status", input.status);
  if (input?.course) params.set("course", input.course);
  if (input?.type) params.set("type", input.type);
  if (input?.q) params.set("q", input.q);

  const query = params.toString();
  const response = await fetch(`${API_ROOT}/questions${query ? `?${query}` : ""}`);
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch question bank.", "FETCH_QUESTION_BANK_FAILED");
  }
  const payload = (await response.json()) as { questions: QuestionBankRecord[] };
  return payload.questions;
}

export async function duplicateQuestionToExamRequest(
  questionId: string,
  targetExamId: string
): Promise<ExamQuestionRecord> {
  const response = await fetch(`${API_ROOT}/questions/${encodeURIComponent(questionId)}/duplicate-to-exam`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetExamId })
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to duplicate question to exam.", "DUPLICATE_QUESTION_TO_EXAM_FAILED");
  }
  const payload = (await response.json()) as { question: ExamQuestionRecord };
  return payload.question;
}

export async function deleteQuestionRequest(questionId: string): Promise<void> {
  const response = await fetch(`${API_ROOT}/questions/${encodeURIComponent(questionId)}`, {
    method: "DELETE"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to delete question.", "DELETE_QUESTION_FAILED");
  }
}

export async function publishExamRequest(examId: string): Promise<ExamRecord> {
  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/publish`, {
    method: "POST"
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to publish exam.", "PUBLISH_EXAM_FAILED");
  }
  const payload = (await response.json()) as { exam: ExamRecord };
  return payload.exam;
}

export async function generateAiQuestionsFromTextRequest(input: {
  examId: string;
  sourceText: string;
  count?: number;
}): Promise<AiGenerateQuestionsResponse> {
  const response = await fetch(`${API_ROOT}/ai/generate-from-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to generate AI questions.", "AI_GENERATION_FAILED");
  }
  return (await response.json()) as AiGenerateQuestionsResponse;
}

export async function createExamRunRequest(examId: string): Promise<ExamRun> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/exams/${encodeURIComponent(examId)}/runs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to create exam run.", "CREATE_EXAM_RUN_FAILED");
  }

  return (await response.json()) as ExamRun;
}

export async function openExamRunLobbyRequest(runId: string): Promise<ExamRun> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/runs/${encodeURIComponent(runId)}/open-lobby`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to open exam run lobby.", "OPEN_EXAM_RUN_LOBBY_FAILED");
  }

  return (await response.json()) as ExamRun;
}

export async function startExamRunRequest(runId: string): Promise<ExamRun> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/runs/${encodeURIComponent(runId)}/start`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to start exam run.", "START_EXAM_RUN_FAILED");
  }

  return (await response.json()) as ExamRun;
}

export async function endExamRunRequest(runId: string): Promise<ExamRun> {
  const token = getAuthToken();
  if (!token) {
    throw new ApiClientError("INVALID_LECTURER_TOKEN", "Missing lecturer token.");
  }

  const response = await fetch(`${API_ROOT}/runs/${encodeURIComponent(runId)}/end`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to end exam run.", "END_EXAM_RUN_FAILED");
  }

  return (await response.json()) as ExamRun;
}

export async function studentLoginRequest(input: { runId: string; matric: string }): Promise<StudentLoginResponse> {
  const response = await fetch(`${API_ROOT}/runs/${encodeURIComponent(input.runId)}/student/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ matric: input.matric })
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to join exam.", "STUDENT_LOGIN_FAILED");
  }

  const payload = (await response.json()) as StudentLoginResponse;
  setStudentToken(payload.sessionToken);
  return payload;
}

export async function fetchStudentExamRequest(): Promise<StudentExamRecord> {
  const response = await fetch(`${API_ROOT}/student/exam`, {
    headers: getStudentHeaders()
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch student exam.", "FETCH_STUDENT_EXAM_FAILED");
  }

  return (await response.json()) as StudentExamRecord;
}

export async function fetchStudentSessionRequest(): Promise<StudentSessionRecord> {
  const response = await fetch(`${API_ROOT}/student/session`, {
    headers: getStudentHeaders()
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to fetch student session.", "FETCH_STUDENT_SESSION_FAILED");
  }

  return (await response.json()) as StudentSessionRecord;
}

export async function saveStudentAnswerRequest(input: {
  questionId: string;
  value: string;
  currentQuestion: number;
}): Promise<{ savedAt: string }> {
  const response = await fetch(`${API_ROOT}/student/answers`, {
    method: "POST",
    headers: {
      ...getStudentHeaders(),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to save answer.", "SAVE_STUDENT_ANSWER_FAILED");
  }

  return (await response.json()) as { savedAt: string };
}

export async function submitStudentExamRequest(): Promise<{ status: string; submittedAt: string }> {
  const response = await fetch(`${API_ROOT}/student/submit`, {
    method: "POST",
    headers: getStudentHeaders()
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to submit exam.", "SUBMIT_STUDENT_EXAM_FAILED");
  }

  const payload = (await response.json()) as { status: string; submittedAt: string };
  clearStudentToken();
  return payload;
}

export function clearStudentSessionToken(): void {
  clearStudentToken();
}

export function getStoredStudentSessionToken(): string | null {
  return getStudentToken();
}

export async function postStudentEventRequest(input: {
  eventType: StudentEventType;
  studentToken?: string;
  details?: Record<string, unknown>;
}): Promise<StudentEventResponse> {
  const headers: HeadersInit = {
    "Content-Type": "application/json"
  };

  const token = input.studentToken ?? getStudentToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_ROOT}/student/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      eventType: input.eventType,
      studentToken: input.studentToken,
      details: input.details
    })
  });

  if (!response.ok) {
    const err = await parseError(response);
    throw toApiClientError(err, "Failed to post student event.", "POST_STUDENT_EVENT_FAILED");
  }

  return (await response.json()) as StudentEventResponse;
}
