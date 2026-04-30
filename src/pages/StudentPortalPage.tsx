import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

function formatTimer(total: number) {
  const m = Math.floor(Math.max(total, 0) / 60);
  const s = Math.max(total, 0) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fullscreenLabel(ok: boolean) {
  return ok ? "Fullscreen confirmed" : "Fullscreen required";
}

export function StudentLoginPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.studentLogin);
  const exams = useAppStore((s) => s.exams);
  const institution = useAppStore((s) => s.institution);
  const studentMode = useAppStore((s) => s.studentMode);
  const [matric, setMatric] = useState("");
  const [stateText, setStateText] = useState("");
  const [step, setStep] = useState<"matric" | "exam">("matric");
  const [uiTestBypass] = useState(true);
  const availableExams = exams.filter((e) => e.status === "Published" || e.status === "Running" || e.status === "Draft");
  const institutionName = institution || "Institution";

  return (
    <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
      <div className="card stack gap-3" style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "32px", fontWeight: 700, margin: 0 }}>Student Login</h1>
        <div style={{ fontSize: "16px", color: "var(--text-tertiary)" }}>{institutionName}</div>

        {step === "matric" && (
          <>
            <div className="form-group">
              <label className="form-label" style={{ fontSize: "18px" }}>Matric Number</label>
              <input
                className="form-input"
                style={{ fontSize: "20px", height: "54px" }}
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                placeholder="e.g. CSC/2021/001"
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              style={{ fontSize: "20px", height: "56px" }}
              onClick={() => {
                if (!matric.trim()) {
                  setStateText("Enter your matric number to continue.");
                  return;
                }
                setStateText("");
                setStep("exam");
              }}
            >
              Continue
            </button>
          </>
        )}

        {step === "exam" && (
          <>
            <div className="row-between">
              <div style={{ fontWeight: 600 }}>Select Exam</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStep("matric")}>{"<-"} Change matric</button>
            </div>
            <div className="stack gap-2">
              {availableExams.length === 0 && (
                <div className="badge badge-neutral" style={{ whiteSpace: "normal", padding: "12px" }}>
                  No exams available right now.
                </div>
              )}
              {availableExams.map((exam) => (
                <button
                  key={exam.id}
                  className="btn btn-secondary"
                  style={{ justifyContent: "space-between", fontSize: "16px", padding: "12px 14px" }}
                  onClick={() => {
                    const result = login(exam.id, matric.trim());
                    if (result.state === "invalid") {
                      if (uiTestBypass) {
                        useAppStore.setState((prev) => ({
                          studentMode: {
                            ...prev.studentMode,
                            examId: exam.id,
                            matric: matric.trim(),
                            name: "UI Test Student",
                            currentQuestion: 1,
                            timeRemaining: exam.durationMinutes * 60,
                            started: false,
                            submitted: false
                          }
                        }));
                        navigate("/student/instructions");
                        return;
                      }
                      setStateText("Matric number not on the roster for this exam.");
                      return;
                    }
                    if (result.state === "submitted") {
                      if (uiTestBypass) {
                        useAppStore.setState((prev) => ({
                          studentMode: {
                            ...prev.studentMode,
                            examId: exam.id,
                            matric: matric.trim(),
                            name: "UI Test Student",
                            currentQuestion: 1,
                            timeRemaining: exam.durationMinutes * 60,
                            started: false,
                            submitted: false
                          }
                        }));
                        navigate("/student/instructions");
                        return;
                      }
                      setStateText("This matric number has already submitted. Contact your invigilator.");
                      return;
                    }
                    if (result.state === "recovery") {
                      const q = studentMode.currentQuestion;
                      const mins = Math.ceil(studentMode.timeRemaining / 60);
                      setStateText(`We found your previous session. Resuming from Q${q} with ${mins} mins remaining.`);
                      navigate("/student/instructions");
                      return;
                    }
                    setStateText("");
                    navigate("/student/instructions");
                  }}
                >
                  <span>{exam.title}</span>
                  <span className={`badge ${exam.status === "Running" ? "badge-success" : "badge-info"}`}>{exam.status}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {stateText ? (
          <div className="badge badge-warning" style={{ fontSize: "16px", padding: "12px", whiteSpace: "normal" }}>
            {stateText}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StudentInstructionsPage() {
  const navigate = useNavigate();
  const startExam = useAppStore((s) => s.studentStartExam);
  const exams = useAppStore((s) => s.exams);
  const selectedExamId = useAppStore((s) => s.studentMode.examId);
  const exam = exams.find((e) => e.id === selectedExamId) ?? exams[0];
  const questionCount = exam?.questions.length ?? 0;
  const duration = exam?.durationMinutes ?? 60;

  const [fullscreenConfirmed, setFullscreenConfirmed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    const onFsChange = () => setFullscreenConfirmed(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFsChange);
    onFsChange();
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const requestFullscreen = async () => {
    try {
      setRequesting(true);
      await document.documentElement.requestFullscreen();
      setFullscreenConfirmed(true);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
      {!fullscreenConfirmed && (
        <div className="modal-overlay" role="presentation" style={{ zIndex: 50 }}>
          <div className="modal" role="dialog" aria-modal="true">
            <h2 className="modal-title">Fullscreen Required</h2>
            <p className="modal-text">You must enter fullscreen before continuing.</p>
            <button className="btn btn-primary" onClick={requestFullscreen} disabled={requesting}>
              {requesting ? "Requesting..." : "Enter Fullscreen"}
            </button>
          </div>
        </div>
      )}

      <div className="card stack gap-3" style={{ padding: "24px" }}>
        <h1 style={{ fontSize: "28px", margin: 0 }}>Exam Instructions</h1>
        <div className={`badge ${fullscreenConfirmed ? "badge-success" : "badge-warning"}`} style={{ width: "fit-content" }}>
          {fullscreenLabel(fullscreenConfirmed)}
        </div>

        <div className="stack gap-2">
          <div className="row-between"><span>Duration</span><strong>{duration} minutes</strong></div>
          <div className="row-between"><span>Question Count</span><strong>{questionCount}</strong></div>
          <div className="row-between"><span>Rules</span><strong>No tab switching. Auto-save enabled.</strong></div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          disabled={!fullscreenConfirmed}
          onClick={() => {
            startExam();
            navigate("/student/exam");
          }}
        >
          Begin Exam
        </button>
      </div>
    </div>
  );
}

export function StudentExamPage() {
  const navigate = useNavigate();
  const exams = useAppStore((s) => s.exams);
  const mode = useAppStore((s) => s.studentMode);
  const tick = useAppStore((s) => s.studentTick);
  const answer = useAppStore((s) => s.studentAnswer);
  const submit = useAppStore((s) => s.studentSubmit);

  const exam = exams.find((e) => e.id === mode.examId) ?? exams[0];
  const questions = useMemo(() => exam?.questions ?? [], [exam]);
  const totalSeconds = (exam?.durationMinutes ?? 60) * 60;
  const pageSize = Math.max(1, Math.ceil(questions.length / 2));
  const [page, setPage] = useState(1);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [jumpToIndex, setJumpToIndex] = useState<number | null>(null);
  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageQuestions = questions.slice(pageStart, pageStart + pageSize);
  const isLastPage = page >= totalPages;
  const answeredCount = questions.filter((q) => Boolean(mode.answers[q.id])).length;
  const unanswered = questions.map((q, i) => ({ q, index: i })).filter(({ q }) => !mode.answers[q.id]);
  const unansweredCount = unanswered.length;
  const ratioLeft = totalSeconds > 0 ? mode.timeRemaining / totalSeconds : 1;
  const timerTone = ratioLeft < 0.1 ? "badge-error" : ratioLeft < 0.2 ? "badge-warning" : "badge-info";

  useEffect(() => {
    const id = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(id);
  }, [tick]);

  useEffect(() => {
    if (jumpToIndex === null) return;
    const target = document.getElementById(`student-q-${jumpToIndex + 1}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setJumpToIndex(null);
  }, [jumpToIndex, page]);

  if (questions.length === 0) {
    return (
      <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
        <div className="card">No questions available for this exam.</div>
      </div>
    );
  }

  return (
    <div className="stack gap-4" style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px" }}>
      <div className="card row-between" style={{ position: "sticky", top: "8px", zIndex: 20, padding: "12px 16px" }}>
        <strong>Page {page} / {totalPages}</strong>
        <div className={`badge ${timerTone}`} style={{ fontSize: "16px" }}>
          {formatTimer(mode.timeRemaining)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "24px", alignItems: "start" }}>
        <div className="card stack gap-3">
          {pageQuestions.map((q, idx) => (
            <div
              key={q.id}
              id={`student-q-${pageStart + idx + 1}`}
              className="stack gap-2"
              style={{ paddingBottom: "12px", borderBottom: "1px solid var(--border-soft)" }}
            >
              <div style={{ fontSize: "18px", fontWeight: 600 }}>
                Q{pageStart + idx + 1}. {q.text}
              </div>
              {(q.type === "MCQ" ? q.options ?? [] : []).slice(0, 4).map((opt) => (
                <label key={opt} className="row gap-2" style={{ border: "1px solid var(--border-soft)", borderRadius: "8px", padding: "10px" }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={mode.answers[q.id] === opt}
                    onChange={() => answer(q.id, opt)}
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ))}
          <div className="row-between">
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous Page</button>
            {!isLastPage ? (
              <button className="btn btn-primary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next Page</button>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowSubmitConfirm(true)}>Submit Exam</button>
            )}
          </div>
        </div>

        <div className="card stack gap-2" style={{ position: "sticky", top: "80px" }}>
          <h3 style={{ margin: 0 }}>Question Navigator</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "6px" }}>
            {questions.map((q, i) => {
              const isInCurrentPage = i >= pageStart && i < pageStart + pageSize;
              const answered = Boolean(mode.answers[q.id]);
              const className = "btn-ghost";
              const navStyle = answered
                ? { background: "transparent", border: "2px solid var(--color-primary)", color: "var(--color-primary)", fontWeight: 700 }
                : isInCurrentPage
                  ? { background: "var(--gray-200)", border: "1px solid var(--gray-300)", color: "var(--text-primary)" }
                  : undefined;
              return (
                <button
                  key={q.id}
                  className={`btn btn-sm ${className}`}
                  style={{ minWidth: "34px", padding: "4px 0", ...navStyle }}
                  onClick={() => setPage(Math.floor(i / pageSize) + 1)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {showSubmitConfirm && (
        <div className="modal-overlay" onClick={() => setShowSubmitConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <h3 className="modal-title">Submit Exam?</h3>
            <p className="modal-text">Summary: {answeredCount} answered, {unansweredCount} unanswered.</p>
            {unansweredCount > 0 && (
              <div className="stack gap-2" style={{ marginBottom: "10px" }}>
                <div className="badge badge-warning" style={{ width: "fit-content" }}>Unanswered Questions Warning</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>You still have unanswered questions:</div>
                <div className="row gap-2 row-wrap">
                  {unanswered.map(({ index }) => (
                    <button
                      key={index}
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setPage(Math.floor(index / pageSize) + 1);
                        setJumpToIndex(index);
                        setShowSubmitConfirm(false);
                      }}
                    >
                      Q{index + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowSubmitConfirm(false)}>Go back and review</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  submit();
                  navigate("/student/submitted");
                }}
              >
                Confirm Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function StudentSubmittedPage() {
  const reset = useAppStore((s) => s.studentReset);
  return (
    <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
      <div className="card stack gap-3" style={{ padding: "24px" }}>
        <h1 style={{ margin: 0 }}>Submission Received</h1>
        <p style={{ margin: 0, color: "var(--text-tertiary)" }}>Your answers have been submitted successfully.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            reset();
            window.location.href = "/student/login";
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
