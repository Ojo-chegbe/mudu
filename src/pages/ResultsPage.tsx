import { useEffect, useMemo, useState } from "react";
import { IconBarChart, IconDownload, IconPlay } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import {
  fetchExamsRequest,
  fetchRunSessionsRequest,
  fetchRunResultsRequest,
  gradeRunRequest,
  updateEssayScoreRequest,
  getResultsExportUrl,
  type ExamRecord,
  type RunResultsRecord,
  type RunSessionRecord,
  type ResultSummary
} from "../api/client";

export function ResultsPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [sessions, setSessions] = useState<RunSessionRecord[]>([]);
  const [results, setResults] = useState<RunResultsRecord>({ 
    results: [], averageScore: 0, passRate: 0, flaggedScriptsCount: 0, scoreBands: [], questionInsights: [] 
  });
  const [selectedExamId, setSelectedExamId] = useState("");
  const [markIndex, setMarkIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "questions" | "essays">("overview");
  const [isGrading, setIsGrading] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const targetRunId = selectedExam?.latestRunId || selectedExam?.activeRunId;

  useEffect(() => {
    let mounted = true;
    void fetchExamsRequest()
      .then((items) => {
        if (!mounted) return;
        setExams(items);
        setSelectedExamId(items[0]?.id ?? "");
      })
      .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to load exams.", "error"));
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = () => {
    if (!targetRunId) {
      setSessions([]);
      setResults({ results: [], averageScore: 0, passRate: 0, flaggedScriptsCount: 0, scoreBands: [], questionInsights: [] });
      return;
    }

    setLoading(true);
    void Promise.all([fetchRunSessionsRequest(targetRunId), fetchRunResultsRequest(targetRunId)])
      .then(([sessionRows, resultsRows]) => {
        setSessions(sessionRows);
        setResults(resultsRows);
      })
      .catch((err) => pushToast(err instanceof Error ? err.message : "Failed to load results.", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [targetRunId]);

  const maxBand = Math.max(1, ...results.scoreBands.map((b) => b.count));
  const submittedResults = results.results.filter(r => r.status === "Completed" || r.status === "PendingEssayReview");
  
  const handleGradeRun = async () => {
    if (!targetRunId) return;
    setIsGrading(true);
    try {
      const res = await gradeRunRequest(targetRunId);
      pushToast(`Successfully graded ${res.gradedSessions} scripts.`, "success");
      loadData();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to grade run.", "error");
    } finally {
      setIsGrading(false);
    }
  };

  const handleUpdateEssayScore = async (resultId: string, scoreStr: string) => {
    const score = Number(scoreStr);
    if (isNaN(score) || score < 0) {
      pushToast("Please enter a valid non-negative number.", "error");
      return;
    }
    try {
      const updated = await updateEssayScoreRequest(resultId, score);
      // Update local state without full reload
      setResults(prev => ({
        ...prev,
        results: prev.results.map(r => r.id === resultId ? updated : r)
      }));
      pushToast("Score updated.", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to update score.", "error");
    }
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Results & Analytics</h1>
        <div className="row gap-3">
          <button className="btn btn-secondary" onClick={handleGradeRun} disabled={isGrading || !targetRunId}>
            <IconPlay /> {isGrading ? "Grading..." : "Run Grading Pipeline"}
          </button>
          {targetRunId && (
            <a className="btn btn-secondary" href={getResultsExportUrl(targetRunId)} download>
              <IconDownload /> Export CSV
            </a>
          )}
        </div>
      </div>

      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="row gap-3">
          <label className="form-label" style={{ whiteSpace: "nowrap" }}>Exam:</label>
          <select className="form-select" style={{ flex: 1, maxWidth: "300px" }} value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)}>
            {exams.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            {exams.length === 0 && <option value="">No exams</option>}
          </select>
          {!targetRunId && selectedExamId && (
            <span className="badge badge-warning">No runs found for this exam</span>
          )}
        </div>
      </div>

      {targetRunId && !loading && (
        <>
          <div className="grid-4">
            <div className="card metric-card"><div className="metric-value">{submittedResults.length}</div><div className="metric-label">Graded Scripts</div></div>
            <div className="card metric-card"><div className="metric-value">{results.averageScore}%</div><div className="metric-label">Average Score</div></div>
            <div className="card metric-card"><div className="metric-value">{results.passRate}%</div><div className="metric-label">Pass Rate</div></div>
            <div className="card metric-card"><div className="metric-value">{results.flaggedScriptsCount}</div><div className="metric-label">Flagged Scripts</div></div>
          </div>

          <div className="tabs">
            {(["overview", "students", "questions", "essays"] as const).map((t) => (
              <button key={t} className={`tab${activeTab === t ? " active" : ""}`} onClick={() => setActiveTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: "center", padding: "40px" }}>
          Loading results...
        </div>
      ) : activeTab === "overview" && (
        <div className="card stack gap-4">
          <div className="row gap-2"><IconBarChart /> <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Score Distribution</h3></div>
          <div className="stack gap-3">
            {results.scoreBands.map((band) => (
              <div key={band.range} className="row gap-3">
                <span style={{ width: "60px", fontSize: "13px", color: "var(--text-tertiary)", textAlign: "right" }}>{band.range}</span>
                <div style={{ flex: 1, height: "24px", background: "var(--gray-100)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${maxBand > 0 ? (band.count / maxBand) * 100 : 0}%`, background: "var(--color-primary)", borderRadius: "4px", transition: "width 0.5s ease" }} />
                </div>
                <span style={{ width: "30px", fontSize: "13px", fontWeight: 500 }}>{band.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === "students" && (
        <div className="card">
          <table className="table">
            <thead><tr><th>Matric</th><th>Name</th><th>Objective</th><th>Essay</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {results.results.map((r) => (
                <tr key={r.id}>
                  <td>{r.matric}</td>
                  <td>{r.name}</td>
                  <td>{r.objectiveScore} / {r.maxScore}</td>
                  <td>{r.essayScore ?? "-"}</td>
                  <td><strong>{r.percentage}%</strong></td>
                  <td>
                    <span className={`badge ${r.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && activeTab === "questions" && (
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

      {!loading && activeTab === "essays" && (
        <div className="card stack gap-4">
          {submittedResults.length === 0 ? (
            <p style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>No submitted scripts yet.</p>
          ) : (
            <>
              <div className="row-between">
                <div>
                  <div className="form-label">Marking Student</div>
                  <div style={{ fontWeight: 600 }}>{submittedResults[markIndex % submittedResults.length]?.name} ({submittedResults[markIndex % submittedResults.length]?.matric})</div>
                </div>
                <span className="badge badge-info">{markIndex + 1} / {submittedResults.length}</span>
              </div>
              
              <div className="row gap-4 align-end">
                <div style={{ flex: 1 }}>
                  <label className="form-label">Essay Score</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    defaultValue={submittedResults[markIndex % submittedResults.length]?.essayScore ?? 0}
                    onBlur={(e) => handleUpdateEssayScore(submittedResults[markIndex % submittedResults.length].id, e.target.value)}
                  />
                </div>
              </div>
              
              <div className="row-between">
                <button className="btn btn-secondary" onClick={() => setMarkIndex((i) => Math.max(0, i - 1))}>Previous</button>
                <button className="btn btn-primary" onClick={() => setMarkIndex((i) => Math.min(submittedResults.length - 1, i + 1))}>Next</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
