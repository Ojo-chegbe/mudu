import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch, IconPlus } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import type { Exam } from "../types";

/* ── Build courses from exams ── */
type Course = {
  code: string;
  exams: Exam[];
  totalQuestions: number;
  students: number;
  lastActivity: string;
};

function buildCourses(exams: Exam[], rosters: ReturnType<typeof useAppStore.getState>["rosters"]): Course[] {
  const map = new Map<string, Exam[]>();
  for (const exam of exams) {
    const code = exam.courseCode || "Uncategorized";
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(exam);
  }

  return Array.from(map.entries()).map(([code, courseExams]) => {
    const totalQuestions = courseExams.reduce((sum, e) => sum + e.questions.length, 0);
    const rosterIds = new Set(courseExams.map(e => e.rosterId));
    const students = rosters.filter(r => rosterIds.has(r.id)).reduce((sum, r) => sum + r.students.length, 0);
    const lastActivity = courseExams
      .map(e => e.createdAt)
      .sort()
      .pop() || "";

    return { code, exams: courseExams, totalQuestions, students, lastActivity };
  });
}

/* ── Status pill ── */
function StatusPill({ status }: { status: Exam["status"] }) {
  const cls = status === "Draft" ? "badge-draft"
    : status === "Published" ? "badge-info"
    : status === "Running" ? "badge-success"
    : status === "Completed" ? "badge-neutral"
    : "badge-warning";
  return <span className={`badge ${cls}`}>{status}</span>;
}

/* ── Course Card ── */
function CourseCard({ course, onSelect }: { course: Course; onSelect: () => void }) {
  const upcoming = course.exams.filter(e => ["Draft", "Published", "Running"].includes(e.status)).length;
  const completed = course.exams.filter(e => ["Completed", "Archived"].includes(e.status)).length;

  return (
    <div className="course-card" onClick={onSelect}>
      <div className="course-card-header">
        <span className="course-code-pill">{course.code}</span>
        <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
          {course.exams.length} exam{course.exams.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="course-card-stats">
        <div className="course-stat">
          <span className="course-stat-value">{course.totalQuestions}</span>
          <span className="course-stat-label">Questions</span>
        </div>
        <div className="course-stat">
          <span className="course-stat-value">{course.students}</span>
          <span className="course-stat-label">Students</span>
        </div>
        <div className="course-stat">
          <span className="course-stat-value">{upcoming}</span>
          <span className="course-stat-label">Upcoming</span>
        </div>
        <div className="course-stat">
          <span className="course-stat-value">{completed}</span>
          <span className="course-stat-label">Completed</span>
        </div>
      </div>

      <div className="course-card-exams">
        {course.exams.slice(0, 3).map(exam => (
          <div key={exam.id} className="course-exam-row">
            <span className="course-exam-title">{exam.title}</span>
            <StatusPill status={exam.status} />
          </div>
        ))}
        {course.exams.length > 3 && (
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
            +{course.exams.length - 3} more
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Course Detail Panel ── */
function CourseDetail({ course, onBack }: { course: Course; onBack: () => void }) {
  const navigate = useNavigate();

  return (
    <div className="stack gap-4">
      <div className="row-between">
        <div className="row gap-3">
          <button className="btn btn-secondary btn-sm" onClick={onBack}>← Back</button>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>{course.code}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/exams/new")}>
          <IconPlus /> New Exam
        </button>
      </div>

      {/* Stats row */}
      <div className="grid-4">
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-4)" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>{course.exams.length}</div>
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Total Exams</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-4)" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>{course.totalQuestions}</div>
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Questions</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-4)" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-primary)" }}>{course.students}</div>
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Students</div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-4)" }}>
          <div style={{ fontSize: "24px", fontWeight: 700, color: "var(--color-success)" }}>
            {course.exams.filter(e => e.status === "Completed").length}
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>Completed</div>
        </div>
      </div>

      {/* Exams table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "var(--sp-4) var(--sp-5)" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600 }}>All Exams</h3>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Date</th>
              <th>Duration</th>
              <th>Questions</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {course.exams.map(exam => {
              const formattedDate = exam.date
                ? new Date(exam.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "—";
              return (
                <tr key={exam.id} className="table-row-hover">
                  <td style={{ fontWeight: 500 }}>{exam.title}</td>
                  <td>{formattedDate}</td>
                  <td>{exam.durationMinutes} min</td>
                  <td>{exam.questions.length}</td>
                  <td><StatusPill status={exam.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main Export ── */
export function CoursesPage() {
  const exams = useAppStore((s) => s.exams);
  const rosters = useAppStore((s) => s.rosters);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const courses = buildCourses(exams, rosters);
  const filtered = search.trim()
    ? courses.filter(c => c.code.toLowerCase().includes(search.toLowerCase()))
    : courses;

  const selectedCourse = selectedCode ? courses.find(c => c.code === selectedCode) : null;

  if (selectedCourse) {
    return <CourseDetail course={selectedCourse} onBack={() => setSelectedCode(null)} />;
  }

  return (
    <div className="stack gap-6">
      <div className="row-between">
        <div>
          <h1 className="page-title">Courses</h1>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            {courses.length} course{courses.length !== 1 ? "s" : ""} across {exams.length} exam{exams.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/exams/new")}>
          <IconPlus /> New Exam
        </button>
      </div>

      {/* Search */}
      <div className="search-box" style={{ maxWidth: "360px" }}>
        <IconSearch />
        <input
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Course grid */}
      {filtered.length > 0 ? (
        <div className="grid-3">
          {filtered.map(course => (
            <CourseCard key={course.code} course={course} onSelect={() => setSelectedCode(course.code)} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "var(--sp-10)" }}>
          <p style={{ color: "var(--text-tertiary)", fontSize: "15px" }}>
            {search ? "No courses match your search." : "No courses yet. Create an exam to get started."}
          </p>
        </div>
      )}
    </div>
  );
}
