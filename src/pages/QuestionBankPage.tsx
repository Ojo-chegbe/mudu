import { useMemo, useState } from "react";
import { DropdownMenu } from "../components/DropdownMenu";
import { IconFolder, IconPlus, IconEdit, IconTrash, IconCopy } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";

export function QuestionBankPage() {
  const exams = useAppStore((s) => s.exams);
  const updateBankQuestion = useAppStore((s) => s.updateBankQuestion);
  const questions = useMemo(() =>
    exams.flatMap((e) => e.questions.map((q) => ({ ...q, exam: e.title, course: e.courseCode }))),
    [exams]
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "MCQ" | "FILL" | "ESSAY">("All");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingPoints, setEditingPoints] = useState(1);
  const [editingOptions, setEditingOptions] = useState<string[]>(["", "", "", ""]);
  const [editingAnswer, setEditingAnswer] = useState("");

  const folders = useMemo(() => {
    const courseMap = new Map<string, number>();
    questions.forEach((q) => {
      const key = q.course || "Uncategorized";
      courseMap.set(key, (courseMap.get(key) || 0) + 1);
    });
    return Array.from(courseMap.entries()).map(([name, count]) => ({ name, count }));
  }, [questions]);

  const filtered = useMemo(() => {
    let list = questions;
    if (activeFolder) list = list.filter((q) => (q.course || "Uncategorized") === activeFolder);
    if (typeFilter !== "All") list = list.filter((q) => q.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => item.text.toLowerCase().includes(q) || item.course.toLowerCase().includes(q));
    }
    return list;
  }, [questions, search, typeFilter]);

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Question Bank</h1>
        <button className="btn btn-primary" onClick={() => setShowNewFolder(true)}>
          <IconPlus /> New Folder
        </button>
      </div>

      {/* Folder List */}
      <div className="grid-3">
        {folders.map((folder) => (
          <div
            key={folder.name}
            className="card"
            style={{ cursor: "pointer", borderColor: activeFolder === folder.name ? "var(--color-primary)" : undefined }}
            onClick={() => setActiveFolder(folder.name)}
          >
            <div className="row-between">
              <div className="row gap-3">
                <IconFolder />
                <div>
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{folder.name}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{folder.count} questions</div>
                </div>
              </div>
              <DropdownMenu items={[
                { label: "Rename", icon: <IconEdit />, onClick: () => {} },
                { label: "Export CSV", icon: <IconCopy />, onClick: () => {} },
                { label: "", divider: true, onClick: () => {} },
                { label: "Delete", icon: <IconTrash />, danger: true, onClick: () => {} },
              ]} />
            </div>
          </div>
        ))}
        {folders.length === 0 && (
          <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No saved questions</h3>
            <p style={{ color: "var(--text-tertiary)" }}>Questions you approve during exam creation get saved here automatically.</p>
          </div>
        )}
      </div>
      {activeFolder ? (
        <div className="row-between" style={{ marginTop: "-8px" }}>
          <div className="badge badge-info">Folder: {activeFolder}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveFolder(null)}>Clear Folder Filter</button>
        </div>
      ) : null}

      {/* Search & Filter */}
      <div className="card" style={{ padding: "12px 16px" }}>
        <div className="row-between row-wrap" style={{ gap: "12px" }}>
          <div className="search-box" style={{ flex: 1, maxWidth: "400px" }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="tabs" style={{ border: "none" }}>
            {(["All", "MCQ", "FILL", "ESSAY"] as const).map((t) => (
              <button key={t} className={`tab${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>{t === "All" ? "All" : t}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="card">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>No questions match your search.</p>
        ) : (
          <div className="stack gap-2">
            {filtered.map((q) => (
              <div key={q.id} className="review-card">
                <div className="row-between">
                  <div className="row gap-2">
                    <span className="badge badge-info">{q.type}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{q.course} · {q.exam}</span>
                  </div>
                  <span style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{q.points} pts</span>
                </div>
                <p style={{ fontSize: "14px" }}>{q.text || "Untitled question"}</p>
                <div className="row" style={{ marginTop: "8px" }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingId(q.id);
                      setEditingText(q.text ?? "");
                      setEditingPoints(q.points ?? 1);
                      setEditingOptions((q.options ?? ["", "", "", ""]).slice(0, 4));
                      setEditingAnswer(q.correctAnswer ?? "");
                    }}
                  >
                    Edit Question
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {showNewFolder && (
        <div className="modal-overlay" onClick={() => setShowNewFolder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New Folder</h3>
            <div className="form-group">
              <label className="form-label">Folder Name</label>
              <input className="form-input" value={folderName} onChange={(e) => setFolderName(e.target.value)} placeholder="e.g. CSC301" />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowNewFolder(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowNewFolder(false)}>Create</button>
            </div>
          </div>
        </div>
      )}

      {editingId && (
        <div className="modal-overlay" onClick={() => setEditingId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Edit Question</h3>
            <div className="stack gap-3">
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea className="form-textarea" value={editingText} onChange={(e) => setEditingText(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Points</label>
                <input className="form-input" type="number" min={1} value={editingPoints} onChange={(e) => setEditingPoints(Math.max(1, Number(e.target.value) || 1))} />
              </div>
              {editingOptions.map((opt, i) => (
                <div key={i} className="form-group">
                  <label className="form-label">Option {String.fromCharCode(65 + i)}</label>
                  <input
                    className="form-input"
                    value={opt}
                    onChange={(e) => {
                      const next = [...editingOptions];
                      next[i] = e.target.value;
                      setEditingOptions(next);
                    }}
                  />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <select className="form-select" value={editingAnswer} onChange={(e) => setEditingAnswer(e.target.value)}>
                  <option value="">Select correct option</option>
                  {editingOptions.map((opt, i) => (
                    <option key={i} value={opt}>{opt || `Option ${String.fromCharCode(65 + i)}`}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  updateBankQuestion(editingId, {
                    text: editingText,
                    points: editingPoints,
                    options: editingOptions,
                    correctAnswer: editingAnswer
                  });
                  setEditingId(null);
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
