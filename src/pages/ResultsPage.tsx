import { useState } from "react";
import { IconBarChart, IconDownload } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";

export function ResultsPage() {
  const exams = useAppStore((s) => s.exams);
  const sessions = useAppStore((s) => s.sessions);
  const [selectedExam, setSelectedExam] = useState(exams[0]?.id ?? "");
  const [markIndex, setMarkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "questions" | "essays">("overview");

  const submitted = sessions.filter((s) => s.status === "Submitted");
  const scores = sessions.map((_, i) => Math.max(35, 90 - i * 7));
  const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  const passRate = scores.length > 0 ? Math.round((scores.filter((s) => s >= 50).length / scores.length) * 100) : 0;

  const scoreBands = [
    { range: "80-100", count: 28, color: "var(--color-success)" },
    { range: "70-79", count: 34, color: "var(--blue-500)" },
    { range: "60-69", count: 26, color: "var(--blue-400)" },
    { range: "50-59", count: 14, color: "var(--color-warning)" },
    { range: "0-49", count: 10, color: "var(--color-error)" },
  ];
  const maxBand = Math.max(...scoreBands.map((b) => b.count));

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Results & Analytics</h1>
        <button className="btn btn-secondary"><IconDownload /> Export</button>
      </div>

      {/* Exam Selector */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="row gap-3">
          <label className="form-label" style={{ whiteSpace: "nowrap" }}>Exam:</label>
          <select className="form-select" style={{ flex: 1, maxWidth: "300px" }} value={selectedExam} onChange={(e) => setSelectedExam(e.target.value)}>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid-4">
        <div className="card metric-card"><div className="metric-value">{submitted.length}</div><div className="metric-label">Submissions</div></div>
        <div className="card metric-card"><div className="metric-value">{avg}%</div><div className="metric-label">Average Score</div></div>
        <div className="card metric-card"><div className="metric-value">{passRate}%</div><div className="metric-label">Pass Rate</div></div>
        <div className="card metric-card"><div className="metric-value">{sessions.filter((s) => s.flags > 0).length}</div><div className="metric-label">Flagged Scripts</div></div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {(["overview", "students", "questions", "essays"] as const).map((t) => (
          <button key={t} className={`tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab — Score Distribution */}
      {activeTab === "overview" && (
        <div className="card stack gap-4">
          <div className="row gap-2"><IconBarChart /> <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Score Distribution</h3></div>
          <div className="stack gap-3">
            {scoreBands.map((band) => (
              <div key={band.range} className="row gap-3">
                <span style={{ width: "60px", fontSize: "13px", color: "var(--text-tertiary)", textAlign: "right" }}>{band.range}</span>
                <div style={{ flex: 1, height: "24px", background: "var(--gray-100)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(band.count / maxBand) * 100}%`, background: band.color, borderRadius: "4px", transition: "width 0.5s ease" }} />
                </div>
                <span style={{ width: "30px", fontSize: "13px", fontWeight: 500 }}>{band.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Matric</th><th>Name</th><th>Score</th><th>Grade</th><th>Flags</th></tr></thead>
            <tbody>
              {sessions.map((s, i) => {
                const score = Math.max(35, 90 - i * 7);
                const grade = score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : score >= 45 ? "D" : "F";
                return (
                  <tr key={s.id}>
                    <td>{s.matric}</td>
                    <td>{s.name}</td>
                    <td style={{ fontWeight: 600 }}>{score}%</td>
                    <td><span className={`badge ${score >= 50 ? "badge-success" : "badge-error"}`}>{grade}</span></td>
                    <td>{s.flags}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="card stack gap-3">
          {[
            { id: "Q1", type: "MCQ", rate: "89%", issue: "None" },
            { id: "Q4", type: "Fill", rate: "44%", issue: "Wording ambiguous" },
            { id: "Q8", type: "Essay", rate: "Manual", issue: "Long answers" },
          ].map((q) => (
            <div key={q.id} className="review-card">
              <div className="row-between">
                <div className="row gap-2">
                  <span className="badge badge-info">{q.type}</span>
                  <strong>{q.id}</strong>
                </div>
                <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Success: {q.rate}</span>
              </div>
              {q.issue !== "None" && (
                <div style={{ fontSize: "13px", color: "var(--color-warning)" }}>⚠ {q.issue}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Essays Tab */}
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
                [Student essay answer would appear here]
              </div>
              <div className="form-group">
                <label className="form-label">Score</label>
                <input className="form-input" type="number" placeholder="Points" style={{ maxWidth: "120px" }} />
              </div>
              <div className="form-group">
                <label className="form-label">Feedback</label>
                <textarea className="form-textarea" placeholder="Optional marking note..." />
              </div>
              <div className="row-between">
                <button className="btn btn-secondary" onClick={() => setMarkIndex((i) => Math.max(0, i - 1))}>Previous</button>
                <button className="btn btn-primary" onClick={() => setMarkIndex((i) => Math.min(submitted.length - 1, i + 1))}>Save & Next</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
