import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IconUpload, IconCheck, IconTrash, IconPlus } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import type { QuestionType } from "../types";

/* ── Local question type for the editor ── */
type EditorQuestion = {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  points: number;
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
function StepDetails({ onNext }: { onNext: (data: { title: string; courseCode: string; date: string; time: string; durationMinutes: number }) => void }) {
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);

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
  question, index, isActive, onFocus, onChange, onDelete
}: {
  question: EditorQuestion;
  index: number;
  isActive: boolean;
  onFocus: () => void;
  onChange: (updated: EditorQuestion) => void;
  onDelete: () => void;
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
function StepQuestions({ onBack, onNext, questions, setQuestions }: {
  onBack: () => void;
  onNext: () => void;
  questions: EditorQuestion[];
  setQuestions: React.Dispatch<React.SetStateAction<EditorQuestion[]>>;
}) {
  const sourceMode = useAppStore((s) => s.examBuilder.sourceMode);
  const setSourceMode = useAppStore((s) => s.setSourceMode);
  const [pasteText, setPasteText] = useState("");
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

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      // Simulate AI generating questions
      const generated: EditorQuestion[] = Array.from({ length: 5 }, (_, i) => ({
        id: makeId(),
        type: (i % 3 === 0 ? "ESSAY" : i % 2 === 0 ? "FILL" : "MCQ") as QuestionType,
        text: `Generated question ${i + 1} from AI`,
        options: i % 2 !== 0 ? [] : ["Option A", "Option B", "Option C", "Option D"],
        correctAnswer: i % 2 !== 0 ? "" : "Option A",
        points: i % 3 === 0 ? 5 : 1,
      }));
      applyQuestions(generated);
      setGenerating(false);
    }, 1500);
  };

  const addQuestion = (type: QuestionType) => {
    const q = newQuestion(type);
    applyQuestions([...questions, q]);
    setActiveCardId(q.id);
    // Scroll to the new question after render
    setTimeout(() => {
      document.getElementById(`qe-${q.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const updateQuestion = (id: string, updated: EditorQuestion) => {
    applyQuestions(questions.map(q => q.id === id ? updated : q));
  };

  const deleteQuestion = (id: string) => {
    applyQuestions(questions.filter(q => q.id !== id));
    if (activeCardId === id) setActiveCardId(null);
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
          <div className="drop-zone" onClick={() => setUploadProgress((p) => p >= 100 ? 0 : p + 25)}>
            <div className="drop-zone-icon"><IconUpload /></div>
            <div className="drop-zone-text">Drag & drop your file here, or click to browse</div>
            <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>PDF, DOCX, or TXT — max 10MB</div>
          </div>
          {uploadProgress > 0 && (
            <div className="stack gap-2">
              <div className="row-between" style={{ fontSize: "13px" }}>
                <span>document.pdf</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${uploadProgress}%` }} /></div>
            </div>
          )}
          {uploadProgress >= 100 && (
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
            />
          ))}

          {/* Add question bar */}
          <div className="qe-add-bar">
            <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Add a question:</span>
            <button className="btn btn-secondary btn-sm" onClick={() => addQuestion("MCQ")}>+ Multiple Choice</button>
            <button className="btn btn-secondary btn-sm" onClick={() => addQuestion("FILL")}>+ Fill in Blank</button>
            <button className="btn btn-secondary btn-sm" onClick={() => addQuestion("ESSAY")}>+ Essay</button>
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
function StepPublish({ title, course, duration, questionCount, onBack }: { title: string; course: string; duration: number; questionCount: number; onBack: () => void }) {
  const publishBuilderExam = useAppStore((s) => s.publishBuilderExam);
  const setBuilderRosterId = useAppStore((s) => s.setBuilderRosterId);
  const rosters = useAppStore((s) => s.rosters);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rosterId, setRosterId] = useState(rosters[0]?.id ?? "");
  const selectedRoster = rosters.find((r) => r.id === rosterId) ?? null;

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

  const handlePublish = () => {
    if (rosterId) {
      setBuilderRosterId(rosterId);
    }
    publishBuilderExam();
    navigate("/");
  };

  const registrationLink = selectedRoster
    ? `http://mudu.local/register/${selectedRoster.id}`
    : "";

  return (
    <div className="card stack gap-4">
      <h2 style={{ fontSize: "18px", fontWeight: 600 }}>Add Students</h2>

      <div className="form-group">
        <label className="form-label">Linked Roster</label>
        <div className="row gap-2">
          <select className="form-select" style={{ flex: 1 }} value={rosterId} onChange={(e) => setRosterId(e.target.value)}>
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
        <div style={{ fontWeight: 600, fontSize: "14px" }}>Registration Link</div>
        <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
          Create and share a student registration link while setting up this exam.
        </div>
        <div className="connection-box">
          <div className="connection-ip" style={{ fontSize: "16px", wordBreak: "break-all" }}>
            {registrationLink || "Select a roster to generate link"}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "18px", fontWeight: 600, marginTop: "var(--sp-4)" }}>Exam Summary</h2>
      <div className="stack gap-2" style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", padding: "16px" }}>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Title</span><strong>{title || "Untitled Exam"}</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Course</span><strong>{course || "-"}</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Duration</span><strong>{duration} minutes</strong></div>
        <div className="row-between"><span style={{ color: "var(--text-tertiary)" }}>Questions</span><strong>{questionCount}</strong></div>
      </div>

      <h3 style={{ fontSize: "15px", fontWeight: 600 }}>Exam Settings</h3>
      <div className="stack gap-2">
        <div className="switch-row"><span>Fullscreen Enforcement</span><button className="switch-track on"><span className="switch-knob" /></button></div>
        <div className="switch-row"><span>Tab Monitoring</span><button className="switch-track on"><span className="switch-knob" /></button></div>
        <div className="switch-row"><span>Shuffle Questions</span><button className="switch-track on"><span className="switch-knob" /></button></div>
        <div className="switch-row"><span>Show Score to Student</span><button className="switch-track"><span className="switch-knob" /></button></div>
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
  const createDraftExam = useAppStore((s) => s.createDraftExam);
  const [details, setDetails] = useState({ title: "", courseCode: "", date: "", durationMinutes: 60, passingScore: 50, rosterId: "" });
  const [questions, setQuestions] = useState<EditorQuestion[]>([]);

  const stepTitles = ["Fill in the details", "Create Questions", "Add Students"];

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

      {step === 1 && <StepDetails onNext={(data) => {
        const updatedDetails = { ...details, ...data };
        setDetails(updatedDetails);
        createDraftExam(updatedDetails);
        setStep(2);
      }} />}
      {step === 2 && <StepQuestions onBack={() => setStep(1)} onNext={() => setStep(3)} questions={questions} setQuestions={setQuestions} />}
      {step === 3 && <StepPublish title={details.title} course={details.courseCode} duration={details.durationMinutes} questionCount={questions.length} onBack={() => setStep(2)} />}
    </div>
  );
}
