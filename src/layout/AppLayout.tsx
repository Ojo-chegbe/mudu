import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  IconBell,
  IconChevronRight,
  IconCopy,
  IconCourses,
  IconDocs,
  IconHome,
  IconQuestionBank,
  IconSearch,
  IconSettings,
  IconSidebarCollapse,
  IconStudents
} from "../components/Icons";
import { fetchDashboardRequest, fetchExamSessionsRequest, fetchExamsRequest, fetchSyncStatusRequest } from "../api/client";
import { useAppStore } from "../store/useAppStore";

const mainNav = [
  { to: "/", icon: IconHome, label: "Home" },
  { to: "/question-bank", icon: IconQuestionBank, label: "Question bank" },
  { to: "/courses", icon: IconCourses, label: "Courses" },
  { to: "/students", icon: IconStudents, label: "Students" }
];

const footerNav = [
  { to: "/settings", icon: IconSettings, label: "Settings" },
  { to: "/docs", icon: IconDocs, label: "Docs and guide" }
];

const breadcrumbMap: Record<string, string[]> = {
  "/": ["Home"],
  "/exams/new": ["Home", "Create Exam"],
  "/question-bank": ["Question bank"],
  "/courses": ["Courses"],
  "/students": ["Students"],
  "/settings": ["Settings"],
  "/docs": ["Docs and guide"],
  "/notifications": ["Notifications"],
  "/launch": ["Home", "Launch Exam"],
  "/monitor": ["Home", "Live Monitoring"],
  "/results": ["Home", "Results"]
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const crumbs = breadcrumbMap[location.pathname] || ["Home"];
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toasts = useAppStore((s) => s.toasts);
  const [backendNotificationCount, setBackendNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotificationCount() {
      try {
        const [dashboard, syncStatus, exams] = await Promise.all([
          fetchDashboardRequest(),
          fetchSyncStatusRequest(),
          fetchExamsRequest()
        ]);

        const runningExams = exams.filter((exam) => exam.status === "Running" || exam.status === "Active");
        const sessions = (
          await Promise.all(
            runningExams.map((exam) =>
              fetchExamSessionsRequest(exam.id).catch(() => [])
            )
          )
        ).flat();

        const unsyncedMetric = dashboard.metrics.find((metric) => metric.label === "Unsynced Exams");
        const unsyncedCount = Number(unsyncedMetric?.value ?? 0);
        const flaggedCount = sessions.filter((session) => session.flags > 0).length;
        const disconnectedCount = sessions.filter((session) => session.status === "Disconnected").length;
        const syncDeferredCount = syncStatus.cloudSyncDeferred ? 1 : 0;

        if (!cancelled) {
          setBackendNotificationCount(
            unsyncedCount + flaggedCount + disconnectedCount + runningExams.length + syncDeferredCount
          );
        }
      } catch {
        if (!cancelled) {
          setBackendNotificationCount(0);
        }
      }
    }

    void loadNotificationCount();
    const interval = window.setInterval(() => void loadNotificationCount(), 30000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const recentActivity = toasts.length;
  const notificationCount = backendNotificationCount + recentActivity;

  return (
    <div className={`app-shell${sidebarCollapsed ? " collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          {!sidebarCollapsed && <span className="sidebar-logo">Mudu</span>}
          <button className="sidebar-copy-btn" onClick={toggleSidebar} title="Collapse Sidebar">
            <IconSidebarCollapse />
          </button>
        </div>

        <nav className="sidebar-nav">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon />
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {footerNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon />
              {!sidebarCollapsed && item.label}
            </NavLink>
          ))}
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-inner">
            <div className="breadcrumbs">
              {crumbs.map((crumb, i) => {
                const isLast = i === crumbs.length - 1;
                return (
                  <span key={i} className="row gap-2">
                    {i > 0 && <IconChevronRight />}
                    {isLast ? (
                      <span className="breadcrumb-active">{crumb}</span>
                    ) : crumb === "Home" ? (
                      <NavLink to="/" style={{ textDecoration: "none" }}>{crumb}</NavLink>
                    ) : (
                      <span>{crumb}</span>
                    )}
                  </span>
                );
              })}
            </div>

            <div className="topbar-actions">
              <div className="search-box">
                <IconSearch />
                <input placeholder="Search exams, students, or questions..." />
              </div>
              <button className="notif-btn" title="Notifications" onClick={() => navigate("/notifications")}>
                <IconBell />
                {notificationCount > 0 && (
                  <span className="notif-count">{notificationCount > 99 ? "99+" : notificationCount}</span>
                )}
              </button>
            </div>
          </div>
        </header>

        <main className="page-content" id="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
