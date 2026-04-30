import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownMenu } from "../components/DropdownMenu";
import { IconPlus, IconEdit, IconCopy, IconDownload, IconArchive, IconTrash, IconCalendar, IconHistoryClock, IconRocket } from "../components/Icons";
import { useAppStore } from "../store/useAppStore";
import type { Exam } from "../types";

/* ── Empty State ── */
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="card">
      <div className="empty-state">
        <div className="empty-state-content">
          <h2 className="empty-state-title">You haven't created an exam yet.</h2>
          <p className="empty-state-text">Here's how to get your first one ready.</p>
          <button className="btn btn-primary btn-lg" onClick={onCreate}>
            <IconPlus /> Create my first exam
          </button>
        </div>

        <div className="onboard-cards">
          <div className="onboard-card">
            <div className="onboard-card-title">Add your questions</div>
            <div className="onboard-card-text">Generate questions with AI or write them yourself.</div>
          </div>
          <div className="onboard-card">
            <div className="onboard-card-title">Fill in the details</div>
            <div className="onboard-card-text">Set a title, duration, and passing score.</div>
          </div>
          <div className="onboard-card">
            <div className="onboard-card-title">Register students</div>
            <div className="onboard-card-text">Import a CSV roster or share a registration link.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── No Results State ── */
function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
      <h3 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>No exams found</h3>
      <p style={{ color: "var(--text-tertiary)", marginBottom: "16px" }}>Try adjusting your search or filter.</p>
      <button className="btn btn-secondary" onClick={onClear}>Clear search</button>
    </div>
  );
}

/* ── Sync Badge ── */
function SyncBadge({ status }: { status: "progress" | "done" | "failed" }) {
  if (status === "progress") {
    return (
      <div className="sync-badge progress">
        <svg width="24" height="24" viewBox="20 21 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M28.7038 31.5684L28.477 31.4633L28.7038 31.5684ZM35.2962 31.5684L35.523 31.4633L35.2962 31.5684ZM30.294 31.7167C30.294 31.5786 30.1821 31.4667 30.044 31.4667C29.9059 31.4667 29.794 31.5786 29.794 31.7167H30.044H30.294ZM30.044 32.9417H29.794C29.794 33.0797 29.9059 33.1917 30.044 33.1917V32.9417ZM31.3079 33.1917C31.4459 33.1917 31.5579 33.0797 31.5579 32.9417C31.5579 32.8036 31.4459 32.6917 31.3079 32.6917V32.9417V33.1917ZM34.4282 34.9833C34.4282 35.1214 34.5402 35.2333 34.6782 35.2333C34.8163 35.2333 34.9282 35.1214 34.9282 34.9833H34.6782H34.4282ZM34.6782 33.7583H34.9282C34.9282 33.6203 34.8163 33.5083 34.6782 33.5083V33.7583ZM33.4144 33.5083C33.2763 33.5083 33.1644 33.6203 33.1644 33.7583C33.1644 33.8964 33.2763 34.0083 33.4144 34.0083V33.7583V33.5083ZM33.9147 32.8232C33.962 32.9529 34.1056 33.0197 34.2353 32.9723C34.365 32.925 34.4317 32.7815 34.3844 32.6518L34.1495 32.7375L33.9147 32.8232ZM31.0214 32.0515L31.1898 32.2364L31.1954 32.231L31.0214 32.0515ZM33.7008 34.6485L33.5324 34.4636L33.5268 34.469L33.7008 34.6485ZM30.8075 33.8768C30.7602 33.7471 30.6167 33.6803 30.487 33.7277C30.3573 33.775 30.2905 33.9185 30.3379 34.0482L30.5727 33.9625L30.8075 33.8768ZM38.5 34.4H38.25C38.25 35.4144 37.3993 36.25 36.3333 36.25V36.5V36.75C37.6606 36.75 38.75 35.7052 38.75 34.4H38.5ZM36.3333 32.3V32.55C37.3993 32.55 38.25 33.3856 38.25 34.4H38.5H38.75C38.75 33.0948 37.6606 32.05 36.3333 32.05V32.3ZM35.2962 31.5684L35.523 31.4633C34.9177 30.156 33.5658 29.25 32 29.25V29.5V29.75C33.3705 29.75 34.5456 30.5424 35.0693 31.6734L35.2962 31.5684ZM32 29.5V29.25C30.4342 29.25 29.0823 30.156 28.477 31.4633L28.7038 31.5684L28.9307 31.6734C29.4544 30.5424 30.6295 29.75 32 29.75V29.5ZM27.6667 32.3V32.05C26.3394 32.05 25.25 33.0948 25.25 34.4H25.5H25.75C25.75 33.3856 26.6007 32.55 27.6667 32.55V32.3ZM25.5 34.4H25.25C25.25 35.7052 26.3394 36.75 27.6667 36.75V36.5V36.25C26.6007 36.25 25.75 35.4144 25.75 34.4H25.5ZM28.7038 31.5684L28.477 31.4633C28.3165 31.8099 28.0056 32.05 27.6667 32.05V32.3V32.55C28.2522 32.55 28.7126 32.1444 28.9307 31.6734L28.7038 31.5684ZM36.3333 32.3V32.05C35.9944 32.05 35.6835 31.8099 35.523 31.4633L35.2962 31.5684L35.0693 31.6734C35.2874 32.1444 35.7478 32.55 36.3333 32.55V32.3ZM36.3333 36.5V36.25H27.6667V36.5V36.75H36.3333V36.5ZM30.044 31.7167H29.794V32.9417H30.044H30.294V31.7167H30.044ZM30.044 32.9417V33.1917H31.3079V32.9417V32.6917H30.044V32.9417ZM34.6782 34.9833H34.9282V33.7583H34.6782H34.4282V34.9833H34.6782ZM34.6782 33.7583V33.5083H33.4144V33.7583V34.0083H34.6782V33.7583ZM34.1495 32.7375L34.3844 32.6518C34.2627 32.3184 34.0561 32.0213 33.7849 31.7877L33.6217 31.9771L33.4586 32.1665C33.6661 32.3452 33.8227 32.5713 33.9147 32.8232L34.1495 32.7375ZM33.6217 31.9771L33.7849 31.7877C33.5137 31.554 33.1866 31.3914 32.8342 31.3141L32.7807 31.5583L32.7271 31.8025C32.9995 31.8622 33.251 31.9877 33.4586 32.1665L33.6217 31.9771ZM32.7807 31.5583L32.8342 31.3141C32.4819 31.2368 32.1151 31.2473 31.768 31.3446L31.8355 31.5853L31.903 31.8261C32.1711 31.7509 32.4547 31.7428 32.7271 31.8025L32.7807 31.5583ZM31.8355 31.5853L31.768 31.3446C31.4209 31.4419 31.104 31.6231 30.8474 31.872L31.0214 32.0515L31.1954 32.231C31.3915 32.0408 31.6349 31.9012 31.903 31.8261L31.8355 31.5853ZM31.0214 32.0515L30.8531 31.8667L29.8756 32.7568L30.044 32.9417L30.2123 33.1265L31.1897 32.2363L31.0214 32.0515ZM34.6782 33.7583L34.5099 33.5735L33.5325 34.4637L33.7008 34.6485L33.8692 34.8333L34.8466 33.9432L34.6782 33.7583ZM33.7008 34.6485L33.5268 34.469C33.3307 34.6592 33.0874 34.7988 32.8192 34.8739L32.8867 35.1147L32.9542 35.3554C33.3014 35.2581 33.6182 35.0769 33.8749 34.828L33.7008 34.6485ZM32.8867 35.1147L32.8192 34.8739C32.5511 34.9491 32.2675 34.9572 31.9951 34.8975L31.9416 35.1417L31.888 35.3859C32.2403 35.4632 32.6071 35.4527 32.9542 35.3554L32.8867 35.1147ZM31.9416 35.1417L31.9951 34.8975C31.7228 34.8378 31.4712 34.7123 31.2636 34.5335L31.1005 34.7229L30.9373 34.9123C31.2085 35.146 31.5356 35.3086 31.888 35.3859L31.9416 35.1417ZM31.1005 34.7229L31.2636 34.5335C31.0562 34.3548 30.8995 34.1287 30.8075 33.8768L30.5727 33.9625L30.3379 34.0482C30.4596 34.3816 30.6661 34.6787 30.9373 34.9123L31.1005 34.7229Z" fill="#FF8000"/>
        </svg>
        <span>Sync in progress</span>
      </div>
    );
  }
  if (status === "done") {
    return (
      <div className="sync-badge done">
        <svg width="24" height="24" viewBox="48 21 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M57.8333 33.6364L58.9444 34.4L61.4444 31.6M60 29.5C61.4679 29.5 62.731 30.349 63.2956 31.568C63.485 31.9769 63.8708 32.3 64.3333 32.3C65.53 32.3 66.5 33.2402 66.5 34.4C66.5 35.5598 65.53 36.5 64.3333 36.5H55.6667C54.47 36.5 53.5 35.5598 53.5 34.4C53.5 33.2402 54.47 32.3 55.6667 32.3C56.1292 32.3 56.515 31.9769 56.7044 31.568C57.269 30.349 58.5321 29.5 60 29.5Z" stroke="#008620" strokeWidth="1"/>
        </svg>
        <span>Sync done</span>
      </div>
    );
  }
  return (
    <div className="sync-badge failed">
      <svg width="24" height="24" viewBox="76 20 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M88 28.75C89.3701 28.75 90.5445 29.5422 91.0684 30.6729C91.2865 31.1439 91.7474 31.5497 92.333 31.5498C93.399 31.5498 94.25 32.386 94.25 33.4004C94.2498 34.4146 93.3988 35.25 92.333 35.25H83.667C82.6012 35.25 81.7502 34.4146 81.75 33.4004C81.75 32.386 82.601 31.5498 83.667 31.5498C84.2526 31.5497 84.7135 31.1439 84.9316 30.6729C85.4555 29.5422 86.6299 28.75 88 28.75ZM89.2705 30.4209L88 31.6514L86.7295 30.4209L86.5498 30.2461L86.2021 30.6055L86.3818 30.7793L87.6406 32L86.3818 33.2207L86.2021 33.3945L86.5498 33.7539L86.7295 33.5791L88 32.3477L89.2705 33.5791L89.4502 33.7539L89.7979 33.3945L89.6182 33.2207L88.3584 32L89.6182 30.7793L89.7979 30.6055L89.4502 30.2461L89.2705 30.4209Z" stroke="#C30000" strokeWidth="1" strokeLinecap="square" strokeLinejoin="round"/>
      </svg>
      <span>Failed to sync</span>
    </div>
  );
}

/* ── Upcoming Exam Card ── */
function UpcomingExamCard({ exam }: { exam: Exam }) {
  const askConfirm = useAppStore((s) => s.askConfirm);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const archiveExam = useAppStore((s) => s.archiveExam);
  const navigate = useNavigate();

  const menuItems = [
    { label: "Launch", icon: <IconPlus />, onClick: () => navigate("/launch") },
    { label: "Edit", icon: <IconEdit />, onClick: () => navigate("/exams/new") },
    { label: "Duplicate", icon: <IconCopy />, onClick: () => {} },
    { label: "", icon: undefined, divider: true, onClick: () => {}, danger: false },
    { label: "Delete", icon: <IconTrash />, danger: true, onClick: () =>
      askConfirm({
        title: `Delete "${exam.title}"?`,
        description: "This action cannot be undone. All exam data will be permanently removed.",
        confirmLabel: "Delete",
        tone: "danger" as const,
        onConfirm: () => deleteExam(exam.id),
      })
    },
  ];

  // Formatting date properly
  const formattedDate = exam.date 
    ? new Date(exam.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : new Date(exam.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="home-card">
      <div className="home-card-header row-between">
        <div className="course-code-pill">{exam.courseCode || "No course"}</div>
        <DropdownMenu items={menuItems} />
      </div>
      <div className="home-card-title">{exam.title}</div>
      <div className="home-card-date">
        <IconCalendar /> {formattedDate}
      </div>
      <div className="home-card-divider" />
      <div className="home-card-footer row-between">
        <div className="row gap-3">
          <span>98 students registered</span>
          <span style={{ color: "var(--border-default)" }}>•</span>
          <span>{exam.questions.length} questions</span>
        </div>
        <button className="btn btn-primary btn-icon" onClick={() => navigate("/launch")}>
          <IconRocket />
        </button>
      </div>
    </div>
  );
}

/* ── Recent Exam Card ── */
function RecentExamCard({ exam }: { exam: Exam }) {
  const askConfirm = useAppStore((s) => s.askConfirm);
  const deleteExam = useAppStore((s) => s.deleteExam);
  const archiveExam = useAppStore((s) => s.archiveExam);
  const navigate = useNavigate();

  // Results, Duplicate, Delete
  const menuItems = [
    { label: "Results", icon: <IconArchive />, onClick: () => navigate("/results") },
    { label: "Duplicate", icon: <IconCopy />, onClick: () => {} },
    { label: "", icon: undefined, divider: true, onClick: () => {}, danger: false },
    { label: "Delete", icon: <IconTrash />, danger: true, onClick: () =>
      askConfirm({
        title: `Delete "${exam.title}"?`,
        description: "This action cannot be undone. All exam data will be permanently removed.",
        confirmLabel: "Delete",
        tone: "danger" as const,
        onConfirm: () => deleteExam(exam.id),
      })
    },
  ];

  const formattedDate = exam.date 
    ? new Date(exam.date).toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : new Date(exam.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // Mocking status to show different sync states
  let syncStatus: "progress" | "done" | "failed" = "done";
  if (exam.status === "Archived") syncStatus = "failed";
  else if (exam.status === "Running") syncStatus = "progress";

  return (
    <div className="home-card">
      <div className="home-card-header row-between">
        <div className="course-code-pill">{exam.courseCode || "No course"}</div>
        <DropdownMenu items={menuItems} />
      </div>
      <div className="home-card-title">{exam.title}</div>
      <div className="home-card-date">
        <IconHistoryClock /> Ended {formattedDate}
      </div>
      <div className="home-card-divider" />
      <div className="row-between" style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
        <span>198/200 students submitted</span>
        <SyncBadge status={syncStatus} />
      </div>
    </div>
  );
}

/* ── Sort/Filter Controls ── */
type SortBy = "date" | "name" | "status";
type FilterBy = "All" | Exam["status"];

/* ── Home Page ── */
export function HomePage() {
  const exams = useAppStore((s) => s.exams);
  const lecturerName = useAppStore((s) => s.lecturerName);
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [filterBy, setFilterBy] = useState<FilterBy>("All");

  const filtered = useMemo(() => {
    let list = [...exams];

    if (filterBy !== "All") {
      list = list.filter((e) => e.status === filterBy);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.title.toLowerCase().includes(q) || e.courseCode.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "name") return a.title.localeCompare(b.title);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [exams, search, sortBy, filterBy]);

  const hasExams = exams.length > 0;

  // Split into Upcoming (Draft, Published, Running) and Recent (Completed, Archived)
  const upcomingExams = filtered.filter(e => ["Draft", "Published", "Running"].includes(e.status));
  const recentExams = filtered.filter(e => ["Completed", "Archived"].includes(e.status));

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-greeting">Welcome back,</div>
          <h1 className="page-title">{lecturerName || "Dr. Chukwudi"}</h1>
        </div>
        {hasExams && (
          <button className="btn btn-primary" onClick={() => navigate("/exams/new")}>
            <IconPlus /> Create a new test
          </button>
        )}
      </div>

      {!hasExams && <EmptyState onCreate={() => navigate("/exams/new")} />}

      {hasExams && (
        <div className="stack gap-6">
          <div className="card" style={{ padding: "12px 16px" }}>
            <div className="row-between row-wrap" style={{ gap: "12px" }}>
              <div className="search-box" style={{ flex: 1, maxWidth: "400px", minWidth: "200px" }}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  placeholder="Search exams..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="row gap-2">
                <select
                  className="form-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  style={{ height: "36px" }}
                >
                  <option value="date">Sort by: Date</option>
                  <option value="name">Sort by: Name</option>
                  <option value="status">Sort by: Status</option>
                </select>
                <select
                  className="form-select"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterBy)}
                  style={{ height: "36px" }}
                >
                  <option value="All">All Exams</option>
                  <option value="Draft">Draft</option>
                  <option value="Published">Published</option>
                  <option value="Running">Running</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <NoResults onClear={() => { setSearch(""); setFilterBy("All"); }} />
          ) : (
            <div className="stack gap-6">
              {/* Upcoming Tests Section */}
              {upcomingExams.length > 0 && (
                <div className="card-flat">
                  <div className="home-section-header">
                    <div className="home-section-title">
                      Upcoming tests <span className="home-section-count">{upcomingExams.length}</span>
                    </div>
                    <button className="home-section-see-all">See all</button>
                  </div>
                  <div className="grid-3">
                    {upcomingExams.map(exam => <UpcomingExamCard key={exam.id} exam={exam} />)}
                  </div>
                </div>
              )}

              {/* Recent Tests Section */}
              {recentExams.length > 0 && (
                <div className="card-flat">
                  <div className="home-section-header">
                    <div className="home-section-title">
                      Recent tests <span className="home-section-count">{recentExams.length}</span>
                    </div>
                    <button className="home-section-see-all">See all</button>
                  </div>
                  <div className="grid-3">
                    {recentExams.map(exam => <RecentExamCard key={exam.id} exam={exam} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
