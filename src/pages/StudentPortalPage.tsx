import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearStudentSessionToken,
  fetchAppSettings,
  fetchExamsRequest,
  fetchStudentExamRequest,
  fetchStudentSessionRequest,
  getStoredStudentSessionToken,
  postStudentEventRequest,
  saveStudentAnswerRequest,
  studentLoginRequest,
  submitStudentExamRequest,
  type ExamRecord,
  type StudentExamRecord
} from "../api/client";
import { useAppStore } from "../store/useAppStore";

function formatTimer(total: number) {
  const m = Math.floor(Math.max(total, 0) / 60);
  const s = Math.max(total, 0) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fullscreenLabel(ok: boolean) {
  return ok ? "Fullscreen confirmed" : "Fullscreen required";
}

function useStudentExam() {
  const [payload, setPayload] = useState<StudentExamRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadExam() {
      try {
        setLoading(true);
        const data = await fetchStudentExamRequest();
        if (!mounted) return;
        setPayload(data);
        setError("");
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load exam.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void loadExam();
    return () => {
      mounted = false;
    };
  }, []);

  return { payload, setPayload, loading, error };
}

export function StudentLoginPage() {
  const navigate = useNavigate();
  const institution = useAppStore((s) => s.institution);
  const [matric, setMatric] = useState("");
  const [stateText, setStateText] = useState("");
  const [step, setStep] = useState<"matric" | "exam">("matric");
  const [availableExams, setAvailableExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningExamId, setJoiningExamId] = useState<string | null>(null);
  const institutionName = institution || "Institution";

  useEffect(() => {
    let mounted = true;
    clearStudentSessionToken();
    void fetchExamsRequest()
      .then((items) => {
        if (!mounted) return;
        setAvailableExams(items.filter((exam) => (exam.status === "Running" || exam.status === "Active") && Boolean(exam.activeRunId)));
        setStateText("");
      })
      .catch((error) => {
        if (!mounted) return;
        setStateText(error instanceof Error ? error.message : "Failed to load available exams.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

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
              {loading ? (
                <div className="badge badge-neutral" style={{ whiteSpace: "normal", padding: "12px" }}>
                  Loading available exams...
                </div>
              ) : availableExams.length === 0 ? (
                <div className="badge badge-neutral" style={{ whiteSpace: "normal", padding: "12px" }}>
                  No running exams are available right now.
                </div>
              ) : null}
              {availableExams.map((exam) => (
                <button
                  key={exam.id}
                  className="btn btn-secondary"
                  disabled={joiningExamId !== null}
                  style={{ justifyContent: "space-between", fontSize: "16px", padding: "12px 14px" }}
                  onClick={async () => {
                    if (!exam.activeRunId) {
                      setStateText("This exam is not accepting student joins yet.");
                      return;
                    }
                    try {
                      setJoiningExamId(exam.id);
                      const result = await studentLoginRequest({ runId: exam.activeRunId, matric: matric.trim() });
                      useAppStore.setState((prev) => ({
                        studentMode: {
                          ...prev.studentMode,
                          examId: exam.id,
                          matric: matric.trim(),
                          name: result.studentName,
                          currentQuestion: result.currentQuestion,
                          timeRemaining: result.timeRemainingSeconds,
                          started: false,
                          submitted: false,
                          answers: {}
                        }
                      }));
                      setStateText("");
                      navigate("/student/instructions");
                    } catch (error) {
                      setStateText(error instanceof Error ? error.message : "Unable to join this exam.");
                    } finally {
                      setJoiningExamId(null);
                    }
                  }}
                >
                  <span>{exam.title}</span>
                  <span className="badge badge-success">{joiningExamId === exam.id ? "Joining..." : exam.status}</span>
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
  const { payload, loading, error } = useStudentExam();
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

  const exam = payload?.exam;

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
        {loading ? <div className="badge badge-neutral">Loading exam...</div> : null}
        {error ? <div className="badge badge-error" style={{ whiteSpace: "normal" }}>{error}</div> : null}
        <div className={`badge ${fullscreenConfirmed ? "badge-success" : "badge-warning"}`} style={{ width: "fit-content" }}>
          {fullscreenLabel(fullscreenConfirmed)}
        </div>

        <div className="stack gap-2">
          <div className="row-between"><span>Exam</span><strong>{exam?.title ?? "-"}</strong></div>
          <div className="row-between"><span>Duration</span><strong>{exam?.durationMinutes ?? 0} minutes</strong></div>
          <div className="row-between"><span>Question Count</span><strong>{exam?.questions.length ?? 0}</strong></div>
          <div className="row-between"><span>Rules</span><strong>No tab switching. Auto-save enabled.</strong></div>
        </div>

        <button
          className="btn btn-primary btn-lg"
          disabled={!fullscreenConfirmed || loading || Boolean(error) || !exam}
          onClick={() => navigate("/student/exam")}
        >
          Begin Exam
        </button>
      </div>
    </div>
  );
}

export function StudentExamPage() {
  const navigate = useNavigate();
  const { payload, setPayload, loading, error } = useStudentExam();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [autosave, setAutosave] = useState<"saved" | "saving" | "failed">("saved");
  const [autosaveIntervalMs, setAutosaveIntervalMs] = useState(5000);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [fullscreenRequired, setFullscreenRequired] = useState(true);
  const [tabMonitoringEnabled, setTabMonitoringEnabled] = useState(true);
  const [page, setPage] = useState(1);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [jumpToIndex, setJumpToIndex] = useState<number | null>(null);
  const pendingSavesRef = useRef<Record<string, { value: string; currentQuestion: number }>>({});
  const saveTimeoutRef = useRef<number | null>(null);
  const flushingRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);
  const unloadEventSentRef = useRef(false);

  useEffect(() => {
    if (!payload) return;
    setTimeRemaining(payload.session.remainingSeconds);
    setAnswers(payload.answers);
    setWarningMessage(payload.session.warningMessage);
  }, [payload]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function syncTimer() {
      try {
        const session = await fetchStudentSessionRequest();
        if (cancelled) return;
        setTimeRemaining(session.remainingSeconds);
        setWarningMessage(session.warningMessage);
        if (session.status === "Submitted" || session.remainingSeconds <= 0) {
          navigate("/student/submitted");
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof Error && err.message.toLowerCase().includes("expired")) {
          navigate("/student/submitted");
        }
      }
    }

    void syncTimer();
    const id = window.setInterval(() => {
      void syncTimer();
    }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    void fetchAppSettings()
      .then((settings) => {
        if (cancelled) return;
        const seconds = Math.max(1, Math.floor(Number(settings.autosaveIntervalSeconds) || 5));
        setAutosaveIntervalMs(seconds * 1000);
        setFullscreenRequired(settings.fullscreenRequired);
        setTabMonitoringEnabled(settings.tabMonitoringEnabled);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
  }, []);

  const exam = payload?.exam;
  const questions = useMemo(() => exam?.questions ?? [], [exam]);
  const totalSeconds = (exam?.durationMinutes ?? 60) * 60;
  const pageSize = Math.max(1, Math.ceil(questions.length / 2));
  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageQuestions = questions.slice(pageStart, pageStart + pageSize);
  const isLastPage = page >= totalPages;
  const answeredCount = questions.filter((q) => Boolean(answers[q.id])).length;
  const unanswered = questions.map((q, i) => ({ q, index: i })).filter(({ q }) => !answers[q.id]);
  const unansweredCount = unanswered.length;
  const ratioLeft = totalSeconds > 0 ? timeRemaining / totalSeconds : 1;
  const timerTone = ratioLeft < 0.1 ? "badge-error" : ratioLeft < 0.2 ? "badge-warning" : "badge-info";

  function scheduleAutosave(delayMs: number) {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushPendingSaves();
    }, delayMs);
  }

  async function flushPendingSaves(): Promise<boolean> {
    if (flushingRef.current) {
      return false;
    }

    const entries = Object.entries(pendingSavesRef.current);
    if (!entries.length) {
      setAutosave("saved");
      return true;
    }

    pendingSavesRef.current = {};
    flushingRef.current = true;
    setAutosave("saving");

    try {
      for (const [questionId, pending] of entries) {
        await saveStudentAnswerRequest({
          questionId,
          value: pending.value,
          currentQuestion: pending.currentQuestion
        });
      }
      setAutosave("saved");
      return true;
    } catch {
      for (const [questionId, pending] of entries) {
        if (!(questionId in pendingSavesRef.current)) {
          pendingSavesRef.current[questionId] = pending;
        }
      }
      setAutosave("failed");
      scheduleAutosave(autosaveIntervalMs);
      return false;
    } finally {
      flushingRef.current = false;
      if (Object.keys(pendingSavesRef.current).length > 0 && saveTimeoutRef.current === null) {
        scheduleAutosave(autosaveIntervalMs);
      }
    }
  }

  function flushPendingSavesOnUnload(): void {
    const entries = Object.entries(pendingSavesRef.current);
    const studentToken = getStoredStudentSessionToken();
    if (!entries.length || !studentToken) {
      return;
    }

    pendingSavesRef.current = {};

    for (const [questionId, pending] of entries) {
      const body = JSON.stringify({
        studentToken,
        questionId,
        value: pending.value,
        currentQuestion: pending.currentQuestion
      });

      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const payload = new Blob([body], { type: "application/json" });
        const queued = navigator.sendBeacon("/api/student/answers", payload);
        if (queued) {
          continue;
        }
      }

      void fetch("/api/student/answers", {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json"
        },
        body
      });
    }
  }

  function sendDisconnectEvent(reason: "pagehide" | "beforeunload") {
    if (unloadEventSentRef.current) {
      return;
    }

    const studentToken = getStoredStudentSessionToken();
    if (!studentToken) {
      return;
    }

    unloadEventSentRef.current = true;
    const body = JSON.stringify({
      studentToken,
      eventType: "client_disconnect",
      details: { reason }
    });

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const payload = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/student/events", payload)) {
        return;
      }
    }

    void fetch("/api/student/events", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
  }

  async function reportStudentEvent(eventType: "fullscreen_exit" | "visibility_lost" | "tab_visible"): Promise<void> {
    try {
      const result = await postStudentEventRequest({
        eventType,
        details:
          eventType === "tab_visible"
            ? {
                reconnectGapSeconds:
                  hiddenAtRef.current === null ? 0 : Math.max(0, Math.floor((Date.now() - hiddenAtRef.current) / 1000))
              }
            : undefined
      });
      setWarningMessage(result.warningMessage);
    } catch {
      // Ignore transient monitoring event failures; the exam flow should continue.
    }
  }

  useEffect(() => {
    const handlePageHide = () => {
      flushPendingSavesOnUnload();
      sendDisconnectEvent("pagehide");
    };

    const handleBeforeUnload = () => {
      flushPendingSavesOnUnload();
      sendDisconnectEvent("beforeunload");
    };

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!fullscreenRequired) {
        return;
      }
      if (!document.fullscreenElement) {
        void reportStudentEvent("fullscreen_exit");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [fullscreenRequired]);

  useEffect(() => {
    if (!tabMonitoringEnabled) {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
        void reportStudentEvent("visibility_lost");
        return;
      }

      if (hiddenAtRef.current !== null) {
        void reportStudentEvent("tab_visible");
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tabMonitoringEnabled]);

  useEffect(() => {
    if (jumpToIndex === null) return;
    const target = document.getElementById(`student-q-${jumpToIndex + 1}`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    setJumpToIndex(null);
  }, [jumpToIndex, page]);

  function queueAnswerSave(questionId: string, value: string, currentQuestion: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    pendingSavesRef.current[questionId] = { value, currentQuestion };
    setAutosave("saving");
    scheduleAutosave(autosaveIntervalMs);
  }

  if (loading) {
    return (
      <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
        <div className="card">Loading exam...</div>
      </div>
    );
  }

  if (error || !payload || !exam) {
    return (
      <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
        <div className="card stack gap-3">
          <div className="badge badge-error" style={{ whiteSpace: "normal" }}>{error || "Exam session is unavailable."}</div>
          <button className="btn btn-primary" onClick={() => navigate("/student/login")}>Back to Login</button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
        <div className="card">No approved questions are available for this exam.</div>
      </div>
    );
  }

  return (
    <div className="stack gap-4" style={{ maxWidth: "1120px", margin: "0 auto", padding: "24px" }}>
      <div className="card row-between" style={{ position: "sticky", top: "8px", zIndex: 20, padding: "12px 16px" }}>
        <strong>Page {page} / {totalPages}</strong>
        <div className="row gap-2">
          <span className={`badge ${autosave === "failed" ? "badge-error" : autosave === "saving" ? "badge-warning" : "badge-success"}`}>
            {autosave === "failed" ? "Save failed" : autosave === "saving" ? "Saving..." : "Saved"}
          </span>
          <div className={`badge ${timerTone}`} style={{ fontSize: "16px" }}>
            {formatTimer(timeRemaining)}
          </div>
        </div>
      </div>

      {warningMessage ? (
        <div className="badge badge-warning" style={{ whiteSpace: "normal", padding: "12px 16px" }}>
          {warningMessage}
        </div>
      ) : null}

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
              {q.type === "MCQ" ? (
                q.options.slice(0, 4).map((opt) => (
                  <label key={opt} className="row gap-2" style={{ border: "1px solid var(--border-soft)", borderRadius: "8px", padding: "10px" }}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt}
                      onChange={() => queueAnswerSave(q.id, opt, pageStart + idx + 1)}
                    />
                    <span>{opt}</span>
                  </label>
                ))
              ) : q.type === "FILL" ? (
                <input
                  className="form-input"
                  value={answers[q.id] ?? ""}
                  onChange={(event) => queueAnswerSave(q.id, event.target.value, pageStart + idx + 1)}
                  placeholder="Type your answer"
                />
              ) : (
                <textarea
                  className="form-input"
                  value={answers[q.id] ?? ""}
                  onChange={(event) => queueAnswerSave(q.id, event.target.value, pageStart + idx + 1)}
                  placeholder="Type your answer"
                  rows={6}
                />
              )}
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
              const answered = Boolean(answers[q.id]);
              const navStyle = answered
                ? { background: "transparent", border: "2px solid var(--color-primary)", color: "var(--color-primary)", fontWeight: 700 }
                : isInCurrentPage
                  ? { background: "var(--gray-200)", border: "1px solid var(--gray-300)", color: "var(--text-primary)" }
                  : undefined;
              return (
                <button
                  key={q.id}
                  className="btn btn-ghost btn-sm"
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
                onClick={async () => {
                  const flushed = await flushPendingSaves();
                  if (!flushed) {
                    return;
                  }
                  await submitStudentExamRequest();
                  setPayload((prev) => prev ? { ...prev, session: { ...prev.session, status: "Submitted" } } : prev);
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
  return (
    <div className="stack gap-4" style={{ maxWidth: "760px", margin: "0 auto", padding: "24px" }}>
      <div className="card stack gap-3" style={{ padding: "24px" }}>
        <h1 style={{ margin: 0 }}>Submission Received</h1>
        <p style={{ margin: 0, color: "var(--text-tertiary)" }}>Your answers have been submitted successfully.</p>
        <button
          className="btn btn-primary"
          onClick={() => {
            clearStudentSessionToken();
            window.location.href = "/student/login";
          }}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
