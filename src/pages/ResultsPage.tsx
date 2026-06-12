import { useEffect, useMemo, useState } from "react";
import { IconBarChart, IconDownload } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import {
  fetchExamResultsRequest,
  fetchExamsRequest,
  fetchExamSessionsRequest,
  type ExamRecord,
  type ExamResultsRecord,
  type ExamSessionRecord
} from "../api/client";

export function ResultsPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [sessions, setSessions] = useState<ExamSessionRecord[]>([]);
  const [results, setResults] = useState<ExamResultsRecord>({ scoreBands: [], questionInsights: [] });
  const [selectedExam, setSelectedExam] = useState("");
  const [markIndex, setMarkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "questions" | "essays">("overview");

  useEffect(() => {
    let mounted = true;
    void fetchExamsRequest()
      .then((items) => {
        if (!mounted) return;
        setExams(items);
        setSelectedExam(items[0]?.id ?? "");
      })
      .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to load exams.", "error"));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedExam) {
      setSessions([]);
      setResults({ scoreBands: [], questionInsights: [] });
      return;
    }

    void Promise.all([fetchExamSessionsRequest(selectedExam), fetchExamResultsRequest(selectedExam)])
      .then(([sessionRows, resultsRows]) => {
        setSessions(sessionRows);
        setResults(resultsRows);
      })
      .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to load results.", "error"));
  }, [selectedExam]);

  const submitted = sessions.filter((s) => s.status === "Submitted");
  const maxBand = Math.max(1, ...results.scoreBands.map((b) => b.count));
  const totalBandCount = results.scoreBands.reduce((sum, b) => sum + b.count, 0);

  const passRate = useMemo(() => {
    if (totalBandCount < 1) return 0;
    const passCount = results.scoreBands.reduce((sum, b) => {
      const bounds = b.range.split("-").map((x) => Number(x.trim()));
      const lower = bounds[0];
      return Number.isFinite(lower) && lower >= 50 ? sum + b.count : sum;
    }, 0);
    return Math.round((passCount / totalBandCount) * 100);
  }, [results.scoreBands, totalBandCount]);

  const avg = useMemo(() => {
    if (totalBandCount < 1) return 0;
    const weighted = results.scoreBands.reduce((sum, b) => {
      const bounds = b.range.split("-").map((x) => Number(x.trim()));
      const midpoint = bounds.length === 2 && Number.isFinite(bounds[0]) && Number.isFinite(bounds[1])
        ? (bounds[0] + bounds[1]) / 2
        : 0;
      return sum + midpoint * b.count;
    }, 0);
    return Math.round(weighted / totalBandCount);
  }, [results.scoreBands, totalBandCount]);

  const exportResultsCsv = () => {
    const header = "matric,name,flags,status";
    const rows = sessions.map((s) =>
      [s.matric, s.name, String(s.flags), s.status]
        .map((value) => `"${value.replace(/"/g, "\"\"")}"`)
        .join(",")
    );
    const csvText = [header, ...rows].join("\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mudu-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Results & Analytics</h1>
        <button className="btn btn-secondary" onClick={exportResultsCsv}><IconDownload /> Export</button>
      </div>

      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="row gap-3">
          <label className="form-label" style={{ whiteSpace: "nowrap" }}>Exam:</label>
          <select className="form-select" style={{ flex: 1, maxWidth: "300px" }} value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            {exams.length === 0 && <option value="">No exams</option>}
          </select>
        </div>
      </div>

      <div className="grid-4">
        <div className="card metric-card"><div className="metric-value">{submitted.length}</div><div className="metric-label">Submissions</div></div>
        <div className="card metric-card"><div className="metric-value">{avg}%</div><div className="metric-label">Average Score</div></div>
        <div className="card metric-card"><div className="metric-value">{passRate}%</div><div className="metric-label">Pass Rate</div></div>
        <div className="card metric-card"><div className="metric-value">{sessions.filter((s) => s.flags > 0).length}</div><div className="metric-label">Flagged Scripts</div></div>
      </div>

      <div className="tabs">
        {(["overview", "students", "questions", "essays"] as const).map((t) => (
          <button key={t} className={`tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="card stack gap-4">
          <div className="row gap-2"><IconBarChart /> <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Score Distribution</h3></div>
          <div className="stack gap-3">
            {results.scoreBands.map((band) => (
              <div key={band.range} className="row gap-3">
                <span style={{ width: "60px", fontSize: "13px", color: "var(--text-tertiary)", textAlign: "right" }}>{band.range}</span>
                <div style={{ flex: 1, height: "24px", background: "var(--gray-100)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(band.count / maxBand) * 100}%`, background: "var(--color-primary)", borderRadius: "4px", transition: "width 0.5s ease" }} />
                </div>
                <span style={{ width: "30px", fontSize: "13px", fontWeight: 500 }}>{band.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "students" && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Matric</th><th>Name</th><th>Status</th><th>Flags</th><th>Time Left</th></tr></thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.matric}</td>
                  <td>{s.name}</td>
                  <td>{s.status}</td>
                  <td>{s.flags}</td>
                  <td>{s.timeRemaining}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "questions" && (
        <div className="card stack gap-3">
          {results.questionInsights.map((q) => (
            <div key={q.id} className="review-card">
              <div className="row-between">
                <div className="row gap-2">
                  <span className="badge badge-info">{q.type}</span>
                  <strong>{q.id}</strong>
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Success: {q.successRate}</span>
              </div>
              {q.issue !== "None" && q.issue !== "" && (
                <div style={{ fontSize: "13px", color: "var(--color-warning)" }}>! {q.issue}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === "essays" && (
        <div className="card stack gap-4">
          {submitted.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>No submitted scripts yet.</p>
          ) : (
            <>
              <div className="row-between">
                <div>
                  <div className="form-label">Marking Student</div>
                  <div style={{ fontWeight: 600 }}>{submitted[markIndex % submitted.length]?.name}</div>
                </div>
                <span className="badge badge-info">{markIndex + 1} / {submitted.length}</span>
              </div>
              <div style={{ background: "var(--gray-50)", padding: "16px", borderRadius: "8px", minHeight: "120px", fontSize: "14px", color: "var(--text-secondary)" }}>
                Essay review endpoint is not implemented yet.
              </div>
              <div className="row-between">
                <button className="btn btn-secondary" onClick={() => setMarkIndex((i) => Math.max(0, i - 1))}>Previous</button>
                <button className="btn btn-primary" onClick={() => setMarkIndex((i) => Math.min(submitted.length - 1, i + 1))}>Next</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
