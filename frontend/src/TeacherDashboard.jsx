
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ClipboardList,
  BookOpen,
  FileText,
  BarChart3,
  Plus,
  Clock3,
  Search,
  LogOut,
  X,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const styles = `
.teacher-app { min-height:100vh; display:grid; grid-template-columns:230px minmax(0,1fr); color:#26394d; background:#f5f7fb; font-family:"DM Sans","Segoe UI",sans-serif; }
.teacher-app * { box-sizing:border-box; }
.teacher-sidebar { display:flex; flex-direction:column; padding:24px 15px; color:#d5e0e9; background:#172c40; }
.teacher-brand { display:flex; align-items:center; gap:10px; padding:0 8px 34px; color:#fff; font-weight:800; font-size:18px; }
.teacher-brand em { color:#8edbd0; font-style:normal; }
.teacher-brand-icon { display:grid; place-items:center; width:39px; height:39px; border-radius:11px; color:#a9e7dd; background:#29465b; }
.teacher-nav-label { margin:0 10px 12px; color:#90a5b8; font-size:10px; font-weight:800; letter-spacing:1.4px; }
.teacher-nav { display:grid; gap:6px; }
.teacher-nav button { display:flex; align-items:center; gap:11px; min-height:43px; padding:0 11px; border:1px solid transparent; border-radius:8px; color:#b9c9d7; background:transparent; font:inherit; font-size:12px; text-align:left; cursor:pointer; }
.teacher-nav button:hover { color:white; background:#253f54; }
.teacher-nav button.selected { color:white; border-color:#38586d; background:#2b4b60; box-shadow:inset 3px 0 #8edbd0; }
.teacher-main { min-width:0; }
.teacher-topbar { display:flex; justify-content:space-between; align-items:center; gap:15px; min-height:68px; padding:0 30px; border-bottom:1px solid #e7edf3; background:white; }
.teacher-topbar span { color:#65768a; font-size:12px; }
.teacher-topbar button { display:flex; align-items:center; gap:7px; padding:8px 12px; border:1px solid #e2e8ef; border-radius:8px; color:#526477; background:#fff; cursor:pointer; }
.teacher-content { max-width:1500px; margin:auto; padding:30px; }
.teacher-heading { display:flex; justify-content:space-between; align-items:center; gap:18px; margin-bottom:25px; }
.teacher-eyebrow { margin:0 0 8px; color:#548a8e; font-size:10px; font-weight:800; letter-spacing:1.5px; }
.teacher-heading h1 { margin:0; color:#21354a; font-size:29px; letter-spacing:-.8px; }
.teacher-description { margin:8px 0 0; color:#798698; font-size:12px; line-height:1.7; }
.teacher-primary { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:41px; padding:0 14px; border:0; border-radius:8px; color:white; background:#285b71; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
.teacher-primary:hover { background:#1c4356; }
.teacher-primary:disabled { opacity:.6; cursor:wait; }
.teacher-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-bottom:22px; }
.teacher-stat { padding:18px; border:1px solid #e7edf3; border-radius:12px; background:white; }
.teacher-stat span { color:#778597; font-size:11px; }
.teacher-stat strong { display:block; margin-top:10px; color:#22364a; font-size:27px; }
.teacher-panel { overflow:hidden; border:1px solid #e7edf3; border-radius:12px; background:white; }
.teacher-panel-head { display:flex; align-items:center; justify-content:space-between; gap:15px; padding:20px; }
.teacher-panel-head h2 { margin:0; font-size:14px; }
.teacher-panel-head p { margin:6px 0 0; color:#8793a2; font-size:11px; }
.teacher-search { display:flex; align-items:center; gap:8px; width:min(100%,260px); padding:0 10px; border:1px solid #e2e8ef; border-radius:8px; color:#98a4b1; }
.teacher-search input { width:100%; height:36px; border:0; outline:0; font:inherit; font-size:11px; }
.teacher-table-wrap { overflow-x:auto; }
.teacher-table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
.teacher-table th { padding:12px 20px; border-top:1px solid #edf1f5; border-bottom:1px solid #e9edf3; color:#8491a0; background:#f7f9fc; font-size:10px; }
.teacher-table td { padding:15px 20px; border-bottom:1px solid #eff2f6; color:#6c798a; font-size:11px; }
.teacher-table tbody tr:last-child td { border-bottom:0; }
.teacher-status { display:inline-flex; padding:5px 9px; border-radius:20px; color:#986b25; background:#fff4df; font-size:10px; font-weight:700; }
.teacher-empty { padding:40px 20px; color:#8995a4; text-align:center; font-size:12px; }
.teacher-notice { margin-bottom:18px; padding:12px 14px; border:1px solid #e2eaf0; border-radius:8px; color:#637588; background:#fff; font-size:11px; line-height:1.7; overflow-wrap:anywhere; }
.teacher-error { border-color:#f0cece; color:#963e3e; background:#fff5f5; }
.teacher-modal-backdrop { position:fixed; inset:0; z-index:20; display:grid; place-items:center; padding:20px; background:#13273d80; }
.teacher-modal { width:min(100%,480px); padding:25px; border-radius:15px; background:white; box-shadow:0 20px 65px #172c4033; }
.teacher-manage-modal {
  width: min(900px, calc(100vw - 40px));
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  box-sizing: border-box;
  min-width: 0;
}
.teacher-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.teacher-modal-head h2 { margin:0; font-size:19px; }
.teacher-modal-head button { border:0; background:transparent; color:#788697; cursor:pointer; }
.teacher-field { display:block; margin-bottom:16px; color:#425267; font-size:11px; font-weight:700; }
.teacher-field input, .teacher-field select, .teacher-field textarea { display:block; width:100%; min-height:42px; margin-top:7px; padding:9px 11px; border:1px solid #dce4eb; border-radius:8px; color:#26394d; background:white; font:inherit; font-weight:400; }
.teacher-field textarea { min-height:85px; resize:vertical; }
.teacher-modal-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:20px; }
.teacher-secondary { min-height:40px; padding:0 13px; border:1px solid #dce4eb; border-radius:8px; color:#536477; background:white; cursor:pointer; }
.teacher-footer { margin-top:22px; color:#9aa4b1; font-size:10px; }
@media(max-width:800px) { .teacher-app { grid-template-columns:1fr; } .teacher-sidebar { padding:15px; } .teacher-brand { padding-bottom:18px; } .teacher-nav { grid-template-columns:repeat(2,minmax(0,1fr)); } .teacher-content { padding:20px 14px; } .teacher-heading { align-items:flex-start; flex-direction:column; } .teacher-stats { grid-template-columns:1fr; } .teacher-panel-head { align-items:flex-start; flex-direction:column; } .teacher-search { width:100%; } }
`;

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Exams", icon: ClipboardList },
  { label: "Passages", icon: BookOpen },
  { label: "Questions", icon: FileText },
  { label: "Student results", icon: BarChart3 },
];

export default function TeacherDashboard({ user, accessToken, onLogout }) {
  const [activePage, setActivePage] = useState("Overview");
  const [exams, setExams] = useState([]);
  const [passages, setPassages] = useState([]);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [passageError, setPassageError] = useState("");
  const [showCreatePassage, setShowCreatePassage] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [showCreateQuestion, setShowCreateQuestion] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [questionPassageId, setQuestionPassageId] = useState("");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [questionType, setQuestionType] = useState("Short answer");
  const [questionOptions, setQuestionOptions] = useState("");
  const [questionAnswer, setQuestionAnswer] = useState("");
  const [questionCriteria, setQuestionCriteria] = useState("");
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageCategory, setPassageCategory] = useState("Reading comprehension");
  const [passageContent, setPassageContent] = useState("");
  const [savingPassage, setSavingPassage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingExamId, setPublishingExamId] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("English Language");
  const [level, setLevel] = useState("O Level");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("60");
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingExamQuestions, setLoadingExamQuestions] = useState(false);
  const [examQuestionsError, setExamQuestionsError] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [showManageQuestions, setShowManageQuestions] = useState(false);

  async function loadExams() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/exams`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Unable to load exams.");
      }

      setExams(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "Unable to load exams.");
    } finally {
      setLoading(false);
    }
  }
  async function loadPassages() {
  setLoadingPassages(true);
  setPassageError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/content/passages`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load passages."
      );
    }

    setPassages(
      Array.isArray(data.items) ? data.items : []
    );
  } catch (err) {
    setPassageError(
      err.message || "Unable to load passages."
    );
  } finally {
    setLoadingPassages(false);
  }
}
async function loadQuestions() {
  setLoadingQuestions(true);
  setQuestionError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/content/questions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load questions."
      );
    }

    setQuestions(
      Array.isArray(data.items) ? data.items : []
    );
  } catch (err) {
    setQuestionError(
      err.message || "Unable to load questions."
    );
  } finally {
    setLoadingQuestions(false);
  }
}
async function loadExamQuestions(examId) {
  setLoadingExamQuestions(true);
  setExamQuestionsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exams/${examId}/questions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load exam questions."
      );
    }

    setExamQuestions(
      Array.isArray(data.items) ? data.items : []
    );
  } catch (err) {
    setExamQuestionsError(
      err.message || "Unable to load exam questions."
    );
  } finally {
    setLoadingExamQuestions(false);
  }
}

async function addQuestionToExam(event) {
  event.preventDefault();
  setExamQuestionsError("");

  if (!selectedExam || !selectedQuestionId) {
    setExamQuestionsError("Please select a question.");
    return;
  }

  setAddingQuestion(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exams/${selectedExam.id}/questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          question_id: Number(selectedQuestionId),
          marks_override: null,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to add question to exam."
      );
    }

    setSelectedQuestionId("");

    await loadExamQuestions(selectedExam.id);
  } catch (err) {
    setExamQuestionsError(
      err.message || "Unable to add question to exam."
    );
  } finally {
    setAddingQuestion(false);
  }
}

async function createQuestion(event) {
  event.preventDefault();
  setQuestionError("");

  const criteria = questionCriteria
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (criteria.length === 0) {
    setQuestionError("Enter at least one marking criterion.");
    return;
  }

  const options =
    questionType === "Multiple choice"
      ? questionOptions
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean)
      : null;

  if (questionType === "Multiple choice" && (!options || options.length < 2)) {
    setQuestionError("Enter at least two answer options.");
    return;
  }

  if (
    questionType === "Multiple choice" &&
    !options.includes(questionAnswer.trim())
  ) {
    setQuestionError(
      "The correct answer must match one of the answer options exactly."
    );
    return;
  }

  setSavingQuestion(true);

  try {
    const payload = {
      passage_id: questionPassageId
        ? Number(questionPassageId)
        : null,
      prompt: questionPrompt.trim(),
      question_type: questionType,
      options,
      correct_answer: questionAnswer.trim(),
      marking_criteria: criteria.map((criterion) => ({
        criterion,
        marks: 1,
      })),
      marks: criteria.length,
    };

    const isEditing = editingQuestionId !== null;

    const response = await fetch(
      isEditing
        ? `${API_BASE_URL}/api/content/questions/${editingQuestionId}`
        : `${API_BASE_URL}/api/content/questions`,
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail ||
          (isEditing
            ? "Unable to update the question."
            : "Unable to save the question.")
      );
    }

    if (isEditing) {
      setQuestions((current) =>
        current.map((question) =>
          question.id === data.id ? data : question
        )
      );
    } else {
      setQuestions((current) => [data, ...current]);
    }

    setQuestionPassageId("");
    setQuestionPrompt("");
    setQuestionType("Short answer");
    setQuestionOptions("");
    setQuestionAnswer("");
    setQuestionCriteria("");
    setEditingQuestionId(null);
    setShowCreateQuestion(false);

  } catch (err) {
    setQuestionError(
      err.message || "Unable to save the question."
    );
  } finally {
    setSavingQuestion(false);
  }
}

async function createPassage(event) {
  event.preventDefault();
  setPassageError("");
  setSavingPassage(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/content/passages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: passageTitle.trim(),
          category: passageCategory.trim() || "General",
          content: passageContent.trim(),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to save the passage."
      );
    }

    setPassages((current) => [data, ...current]);
    setPassageTitle("");
    setPassageCategory("Reading comprehension");
    setPassageContent("");
    setShowCreatePassage(false);
  } catch (err) {
    setPassageError(
      err.message || "Unable to save the passage."
    );
  } finally {
    setSavingPassage(false);
  }
}

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (activePage === "Passages") {
        loadPassages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activePage, accessToken]);
  useEffect(() => {
  if (activePage === "Questions") {
    loadQuestions();
    loadPassages();
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activePage, accessToken]);
  

  async function createExam(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/exams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          subject,
          level: level.trim() || null,
          instructions: instructions.trim() || null,
          duration_minutes: duration ? Number(duration) : null,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Unable to create exam.");
      }

      setExams((current) => [data, ...current]);
      setTitle("");
      setSubject("English Language");
      setLevel("O Level");
      setInstructions("");
      setDuration("60");
      setShowCreate(false);
      setActivePage("Exams");
    } catch (err) {
      setError(err.message || "Unable to create exam.");
    } finally {
      setSubmitting(false);
    }
  }
  async function publishExam(exam) {
  const confirmed = window.confirm(
    `Publish "${exam.title}"? It will become available to students in your institution, and you won't be able to add more questions afterward.`
  );

  if (!confirmed) {
    return;
  }

  setPublishingExamId(exam.id);
  setError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exams/${exam.id}/publish`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to publish the exam."
      );
    }

    setExams((current) =>
      current.map((item) =>
        item.id === exam.id
          ? { ...item, ...data.exam, status: "Published" }
          : item
      )
    );
  } catch (err) {
    setError(err.message || "Unable to publish the exam.");
  } finally {
    setPublishingExamId(null);
  }
}

  const visibleExams = exams.filter((exam) =>
    `${exam.title} ${exam.subject} ${exam.level || ""} ${exam.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const pageDescriptions = {
    Overview: "A live view of your exams and assessment work.",
    Exams: "Create and manage exams for your institution.",
    Passages: "Manage institution reading passages.",
    Questions: "Manage questions, reference answers and marking criteria.",
    "Student results": "Review student attempts and evaluation feedback.",
  };

  return (
    <div className="teacher-app">
      <style>{styles}</style>

      <aside className="teacher-sidebar">
        <div className="teacher-brand">
          <span className="teacher-brand-icon"><BookOpen size={21} /></span>
          <span>EnglishPrep <em>AI</em></span>
        </div>

        <p className="teacher-nav-label">TEACHING WORKSPACE</p>
        <nav className="teacher-nav" aria-label="Teacher navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              className={activePage === label ? "selected" : ""}
              onClick={() => {
                setActivePage(label);
                setSearch("");
                setError("");
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="teacher-main">
        <header className="teacher-topbar">
          <span>{user?.institution_name || "Institution workspace"} / {user?.email}</span>
          <button type="button" onClick={onLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </header>

        <section className="teacher-content">
          <div className="teacher-heading">
            <div>
              <p className="teacher-eyebrow">ENGLISHPREP AI / TEACHER</p>
              <h1>{activePage === "Overview" ? "Overview" : activePage}</h1>
              <p className="teacher-description">
                {pageDescriptions[activePage]}
              </p>
            </div>

            {activePage === "Exams" && (
              <button
                className="teacher-primary"
                type="button"
                onClick={() => {
                  setError("");
                  setShowCreate(true);
                }}
              >
                <Plus size={16} /> Create exam
              </button>
            )}
          </div>

          {error && (
            <div className="teacher-notice teacher-error" role="alert">
              {error}
            </div>
          )}

          {activePage === "Overview" && (
            <div className="teacher-stats">
              <article className="teacher-stat">
                <span>Total exams</span>
                <strong>{loading ? "…" : exams.length}</strong>
              </article>
              <article className="teacher-stat">
                <span>Draft exams</span>
                <strong>{loading ? "…" : exams.filter((e) => e.status === "Draft").length}</strong>
              </article>
              <article className="teacher-stat">
                <span>Published exams</span>
                <strong>{loading ? "…" : exams.filter((e) => e.status === "Published").length}</strong>
              </article>

              <section className="teacher-panel" style={{ gridColumn: "1 / -1" }}>
                <div className="teacher-panel-head">
                  <div>
                    <h2>Continue your work</h2>
                    <p>Start by creating a draft exam. Passage and question authoring will be connected next.</p>
                  </div>
                  <button className="teacher-primary" onClick={() => setActivePage("Exams")}>
                    <ClipboardList size={16} /> View exams
                  </button>
                </div>
              </section>
            </div>
          )}

          {activePage === "Exams" && (
            <section className="teacher-panel">
              <div className="teacher-panel-head">
                <div>
                  <h2>Your exams</h2>
                  <p>Exams are saved in your institution's database.</p>
                </div>
                <label className="teacher-search">
                  <Search size={15} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search exams..."
                  />
                </label>
              </div>

              {loading ? (
                <div className="teacher-empty">Loading exams…</div>
              ) : visibleExams.length === 0 ? (
                <div className="teacher-empty">
                  {exams.length === 0 ? "No exams yet. Create your first draft exam." : "No matching exams found."}
                </div>
              ) : (
                <div className="teacher-table-wrap">
                  <table className="teacher-table">
                    <thead>
                      <tr>
                        <th>Exam</th>
                        <th>Subject</th>
                        <th>Level</th>
                        <th>Duration</th>
                        <th>Status</th>
                        <th>Actions</th>

                      </tr>
                    </thead>
                    <tbody>
                      {visibleExams.map((exam) => (
                        <tr key={exam.id}>
                          <td><strong>{exam.title}</strong><br /><small>ID: {exam.id}</small></td>
                          <td>{exam.subject}</td>
                          <td>{exam.level || "—"}</td>
                          <td>{exam.duration_minutes ? `${exam.duration_minutes} min` : "—"}</td>
                          <td><span className="teacher-status">{exam.status}</span></td>
                          <td>
                            <button
                                type="button"
                                className="teacher-primary"
                                onClick={() => {
                                setSelectedExam(exam);
                                setExamQuestions([]);
                                setSelectedQuestionId("");
                                setExamQuestionsError("");
                                setQuestionError("");
                                setShowManageQuestions(true);

                                loadExamQuestions(exam.id);
                                loadQuestions();
                                }}
                            >
                                Manage questions
                            </button>
                            {exam.status === "Draft" && (
                            <button
                                type="button"
                                className="teacher-primary"
                                onClick={() => publishExam(exam)}
                                disabled={publishingExamId === exam.id}
                            >
                                {publishingExamId === exam.id
                                ? "Publishing..."
                                : "Publish"}
                            </button>
                            )}
                            </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          
            {activePage === "Passages" && (
            <section className="teacher-panel">
                <div className="teacher-panel-head">
                <div>
                    <h2>Your passages</h2>
                    <p>Reading passages stored for your institution.</p>
                </div>

                <button
                    className="teacher-primary"
                    type="button"
                    onClick={() => {
                    setPassageError("");
                    setShowCreatePassage(true);
                    }}
                >
                    <Plus size={16} /> Create passage
                </button>
                </div>

                {passageError && (
                <div className="teacher-notice teacher-error" role="alert">
                    {passageError}
                </div>
                )}

                {loadingPassages ? (
                <div className="teacher-empty">Loading passages...</div>
                ) : passages.length === 0 ? (
                <div className="teacher-empty">
                    No passages yet. Create your first reading passage.
                </div>
                ) : (
                <div className="teacher-table-wrap">
                    <table className="teacher-table">
                    <thead>
                        <tr>
                        <th>Title</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {passages.map((passage) => (
                        <tr key={passage.id}>
                            <td>
                            <strong>{passage.title}</strong>
                            </td>
                            <td>{passage.category}</td>
                            <td>
                            <span className="teacher-status">
                                {passage.status}
                            </span>
                            </td>
                            <td>
                            {passage.created_at
                                ? new Date(
                                    passage.created_at
                                ).toLocaleDateString()
                                : "—"}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                )}
            </section>
            )}

            
{activePage === "Questions" && (
  <section className="teacher-panel">
    <div className="teacher-panel-head">
      <div>
        <h2>Your questions</h2>
        <p>
          Questions, reference answers and marking criteria for your institution.
        </p>
      </div>

      <button
        className="teacher-primary"
        type="button"
        onClick={() => {
          setQuestionError("");
          setShowCreateQuestion(true);
        }}
      >
        <Plus size={16} /> Create question
      </button>
    </div>

    {questionError && (
      <div className="teacher-notice teacher-error" role="alert">
        {questionError}
      </div>
    )}

    {loadingQuestions ? (
      <div className="teacher-empty">Loading questions...</div>
    ) : questions.length === 0 ? (
      <div className="teacher-empty">
        No questions yet. Create your first question.
      </div>
    ) : (
      <div className="teacher-table-wrap">
        <table
          className="teacher-table"
          style={{ width: "100%", tableLayout: "fixed" }}
        >
          <thead>
            <tr>
              <th style={{ width: "34%" }}>Question</th>
              <th style={{ width: "18%" }}>Passage</th>
              <th style={{ width: "13%" }}>Type</th>
              <th style={{ width: "8%" }}>Marks</th>
              <th style={{ width: "14%" }}>Marking criteria</th>
              <th style={{ width: "13%" }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {questions.map((question) => {
              const linkedPassage = passages.find(
                (passage) => passage.id === question.passage_id
              );

              return (
                <tr key={question.id}>
                  <td>
                    <strong
                      title={question.prompt}
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                    >
                      {question.prompt}
                    </strong>

                    <small>ID: {question.id}</small>
                  </td>

                  <td>
                    {linkedPassage
                      ? linkedPassage.title
                      : question.passage_id
                        ? "Passage unavailable"
                        : "Standalone"}
                  </td>

                  <td>{question.question_type}</td>

                  <td>{question.marks}</td>

                  <td>
                    {Array.isArray(question.marking_criteria)
                      ? `${question.marking_criteria.length} criteria`
                      : "Not available"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="teacher-secondary"
                      onClick={() => {
                        setEditingQuestionId(question.id);
                        setQuestionPassageId(
                          question.passage_id
                            ? String(question.passage_id)
                            : ""
                        );
                        setQuestionPrompt(question.prompt || "");
                        setQuestionType(question.question_type || "Short answer");
                        setQuestionOptions(
                          Array.isArray(question.options)
                            ? question.options.join("\n")
                            : ""
                        );
                        setQuestionAnswer(question.correct_answer || "");
                        setQuestionCriteria(
                          (question.marking_criteria || [])
                            .map((item) => item.criterion)
                            .join("\n")
                        );
                        setQuestionError("");
                        setShowCreateQuestion(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </section>
)}

{activePage === "Student results" && (
  <section className="teacher-panel">
    <div className="teacher-panel-head">
      <div>
        <h2>Student results</h2>
        <p>
          Review student attempts, awarded marks and AI evaluation feedback.
        </p>
      </div>
    </div>

    <div className="teacher-empty">
      Student results will appear here when exam attempts and evaluation
      are connected.
    </div>
  </section>
)}



          <footer className="teacher-footer">
            EnglishPrep AI · {user?.institution_name || "Teacher workspace"}
          </footer>
        </section>
      </main>
      {showManageQuestions && selectedExam && (
  <div
    className="teacher-modal-backdrop"
    onClick={() => setShowManageQuestions(false)}
  >
    <section
      className="teacher-modal teacher-manage-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-exam-questions-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="teacher-modal-head">
        <h2 id="manage-exam-questions-title">
          Manage exam questions
        </h2>

        <button
          type="button"
          onClick={() => setShowManageQuestions(false)}
          aria-label="Close dialog"
        >
          <X size={19} />
        </button>
      </div>

      <p className="teacher-description">
        {selectedExam.title}
      </p>

      {examQuestionsError && (
        <div className="teacher-notice teacher-error" role="alert">
          {examQuestionsError}
        </div>
      )}

      {questionError && (
        <div className="teacher-notice teacher-error" role="alert">
          {questionError}
        </div>
      )}

      <h3>Questions in this exam</h3>

      {loadingExamQuestions ? (
        <div className="teacher-empty">
          Loading exam questions...
        </div>
      ) : examQuestions.length === 0 ? (
        <div className="teacher-empty">
          No questions have been added to this exam yet.
        </div>
      ) : (
        <div className="teacher-table-wrap">
          <table
            className="teacher-table"
            style={{ width: "100%", tableLayout: "fixed" }}
          >
            <thead>
              <tr>
                <th>Position</th>
                <th>Question</th>
                <th>Type</th>
                <th>Marks</th>
              </tr>
            </thead>

            <tbody>
              {examQuestions.map((item) => (
                <tr key={item.exam_question_id}>
                  <td>{item.position}</td>
                  <td>
                    <span
                      title={item.prompt}
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.prompt}
                    </span>
                  </td>
                  <td>{item.question_type}</td>
                  <td>{item.marks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 style={{ marginTop: 26 }}>
        Add a saved question
      </h3>

      <form onSubmit={addQuestionToExam}>
        <label className="teacher-field">
          Select question
          <select
            value={selectedQuestionId}
            onChange={(event) =>
              setSelectedQuestionId(event.target.value)
            }
            required
            disabled={loadingQuestions}
          >
            <option value="">Choose a question...</option>

            {questions
              .filter(
                (question) =>
                  !examQuestions.some(
                    (item) => item.question_id === question.id
                  )
              )
              .map((question) => (
                <option
                  key={question.id}
                  value={question.id}
                >
                  {`ID ${question.id} — ${(question.prompt || "").slice(0, 65)}${(question.prompt || "").length > 65 ? "..." : ""}`}
                </option>
              ))}
          </select>
        </label>

        {!loadingQuestions &&
          questions.filter(
            (question) =>
              !examQuestions.some(
                (item) => item.question_id === question.id
              )
          ).length === 0 && (
            <p className="teacher-description">
              All available questions have already been added,
              or no questions are available.
            </p>
          )}

        <div className="teacher-modal-actions">
          <button
            type="button"
            className="teacher-secondary"
            onClick={() => setShowManageQuestions(false)}
          >
            Close
          </button>

          <button
            type="submit"
            className="teacher-primary"
            disabled={
              addingQuestion ||
              loadingQuestions ||
              !selectedQuestionId
            }
          >
            {addingQuestion ? "Adding..." : "Add question"}
          </button>
        </div>
      </form>
    </section>
  </div>
)}

      {showCreate && (
        <div className="teacher-modal-backdrop" onClick={() => setShowCreate(false)}>
          <section
            className="teacher-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="teacher-create-exam-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teacher-modal-head">
              <h2 id="teacher-create-exam-title">Create draft exam</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={createExam}>
              <label className="teacher-field">
                Exam title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  minLength={2}
                  maxLength={200}
                  placeholder="e.g. O Level English Practice Test 2"
                  required
                />
              </label>

              <label className="teacher-field">
                Subject
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </label>

              <label className="teacher-field">
                Level
                <input
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  maxLength={50}
                  placeholder="e.g. O Level"
                />
              </label>

              <label className="teacher-field">
                Duration in minutes
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </label>

              <label className="teacher-field">
                Instructions
                <textarea
                  value={instructions}
                  onChange={(event) => setInstructions(event.target.value)}
                  placeholder="Instructions shown to students"
                />
              </label>

              <div className="teacher-modal-actions">
                <button type="button" className="teacher-secondary" onClick={() => setShowCreate(false)}>
                  Cancel
                </button>
                <button type="submit" className="teacher-primary" disabled={submitting}>
                  {submitting ? "Saving…" : "Save draft exam"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      
{showCreatePassage && (
  <div
    className="teacher-modal-backdrop"
    onClick={() => setShowCreatePassage(false)}
  >
    <section
      className="teacher-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-passage-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="teacher-modal-head">
        <h2 id="create-passage-title">Create reading passage</h2>
        <button
          type="button"
          onClick={() => setShowCreatePassage(false)}
          aria-label="Close dialog"
        >
          <X size={19} />
        </button>
      </div>

      <form onSubmit={createPassage}>
        <label className="teacher-field">
          Passage title
          <input
            value={passageTitle}
            onChange={(event) => setPassageTitle(event.target.value)}
            minLength={2}
            maxLength={200}
            placeholder="e.g. The Journey Home"
            required
          />
        </label>

        <label className="teacher-field">
          Category
          <input
            value={passageCategory}
            onChange={(event) => setPassageCategory(event.target.value)}
            maxLength={80}
            placeholder="e.g. Narrative"
          />
        </label>

        <label className="teacher-field">
          Passage text
          <textarea
            value={passageContent}
            onChange={(event) => setPassageContent(event.target.value)}
            rows={8}
            placeholder="Paste the complete reading passage here..."
            required
          />
        </label>

        <div className="teacher-modal-actions">
          <button
            type="button"
            className="teacher-secondary"
            onClick={() => setShowCreatePassage(false)}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="teacher-primary"
            disabled={savingPassage}
          >
            {savingPassage ? "Saving..." : "Save passage"}
          </button>
        </div>
      </form>
    </section>
  </div>
)}

      {showCreateQuestion && (
        <div
          className="teacher-modal-backdrop"
          onClick={() => setShowCreateQuestion(false)}
        >
          <section
            className="teacher-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-question-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="teacher-modal-head">
              <h2 id="create-question-title">Create question</h2>

              <button
                type="button"
                onClick={() => setShowCreateQuestion(false)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <p className="teacher-description">
              Add the question, its reference answer, and the criteria
              used to evaluate student responses.
            </p>

            <form onSubmit={createQuestion}>
              <label className="teacher-field">
                Related passage
                <select
                  value={questionPassageId}
                  onChange={(event) =>
                    setQuestionPassageId(event.target.value)
                  }
                >
                  <option value="">Standalone question</option>
                  {passages.map((passage) => (
                    <option key={passage.id} value={passage.id}>
                      {passage.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="teacher-field">
                Question text
                <textarea
                  value={questionPrompt}
                  onChange={(event) =>
                    setQuestionPrompt(event.target.value)
                  }
                  rows={3}
                  minLength={3}
                  placeholder="Enter the question shown to students..."
                  required
                />
              </label>

              <label className="teacher-field">
                Question type
                <select
                  value={questionType}
                  onChange={(event) =>
                    setQuestionType(event.target.value)
                  }
                >
                  <option value="Short answer">Short answer</option>
                  <option value="Inference">Inference</option>
                  <option value="Multiple choice">Multiple choice</option>
                  <option value="Language analysis">Language analysis</option>
                  <option value="Vocabulary">Vocabulary</option>
                  <option value="Extended response">Extended response</option>
                </select>
              </label>

              {questionType === "Multiple choice" && (
                <label className="teacher-field">
                  Answer options (one per line)
                  <textarea
                    value={questionOptions}
                    onChange={(event) =>
                      setQuestionOptions(event.target.value)
                    }
                    rows={4}
                    placeholder={"Option A\nOption B\nOption C\nOption D"}
                    required
                  />
                </label>
              )}

              <label className="teacher-field">
                Reference answer
                <textarea
                  value={questionAnswer}
                  onChange={(event) =>
                    setQuestionAnswer(event.target.value)
                  }
                  rows={4}
                  placeholder="Enter the expected answer or acceptable answer guidance..."
                  required
                />
              </label>

              <label className="teacher-field">
                Marking criteria (one criterion per line)
                <textarea
                  value={questionCriteria}
                  onChange={(event) =>
                    setQuestionCriteria(event.target.value)
                  }
                  rows={4}
                  placeholder={"Identifies the relevant idea\nSupports the answer with evidence\nExplains the effect clearly"}
                  required
                />
                <small>
                  For this first version, each non-empty line is worth
                  one mark. The total marks are calculated automatically.
                </small>
              </label>

              {questionError && (
                <div
                  className="teacher-notice teacher-error"
                  role="alert"
                >
                  {questionError}
                </div>
              )}

              <div className="teacher-modal-actions">
                <button
                  type="button"
                  className="teacher-secondary"
                  onClick={() => setShowCreateQuestion(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="teacher-primary"
                  disabled={savingQuestion}
                >
                  {savingQuestion ? "Saving..." : "Save question"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}


    </div>
    

  );
}
