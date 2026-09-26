import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconUpload, IconCheck, IconTrash, IconPlus } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import type { QuestionType } from "../types";
import {
  createExamQuestionRequest,
  createExamRequest,
  deleteQuestionRequest,
  fetchRosters,
  generateAiQuestionsFromTextRequest,
  generateAiQuestionsFromFileRequest,
  approveAiQuestionRequest,
  discardAiQuestionRequest,
  publishExamRequest,
  updateExamRequest,
  updateQuestionRequest,
  fetchExamByIdRequest,
  createRosterRegistrationLinkRequest,
  confirmRosterRegistrationsRequest,
  createRosterRequest,
  type RosterRecord
} from "../api/client";

/* ── Local question type for the editor ── */
type EditorQuestion = {
  id: string;
  backendId?: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
  status?: string;
};

const makeId = () => `q_${crypto.randomUUID().slice(0, 8)}`;

const newQuestion = (type: QuestionType): EditorQuestion => ({
  id: makeId(),
  type,
  text: "",
  options: type === "MCQ" ? ["", "", "", ""] : [],
  correctAnswer: "",
  points: type === "ESSAY" ? 5 : 1,
});

/* ── Stepper ── */
function StepIndicator({ current }: { current: number }) {
  const steps = ["Details", "Questions", "Students"];
  return (
    <div className="stepper" style={{ marginBottom: "var(--sp-2)" }}>
      {steps.map((label, i) => (
        <span key={i} className="row gap-2" style={{ flex: i < steps.length - 1 ? 1 : undefined }}>
          <span className={`step-dot${i + 1 === current ? " active" : i + 1 < current ? " done" : ""}`}>
            {i + 1 < current ? <IconCheck /> : i + 1}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: i + 1 === current ? "var(--color-primary)" : "var(--text-tertiary)" }}>{label}</span>
          {i < steps.length - 1 && <span className={`step-line${i + 1 < current ? " active" : ""}`} />}
        </span>
      ))}
    </div>
  );
}

/* ── Step 1: Details ── */
function StepDetails({ details, onNext }: { details: any; onNext: (data: { title: string; courseCode: string; date: string; time: string; durationMinutes: number }) => void }) {
  const [title, setTitle] = useState(details.title || "");
  const [course, setCourse] = useState(details.courseCode || "");
  const [date, setDate] = useState(details.date || "");
  const [time, setTime] = useState(details.time || "");
  const [duration, setDuration] = useState(details.durationMinutes || 60);

  useEffect(() => {
    setTitle(details.title || "");
    setCourse(details.courseCode || "");
    setDate(details.date || "");
    setTime(details.time || "");
    setDuration(details.durationMinutes || 60);
  }, [details]);

  return (
    <div className="stack gap-4">
      <div className="card stack gap-4">
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Exam details</h2>
        <div className="stack gap-3">
          <div className="form-group">
            <label className="form-label"><span style={{color: 'var(--color-error)'}}>*</span>Course title</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g Introduction to Bioinformatics" />
          </div>
          <div className="form-group">
            <label className="form-label"><span style={{color: 'var(--color-error)'}}>*</span>Course code</label>
            <input className="form-input" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="E.g PCH 411" />
          </div>
        </div>
      </div>

      <div className="card stack gap-4">
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Schedule</h2>
        <div className="grid-3" style={{ gap: "16px" }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <input className="form-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Duration (mins)</label>
            <input className="form-input" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "var(--sp-2)" }} onClick={() => onNext({ title, courseCode: course, date, time, durationMinutes: duration })}>
        Create Questions
      </button>
    </div>
  );
}

/* ── Inline Question Editor Card (Google Forms style) ── */
function QuestionEditorCard({
  question, index, isActive, onFocus, onChange, onDelete, onApprove, onDiscard
}: {
  question: EditorQuestion;
  index: number;
  isActive: boolean;
  onFocus: () => void;
  onChange: (updated: EditorQuestion) => void;
  onDelete: () => void;
  onApprove?: () => void;
  onDiscard?: () => void;
}) {
  const updateField = <K extends keyof EditorQuestion>(key: K, value: EditorQuestion[K]) => {
    onChange({ ...question, [key]: value });
  };

  const updateOption = (optIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optIndex] = value;
    onChange({ ...question, options: newOptions });
  };

  const addOption = () => {
    onChange({ ...question, options: [...question.options, ""] });
  };

  const removeOption = (optIndex: number) => {
    if (question.options.length <= 2) return;
    const newOptions = question.options.filter((_, i) => i !== optIndex);
    const newCorrect = question.correctAnswer === question.options[optIndex] ? "" : question.correctAnswer;
    onChange({ ...question, options: newOptions, correctAnswer: newCorrect });
  };

  const changeType = (type: QuestionType) => {
    onChange({
      ...question,
      type,
      options: type === "MCQ" ? (question.options.length >= 2 ? question.options : ["", "", "", ""]) : [],
      correctAnswer: type === "MCQ" ? question.correctAnswer : "",
      points: type === "ESSAY" ? 5 : question.points,
    });
  };

  return (
    <div id={`qe-${question.id}`} className={`qe-card${isActive ? " qe-card-active" : ""}`} onClick={onFocus}>
      {/* Header row */}
      <div className="qe-header">
        <span className="qe-number">{index + 1}</span>
        <select
          className="qe-type-select"
          value={question.type}
          onChange={(e) => changeType(e.target.value as QuestionType)}
        >
          <option value="MCQ">Multiple Choice</option>
          <option value="FILL">Fill in the blank</option>
          <option value="ESSAY">Essay / Long answer</option>
        </select>
        <div style={{ flex: 1 }} />
        <div className="qe-points-group">
          <input
            type="number"
            className="qe-points-input"
            value={question.points}
            min={1}
            onChange={(e) => updateField("points", Math.max(1, Number(e.target.value)))}
          />
          <span className="qe-points-label">pts</span>
        </div>
        <button className="qe-delete-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete question">
          <IconTrash />
        </button>
      </div>

      {question.status === "Pending" && (
        <div style={{ padding: "8px 16px", background: "var(--color-warning-light)", color: "var(--color-warning-dark)", fontSize: "13px", display: "flex", gap: "12px", alignItems: "center" }}>
          <strong>AI Generated Question</strong>
          <span>Review the content before approving.</span>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary btn-sm" style={{ background: "white" }} onClick={(e) => { e.stopPropagation(); onDiscard?.(); }}>Discard</button>
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); onApprove?.(); }}>Approve</button>
        </div>
      )}

      {/* Question text */}
      <input
        className="qe-text-input"
        value={question.text}
        onChange={(e) => updateField("text", e.target.value)}
        placeholder="Type your question here..."
      />

      {/* MCQ Options */}
      {question.type === "MCQ" && (
        <div className="qe-options">
          {question.options.map((opt, i) => (
            <div key={i} className="qe-option-row">
              <input
                type="radio"
                name={`correct-${question.id}`}
                className="qe-radio"
                checked={question.correctAnswer === opt && opt !== ""}
                onChange={() => updateField("correctAnswer", opt)}
                title="Mark as correct answer"
              />
              <input
                className="qe-option-input"
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
              />
              {question.options.length > 2 && (
                <button className="qe-remove-option" onClick={() => removeOption(i)} title="Remove option">×</button>
              )}
            </div>
          ))}
          <button className="qe-add-option-btn" onClick={addOption}>
            + Add option
          </button>
          {question.correctAnswer && (
            <div style={{ fontSize: "12px", color: "var(--color-success)", marginTop: "4px" }}>
              ✓ Correct answer: {question.correctAnswer}
            </div>
          )}
        </div>
      )}

      {/* Fill in the blank */}
      {question.type === "FILL" && (
        <div className="qe-fill-section">
          <label className="form-label">Correct answer</label>
          <input
            className="qe-option-input"
            value={question.correctAnswer}
            onChange={(e) => updateField("correctAnswer", e.target.value)}
            placeholder="Type the correct answer..."
          />
        </div>
      )}

      {/* Essay */}
      {question.type === "ESSAY" && (
        <div className="qe-essay-section">
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)", padding: "12px", background: "var(--gray-50)", borderRadius: "var(--radius-md)" }}>
            Students will provide a long-form text answer. Graded manually.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Question Creation ── */
function StepQuestions({ onBack, onNext, questions, setQuestions, examId }: {
  onBack: () => void;
  onNext: () => void;
  questions: EditorQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<EditorQuestion[]>>;
  examId: string | null;
}) {
  const [sourceMode, setSourceMode] = useState<"upload" | "paste" | "manual" | "bank">("manual");
  const [aiSettings] = useState({ count: 20, difficulty: "Intermediate" as const, mix: "MCQ 60 / Fill 30 / Essay 10" });
  const pushToast = useAppStore((s) => s.pushToast);
  const [pasteText, setPasteText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const undoStackRef = useRef<EditorQuestion[][]>([]);
  const redoStackRef = useRef<EditorQuestion[][]>([]);

  const cloneQuestions = (items: EditorQuestion[]) => items.map((q) => ({ ...q, options: [...q.options] }));
  const pushHistory = (current: EditorQuestion[]) => {
    undoStackRef.current.push(cloneQuestions(current));
    if (undoStackRef.current.length > 100) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  };
  const applyQuestions = (next: EditorQuestion[]) => {
    pushHistory(questions);
    setQuestions(next);
  };

  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    redoStackRef.current.push(cloneQuestions(questions));
    setQuestions(prev);
  };
  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    undoStackRef.current.push(cloneQuestions(questions));
    setQuestions(next);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ctrlOrMeta = event.ctrlKey || event.metaKey;
      if (!ctrlOrMeta) return;
      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }
      if (key === "y" || (key === "z" && event.shiftKey)) {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [questions]);

  const sources = [
    { key: "upload" as const, label: "Upload document", desc: "Upload a PDF, DOCX or TXT files and AI generates and organizes the questions" },
    { key: "paste" as const, label: "Paste text", desc: "Paste course material and AI generates questions from it" },
    { key: "manual" as const, label: "Manual creation", desc: "Create questions one by one, like Google Forms" },
    { key: "bank" as const, label: "Question bank", desc: "Pull from your saved question bank" },
  ];

  const handleGenerate = async () => {
    if (!examId) {
      pushToast("Create exam details first before AI generation.", "error");
      return;
    }

    if (sourceMode === "paste" && !pasteText.trim()) {
      pushToast("Provide source text before generation.", "error");
      return;
    }

    if (sourceMode === "upload" && !selectedFile) {
      pushToast("Please select a file to upload.", "error");
      return;
    }

    setGenerating(true);
    try {
      let payload;
      if (sourceMode === "upload" && selectedFile) {
        payload = await generateAiQuestionsFromFileRequest({
          examId,
          file: selectedFile,
          difficulty: aiSettings.difficulty,
          count: aiSettings.count
        });
      } else {
        payload = await generateAiQuestionsFromTextRequest({
          examId,
          sourceText: pasteText.trim(),
          difficulty: aiSettings.difficulty,
          count: aiSettings.count
        });
      }

      const generated: EditorQuestion[] = payload.questions.map((q) => ({
        id: makeId(),
        backendId: q.id,
        type: q.type,
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        status: q.status
      }));
      applyQuestions([...questions, ...generated]);
      pushToast("AI generated questions successfully added.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "AI generation failed.";
      pushToast(message, "error");
    } finally {
      setGenerating(false);
    }
  };

  const addQuestion = async (type: QuestionType) => {
    const q = newQuestion(type);
    applyQuestions([...questions, q]);
    setActiveCardId(q.id);
    setTimeout(() => {
      document.getElementById(`qe-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);

    if (!examId) return;
    try {
      const created = await createExamQuestionRequest(examId, {
        type: q.type,
        text: "New question",
        options: q.options,
        correctAnswer: q.correctAnswer,
        points: q.points,
        status: "Approved",
        orderIndex: questions.length
      });
      setQuestions((prev) => prev.map((item) => (item.id === q.id ? { ...item, backendId: created.id, text: "" } : item)));
    } catch {
      // Keep editor usable if backend question create fails.
    }
  };

  const updateQuestion = (id: string, updated: EditorQuestion) => {
    applyQuestions(questions.map(q => q.id === id ? updated : q));
    if (updated.backendId) {
      void updateQuestionRequest(updated.backendId, {
        text: updated.text,
        options: updated.options,
        correctAnswer: updated.correctAnswer,
        points: updated.points,
        orderIndex: questions.findIndex((q) => q.id === id)
      });
    }
  };

  const deleteQuestion = (id: string) => {
    const target = questions.find((q) => q.id === id);
    applyQuestions(questions.filter(q => q.id !== id));
    if (activeCardId === id) setActiveCardId(null);
    if (target?.backendId) {
      void deleteQuestionRequest(target.backendId);
    }
  };

  return (
    <div className="stack gap-4">
      {/* Source selector */}
      <div className="card stack gap-3">
        <h2 style={{ fontSize: "16px", fontWeight: 600 }}>Question Source</h2>

        <div className="segment-control">
          {sources.map((s) => (
            <button
              key={s.key}
              className={`segment-button ${sourceMode === s.key ? "active" : ""}`}
              onClick={() => setSourceMode(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          {sources.find((s) => s.key === sourceMode)?.desc}
        </div>
      </div>

      {/* Upload panel */}
      {sourceMode === "upload" && (
        <div className="card stack gap-3">
          <label className="drop-zone" style={{ cursor: "pointer", position: "relative" }}>
            <input 
              type="file" 
              accept=".txt,.pdf,.docx,application/pdf,application/msword,text/plain" 
              style={{ opacity: 0, position: "absolute", top: 0, left: 0, right: 0, bottom: 0, cursor: "pointer" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  setUploadProgress(100);
                }
              }}
            />
            <div className="drop-zone-icon"><IconUpload /></div>
            <div className="drop-zone-text">Drag & drop your file here, or click to browse</div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>PDF, DOCX, or TXT — max 5MB</div>
          </label>
          
          {selectedFile && (
            <div className="stack gap-2">
              <div className="row-between" style={{ fontSize: "13px", padding: "12px", background: "var(--gray-50)", borderRadius: "var(--radius-md)" }}>
                <span style={{ fontWeight: 500 }}>{selectedFile.name}</span>
                <span style={{ color: "var(--color-success)", fontWeight: 500 }}>Ready</span>
              </div>
            </div>
          )}
          
          {selectedFile && (
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate Questions from Document"}
            </button>
          )}
        </div>
      )}

      {/* Paste panel */}
      {sourceMode === "paste" && (
        <div className="card stack gap-3">
          <div className="form-group">
            <label className="form-label">Paste your course material</label>
            <textarea className="form-textarea" style={{ minHeight: "180px" }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder="Paste lecture notes, textbook content, or syllabus..." />
          </div>
          <div className="row-between">
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
              Word count: {pasteText.trim() ? pasteText.trim().split(/\s+/).length : 0}
            </div>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating || !pasteText.trim()}>
              {generating ? "Generating..." : "Generate Questions"}
            </button>
          </div>
        </div>
      )}

      {/* Bank panel */}
      {sourceMode === "bank" && (
        <div className="card stack gap-3">
          <p style={{ color: "var(--text-secondary)" }}>Select questions from your saved question bank.</p>
          <div className="row gap-2">
            <span className="badge badge-neutral">MCQ: 120</span>
            <span className="badge badge-neutral">Fill: 37</span>
            <span className="badge badge-neutral">Essay: 18</span>
          </div>
        </div>
      )}

      {/* ── Question Editor (visible for all modes once questions exist, always visible for manual) ── */}
      {(sourceMode === "manual" || questions.length > 0) && (
        <div className="stack gap-3">
          {/* Sticky question navigator */}
          {questions.length > 0 && (
            <div className="qe-nav">
              <div className="qe-nav-left">
                <span className="qe-nav-count">{questions.length} question{questions.length !== 1 ? "s" : ""}</span>
                <div className="qe-nav-pills">
                  {questions.map((q, i) => (
                    <button
                      key={q.id}
                      className={`qe-nav-pill${activeCardId === q.id ? " active" : ""}${q.text.trim() ? " filled" : ""}`}
                      onClick={() => {
                        setActiveCardId(q.id);
                        document.getElementById(`qe-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      title={q.text || `Question ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row gap-2">
                <span className="badge badge-neutral">MCQ: {questions.filter(q => q.type === "MCQ").length}</span>
                <span className="badge badge-neutral">Fill: {questions.filter(q => q.type === "FILL").length}</span>
                <span className="badge badge-neutral">Essay: {questions.filter(q => q.type === "ESSAY").length}</span>
              </div>
            </div>
          )}

          {/* Approve All Bar */}
          {questions.some(q => q.status === "Pending") && (
            <div className="card-flat row-between" style={{ background: "var(--color-primary-light)" }}>
              <div style={{ fontSize: "14px", color: "var(--color-primary-dark)", fontWeight: 500 }}>
                You have {questions.filter(q => q.status === "Pending").length} pending questions generated by AI.
              </div>
              <button 
                className="btn btn-primary btn-sm"
                onClick={async () => {
                  try {
                    const pendingQuestions = questions.filter(q => q.status === "Pending" && q.backendId);
                    await Promise.all(pendingQuestions.map(q => approveAiQuestionRequest(q.backendId!)));
                    applyQuestions(questions.map(q => q.status === "Pending" ? { ...q, status: "Approved" } : q));
                    pushToast(`Approved ${pendingQuestions.length} questions.`, "success");
                  } catch (err) {
                    pushToast("Failed to approve all questions.", "error");
                  }
                }}
              >
                Approve All
              </button>
            </div>
          )}

          {/* Question cards */}
          {questions.map((q, i) => (
            <QuestionEditorCard
              key={q.id}
              question={q}
              index={i}
              isActive={activeCardId === q.id}
              onFocus={() => setActiveCardId(q.id)}
              onChange={(updated) => updateQuestion(q.id, updated)}
              onDelete={() => deleteQuestion(q.id)}
              onApprove={() => {
                if (!q.backendId) return;
                void approveAiQuestionRequest(q.backendId);
                updateQuestion(q.id, { ...q, status: "Approved" });
              }}
              onDiscard={() => {
                if (!q.backendId) return;
                void discardAiQuestionRequest(q.backendId);
                deleteQuestion(q.id);
              }}
            />
          ))}

          {/* Add question bar */}
          <div className="qe-add-bar">
            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Add a question:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => void addQuestion("MCQ")}>+ Multiple Choice</button>
            <button className="btn btn-secondary btn-sm" onClick={() => void addQuestion("FILL")}>+ Fill in Blank</button>
            <button className="btn btn-secondary btn-sm" onClick={() => void addQuestion("ESSAY")}>+ Essay</button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="row-between">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onNext} disabled={questions.length === 0}>
          Continue to Add Students
        </button>
      </div>
    </div>
  );
}

/* ── Step 3: Students & Publish ── */
function StepPublish({
  title,
  course,
  duration,
  questionCount,
  onBack,
  examId,
  onRosterChanged
}: {
  title: string;
  course: string;
  duration: number;
  questionCount: number;
  onBack: () => void;
  examId: string | null;
  onRosterChanged: (rosterId: string) => void;
}) {
  const navigate = useNavigate();
  const pushToast = useAppStore((s) => s.pushToast);
  const [searchParams] = useSearchParams();
  const [rosters, setRosters] = useState<RosterRecord[]>([]);
  const [loadingRosters, setLoadingRosters] = useState(false);
  const [rosterId, setRosterId] = useState(rosters[0]?.id ?? "");
  const [registrationLink, setRegistrationLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [fullscreenRequired, setFullscreenRequired] = useState(true);
  const [tabMonitoringEnabled, setTabMonitoringEnabled] = useState(true);
  const [showScoreToStudent, setShowScoreToStudent] = useState(false);
  const selectedRoster = rosters.find((r) => r.id === rosterId) ?? null;

  useEffect(() => {
    let mounted = true;
    setLoadingRosters(true);
    void fetchRosters()
      .then((items) => {
        if (!mounted) return;
        setRosters(items);
      })
      .finally(() => {
        if (mounted) setLoadingRosters(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const createdRosterId = searchParams.get("rosterId");
    if (createdRosterId && rosters.some((r) => r.id === createdRosterId)) {
      setRosterId(createdRosterId);
      return;
    }
    if (!rosterId && rosters[0]?.id) {
      setRosterId(rosters[0].id);
    }
  }, [searchParams, rosters, rosterId]);

  const handlePublish = async () => {
    if (!examId || !rosterId) {
      pushToast("Missing exam or roster. Please ensure a roster is selected.", "error");
      return;
    }
    try {
      await updateExamRequest(examId, { rosterId });
      await publishExamRequest(examId);
      pushToast("Exam published successfully!", "success");
      navigate("/");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to publish exam.", "error");
    }
  };

  const handleGenerateLink = async () => {
    if (!selectedRoster) return;
    setGeneratingLink(true);
    try {

      const res = await createRosterRegistrationLinkRequest(selectedRoster.id);
      setRegistrationLink(`${window.location.origin}/register/${res.token}`);
      pushToast("Registration link generated!", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to generate link.", "error");
    } finally {
      setGeneratingLink(false);
    }
  };

  useEffect(() => {
    if (!registrationLink) return;
    const interval = setInterval(() => {
      void fetchRosters().then(setRosters).catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [registrationLink]);

  return (
    <div className="card stack gap-4">
      <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Add Students</h2>

      <div className="form-group">
        <label className="form-label">Linked Roster</label>
        <div className="row gap-2">
          <select
            className="form-select"
            style={{ flex: 1 }}
            value={rosterId}
            disabled={loadingRosters}
            onChange={(e) => {
              setRosterId(e.target.value);
              onRosterChanged(e.target.value);
              setRegistrationLink("");
            }}
          >
            {rosters.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.students.length} students)</option>)}
            {rosters.length === 0 && <option value="">No rosters yet</option>}
          </select>
          <button
            className="btn btn-secondary"
            onClick={() => navigate("/students?mode=create&from=exam-create&returnTo=/exams/new?step=3")}
          >
            <IconPlus /> Create New Roster
          </button>
        </div>
      </div>

      <div className="card-flat stack gap-2">
        <div className="row-between">
          <div className="stack gap-1">
            <div style={{ fontWeight: 600, fontSize: "14px" }}>Registration Link</div>
            <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
              Create and share a student registration link while setting up this exam.
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleGenerateLink} disabled={generatingLink || !selectedRoster}>
            {generatingLink ? "Generating..." : registrationLink ? "Link Active" : "Generate Link"}
          </button>
        </div>
        
        {registrationLink ? (
          <div className="connection-box">
            <div className="connection-ip" style={{ fontSize: "16px", wordBreak: "break-all" }}>
              {registrationLink}
            </div>
          </div>
        ) : (
          <div className="connection-box" style={{ opacity: 0.5 }}>
            <div className="connection-ip" style={{ fontSize: "16px", wordBreak: "break-all" }}>
              {selectedRoster ? "Click 'Generate Link' to create a link" : "Select a roster to generate link"}
            </div>
          </div>
        )}
      </div>

      {selectedRoster?.pendingRegistrations && selectedRoster.pendingRegistrations.length > 0 && (
        <div className="card stack gap-3" style={{ background: "var(--color-warning-light)" }}>
          <div className="row-between">
            <div>
              <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--color-warning-dark)", margin: 0 }}>Pending Registrations</h3>
              <p style={{ fontSize: "13px", color: "var(--color-warning-dark)", marginTop: "4px" }}>
                {selectedRoster.pendingRegistrations.length} students have registered and are waiting for your approval.
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={async () => {
                try {

                  await confirmRosterRegistrationsRequest(selectedRoster.id);
                  const items = await fetchRosters();
                  setRosters(items);
                  pushToast(`Approved ${selectedRoster.pendingRegistrations!.length} registrations.`, "success");
                } catch (err) {
                  pushToast(err instanceof Error ? err.message : "Failed to confirm registrations.", "error");
                }
              }}
            >
              Approve All
            </button>
          </div>
          <div style={{ background: "white", borderRadius: "var(--radius-md)", border: "1px solid var(--border-soft)", overflow: "hidden", maxHeight: "200px", overflowY: "auto" }}>
            <table className="table" style={{ margin: 0, border: "none" }}>
              <thead><tr><th>Matric Number</th><th>Full Name</th></tr></thead>
              <tbody>
                {selectedRoster.pendingRegistrations.map((s) => (
                  <tr key={s.id}>
                    <td>{s.matric}</td>
                    <td>{s.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: "18px", fontWeight: 600, marginTop: "var(--sp-4)" }}>Exam Summary</h2>
      <div className="stack gap-2" style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "16px" }}>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Title</span><strong>{title || "Untitled Exam"}</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Course</span><strong>{course || "-"}</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Duration</span><strong>{duration} minutes</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Questions</span><strong>{questionCount}</strong></div>
      </div>

      <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Exam Settings</h3>
      <div className="stack gap-2">
        <div className="switch-row" onClick={() => setFullscreenRequired(!fullscreenRequired)} style={{ cursor: "pointer" }}>
          <span>Fullscreen Enforcement</span>
          <button className={`switch-track ${fullscreenRequired ? "on" : ""}`}><span className="switch-knob" /></button>
        </div>
        <div className="switch-row" onClick={() => setTabMonitoringEnabled(!tabMonitoringEnabled)} style={{ cursor: "pointer" }}>
          <span>Tab Monitoring</span>
          <button className={`switch-track ${tabMonitoringEnabled ? "on" : ""}`}><span className="switch-knob" /></button>
        </div>
        <div className="switch-row" onClick={() => setShuffleQuestions(!shuffleQuestions)} style={{ cursor: "pointer" }}>
          <span>Shuffle Questions</span>
          <button className={`switch-track ${shuffleQuestions ? "on" : ""}`}><span className="switch-knob" /></button>
        </div>
        <div className="switch-row" onClick={() => setShowScoreToStudent(!showScoreToStudent)} style={{ cursor: "pointer" }}>
          <span>Show Score to Student</span>
          <button className={`switch-track ${showScoreToStudent ? "on" : ""}`}><span className="switch-knob" /></button>
        </div>
      </div>

      <div className="row-between">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <div className="row gap-2">
          <button className="btn btn-secondary" onClick={() => navigate("/")}>Save as Draft</button>
          <button className="btn btn-primary" onClick={handlePublish}>Publish Exam</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Export ── */
export function ExamCreatePage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState({
    title: "",
    courseCode: "",
    date: "",
    durationMinutes: 60,
    passingScore: 50,
    rosterId: ""
  });
  const [questions, setQuestions] = useState<EditorQuestion[]>([]);
  const [examId, setExamId] = useState<string | null>(searchParams.get("examId"));

  const stepTitles = ["Fill in the details", "Create Questions", "Add Students"];

  // Fetch existing exam if examId is provided
  useEffect(() => {
    if (examId) {
      fetchExamByIdRequest(examId).then((exam) => {
        setDetails({
          title: exam.title,
          courseCode: exam.courseCode ?? "",
          date: exam.date ?? "",
          durationMinutes: exam.durationMinutes ?? 60,
          passingScore: exam.passingScore ?? 50,
          rosterId: exam.rosterId ?? ""
        });
        setQuestions(exam.questions.map((q) => ({
          id: makeId(),
          backendId: q.id,
          type: q.type as QuestionType,
          text: q.text,
          options: q.options || [],
          correctAnswer: q.correctAnswer || "",
          points: q.points || 1,
          status: q.status
        })));
      });
    }
  }, [examId]);

  useEffect(() => {
    const requestedStep = Number(searchParams.get("step"));
    if ([1, 2, 3].includes(requestedStep)) {
      setStep(requestedStep);
    }
  }, [searchParams]);

  return (
    <div className="stack gap-6">
      <div className="stack gap-2">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1 className="page-title">Create new exam</h1>
        </div>
        <div style={{ fontSize: "15px", color: "var(--text-secondary)", fontWeight: 500 }}>
          Step {step} of 3: {stepTitles[step - 1]}
        </div>
      </div>

      <div className="card" style={{ padding: "16px 20px" }}>
        <StepIndicator current={step} />
      </div>

      {step === 1 && <StepDetails details={details} onNext={async (data) => {
        const rosterList = await fetchRosters();
        let primaryRosterId = rosterList[0]?.id ?? "";

        if (!primaryRosterId) {
          const newRoster = await createRosterRequest({ name: "Default Roster", courseCode: data.courseCode || undefined });
          primaryRosterId = newRoster.id;
        }

        const updatedDetails = { ...details, ...data, rosterId: primaryRosterId };
        setDetails(updatedDetails);

        if (examId) {
          await updateExamRequest(examId, updatedDetails);
          setStep(2);
          return;
        }

        const created = await createExamRequest({
          title: updatedDetails.title,
          courseCode: updatedDetails.courseCode,
          date: updatedDetails.date,
          durationMinutes: updatedDetails.durationMinutes,
          passingScore: updatedDetails.passingScore,
          rosterId: primaryRosterId,
          status: "Draft"
        });
        setExamId(created.id);
        setStep(2);
      }} />}
      {step === 2 && <StepQuestions onBack={() => setStep(1)} onNext={() => setStep(3)} questions={questions} setQuestions={setQuestions} examId={examId} />}
      {step === 3 && (
        <StepPublish
          title={details.title}
          course={details.courseCode}
          duration={details.durationMinutes}
          questionCount={questions.length}
          onBack={() => setStep(2)}
          examId={examId}
          onRosterChanged={(rosterId) => {
            setDetails((prev) => ({ ...prev, rosterId }));
          }}
        />
      )}
    </div>
  );
}
