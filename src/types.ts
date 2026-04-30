export type Tone = "info" | "success" | "warning" | "error" | "neutral";

export type ExamStatus = "Draft" | "Published" | "Running" | "Completed" | "Archived";

export type QuestionType = "MCQ" | "FILL" | "ESSAY";

export type QuestionStatus = "Pending" | "Approved" | "Discarded";

export type Question = {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
  status: QuestionStatus;
};

export type Exam = {
  id: string;
  title: string;
  courseCode: string;
  date: string;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
  status: ExamStatus;
  questions: Question[];
  createdAt: string;
};

export type RosterStudent = {
  id: string;
  matric: string;
  name: string;
};

export type Roster = {
  id: string;
  name: string;
  description?: string;
  students: RosterStudent[];
  lastUsedAt: string;
};

export type SessionStatus = "Connected" | "Active" | "Submitted" | "Flagged" | "Disconnected";

export type StudentSession = {
  id: string;
  studentId: string;
  matric: string;
  name: string;
  status: SessionStatus;
  currentQuestion: number;
  flags: number;
  timeRemaining: number;
  reconnectGapSeconds: number;
};

export type NetworkInfo = {
  host: string;
  port: number;
  localIp: string;
  joinUrl: string;
  note: string;
};

export type SyncItem = {
  id: string;
  examId: string;
  examTitle: string;
  sizeLabel: string;
  status: "Pending" | "Syncing" | "Synced" | "Error";
  error?: string;
  progress: number;
};

export type ConfirmConfig = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "default";
  onConfirm: () => void;
};

export type Toast = {
  id: string;
  message: string;
  tone: Tone;
};

export type OnboardingStep = 0 | 1 | 2 | 3 | 4;

export type StudentLoginResult =
  | { type: "invalid"; message: string }
  | { type: "already_submitted"; message: string }
  | { type: "recovery"; message: string; question: number; remaining: number }
  | { type: "ok"; message: string };
