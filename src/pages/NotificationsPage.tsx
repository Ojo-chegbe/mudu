import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  tone: "info" | "success" | "warning" | "error";
  actionLabel?: string;
  actionTo?: string;
};

function toneBadge(tone: NotificationItem["tone"]) {
  if (tone === "success") return "badge-success";
  if (tone === "warning") return "badge-warning";
  if (tone === "error") return "badge-error";
  return "badge-info";
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const exams = useAppStore((s) => s.exams);
  const sessions = useAppStore((s) => s.sessions);
  const syncItems = useAppStore((s) => s.syncItems);
  const toasts = useAppStore((s) => s.toasts);

  const [filter, setFilter] = useState<"All" | "Action Needed" | "Updates">("All");
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  const notifications = useMemo<NotificationItem[]>(() => {
    const list: NotificationItem[] = [];

    syncItems.forEach((item) => {
      if (item.status === "Error") {
        list.push({
          id: `sync-error-${item.id}`,
          title: "Sync Failed",
          message: `${item.examTitle} failed to sync${item.error ? `: ${item.error}` : "."}`,
          tone: "error",
          actionLabel: "Open Results",
          actionTo: "/results"
        });
      }
      if (item.status === "Pending") {
        list.push({
          id: `sync-pending-${item.id}`,
          title: "Pending Sync",
          message: `${item.examTitle} is waiting to sync.`,
          tone: "warning",
          actionLabel: "Open Results",
          actionTo: "/results"
        });
      }
    });

    const flagged = sessions.filter((s) => s.flags > 0);
    if (flagged.length > 0) {
      list.push({
        id: "flagged-students",
        title: "Flagged Students Detected",
        message: `${flagged.length} student session(s) have active flags in the current exam.`,
        tone: "warning",
        actionLabel: "Open Monitoring",
        actionTo: "/monitor"
      });
    }

    const disconnected = sessions.filter((s) => s.status === "Disconnected");
    if (disconnected.length > 0) {
      list.push({
        id: "disconnected-students",
        title: "Student Disconnects",
        message: `${disconnected.length} student session(s) are disconnected.`,
        tone: "warning",
        actionLabel: "Open Monitoring",
        actionTo: "/monitor"
      });
    }

    const running = exams.filter((e) => e.status === "Running");
    if (running.length > 0) {
      list.push({
        id: "running-exams",
        title: "Exams In Progress",
        message: `${running.length} exam(s) are currently running.`,
        tone: "info",
        actionLabel: "Open Home",
        actionTo: "/"
      });
    }

    const recentToast = toasts.slice(-3).map((toast) => ({
      id: `toast-${toast.id}`,
      title: "Recent Activity",
      message: toast.message,
      tone: toast.tone === "neutral" ? "info" : toast.tone
    }));
    list.push(...recentToast);

    return list;
  }, [exams, sessions, syncItems, toasts]);

  const filtered = notifications
    .filter((n) => !dismissedIds.includes(n.id))
    .filter((n) => {
      if (filter === "All") return true;
      if (filter === "Action Needed") return n.tone === "warning" || n.tone === "error";
      return n.tone === "info" || n.tone === "success";
    });

  return (
    <div className="stack gap-6">
      <div className="page-header">
        <h1 className="page-title">Notifications</h1>
      </div>

      <div className="card row-between row-wrap" style={{ gap: "12px" }}>
        <div className="tabs" style={{ border: "none" }}>
          {(["All", "Action Needed", "Updates"] as const).map((tab) => (
            <button key={tab} className={`tab${filter === tab ? " active" : ""}`} onClick={() => setFilter(tab)}>
              {tab}
            </button>
          ))}
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setDismissedIds([])}>Reset Dismissed</button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>No notifications</h3>
            <p style={{ color: "var(--text-tertiary)" }}>You're all caught up.</p>
          </div>
        ) : (
          <div className="stack gap-3">
            {filtered.map((n) => (
              <div key={n.id} className="review-card">
                <div className="row-between">
                  <div className="row gap-2">
                    <span className={`badge ${toneBadge(n.tone)}`}>{n.title}</span>
                    <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>Just now</span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDismissedIds((prev) => [...prev, n.id])}
                  >
                    Dismiss
                  </button>
                </div>
                <p style={{ fontSize: "14px" }}>{n.message}</p>
                {n.actionTo && n.actionLabel ? (
                  <div className="row">
                    <button className="btn btn-secondary btn-sm" onClick={() => n.actionTo && navigate(n.actionTo)}>
                      {n.actionLabel}
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
