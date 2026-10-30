import { useState } from "react";
import StudentDashboard from "./StudentDashboard";
import PlatformOwnerDashboard from "./PlatformOwnerDashboard";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";
import "./App.css";
import AdminSetup from "./AdminSetup";
import InstitutionAdminDashboard from "./InstitutionAdminDashboard";
import TeacherDashboard from "./TeacherDashboard";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Passages", icon: BookOpen },
  { label: "Questions", icon: ClipboardList },
  { label: "Marking rubrics", icon: FileText },
  { label: "Student results", icon: BarChart3 },
];

const stats = [
  { label: "Total passages", value: "24", change: "Content library", icon: BookOpen },
  { label: "Questions", value: "86", change: "Across all exercises", icon: ClipboardList },
  { label: "Published exercises", value: "12", change: "Available for practice", icon: FileText },
  { label: "Student attempts", value: "148", change: "Sample activity data", icon: Users },
];

const mockPassages = [
  { title: "The Journey Home", category: "Narrative", questions: 6, status: "Published" },
  { title: "Life in the Mountains", category: "Descriptive", questions: 5, status: "Published" },
  { title: "A Changing World", category: "Non-fiction", questions: 8, status: "Draft" },
  { title: "The Forgotten Garden", category: "Narrative", questions: 7, status: "Published" },
];

const mockQuestions = [
  { title: "Identify the writer's impression", type: "Inference", marks: 3, status: "Ready" },
  { title: "Explain the meaning of a phrase", type: "Vocabulary", marks: 2, status: "Ready" },
  { title: "Find two details from the passage", type: "Retrieval", marks: 2, status: "Ready" },
  { title: "Analyse the writer's language", type: "Language analysis", marks: 5, status: "Draft" },
];

const mockRubrics = [
  { title: "Inference — evidence and explanation", criteria: 3, marks: 3, status: "Published" },
  { title: "Vocabulary in context", criteria: 2, marks: 2, status: "Published" },
  { title: "Writer's language analysis", criteria: 5, marks: 5, status: "Draft" },
];

const mockResults = [
  { student: "Student A", exercise: "The Journey Home", score: "12 / 15", date: "28 Oct 2026", status: "Reviewed" },
  { student: "Student B", exercise: "Life in the Mountains", score: "9 / 12", date: "27 Oct 2026", status: "Completed" },
  { student: "Student C", exercise: "The Forgotten Garden", score: "14 / 16", date: "26 Oct 2026", status: "Completed" },
  { student: "Student A", exercise: "A Changing World", score: "7 / 10", date: "25 Oct 2026", status: "Reviewed" },
];

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "The email or password is incorrect."
            : data.detail || "Sign-in failed. Please try again."
        );
      }

      setAccessToken(data.access_token);
      setUser(data.user);
      setActivePage("Overview");
      setPassword("");
      setError("");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Cannot reach the backend. Check that FastAPI is running."
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setUser(null);
    setAccessToken(null);
    setPassword("");
    setError("");
    setActivePage("Overview");
  }
  const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has("setup_token")) {
      return <AdminSetup />;
    }

  // Display the sign-in form until FastAPI verifies the credentials.
  if (!user || !accessToken) {
    return (
      <main className="login-page">
        <section className="login-intro">
          <header className="brand">
            <span className="brand-icon">
              <BookOpen size={22} />
            </span>
            <span className="brand-name">
              EnglishPrep <span>AI</span>
            </span>
          </header>

          <div className="intro-content">
            <div className="intro-label">
              <Sparkles size={15} />
              ADMIN WORKSPACE
            </div>

            <h1>
              Better learning
              <br />
              starts with
              <br />
              <span>better questions.</span>
            </h1>

            <p className="intro-description">
              Manage reading passages, build question sets, organise marking
              criteria, and help students improve their English Language skills.
            </p>

            <div className="intro-features">
              <div className="intro-feature">
                <span className="feature-check">01</span>
                <div>
                  <strong>Build your content library</strong>
                  <p>Organise passages and practice exercises.</p>
                </div>
              </div>

              <div className="intro-feature">
                <span className="feature-check">02</span>
                <div>
                  <strong>Define marking criteria</strong>
                  <p>Prepare rubrics for consistent assessment.</p>
                </div>
              </div>

              <div className="intro-feature">
                <span className="feature-check">03</span>
                <div>
                  <strong>Support student progress</strong>
                  <p>Review attempts, marks, and feedback.</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="intro-footer">
            Thoughtfully designed for English Language learning.
          </footer>
        </section>

        <section className="login-area">
          <div className="login-card">
            <div className="login-symbol">
              <ShieldCheck size={23} />
            </div>

            <p className="login-eyebrow">WELCOME BACK</p>
            <h2>Admin sign in</h2>
            <p className="login-description">
              Enter your administrator credentials to continue.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label htmlFor="admin-email">Email address</label>
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="admin@example.com"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>

              <div className="form-field">
                <label htmlFor="admin-password">Password</label>
                <div className="password-input">
                  <input
                    id="admin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="login-notice login-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="sign-in-button"
                disabled={loading}
              >
                {loading ? "Verifying credentials..." : "Sign in to dashboard"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="login-divider">
              <span />
              <span>ADMINISTRATOR ACCESS</span>
              <span />
            </div>

            <div className="security-note">
              <ShieldCheck size={18} />
              <p>
                Your credentials are verified by the backend. Only an active
                administrator account can sign in.
              </p>
            </div>
          </div>

          <p className="login-copyright">
            © {new Date().getFullYear()} EnglishPrep AI
          </p>
        </section>
      </main>
    );
  }
  if (user.role === "platform_owner") {
    return (
      <PlatformOwnerDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
    );
  }
  if (user.role === "admin") {
    return (
      <InstitutionAdminDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
    );
  }
  if (user.role === "teacher") {
    return (
      <TeacherDashboard
        user={user}
        accessToken={accessToken}
        onLogout={handleLogout}
      />
    );
  }
  if (user.role === "student") {
  return (
    <StudentDashboard
      user={user}
      accessToken={accessToken}
      onLogout={handleLogout}
    />
  );
}
  const pageDetails = {
    Overview: {
      title: "Overview",
      description: "Here's what's happening in your learning platform.",
    },
    Passages: {
      title: "Passages",
      description: "Manage the reading passages used in practice exercises.",
    },
    Questions: {
      title: "Questions",
      description: "Review and organise your question library.",
    },
    "Marking rubrics": {
      title: "Marking rubrics",
      description: "Manage the criteria used to assess student answers.",
    },
    "Student results": {
      title: "Student results",
      description: "Review student attempts and their practice results.",
    },
  };

  const page = pageDetails[activePage] || pageDetails.Overview;

  const tableData = {
    Passages: {
      columns: ["Passage", "Category", "Questions", "Status"],
      rows: mockPassages.filter((item) =>
        `${item.title} ${item.category}`.toLowerCase().includes(search.toLowerCase())
      ).map((item) => [item.title, item.category, item.questions, item.status]),
    },
    Questions: {
      columns: ["Question", "Type", "Maximum marks", "Status"],
      rows: mockQuestions.filter((item) =>
        `${item.title} ${item.type}`.toLowerCase().includes(search.toLowerCase())
      ).map((item) => [item.title, item.type, item.marks, item.status]),
    },
    "Marking rubrics": {
      columns: ["Rubric", "Criteria", "Maximum marks", "Status"],
      rows: mockRubrics.filter((item) =>
        item.title.toLowerCase().includes(search.toLowerCase())
      ).map((item) => [item.title, item.criteria, item.marks, item.status]),
    },
    "Student results": {
      columns: ["Student", "Exercise", "Score", "Attempt date", "Status"],
      rows: mockResults.filter((item) =>
        `${item.student} ${item.exercise}`.toLowerCase().includes(search.toLowerCase())
      ).map((item) => [item.student, item.exercise, item.score, item.date, item.status]),
    },
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <a className="admin-brand" href="#" onClick={(e) => { e.preventDefault(); setActivePage("Overview"); }}>
          <span className="admin-brand-icon"><BookOpen size={21} /></span>
          <span>EnglishPrep <em>AI</em></span>
        </a>

        <p className="sidebar-label">WORKSPACE</p>
        <nav className="sidebar-nav" aria-label="Admin navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={`nav-item ${activePage === label ? "active" : ""}`}
              onClick={() => { setActivePage(label); setSearch(""); }}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Student results" && <span className="nav-count">4</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-help">
          <div className="help-icon"><Sparkles size={17} /></div>
          <strong>Content tip</strong>
          <p>Clear marking criteria help produce more consistent feedback.</p>
        </div>

        <button className="nav-item settings-item" onClick={() => setActivePage("Overview")}>
          <Settings size={18} />
          <span>Settings</span>
        </button>

        <div className="sidebar-user">
          <div className="user-avatar">
            {(user.email || "A").charAt(0).toUpperCase()}
          </div>
          <div className="user-details">
            <strong>{user.institution_name || "Administrator"}</strong>
            <span>{user.email}</span>
          </div>
          <button
            className="logout-icon"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span className="breadcrumb-separator">/</span>
            <strong>{activePage}</strong>
          </div>
          <div className="topbar-actions">
            <span className="environment-label">
              <span className="environment-dot" />
              Mock data
            </span>
            <button className="icon-button" aria-label="Notifications">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
            <div className="topbar-avatar">
              {(user.email || "A").charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <section className="admin-content">
          <div className="page-heading">
            <div>
              <p className="page-eyebrow">ENGLISHPREP AI / ADMIN</p>
              <h1>{page.title}</h1>
              <p className="page-description">{page.description}</p>
            </div>
            {(activePage === "Passages" || activePage === "Questions") && (
              <button
                className="create-button"
                onClick={() => window.alert("Content creation will be implemented in a later step.")}
              >
                <Plus size={17} />
                Create {activePage === "Passages" ? "passage" : "question"}
              </button>
            )}
          </div>

          {activePage === "Overview" ? (
            <>
              <div className="welcome-banner">
                <div>
                  <div className="welcome-label"><Sparkles size={15} /> YOUR CONTENT WORKSPACE</div>
                  <h2>Welcome back.</h2>
                  <p>Manage practice content and prepare meaningful learning experiences.</p>
                </div>
                <div className="welcome-art"><BookOpen size={66} strokeWidth={1.2} /></div>
              </div>

              <div className="stats-grid">
                {stats.map(({ label, value, change, icon: Icon }) => (
                  <article className="stat-card" key={label}>
                    <div className="stat-card-top">
                      <span>{label}</span>
                      <span className="stat-icon"><Icon size={18} /></span>
                    </div>
                    <strong className="stat-value">{value}</strong>
                    <span className="stat-change">{change}</span>
                  </article>
                ))}
              </div>

              <section className="content-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recently updated passages</h2>
                    <p>Sample content to preview the future admin experience.</p>
                  </div>
                  <button className="text-action" onClick={() => setActivePage("Passages")}>
                    View all <ArrowUpRight size={15} />
                  </button>
                </div>

                <div className="table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Passage</th>
                        <th>Category</th>
                        <th>Questions</th>
                        <th>Status</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {mockPassages.slice(0, 3).map((item) => (
                        <tr key={item.title}>
                          <td><div className="table-title"><span className="row-icon"><BookOpen size={16} /></span><strong>{item.title}</strong></div></td>
                          <td>{item.category}</td>
                          <td>{item.questions}</td>
                          <td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span></td>
                          <td><button className="row-menu" aria-label={`More actions for ${item.title}`}><MoreHorizontal size={18} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="panel-footer">
                  <span>Showing sample data only</span>
                  <button className="text-action" onClick={() => setActivePage("Passages")}>Manage passages <ArrowRight size={15} /></button>
                </div>
              </section>

              <section className="content-panel activity-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Recent student attempts</h2>
                    <p>Illustrative results; no real student records are connected yet.</p>
                  </div>
                  <Clock3 size={19} />
                </div>
                <div className="attempt-list">
                  {mockResults.slice(0, 3).map((item) => (
                    <div className="attempt-row" key={`${item.student}-${item.exercise}`}>
                      <div className="attempt-avatar">{item.student.slice(-1)}</div>
                      <div className="attempt-info">
                        <strong>{item.student}</strong>
                        <span>{item.exercise} · {item.date}</span>
                      </div>
                      <strong className="attempt-score">{item.score}</strong>
                    </div>
                  ))}
                </div>
                <div className="panel-footer">
                  <span>Mock results</span>
                  <button className="text-action" onClick={() => setActivePage("Student results")}>View results <ArrowRight size={15} /></button>
                </div>
              </section>
            </>
          ) : (
            <section className="content-panel">
              <div className="panel-heading">
                <div>
                  <h2>{activePage}</h2>
                  <p>Example records for layout preview. This data is not stored in PostgreSQL.</p>
                </div>
                <span className="mock-tag">Mock data</span>
              </div>
              <div className="table-toolbar">
                <div className="table-search">
                  <Search size={17} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${activePage.toLowerCase()}...`}
                    aria-label={`Search ${activePage}`}
                  />
                </div>
              </div>
              <div className="table-scroll">
                <table className="admin-table">
                  <thead>
                    <tr>
                      {tableData[activePage]?.columns.map((column) => (
                        <th key={column}>{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(tableData[activePage]?.rows || []).map((row, index) => (
                      <tr key={`${activePage}-${index}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex}>
                            {cellIndex === row.length - 1 &&
                            ["Published", "Draft", "Ready", "Reviewed", "Completed"].includes(String(cell)) ? (
                              <span className={`status-pill ${String(cell).toLowerCase()}`}>{cell}</span>
                            ) : cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {(!tableData[activePage] || tableData[activePage].rows.length === 0) && (
                      <tr><td colSpan="5">No matching sample records.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="panel-footer">
                <span>{tableData[activePage]?.rows.length || 0} sample records</span>
                <span>Live data integration is a future step.</span>
              </div>
            </section>
          )}

          <footer className="admin-footer">
            <span>EnglishPrep AI</span>
            <span>Admin workspace · Preview environment</span>
          </footer>
        </section>
      </main>
    </div>
  );
}

export default App;