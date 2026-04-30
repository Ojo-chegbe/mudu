import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, SectionHeader } from "../components/primitives";
import { useAppStore } from "../store/useAppStore";

const EXAM_ID = "exam_demo_midsem";

function currentQuestions() {
  return [
    { id: "q_1", type: "MCQ", text: "Which property best explains an offline-first exam platform?", options: ["Needs internet always", "Works on local network first", "Uses student passwords", "Cloud-only runtime"] },
    { id: "q_2", type: "FILL", text: "SQLite is a ______ database stored in a local file." },
    { id: "q_3", type: "ESSAY", text: "Explain why server-side timer control improves exam integrity." }
  ] as const;
}

export function StudentLoginScreen() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.studentLogin);
  const [matric, setMatric] = useState("");
  const [stateMessage, setStateMessage] = useState<string | null>(null);
  const [stateTone, setStateTone] = useState<"error" | "warning" | "success" | "info">("info");

  return (
    <>
      <SectionHeader title="Student Login" subtitle="Enter matric number to join exam from browser." />
      <Card>
        <h3>CSC301 Mid-Semester</h3>
        <label className="field">
          <span className="label">Matric Number</span>
          <input className="input" value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="CSC/2021/001" />
        </label>
        <div className="row top-gap">
          <Button
            variant="primary"
            onClick={() => {
              const result = login(EXAM_ID, matric.trim());
              if (result.state === "invalid") setStateTone("error");
              if (result.state === "submitted") setStateTone("warning");
              if (result.state === "recovery") setStateTone("info");
              if (result.state === "ok") setStateTone("success");
              setStateMessage(result.message);
              if (result.ok) {
                navigate("/student/instructions");
              }
            }}
          >
            Join Exam
          </Button>
        </div>
        {stateMessage ? <div className={`state-banner ${stateTone}`}>{stateMessage}</div> : null}
      </Card>
    </>
  );
}

export function StudentInstructionsScreen() {
  const navigate = useNavigate();
  const start = useAppStore((s) => s.studentStartExam);
  const [fullscreenAccepted, setFullscreenAccepted] = useState(false);

  return (
    <>
      <SectionHeader title="Exam Instructions" subtitle="Read rules, enter fullscreen, and begin." />
      <Card>
        <div className="stack">
          <div className="meta-row"><span>Duration</span><strong>60 minutes</strong></div>
          <div className="meta-row"><span>Questions</span><strong>3</strong></div>
          <div className="meta-row"><span>Auto-save</span><strong>Every 35 seconds</strong></div>
          <div className="meta-row"><span>Timer Authority</span><strong>Server-side</strong></div>
        </div>
        <div className="overlay-lite top-gap">
          <p>Fullscreen is required. Exits and tab switches are flagged.</p>
          <div className="row top-gap">
            <Button onClick={() => setFullscreenAccepted((v) => !v)}>{fullscreenAccepted ? "Fullscreen Confirmed" : "Enter Fullscreen"}</Button>
          </div>
        </div>
        <div className="row top-gap">
          <Button
            variant="primary"
            disabled={!fullscreenAccepted}
            onClick={() => {
              start();
              navigate("/student/exam");
            }}
          >
            Begin Exam
          </Button>
        </div>
      </Card>
    </>
  );
}

export function StudentExamScreen() {
  const navigate = useNavigate();
  const questions = useMemo(() => currentQuestions(), []);
  const student = useAppStore((s) => s.studentMode);
  const tick = useAppStore((s) => s.studentTick);
  const answer = useAppStore((s) => s.studentAnswer);
  const goto = useAppStore((s) => s.studentGoto);
  const submit = useAppStore((s) => s.studentSubmit);

  const [showSubmit, setShowSubmit] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => tick(), 1000);
    return () => window.clearInterval(timer);
  }, [tick]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return;
      setTabWarning(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const index = Math.min(Math.max(student.currentQuestion - 1, 0), questions.length - 1);
  const q = questions[index];
  const unanswered = questions.filter((qq) => !student.answers[qq.id]);

  return (
    <>
      <SectionHeader title="Student Exam" subtitle="Server timer, autosave state, and direct question navigation." />
      {tabWarning ? <div className="state-banner warning">Switching tabs has been flagged.</div> : null}
      <section className="grid-2">
        <Card>
          <div className="row spread">
            <strong>Question {index + 1} of {questions.length}</strong>
            <Badge tone={student.timeRemaining <= 300 ? "error" : student.timeRemaining <= 600 ? "warning" : "info"}>
              {formatTimer(student.timeRemaining)}
            </Badge>
          </div>
          <p className="question-text">{q.text}</p>

          {q.type === "MCQ" ? (
            <div className="stack">
              {q.options.map((opt) => (
                <label key={opt} className={`choice ${student.answers[q.id] === opt ? "selected" : ""}`}>
                  <input type="radio" checked={student.answers[q.id] === opt} onChange={() => answer(q.id, opt)} />
                  {opt}
                </label>
              ))}
            </div>
          ) : null}

          {q.type === "FILL" ? (
            <label className="field">
              <span className="label">Answer</span>
              <input className="input" value={student.answers[q.id] ?? ""} onChange={(e) => answer(q.id, e.target.value)} />
            </label>
          ) : null}

          {q.type === "ESSAY" ? (
            <label className="field">
              <span className="label">Essay</span>
              <textarea className="input textarea large" value={student.answers[q.id] ?? ""} onChange={(e) => answer(q.id, e.target.value)} />
            </label>
          ) : null}

          <div className="row top-gap">
            <Button disabled={index === 0} onClick={() => goto(index)}>Previous</Button>
            <Button variant="primary" disabled={index === questions.length - 1} onClick={() => goto(index + 2)}>Next</Button>
            <Button variant="ghost" onClick={() => setShowSubmit(true)}>Submit Exam</Button>
          </div>

          <div className="row top-gap">
            <Badge tone={student.autosave === "saved" ? "success" : student.autosave === "saving" ? "info" : "error"}>
              {student.autosave === "saved" ? "Saved" : student.autosave === "saving" ? "Saving..." : "Save failed"}
            </Badge>
          </div>
        </Card>

        <Card>
          <h3>Navigator</h3>
          <div className="navigator-grid">
            {questions.map((qq, i) => {
              const tone = i === index ? "active" : student.answers[qq.id] ? "done" : "empty";
              return <button key={qq.id} className={`nav-pill ${tone}`} onClick={() => goto(i + 1)}>{i + 1}</button>;
            })}
          </div>
          <p className="muted top-gap">Answered: {questions.length - unanswered.length} / {questions.length}</p>
        </Card>
      </section>

      {showSubmit ? (
        <div className="modal-overlay" role="presentation">
          <section className="modal" role="dialog" aria-modal="true">
            <h3>Submit Exam?</h3>
            <p className="muted">Answered {questions.length - unanswered.length} of {questions.length}. Unanswered: {unanswered.map((u) => u.id.replace("q_", "Q")).join(", ") || "None"}.</p>
            <div className="row">
              <Button onClick={() => setShowSubmit(false)}>Go Back</Button>
              <Button
                variant="primary"
                onClick={() => {
                  submit();
                  navigate("/student/submitted");
                }}
              >
                Confirm Submit
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function StudentSubmittedScreen() {
  const reset = useAppStore((s) => s.studentReset);

  return (
    <>
      <SectionHeader title="Submission Received" subtitle="Session can auto-reset for next student on shared laptop." />
      <Card>
        <h3>Well done.</h3>
        <p className="muted">Your exam has been submitted successfully.</p>
        <div className="row top-gap">
          <Button
            variant="primary"
            onClick={() => {
              reset();
              window.location.href = "/student/login";
            }}
          >
            Reset For Next Student
          </Button>
        </div>
      </Card>
    </>
  );
}

function formatTimer(total: number) {
  const m = Math.floor(Math.max(total, 0) / 60);
  const s = Math.max(total, 0) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
