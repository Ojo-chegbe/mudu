import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchNetwork } from "../api/client";
import type {
  ConfirmConfig,
  Exam,
  NetworkInfo,
  OnboardingStep,
  Question,
  QuestionType,
  Roster,
  StudentSession,
  SyncItem,
  Toast
} from "../types";

const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

// Temporary UI fixtures. Active lecturer flows should read/write through API
// modules; these remain for routes that have not moved to the backend yet
// and for unmounted reference screens under src/screens.
const baseRosters: Roster[] = [
  {
    id: "roster_csc301",
    name: "CSC301 - 2026 Cohort",
    lastUsedAt: now(),
    students: [
      { id: "st_1", matric: "CSC/2021/098", name: "Amina Bello" },
      { id: "st_2", matric: "CSC/2021/011", name: "Ifeanyi Obi" },
      { id: "st_3", matric: "CSC/2021/072", name: "David Asha" },
      { id: "st_4", matric: "CSC/2021/030", name: "Mariam Yusuf" },
      { id: "st_5", matric: "CSC/2021/104", name: "Olu Adams" }
    ]
  }
];

const seedQuestions: Question[] = [
  {
    id: "q_1",
    type: "MCQ",
    text: "Which property best explains an offline-first exam platform?",
    options: ["Needs permanent internet", "Works on local network first", "Requires student accounts", "Runs only in cloud"],
    correctAnswer: "Works on local network first",
    points: 1,
    status: "Approved"
  },
  {
    id: "q_2",
    type: "FILL",
    text: "SQLite is a ______ database stored in a local file.",
    correctAnswer: "serverless",
    points: 1,
    status: "Approved"
  },
  {
    id: "q_3",
    type: "ESSAY",
    text: "Explain why server-side timer control improves exam integrity.",
    points: 5,
    status: "Approved"
  }
];

const mockObjectiveQuestions: Question[] = Array.from({ length: 30 }, (_, i) => {
  const n = i + 1;
  return {
    id: `q_mock_${n}`,
    type: "MCQ",
    text: `Mock Objective Question ${n}: Select the best answer.`,
    options: [
      `Option A for Q${n}`,
      `Option B for Q${n}`,
      `Option C for Q${n}`,
      `Option D for Q${n}`
    ],
    correctAnswer: `Option A for Q${n}`,
    points: 1,
    status: "Approved"
  };
});

const seedExams: Exam[] = [
  {
    id: "exam_demo_midsem",
    title: "CSC301 Mid-Semester",
    courseCode: "CSC301",
    date: "2026-05-14",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Running",
    questions: seedQuestions,
    createdAt: now()
  },
  {
    id: "exam_demo_quiz",
    title: "MTH219 Quiz",
    courseCode: "MTH219",
    date: "2026-05-06",
    durationMinutes: 45,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Draft",
    questions: [],
    createdAt: now()
  },
  {
    id: "exam_mock_objective_30",
    title: "UI Test Mock Exam (30 Objective)",
    courseCode: "TEST300",
    date: "2026-05-20",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Running",
    questions: mockObjectiveQuestions,
    createdAt: now()
  },
  {
    id: "exam_demo_completed1",
    title: "Cardiovascular Pharmacology",
    courseCode: "PCH 412",
    date: "2026-04-24T11:30:00Z",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Completed",
    questions: [],
    createdAt: "2026-04-20T10:00:00Z"
  },
  {
    id: "exam_demo_completed2",
    title: "Addition reactions",
    courseCode: "PCH 412",
    date: "2026-04-24T11:30:00Z",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Archived",
    questions: [],
    createdAt: "2026-04-20T10:00:00Z"
  },
  {
    id: "exam_demo_completed3",
    title: "Introduction to bioinformatics",
    courseCode: "PCH 412",
    date: "2026-04-24T11:30:00Z",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: "roster_csc301",
    status: "Completed",
    questions: [],
    createdAt: "2026-04-20T10:00:00Z"
  }
];

const seedSessions: StudentSession[] = [
  { id: "ss_1", studentId: "st_1", matric: "CSC/2021/098", name: "Amina Bello", status: "Active", currentQuestion: 8, flags: 0, timeRemaining: 1940, reconnectGapSeconds: 0 },
  { id: "ss_2", studentId: "st_2", matric: "CSC/2021/011", name: "Ifeanyi Obi", status: "Connected", currentQuestion: 1, flags: 0, timeRemaining: 2100, reconnectGapSeconds: 0 },
  { id: "ss_3", studentId: "st_3", matric: "CSC/2021/072", name: "David Asha", status: "Flagged", currentQuestion: 6, flags: 3, timeRemaining: 1820, reconnectGapSeconds: 38 },
  { id: "ss_4", studentId: "st_4", matric: "CSC/2021/030", name: "Mariam Yusuf", status: "Submitted", currentQuestion: 30, flags: 0, timeRemaining: 0, reconnectGapSeconds: 0 },
  { id: "ss_5", studentId: "st_5", matric: "CSC/2021/104", name: "Olu Adams", status: "Disconnected", currentQuestion: 4, flags: 1, timeRemaining: 2050, reconnectGapSeconds: 220 }
];

const defaultNetwork: NetworkInfo = {
  host: "0.0.0.0",
  port: 3000,
  localIp: "127.0.0.1",
  joinUrl: "http://127.0.0.1:3000",
  note: "Students should connect from browser on same WiFi as lecturer laptop."
};

const seedSync: SyncItem[] = [
  { id: "sync_1", examId: "exam_demo_midsem", examTitle: "CSC301 Mid-Semester", sizeLabel: "12 MB", status: "Pending", progress: 0 },
  { id: "sync_2", examId: "exam_demo_quiz", examTitle: "MTH219 Quiz", sizeLabel: "4 MB", status: "Error", progress: 0, error: "No internet" }
];

type NewExamInput = {
  title: string;
  courseCode: string;
  date: string;
  durationMinutes: number;
  passingScore: number;
  rosterId: string;
};

type AppState = {
  isAuthenticated: boolean;
  currentUserId: string | null;
  lecturerName: string;
  institution: string;
  department: string;
  onboardingStep: OnboardingStep;
  onboardingComplete: boolean;

  exams: Exam[];
  rosters: Roster[];
  sessions: StudentSession[];
  syncItems: SyncItem[];
  network: NetworkInfo;

  examBuilder: {
    draft: NewExamInput;
    sourceMode: "upload" | "paste" | "manual" | "bank";
    ai: { count: number; difficulty: "Beginner" | "Intermediate" | "Advanced"; mix: string };
    generated: Question[];
    reviewIndex: number;
  };

  studentMode: {
    examId: string;
    matric: string;
    name: string;
    started: boolean;
    currentQuestion: number;
    answers: Record<string, string>;
    timeRemaining: number;
    autosave: "saved" | "saving" | "failed";
    fullscreen: boolean;
    tabWarnings: number;
    submitted: boolean;
  };

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  confirm: ConfirmConfig | null;
  toasts: Toast[];
  busy: boolean;

  setProfile: (name: string, institution: string, department: string) => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;

  createDraftExam: (input: NewExamInput) => string;
  updateExamStatus: (id: string, status: Exam["status"]) => void;
  deleteExam: (id: string) => void;
  archiveExam: (id: string) => void;

  setSourceMode: (mode: AppState["examBuilder"]["sourceMode"]) => void;
  generateAiQuestions: () => void;
  setQuestionStatus: (id: string, status: Question["status"]) => void;
  updateQuestionText: (id: string, text: string) => void;
  updateBankQuestion: (questionId: string, updates: Partial<Pick<Question, "text" | "options" | "correctAnswer" | "points">>) => void;
  addManualQuestion: (type: QuestionType) => void;
  setBuilderRosterId: (rosterId: string) => void;
  setExamBuilderDraft: (updates: Partial<NewExamInput>) => void;
  publishBuilderExam: () => void;

  importRosterFromCsv: (name: string, csvText: string) => { created: boolean; duplicates: number; invalid: number };
  createRoster: (name: string, description?: string) => string | null;
  addManualStudent: (rosterId: string, matric: string, name: string) => void;

  loadNetwork: () => Promise<void>;
  setSessionsFromRoster: (examId: string) => void;
  extendTime: (sessionId: string, mins: number) => void;
  dismissFlags: (sessionId: string) => void;
  forceSubmit: (sessionId: string) => void;

  runSyncAll: () => Promise<void>;

  studentLogin: (examId: string, matric: string) => { ok: boolean; state: "invalid" | "submitted" | "recovery" | "ok"; message: string };
  studentStartExam: () => void;
  studentAnswer: (questionId: string, value: string) => void;
  studentGoto: (index: number) => void;
  studentTick: () => void;
  studentSubmit: () => void;
  studentReset: () => void;

  askConfirm: (cfg: ConfirmConfig) => void;
  closeConfirm: () => void;
  pushToast: (message: string, tone?: Toast["tone"]) => void;
  removeToast: (id: string) => void;
  logOut: () => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      currentUserId: null,
      lecturerName: "",
      institution: "",
      department: "",
      onboardingStep: 0,
      onboardingComplete: false,

      exams: seedExams,
      rosters: baseRosters,
      sessions: seedSessions,
      syncItems: seedSync,
      network: defaultNetwork,

      examBuilder: {
        draft: {
          title: "",
          courseCode: "",
          date: "",
          durationMinutes: 60,
          passingScore: 50,
          rosterId: baseRosters[0].id
        },
        sourceMode: "manual",
        ai: { count: 20, difficulty: "Intermediate", mix: "MCQ 60 / Fill 30 / Essay 10" },
        generated: [],
        reviewIndex: 0
      },

      studentMode: {
        examId: "exam_demo_midsem",
        matric: "",
        name: "",
        started: false,
        currentQuestion: 1,
        answers: {},
        timeRemaining: 3600,
        autosave: "saved",
        fullscreen: false,
        tabWarnings: 0,
        submitted: false
      },

      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      confirm: null,
      toasts: [],
      busy: false,

      setProfile: (lecturerName, institution, department) => set({ lecturerName, institution, department }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      completeOnboarding: () => set({ onboardingComplete: true }),

      createDraftExam: (input) => {
        const id = makeId("exam");
        set((state) => ({
          exams: [{ id, ...input, status: "Draft", questions: [], createdAt: now() }, ...state.exams],
          examBuilder: { ...state.examBuilder, draft: input }
        }));
        return id;
      },

      updateExamStatus: (id, status) => set((state) => ({ exams: state.exams.map((exam) => (exam.id === id ? { ...exam, status } : exam)) })),
      deleteExam: (id) => set((state) => ({ exams: state.exams.filter((exam) => exam.id !== id) })),
      archiveExam: (id) => set((state) => ({ exams: state.exams.map((exam) => (exam.id === id ? { ...exam, status: "Archived" } : exam)) })),

      setSourceMode: (sourceMode) => set((state) => ({ examBuilder: { ...state.examBuilder, sourceMode } })),
      generateAiQuestions: () => {
        const count = get().examBuilder.ai.count;
        const generated: Question[] = Array.from({ length: count }, (_, i) => ({
          id: makeId("genq"),
          type: i % 7 === 0 ? "ESSAY" : i % 3 === 0 ? "FILL" : "MCQ",
          text: `Generated question ${i + 1}`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          points: i % 7 === 0 ? 5 : 1,
          status: "Pending"
        }));
        set((state) => ({ examBuilder: { ...state.examBuilder, generated, reviewIndex: 0 } }));
      },
      setQuestionStatus: (id, status) =>
        set((state) => ({
          examBuilder: {
            ...state.examBuilder,
            generated: state.examBuilder.generated.map((q) => (q.id === id ? { ...q, status } : q))
          }
        })),
      updateQuestionText: (id, text) =>
        set((state) => ({
          examBuilder: {
            ...state.examBuilder,
            generated: state.examBuilder.generated.map((q) => (q.id === id ? { ...q, text } : q))
          }
        })),
      updateBankQuestion: (questionId, updates) =>
        set((state) => ({
          exams: state.exams.map((exam) => ({
            ...exam,
            questions: exam.questions.map((q) => (q.id === questionId ? { ...q, ...updates } : q))
          }))
        })),
      addManualQuestion: (type) =>
        set((state) => ({
          examBuilder: {
            ...state.examBuilder,
            generated: [
              ...state.examBuilder.generated,
              { id: makeId("manq"), type, text: "", options: type === "MCQ" ? ["", "", "", ""] : undefined, points: type === "ESSAY" ? 5 : 1, status: "Pending" }
            ]
          }
        })),
      setBuilderRosterId: (rosterId) =>
        set((state) => ({
          examBuilder: {
            ...state.examBuilder,
            draft: {
              ...state.examBuilder.draft,
              rosterId
            }
          }
        })),
      setExamBuilderDraft: (updates) =>
        set((state) => ({
          examBuilder: {
            ...state.examBuilder,
            draft: {
              ...state.examBuilder.draft,
              ...updates
            }
          }
        })),
      publishBuilderExam: () => {
        const state = get();
        const approved = state.examBuilder.generated.filter((q) => q.status === "Approved");
        const id = makeId("exam");
        const draft = state.examBuilder.draft;
        const exam: Exam = {
          id,
          title: draft.title || "Untitled Exam",
          courseCode: draft.courseCode,
          date: draft.date || new Date().toISOString().slice(0, 10),
          durationMinutes: draft.durationMinutes,
          passingScore: draft.passingScore,
          rosterId: draft.rosterId,
          status: "Published",
          questions: approved,
          createdAt: now()
        };
        set((s) => ({
          exams: [exam, ...s.exams],
          examBuilder: { ...s.examBuilder, generated: [], reviewIndex: 0 }
        }));
        get().pushToast("Exam published successfully.", "success");
      },

      importRosterFromCsv: (name, csvText) => {
        const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          return { created: false, duplicates: 0, invalid: 0 };
        }
        const seen = new Set<string>();
        const students = [] as Roster["students"];
        let duplicates = 0;
        let invalid = 0;
        for (let i = 1; i < lines.length; i += 1) {
          const [matricRaw, nameRaw] = lines[i].split(",");
          const matric = (matricRaw ?? "").trim();
          const studentName = (nameRaw ?? "").trim();
          if (!matric || !studentName) {
            invalid += 1;
            continue;
          }
          if (seen.has(matric)) {
            duplicates += 1;
            continue;
          }
          seen.add(matric);
          students.push({ id: makeId("st"), matric, name: studentName });
        }
        if (students.length === 0) {
          return { created: false, duplicates, invalid };
        }
        const roster: Roster = { id: makeId("roster"), name, students, lastUsedAt: now() };
        set((state) => ({ rosters: [roster, ...state.rosters] }));
        return { created: true, duplicates, invalid };
      },
      createRoster: (name, description) => {
        const trimmedName = name.trim();
        if (!trimmedName) {
          return null;
        }
        const roster: Roster = {
          id: makeId("roster"),
          name: trimmedName,
          description: description?.trim() || undefined,
          students: [],
          lastUsedAt: now()
        };
        set((state) => ({ rosters: [roster, ...state.rosters] }));
        return roster.id;
      },
      addManualStudent: (rosterId, matric, name) =>
        set((state) => ({
          rosters: state.rosters.map((r) =>
            r.id === rosterId ? { ...r, students: [...r.students, { id: makeId("st"), matric, name }], lastUsedAt: now() } : r
          )
        })),

      loadNetwork: async () => {
        const payload = await fetchNetwork();
        set({ network: payload });
      },
      setSessionsFromRoster: (examId) => {
        const state = get();
        const exam = state.exams.find((e) => e.id === examId);
        if (!exam) {
          return;
        }
        const roster = state.rosters.find((r) => r.id === exam.rosterId);
        if (!roster) {
          return;
        }
        set({
          sessions: roster.students.map((student, index) => ({
            id: makeId("ss"),
            studentId: student.id,
            matric: student.matric,
            name: student.name,
            status: index % 4 === 0 ? "Connected" : "Active",
            currentQuestion: 1,
            flags: 0,
            timeRemaining: exam.durationMinutes * 60,
            reconnectGapSeconds: 0
          }))
        });
      },
      extendTime: (sessionId, mins) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, timeRemaining: s.timeRemaining + mins * 60 } : s))
        })),
      dismissFlags: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, flags: 0, status: "Active" } : s))
        })),
      forceSubmit: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === sessionId ? { ...s, status: "Submitted", timeRemaining: 0 } : s))
        })),

      runSyncAll: async () => {
        set({ busy: true });
        set((state) => ({
          syncItems: state.syncItems.map((item) => (item.status === "Pending" || item.status === "Error" ? { ...item, status: "Syncing", progress: 0 } : item))
        }));

        for (const step of [20, 45, 70, 100]) {
          await new Promise((resolve) => setTimeout(resolve, 250));
          set((state) => ({
            syncItems: state.syncItems.map((item) => (item.status === "Syncing" ? { ...item, progress: step } : item))
          }));
        }

        set((state) => ({
          busy: false,
          syncItems: state.syncItems.map((item) => (item.status === "Syncing" ? { ...item, status: "Synced", progress: 100, error: undefined } : item))
        }));
        get().pushToast("All pending results synced.", "success");
      },

      studentLogin: (examId, matric) => {
        const state = get();
        const exam = state.exams.find((e) => e.id === examId);
        if (!exam) {
          return { ok: false, state: "invalid" as const, message: "Exam not found." };
        }
        const roster = state.rosters.find((r) => r.id === exam.rosterId);
        const student = roster?.students.find((s) => s.matric.toLowerCase() === matric.toLowerCase());
        if (!student) {
          return { ok: false, state: "invalid" as const, message: "Matric number not on the roster for this exam." };
        }

        const session = state.sessions.find((s) => s.studentId === student.id);
        if (session?.status === "Submitted") {
          return { ok: false, state: "submitted" as const, message: "This matric number has already submitted." };
        }

        set((prev) => ({
          studentMode: {
            ...prev.studentMode,
            examId,
            matric: student.matric,
            name: student.name,
            currentQuestion: session?.currentQuestion ?? 1,
            timeRemaining: session?.timeRemaining ?? exam.durationMinutes * 60,
            started: false,
            submitted: false
          }
        }));

        if (session) {
          return {
            ok: true,
            state: "recovery" as const,
            message: `Recovered session at Q${session.currentQuestion}.`
          };
        }

        return { ok: true, state: "ok" as const, message: "Login successful." };
      },
      studentStartExam: () => set((state) => ({ studentMode: { ...state.studentMode, started: true } })),
      studentAnswer: (questionId, value) =>
        set((state) => ({
          studentMode: {
            ...state.studentMode,
            answers: { ...state.studentMode.answers, [questionId]: value },
            autosave: "saving"
          }
        })),
      studentGoto: (index) => set((state) => ({ studentMode: { ...state.studentMode, currentQuestion: Math.max(1, index) } })),
      studentTick: () =>
        set((state) => ({
          studentMode: {
            ...state.studentMode,
            timeRemaining: Math.max(0, state.studentMode.timeRemaining - 1),
            autosave: state.studentMode.autosave === "saving" ? "saved" : state.studentMode.autosave
          }
        })),
      studentSubmit: () => set((state) => ({ studentMode: { ...state.studentMode, submitted: true, started: false } })),
      studentReset: () =>
        set((state) => ({
          studentMode: {
            ...state.studentMode,
            matric: "",
            name: "",
            started: false,
            currentQuestion: 1,
            answers: {},
            timeRemaining: 3600,
            autosave: "saved",
            fullscreen: false,
            tabWarnings: 0,
            submitted: false
          }
        })),

      askConfirm: (confirm) => set({ confirm }),
      closeConfirm: () => set({ confirm: null }),
      pushToast: (message, tone = "info") => {
        const toast: Toast = { id: makeId("toast"), message, tone };
        set((state) => ({ toasts: [...state.toasts.slice(-2), toast] }));
      },
      removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
      logOut: () => {
        set({
          isAuthenticated: false,
          currentUserId: null,
          lecturerName: "",
          institution: "",
          department: "",
          onboardingComplete: false,
          onboardingStep: 0
        });
      }
    }),
    {
      name: "mudu-app-state-v3",
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AppState>) ?? {};
        return {
          ...currentState,
          lecturerName: typeof persisted.lecturerName === "string" ? persisted.lecturerName : currentState.lecturerName,
          isAuthenticated: typeof persisted.isAuthenticated === "boolean" ? persisted.isAuthenticated : currentState.isAuthenticated,
          currentUserId: typeof persisted.currentUserId === "string" || persisted.currentUserId === null
            ? persisted.currentUserId
            : currentState.currentUserId,
          institution: typeof persisted.institution === "string" ? persisted.institution : currentState.institution,
          department: typeof persisted.department === "string" ? persisted.department : currentState.department,
          onboardingComplete: typeof persisted.onboardingComplete === "boolean"
            ? persisted.onboardingComplete
            : currentState.onboardingComplete,
          onboardingStep: typeof persisted.onboardingStep === "number" ? persisted.onboardingStep : currentState.onboardingStep,
          sidebarCollapsed: typeof persisted.sidebarCollapsed === "boolean"
            ? persisted.sidebarCollapsed
            : currentState.sidebarCollapsed
        };
      },
      partialize: (state) => ({
        lecturerName: state.lecturerName,
        isAuthenticated: state.isAuthenticated,
        currentUserId: state.currentUserId,
        institution: state.institution,
        department: state.department,
        onboardingComplete: state.onboardingComplete,
        onboardingStep: state.onboardingStep,
        sidebarCollapsed: state.sidebarCollapsed
      })
    }
  )
);
