import { useEffect, useMemo, useState } from "react";
import { DropdownMenu } from "../components/DropdownMenu";
import { IconFolder, IconPlus, IconEdit, IconTrash, IconCopy } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import {
  duplicateQuestionToExamRequest,
  fetchExamsRequest,
  fetchQuestionBankRequest,
  updateQuestionRequest,
  type ExamRecord,
  type QuestionBankRecord
} from "../api/client";

export function QuestionBankPage() {
  const pushToast = useAppStore((s) => s.pushToast);
  const [questions, setQuestions] = useState<QuestionBankRecord[]>([]);
  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(false);

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
  const [targetExamId, setTargetExamId] = useState("");
  const [customFolders, setCustomFolders] = useState<Array<{ name: string; count: number }>>([]);
  const [folderAliases, setFolderAliases] = useState<Record<string, string>>({});
  const [hiddenFolders, setHiddenFolders] = useState<string[]>([]);

  const resolveFolderName = (name: string) => folderAliases[name] ?? name;

  const loadQuestionBank = async (params?: {
    q?: string;
    type?: "MCQ" | "FILL" | "ESSAY";
    course?: string;
    status?: "Pending" | "Approved" | "Discarded";
  }) => {
    try {
      setLoading(true);
      const list = await fetchQuestionBankRequest(params);
      setQuestions(list);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to load question bank.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      loadQuestionBank({ status: "Approved" }),
      fetchExamsRequest().then((items) => {
        setExams(items);
        if (!targetExamId && items[0]?.id) {
          setTargetExamId(items[0].id);
        }
      })
    ]);
  }, []);

  const folders = useMemo(() => {
    const courseMap = new Map<string, number>();
    questions.forEach((q) => {
      const key = q.courseCode || "Uncategorized";
      if (hiddenFolders.includes(key)) return;
      courseMap.set(key, (courseMap.get(key) || 0) + 1);
    });
    const systemFolders = Array.from(courseMap.entries()).map(([name, count]) => ({ name, count }));
    const merged = [...systemFolders, ...customFolders.filter((f) => !hiddenFolders.includes(f.name))];
    return merged.map((f) => ({ ...f, label: resolveFolderName(f.name) }));
  }, [questions, customFolders, hiddenFolders, folderAliases]);

  const filtered = useMemo(() => {
    let list = questions.filter((q) => !hiddenFolders.includes(q.courseCode || "Uncategorized"));
    if (activeFolder) list = list.filter((q) => (q.courseCode || "Uncategorized") === activeFolder);
    if (typeFilter !== "All") list = list.filter((q) => q.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (item) =>
          item.text.toLowerCase().includes(q) ||
          (item.courseCode ?? "").toLowerCase().includes(q) ||
          (item.examTitle ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [questions, search, typeFilter, activeFolder, hiddenFolders]);

  const exportFolderCsv = (folderKey: string) => {
    const rows = questions.filter((q) => (q.courseCode || "Uncategorized") === folderKey);
    const header = "type,course,exam,points,text,correctAnswer,options";
    const csvRows = rows.map((q) => {
      const safe = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
      return [
        safe(q.type),
        safe(q.courseCode || "Uncategorized"),
        safe(q.examTitle || ""),
        String(q.points ?? 0),
        safe(q.text || ""),
        safe(q.correctAnswer || ""),
        safe((q.options || []).join(" | "))
      ].join(",");
    });
    const blob = new Blob([[header, ...csvRows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${resolveFolderName(folderKey).replace(/[^a-z0-9-_ ]/gi, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    pushToast("Folder exported as CSV.", "success");
  };

  const renameFolder = (folderKey: string) => {
    const current = resolveFolderName(folderKey);
    const next = window.prompt("Rename folder", current)?.trim();
    if (!next || next === current) return;
    setFolderAliases((prev) => ({ ...prev, [folderKey]: next }));
    pushToast("Folder renamed.", "success");
  };

  const deleteFolder = (folderKey: string) => {
    const confirmed = window.confirm(`Delete folder "${resolveFolderName(folderKey)}" from this view?`);
    if (!confirmed) return;
    setHiddenFolders((prev) => (prev.includes(folderKey) ? prev : [...prev, folderKey]));
    if (activeFolder === folderKey) {
      setActiveFolder(null);
    }
    pushToast("Folder removed from view.", "success");
  };

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Question Bank</h1>
        <button className="btn btn-primary" onClick={() => setShowNewFolder(true)}>
          <IconPlus /> New Folder
        </button>
      </div>

      <div className="card stack gap-2">
        <label className="form-label">Target exam for “Add to Exam”</label>
        <select className="form-select" value={targetExamId} onChange={(e) => setTargetExamId(e.target.value)}>
          {exams.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.title} ({exam.courseCode || "No course"})
            </option>
          ))}
          {exams.length === 0 && <option value="">No exams available</option>}
        </select>
      </div>

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
                  <div style={{ fontWeight: 600, fontSize: "14px" }}>{folder.label}</div>
                  <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{folder.count} questions</div>
                </div>
              </div>
              <DropdownMenu items={[
                { label: "Rename", icon: <IconEdit />, onClick: () => renameFolder(folder.name) },
                { label: "Export CSV", icon: <IconCopy />, onClick: () => exportFolderCsv(folder.name) },
                { label: "", divider: true, onClick: () => {} },
                { label: "Delete", icon: <IconTrash />, danger: true, onClick: () => deleteFolder(folder.name) }
              ]} />
            </div>
          </div>
        ))}
        {folders.length === 0 && (
          <div className="card" style={{ gridColumn: "1/-1", textAlign: "center", padding: "40px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>No saved questions</h3>
            <p style={{ color: "var(--text-tertiary)" }}>Questions approved during exam creation appear here.</p>
          </div>
        )}
      </div>
      {activeFolder ? (
        <div className="row-between" style={{ marginTop: "-8px" }}>
          <div className="badge badge-info">Folder: {resolveFolderName(activeFolder)}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveFolder(null)}>Clear Folder Filter</button>
        </div>
      ) : null}

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

      <div className="card">
        {filtered.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)", textAlign: "center", padding: "24px" }}>
            {loading ? "Loading questions..." : "No questions match your search."}
          </p>
        ) : (
          <div className="stack gap-2">
            {filtered.map((q) => (
              <div key={q.id} className="review-card">
                <div className="row-between">
                  <div className="row gap-2">
                    <span className="badge badge-info">{q.type}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>{q.courseCode} · {q.examTitle}</span>
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
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginLeft: "8px" }}
                    onClick={async () => {
                      if (!targetExamId) {
                        pushToast("Select a target exam first.", "warning");
                        return;
                      }
                      try {
                        await duplicateQuestionToExamRequest(q.id, targetExamId);
                        pushToast("Question duplicated to selected exam.", "success");
                      } catch (err) {
                        pushToast(err instanceof Error ? err.message : "Failed to duplicate question.", "error");
                      }
                    }}
                  >
                    Add to Exam
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
              <button className="btn btn-primary" onClick={() => {
                const cleanName = folderName.trim();
                if (!cleanName) {
                  pushToast("Folder name is required.", "warning");
                  return;
                }
                if (folders.some((f) => f.name.toLowerCase() === cleanName.toLowerCase())) {
                  pushToast("Folder already exists.", "warning");
                  return;
                }
                setCustomFolders((prev) => [...prev, { name: cleanName, count: 0 }]);
                setFolderName("");
                setShowNewFolder(false);
                pushToast("Folder created.", "success");
              }}>Create</button>
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
                onClick={async () => {
                  try {
                    await updateQuestionRequest(editingId, {
                      text: editingText,
                      points: editingPoints,
                      options: editingOptions,
                      correctAnswer: editingAnswer
                    });
                    await loadQuestionBank({
                      status: "Approved",
                      course: activeFolder ?? undefined,
                      type: typeFilter === "All" ? undefined : typeFilter,
                      q: search.trim() ? search : undefined
                    });
                    pushToast("Question updated.", "success");
                    setEditingId(null);
                  } catch (err) {
                    pushToast(err instanceof Error ? err.message : "Failed to update question.", "error");
                  }
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
