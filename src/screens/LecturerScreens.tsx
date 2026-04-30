import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Button, Card, Field, SectionHeader, Switch } from "../components/primitives";
import { useAppStore } from "../store/useAppStore";
import type { Exam, Question, QuestionType, SessionStatus } from "../types";

function statusTone(status: Exam["status"]): "info" | "neutral" | "warning" | "success" {
  if (status === "Running") return "success";
  if (status === "Completed") return "info";
  if (status === "Draft") return "warning";
  return "neutral";
}

function sessionTone(status: SessionStatus): "info" | "success" | "warning" | "error" {
  if (status === "Active" || status === "Submitted") return "success";
  if (status === "Flagged") return "warning";
  if (status === "Disconnected") return "error";
  return "info";
}

function formatSeconds(total: number): string {
  const safe = Math.max(0, total);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function TourCard(props: { title: string; text: string; onBack: () => void; onNext: () => void; nextLabel?: string }) {
  const { title, text, onBack, onNext, nextLabel = "Next" } = props;
  return (
    <div className="stack">
      <h3>{title}</h3>
      <p className="muted">{text}</p>
      <div className="row">
        <Button onClick={onBack}>Back</Button>
        <Button variant="primary" onClick={onNext}>{nextLabel}</Button>
      </div>
    </div>
  );
}

export function OnboardingScreen() {
  const navigate = useNavigate();
  const step = useAppStore((s) => s.onboardingStep);
  const setStep = useAppStore((s) => s.setOnboardingStep);
  const setProfile = useAppStore((s) => s.setProfile);
  const complete = useAppStore((s) => s.completeOnboarding);
  const askConfirm = useAppStore((s) => s.askConfirm);

  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");

  const moveNext = () => setStep((Math.min(4, step + 1) as 0 | 1 | 2 | 3 | 4));
  const moveBack = () => setStep((Math.max(0, step - 1) as 0 | 1 | 2 | 3 | 4));

  return (
    <>
      <SectionHeader title="Welcome" subtitle="First launch flow: setup profile and understand the 3 core journeys." />
      <Card>
        {step === 0 ? (
          <div className="stack">
            <h3>Get Started</h3>
            <p className="muted">MUDU helps you create exams, manage rosters, and run secure local-network assessments.</p>
            <div className="row">
              <Button variant="primary" onClick={moveNext}>Get Started</Button>
              <Button
                onClick={() =>
                  askConfirm({
                    title: "Skip onboarding?",
                    description: "You can revisit this from Settings.",
                    confirmLabel: "Skip",
                    onConfirm: () => {
                      complete();
                      navigate("/lecturer/dashboard");
                    }
                  })
                }
              >
                Skip
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="stack">
            <h3>Profile Setup</h3>
            <label className="field"><span className="label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span className="label">Institution</span><input className="input" value={institution} onChange={(e) => setInstitution(e.target.value)} /></label>
            <label className="field"><span className="label">Department</span><input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} /></label>
            <div className="row">
              <Button onClick={moveBack}>Back</Button>
              <Button variant="primary" onClick={() => { setProfile(name, institution, department); moveNext(); }}>Continue</Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? <TourCard title="Step 1 of 3: Create Exam" text="Build from document upload, pasted text, question bank, or manual entry." onBack={moveBack} onNext={moveNext} /> : null}
        {step === 3 ? <TourCard title="Step 2 of 3: Manage Roster" text="Import CSV or collect student registrations before launch." onBack={moveBack} onNext={moveNext} /> : null}
        {step === 4 ? (
          <TourCard
            title="Step 3 of 3: Run Exam"
            text="Launch local server, project IP address, monitor sessions in real time."
            onBack={moveBack}
            onNext={() => { complete(); navigate("/lecturer/dashboard"); }}
            nextLabel="Finish"
          />
        ) : null}
      </Card>
    </>
  );
}

export function DashboardScreen() {
  const exams = useAppStore((s) => s.exams);
  const askConfirm = useAppStore((s) => s.askConfirm);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const archiveExam = useAppStore((s) => s.archiveExam);
  const runSyncAll = useAppStore((s) => s.runSyncAll);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | Exam["status"]>("All");

  const filtered = useMemo(() => exams.filter((exam) => {
    const matchSearch = exam.title.toLowerCase().includes(search.toLowerCase()) || exam.courseCode.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" ? true : exam.status === filter;
    return matchSearch && matchFilter;
  }), [exams, search, filter]);

  return (
    <>
      <SectionHeader title="Home Dashboard" subtitle="Search, filter, and manage exams with quick actions." />
      <Card>
        <div className="row wrap">
          <label className="field row-grow">
            <span className="label">Search Exams</span>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title or course" />
          </label>
          <label className="field">
            <span className="label">Filter</span>
            <select className="input" value={filter} onChange={(e) => setFilter(e.target.value as "All" | Exam["status"])}>
              <option value="All">All</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Running">Running</option>
              <option value="Completed">Completed</option>
              <option value="Archived">Archived</option>
            </select>
          </label>
          <Button variant="primary" onClick={() => void runSyncAll()}>Sync Now</Button>
        </div>
      </Card>

      {exams.length === 0 ? <Card><h3>No Exams Yet</h3><p className="muted">Create your first exam to get started.</p></Card> : null}
      {exams.length > 0 && filtered.length === 0 ? <Card><h3>No Results</h3><p className="muted">No exams match your current search/filter.</p></Card> : null}

      {filtered.length > 0 ? (
        <Card>
          <h3>Exam List</h3>
          <table className="table">
            <thead><tr><th>Exam</th><th>Course</th><th>Status</th><th>Questions</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((exam) => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>{exam.courseCode || "-"}</td>
                  <td><Badge tone={statusTone(exam.status)}>{exam.status}</Badge></td>
                  <td>{exam.questions.length}</td>
                  <td>
                    <div className="row wrap">
                      <Button>Duplicate</Button>
                      <Button onClick={() => archiveExam(exam.id)}>Archive</Button>
                      <Button
                        variant="ghost"
                        onClick={() =>
                          askConfirm({
                            title: `Delete ${exam.title}?`,
                            description: "This action cannot be undone.",
                            confirmLabel: "Delete",
                            tone: "danger",
                            onConfirm: () => deleteExam(exam.id)
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </>
  );
}

function UploadPanel() {
  const [progress, setProgress] = useState(0);
  return (
    <div className="stack top-gap">
      <p className="muted">Upload PDF / DOCX / TXT</p>
      <Button onClick={() => setProgress((p) => (p >= 100 ? 0 : p + 25))}>Simulate Upload</Button>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
      {progress >= 100 ? <Badge tone="success">Upload complete</Badge> : <Badge tone="info">Uploading {progress}%</Badge>}
    </div>
  );
}

function PastePanel() {
  const [text, setText] = useState("");
  return (
    <div className="stack top-gap">
      <label className="field"><span className="label">Paste Source Text</span><textarea className="input textarea" value={text} onChange={(e) => setText(e.target.value)} /></label>
      <div className="muted">Word count: {text.trim() ? text.trim().split(/\s+/).length : 0}</div>
    </div>
  );
}

function ManualPanel({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  return (
    <div className="row wrap top-gap">
      <Button onClick={() => onAdd("MCQ")}>Add MCQ</Button>
      <Button onClick={() => onAdd("FILL")}>Add Fill</Button>
      <Button onClick={() => onAdd("ESSAY")}>Add Essay</Button>
    </div>
  );
}

function BankPanel() {
  return (
    <div className="stack top-gap">
      <p className="muted">Select from previously approved questions.</p>
      <div className="row wrap">
        <Badge tone="info">MCQ 120</Badge>
        <Badge tone="info">Fill 37</Badge>
        <Badge tone="info">Essay 18</Badge>
      </div>
    </div>
  );
}

function QuestionReviewCard({ question, onStatus, onUpdate }: { question: Question; onStatus: (id: string, status: Question["status"]) => void; onUpdate: (id: string, text: string) => void }) {
  return (
    <div className="review-card">
      <div className="row spread">
        <strong>{question.type}</strong>
        <Badge tone={question.status === "Approved" ? "success" : question.status === "Discarded" ? "error" : "warning"}>{question.status}</Badge>
      </div>
      <input className="input" value={question.text} onChange={(e) => onUpdate(question.id, e.target.value)} />
      <div className="row">
        <Button variant="primary" onClick={() => onStatus(question.id, "Approved")}>Approve</Button>
        <Button onClick={() => onStatus(question.id, "Pending")}>Pending</Button>
        <Button variant="ghost" onClick={() => onStatus(question.id, "Discarded")}>Discard</Button>
      </div>
    </div>
  );
}

export function NewExamScreen() {
  const rosters = useAppStore((s) => s.rosters);
  const examBuilder = useAppStore((s) => s.examBuilder);
  const createDraftExam = useAppStore((s) => s.createDraftExam);
  const setSourceMode = useAppStore((s) => s.setSourceMode);
  const generateAiQuestions = useAppStore((s) => s.generateAiQuestions);
  const setQuestionStatus = useAppStore((s) => s.setQuestionStatus);
  const updateQuestionText = useAppStore((s) => s.updateQuestionText);
  const addManualQuestion = useAppStore((s) => s.addManualQuestion);
  const publishBuilderExam = useAppStore((s) => s.publishBuilderExam);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [title, setTitle] = useState(examBuilder.draft.title);
  const [course, setCourse] = useState(examBuilder.draft.courseCode);
  const [date, setDate] = useState(examBuilder.draft.date || new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(examBuilder.draft.durationMinutes);
  const [passing, setPassing] = useState(examBuilder.draft.passingScore);
  const [rosterId, setRosterId] = useState(examBuilder.draft.rosterId);

  const pending = examBuilder.generated.filter((q) => q.status === "Pending").length;
  const approved = examBuilder.generated.filter((q) => q.status === "Approved").length;

  return (
    <>
      <SectionHeader title="Exam Creation" subtitle="Full interactive flow: setup, source, review, publish." />
      <Card>
        <div className="row wrap">
          <Badge tone={step === 1 ? "info" : "neutral"}>1 Details</Badge>
          <Badge tone={step === 2 ? "info" : "neutral"}>2 Sources</Badge>
          <Badge tone={step === 3 ? "info" : "neutral"}>3 Review</Badge>
          <Badge tone={step === 4 ? "info" : "neutral"}>4 Publish</Badge>
        </div>
      </Card>

      {step === 1 ? (
        <Card>
          <h3>Step 1: Exam Details</h3>
          <section className="grid-2">
            <label className="field"><span className="label">Exam Title</span><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
            <label className="field"><span className="label">Course Code</span><input className="input" value={course} onChange={(e) => setCourse(e.target.value)} /></label>
            <label className="field"><span className="label">Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="field"><span className="label">Duration (minutes)</span><input className="input" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label>
            <label className="field"><span className="label">Passing Score (%)</span><input className="input" type="number" value={passing} onChange={(e) => setPassing(Number(e.target.value))} /></label>
            <label className="field"><span className="label">Linked Roster</span><select className="input" value={rosterId} onChange={(e) => setRosterId(e.target.value)}>{rosters.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.students.length})</option>)}</select></label>
          </section>
          <div className="row top-gap">
            <Button variant="primary" onClick={() => { createDraftExam({ title, courseCode: course, date, durationMinutes: duration, passingScore: passing, rosterId }); setStep(2); }}>Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <h3>Step 2: Question Source Selection</h3>
          <div className="row wrap">
            <Button variant={examBuilder.sourceMode === "upload" ? "primary" : "secondary"} onClick={() => setSourceMode("upload")}>Upload Document</Button>
            <Button variant={examBuilder.sourceMode === "paste" ? "primary" : "secondary"} onClick={() => setSourceMode("paste")}>Paste Text</Button>
            <Button variant={examBuilder.sourceMode === "manual" ? "primary" : "secondary"} onClick={() => setSourceMode("manual")}>Manual Entry</Button>
            <Button variant={examBuilder.sourceMode === "bank" ? "primary" : "secondary"} onClick={() => setSourceMode("bank")}>Question Bank</Button>
          </div>
          {examBuilder.sourceMode === "upload" ? <UploadPanel /> : null}
          {examBuilder.sourceMode === "paste" ? <PastePanel /> : null}
          {examBuilder.sourceMode === "manual" ? <ManualPanel onAdd={addManualQuestion} /> : null}
          {examBuilder.sourceMode === "bank" ? <BankPanel /> : null}
          <div className="row top-gap">
            <Button onClick={() => setStep(1)}>Back</Button>
            <Button variant="primary" onClick={() => { generateAiQuestions(); setStep(3); }}>Generate / Continue</Button>
          </div>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <h3>Step 3: Review Questions</h3>
          <div className="row wrap">
            <Badge tone="warning">Pending: {pending}</Badge>
            <Badge tone="success">Approved: {approved}</Badge>
            <Badge tone="error">Discarded: {examBuilder.generated.length - pending - approved}</Badge>
          </div>
          <div className="stack top-gap">
            {examBuilder.generated.slice(0, 8).map((q) => <QuestionReviewCard key={q.id} question={q} onUpdate={updateQuestionText} onStatus={setQuestionStatus} />)}
          </div>
          <div className="row top-gap">
            <Button onClick={() => setStep(2)}>Back</Button>
            <Button variant="primary" onClick={() => setStep(4)}>Continue to Publish</Button>
          </div>
        </Card>
      ) : null}

      {step === 4 ? (
        <Card>
          <h3>Step 4: Exam Summary & Publish</h3>
          <div className="meta-row"><span>Title</span><strong>{title || "Untitled Exam"}</strong></div>
          <div className="meta-row"><span>Course</span><strong>{course || "-"}</strong></div>
          <div className="meta-row"><span>Duration</span><strong>{duration} mins</strong></div>
          <div className="meta-row"><span>Approved Questions</span><strong>{approved}</strong></div>
          <div className="stack top-gap">
            <Switch label="Fullscreen Enforcement" checked />
            <Switch label="Tab Monitoring" checked />
            <Switch label="Question Shuffle" checked />
            <Switch label="Show Score to Student" />
          </div>
          <div className="row top-gap">
            <Button onClick={() => setStep(3)}>Back</Button>
            <Button variant="primary" onClick={publishBuilderExam}>Publish Exam</Button>
          </div>
        </Card>
      ) : null}
    </>
  );
}

export function QuestionBankScreen() {
  const exams = useAppStore((s) => s.exams);
  const questions = useMemo(() => exams.flatMap((e) => e.questions.map((q) => ({ ...q, exam: e.title, course: e.courseCode }))), [exams]);
  const [search, setSearch] = useState("");
  const filtered = questions.filter((q) => q.text.toLowerCase().includes(search.toLowerCase()) || q.course.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <SectionHeader title="Question Bank" subtitle="Search, filter and pick reusable approved questions." />
      <Card>
        <label className="field"><span className="label">Search Questions</span><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      </Card>
      <Card>
        <h3>Questions ({filtered.length})</h3>
        {filtered.length === 0 ? <p className="muted">No question matched your search.</p> : null}
        {filtered.map((q) => (
          <div key={q.id} className="inventory-row">
            <Badge tone="info">{q.type}</Badge>
            <div>
              <strong>{q.text || "Untitled question"}</strong>
              <p className="muted">{q.course} - {q.exam}</p>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}

export function RosterScreen() {
  const rosters = useAppStore((s) => s.rosters);
  const importCsv = useAppStore((s) => s.importRosterFromCsv);
  const addStudent = useAppStore((s) => s.addManualStudent);
  const [method, setMethod] = useState<"csv" | "self">("csv");
  const [name, setName] = useState("New Roster");
  const [csv, setCsv] = useState("matric,name\nCSC/2021/001,Jane Doe\nCSC/2021/002,John Smith");
  const [selected, setSelected] = useState(rosters[0]?.id ?? "");
  const [matric, setMatric] = useState("");
  const [studentName, setStudentName] = useState("");
  const [result, setResult] = useState<{ duplicates: number; invalid: number } | null>(null);

  return (
    <>
      <SectionHeader title="Roster Management" subtitle="Import CSV or collect registrations, then lock roster for exam." />
      <section className="grid-2">
        <Card>
          <h3>Create New Roster</h3>
          <div className="row">
            <Button variant={method === "csv" ? "primary" : "secondary"} onClick={() => setMethod("csv")}>Import CSV</Button>
            <Button variant={method === "self" ? "primary" : "secondary"} onClick={() => setMethod("self")}>Self-Registration</Button>
          </div>
          {method === "csv" ? (
            <div className="stack top-gap">
              <label className="field"><span className="label">Roster Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="field"><span className="label">CSV Data</span><textarea className="input textarea" value={csv} onChange={(e) => setCsv(e.target.value)} /></label>
              <Button variant="primary" onClick={() => { const r = importCsv(name, csv); setResult({ duplicates: r.duplicates, invalid: r.invalid }); }}>Import</Button>
              {result ? <p className="muted">Duplicates: {result.duplicates} | Invalid rows: {result.invalid}</p> : null}
            </div>
          ) : (
            <div className="stack top-gap">
              <p className="muted">Registration Link</p>
              <div className="connection-box"><strong>http://mudu.local/register/abc123</strong></div>
              <p className="muted">Live submissions update in real time in production mode.</p>
            </div>
          )}
        </Card>

        <Card>
          <h3>Roster Detail</h3>
          <label className="field"><span className="label">Select Roster</span><select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>{rosters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
          <div className="row top-gap">
            <input className="input row-grow" placeholder="Matric" value={matric} onChange={(e) => setMatric(e.target.value)} />
            <input className="input row-grow" placeholder="Name" value={studentName} onChange={(e) => setStudentName(e.target.value)} />
            <Button onClick={() => { if (!selected || !matric || !studentName) return; addStudent(selected, matric, studentName); setMatric(""); setStudentName(""); }}>Add</Button>
          </div>
          <table className="table top-gap">
            <thead><tr><th>Matric</th><th>Name</th></tr></thead>
            <tbody>{(rosters.find((r) => r.id === selected)?.students ?? []).map((s) => <tr key={s.id}><td>{s.matric}</td><td>{s.name}</td></tr>)}</tbody>
          </table>
        </Card>
      </section>
    </>
  );
}

export function LaunchScreen() {
  const network = useAppStore((s) => s.network);
  const loadNetwork = useAppStore((s) => s.loadNetwork);
  const setSessionsFromRoster = useAppStore((s) => s.setSessionsFromRoster);
  const [state, setState] = useState<"starting" | "ready" | "error">("starting");

  useEffect(() => {
    void loadNetwork().then(() => setState("ready")).catch(() => setState("error"));
  }, [loadNetwork]);

  return (
    <>
      <SectionHeader title="Exam Launch" subtitle="Project this screen in hall. Students connect by IP in browser." />
      <Card>
        {state === "starting" ? <p className="muted">Server starting...</p> : null}
        {state === "error" ? <p className="error-text">Server unavailable. Retry.</p> : null}
        {state === "ready" ? (
          <>
            <div className="connection-box">
              <div className="muted">Students open this in browser</div>
              <div className="ip">{network.localIp}:{network.port}</div>
              <div className="muted">{network.joinUrl}</div>
            </div>
            <div className="row top-gap">
              <Button onClick={() => void loadNetwork()}>Refresh IP</Button>
              <Button variant="primary" onClick={() => setSessionsFromRoster("exam_demo_midsem")}>Open Lobby</Button>
            </div>
          </>
        ) : null}
      </Card>
    </>
  );
}

export function MonitorScreen() {
  const sessions = useAppStore((s) => s.sessions);
  const extendTime = useAppStore((s) => s.extendTime);
  const dismissFlags = useAppStore((s) => s.dismissFlags);
  const forceSubmit = useAppStore((s) => s.forceSubmit);
  const [view, setView] = useState<"grid" | "list">("list");
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const visible = sessions.filter((s) => (showFlaggedOnly ? s.flags > 0 : true));

  return (
    <>
      <SectionHeader title="Live Monitoring" subtitle="Track student state, flags, and interventions in real time." />
      <Card>
        <div className="row wrap spread">
          <div className="row wrap">
            <Badge tone="success">Connected: {sessions.filter((s) => s.status === "Connected" || s.status === "Active").length}</Badge>
            <Badge tone="info">Submitted: {sessions.filter((s) => s.status === "Submitted").length}</Badge>
            <Badge tone="warning">Flagged: {sessions.filter((s) => s.flags > 0).length}</Badge>
          </div>
          <div className="row wrap">
            <Button variant={view === "list" ? "primary" : "secondary"} onClick={() => setView("list")}>List</Button>
            <Button variant={view === "grid" ? "primary" : "secondary"} onClick={() => setView("grid")}>Grid</Button>
            <Button onClick={() => setShowFlaggedOnly((v) => !v)}>{showFlaggedOnly ? "All Students" : "Flagged Only"}</Button>
          </div>
        </div>
      </Card>

      {view === "list" ? (
        <Card>
          <table className="table">
            <thead><tr><th>Name</th><th>Matric</th><th>Status</th><th>Question</th><th>Flags</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.matric}</td>
                  <td><Badge tone={sessionTone(s.status)}>{s.status}</Badge></td>
                  <td>Q{s.currentQuestion}</td>
                  <td>{s.flags}</td>
                  <td>{formatSeconds(s.timeRemaining)}</td>
                  <td>
                    <div className="row wrap">
                      <Button onClick={() => extendTime(s.id, 10)}>+10m</Button>
                      <Button onClick={() => dismissFlags(s.id)}>Dismiss</Button>
                      <Button variant="ghost" onClick={() => forceSubmit(s.id)}>Force Submit</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <section className="grid-3">
          {visible.map((s) => (
            <Card key={s.id}>
              <div className="row spread"><strong>{s.name}</strong><Badge tone={sessionTone(s.status)}>{s.status}</Badge></div>
              <div className="meta-row"><span>Matric</span><strong>{s.matric}</strong></div>
              <div className="meta-row"><span>Current</span><strong>Q{s.currentQuestion}</strong></div>
              <div className="meta-row"><span>Flags</span><strong>{s.flags}</strong></div>
              <div className="row wrap">
                <Button onClick={() => extendTime(s.id, 5)}>+5m</Button>
                <Button onClick={() => dismissFlags(s.id)}>Dismiss</Button>
                <Button variant="ghost" onClick={() => forceSubmit(s.id)}>Submit</Button>
              </div>
            </Card>
          ))}
        </section>
      )}
    </>
  );
}

export function ResultsScreen() {
  const exams = useAppStore((s) => s.exams);
  const sessions = useAppStore((s) => s.sessions);
  const [selectedExam, setSelectedExam] = useState(exams[0]?.id ?? "");
  const [markIndex, setMarkIndex] = useState(0);
  const submitted = sessions.filter((s) => s.status === "Submitted");
  const passRate = submitted.length === 0 ? 0 : 74;

  return (
    <>
      <SectionHeader title="Results & Analytics" subtitle="Review scores, question outcomes, and manual essay marking workflow." />
      <Card>
        <label className="field"><span className="label">Exam</span><select className="input" value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>{exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
      </Card>
      <section className="grid-4">
        <Card><div className="metric-label">Submissions</div><div className="metric-value">{submitted.length}</div></Card>
        <Card><div className="metric-label">Average Score</div><div className="metric-value">67%</div></Card>
        <Card><div className="metric-label">Pass Rate</div><div className="metric-value">{passRate}%</div></Card>
        <Card><div className="metric-label">Flagged Scripts</div><div className="metric-value">{sessions.filter((s) => s.flags > 0).length}</div></Card>
      </section>
      <Card>
        <h3>Student Results Table</h3>
        <table className="table">
          <thead><tr><th>Matric</th><th>Name</th><th>Score</th><th>Grade</th><th>Flags</th></tr></thead>
          <tbody>{sessions.map((s, i) => <tr key={s.id}><td>{s.matric}</td><td>{s.name}</td><td>{Math.max(35, 90 - i * 7)}%</td><td>{i < 3 ? "A/B" : "C/D"}</td><td>{s.flags}</td></tr>)}</tbody>
        </table>
      </Card>
      <Card>
        <h3>Essay Marking</h3>
        {submitted.length === 0 ? <p className="muted">No submitted scripts yet.</p> : (
          <>
            <div className="meta-row"><span>Current Student</span><strong>{submitted[markIndex % submitted.length].name}</strong></div>
            <label className="field top-gap"><span className="label">Feedback</span><textarea className="input textarea" placeholder="Optional note" /></label>
            <div className="row top-gap">
              <Button onClick={() => setMarkIndex((i) => (i + submitted.length - 1) % submitted.length)}>Previous</Button>
              <Button variant="primary" onClick={() => setMarkIndex((i) => (i + 1) % submitted.length)}>Save & Next</Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function SyncScreen() {
  const syncItems = useAppStore((s) => s.syncItems);
  const runSyncAll = useAppStore((s) => s.runSyncAll);
  const busy = useAppStore((s) => s.busy);

  return (
    <>
      <SectionHeader title="Cloud Sync" subtitle="Local-first queue with progress and retry visibility." />
      <Card>
        <div className="row spread">
          <Badge tone="warning">{syncItems.filter((i) => i.status !== "Synced").length} unsynced item(s)</Badge>
          <Button variant="primary" onClick={() => void runSyncAll()} disabled={busy}>Sync All</Button>
        </div>
      </Card>
      <Card>
        <table className="table">
          <thead><tr><th>Exam</th><th>Size</th><th>Status</th><th>Progress</th><th>Error</th></tr></thead>
          <tbody>
            {syncItems.map((item) => (
              <tr key={item.id}>
                <td>{item.examTitle}</td>
                <td>{item.sizeLabel}</td>
                <td><Badge tone={item.status === "Synced" ? "success" : item.status === "Error" ? "error" : "warning"}>{item.status}</Badge></td>
                <td><div className="progress-track"><div className="progress-fill" style={{ width: `${item.progress}%` }} /></div></td>
                <td>{item.error ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

export function SettingsScreen() {
  const lecturerName = useAppStore((s) => s.lecturerName);
  const institution = useAppStore((s) => s.institution);
  const department = useAppStore((s) => s.department);
  const setProfile = useAppStore((s) => s.setProfile);
  const [name, setName] = useState(lecturerName);
  const [inst, setInst] = useState(institution);
  const [dept, setDept] = useState(department);

  return (
    <>
      <SectionHeader title="Settings" subtitle="Profile, defaults, cloud configuration, and safety actions." />
      <section className="grid-2">
        <Card>
          <h3>Profile</h3>
          <label className="field"><span className="label">Name</span><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field"><span className="label">Institution</span><input className="input" value={inst} onChange={(e) => setInst(e.target.value)} /></label>
          <label className="field"><span className="label">Department</span><input className="input" value={dept} onChange={(e) => setDept(e.target.value)} /></label>
          <Button variant="primary" onClick={() => setProfile(name, inst, dept)}>Save Profile</Button>
        </Card>
        <Card>
          <h3>Exam Defaults</h3>
          <div className="stack">
            <Field label="Default Duration" value="60" />
            <Field label="Recovery Window" value="10" />
            <Switch label="Fullscreen Enforcement" checked />
            <Switch label="Tab Monitoring" checked />
            <Switch label="Question Shuffle" checked />
          </div>
        </Card>
      </section>
    </>
  );
}
