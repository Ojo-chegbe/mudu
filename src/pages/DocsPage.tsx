export function DocsPage() {
  const sections = [
    { id: "getting-started", title: "Getting Started" },
    { id: "home", title: "Home Dashboard" },
    { id: "create-exam", title: "Create Exam" },
    { id: "question-bank", title: "Question Bank" },
    { id: "rosters", title: "Student Rosters" },
    { id: "launch", title: "Exam Launch" },
    { id: "monitor", title: "Live Monitoring" },
    { id: "results", title: "Results & Analytics" },
    { id: "settings", title: "Settings" },
    { id: "student-flow", title: "Student Experience" },
    { id: "best-practices", title: "Best Practices" }
  ];

  return (
    <div className="stack gap-6" style={{ position: "relative" }}>
      <div style={{ 
        position: "sticky", 
        top: "-24px", 
        background: "var(--surface-page)", 
        zIndex: 15, 
        margin: "0 -24px", 
        padding: "16px 24px 12px",
        borderBottom: "1px solid var(--border-light)"
      }}>
        <div className="page-header" style={{ marginBottom: "12px", padding: 0, border: 0 }}>
          <div>
            <div className="page-greeting">Documentation</div>
            <h1 className="page-title">Docs & Guide for Lecturers</h1>
          </div>
        </div>

        <div className="segment-control" style={{ 
          maxWidth: "100%", 
          overflowX: "auto", 
          scrollbarWidth: "none", 
          msOverflowStyle: "none",
          background: "var(--gray-50)",
          border: "1px solid var(--border-default)",
          display: "flex",
          whiteSpace: "nowrap"
        }}>
          {sections.map((item) => (
            <a 
              key={item.id} 
              href={`#${item.id}`} 
              className="segment-button"
              style={{ 
                textDecoration: "none", 
                color: "inherit",
                flexShrink: 0
              }}
            >
              {item.title}
            </a>
          ))}
        </div>
      </div>

      <section id="getting-started" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Getting Started</h2>
        <p>Use MUDU in this order: create exam, link roster, launch, monitor, then review results.</p>
        <div className="review-card">
          <strong>Quick Start Checklist</strong>
          <ol style={{ paddingLeft: "18px" }}>
            <li>Create or import student roster.</li>
            <li>Create exam and review questions.</li>
            <li>Verify duration and security settings.</li>
            <li>Open Launch page and project join details.</li>
            <li>Monitor sessions and submit incidents if needed.</li>
          </ol>
        </div>
      </section>

      <section id="home" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Home Dashboard</h2>
        <p>Home gives a summary of upcoming and recent exams. Use search/filter to quickly find an exam.</p>
        <p>Use quick actions on cards for edit, archive, and delete.</p>
      </section>

      <section id="create-exam" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Create Exam</h2>
        <p>The builder has 3 steps: Details, Questions, Students.</p>
        <ul style={{ paddingLeft: "18px" }}>
          <li>Details: set title, course code, date/time, and duration.</li>
          <li>Questions: create manually or generate from source material.</li>
          <li>Students: link roster, generate registration link, then publish.</li>
        </ul>
      </section>

      <section id="question-bank" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Question Bank</h2>
        <p>Questions are grouped into folders by course. Click a folder to open it and edit questions.</p>
        <p>Use search and type filters (MCQ/FILL/ESSAY) to narrow large banks.</p>
      </section>

      <section id="rosters" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Student Rosters</h2>
        <p>Create a roster with name/description first, then add students using:</p>
        <ul style={{ paddingLeft: "18px" }}>
          <li>CSV import (file upload)</li>
          <li>Manual student entry</li>
          <li>Self-registration link</li>
        </ul>
        <p>When coming from exam creation, you can return directly after roster setup.</p>
      </section>

      <section id="launch" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Exam Launch</h2>
        <p>Use this page in the exam hall. Students connect by typing your local network IP URL in a browser.</p>
        <p>Confirm enough students are connected before starting the exam timer.</p>
      </section>

      <section id="monitor" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Live Monitoring</h2>
        <p>Track connected, flagged, and submitted students in list or grid view.</p>
        <p>Per student actions include extending time (custom minutes), dismissing flags, and force submit.</p>
      </section>

      <section id="results" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Results & Analytics</h2>
        <p>Review score bands and question-level insights to identify weak content areas and exam quality issues.</p>
      </section>

      <section id="settings" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Settings</h2>
        <p>Manage lecturer profile, institution metadata, and default exam behavior.</p>
      </section>

      <section id="student-flow" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Student Experience</h2>
        <p>Students use the student portal flow: login, exam selection, instructions, fullscreen check, exam pages, submit confirmation.</p>
        <p>Timer warning states: amber under 20% time remaining, red under 10%.</p>
      </section>

      <section id="best-practices" className="card stack gap-2">
        <h2 style={{ fontSize: "18px", fontWeight: 700 }}>Best Practices</h2>
        <ul style={{ paddingLeft: "18px" }}>
          <li>Run a full test with 3-5 dummy students before exam day.</li>
          <li>Prepare backup power and stable local WiFi coverage.</li>
          <li>Keep one invigilator assigned to monitoring incidents only.</li>
          <li>Export results and sync immediately after each exam.</li>
        </ul>
      </section>
    </div>
  );
}

