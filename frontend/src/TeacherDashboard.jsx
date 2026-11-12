import { useEffect, useRef, useState } from "react";
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
  Camera,
} from "lucide-react";

import AiExamGenerator from "./AiExamGenerator";
import SentenceConstructionGenerator from "./SentenceConstructionGenerator";
import QRCode from "qrcode";
import { authenticatedFetch, API_BASE_URL } from "./api";


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
/* Teacher Student Results Filters */
.teacher-results-filters {
  margin: 20px 0;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e5eaf1;
  border-radius: 12px;
}

.teacher-results-filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.teacher-results-filter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px;
}

.teacher-results-filter-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.teacher-results-filter-input {
  width: 100%;
  padding: 9px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 7px;
  background: #fff;
  font-size: 14px;
  box-sizing: border-box;
}
.exam-category-section,
.exam-date-section,
.exam-list-section {
  margin-top: 24px;
}

.exam-category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.exam-category-button {
  padding: 20px;
  border: 1px solid #dce2ea;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  text-align: left;
  transition: all 0.2s ease;
}

.exam-category-button:hover {
  border-color: #2563eb;
  background: #f0f5ff;
}
  .teacher-danger {
  background: #dc2626;
  color: white;
  border: none;
  padding: 9px 14px;
  border-radius: 6px;
  cursor: pointer;
  margin-left: 8px;
}

.teacher-danger:hover {
  background: #b91c1c;
}

.teacher-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.exam-delete-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 20px 0;
}

.exam-delete-options p {
  color: #64748b;
  font-size: 13px;
  margin: 0 0 12px;
}

.teacher-secondary {
  background: #e5e7eb;
  color: #374151;
  border: none;
  padding: 9px 16px;
  border-radius: 6px;
  cursor: pointer;
}
  .teacher-modal-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
  padding: 20px;
  box-sizing: border-box;
}

.teacher-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: #ffffff;
  border-radius: 14px;
  padding: 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
}

.teacher-modal h2 {
  margin-top: 0;
  font-size: 22px;
  color: #1e293b;
}

.teacher-modal > p {
  color: #475569;
  line-height: 1.6;
}

.teacher-modal .teacher-danger,
.teacher-modal .teacher-primary,
.teacher-modal .teacher-secondary {
  width: 100%;
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  font-weight: 600;
}

.exam-delete-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 22px 0;
}

.exam-delete-options p {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
}

@media (max-width: 600px) {
  .teacher-modal {
    padding: 22px;
  }
}
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
  const [selectedExamSubject, setSelectedExamSubject] = useState(null);
  const [selectedExamDate, setSelectedExamDate] = useState(null);
  const [exams, setExams] = useState([]);
  const [webcamSessionId, setWebcamSessionId] = useState(null);
  const [webcamScanToken, setWebcamScanToken] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loadingStudentResults, setLoadingStudentResults] = useState(false);
  const [studentResultsError, setStudentResultsError] = useState("");
  // Student results filters
  const [resultsDateFilter, setResultsDateFilter] = useState("");
  const [webcamLoading, setWebcamLoading] = useState(false);

  const [resultsSubjectFilter, setResultsSubjectFilter] = useState("");
  const [resultsClassFilter, setResultsClassFilter] = useState("");
  const [resultsExamFilter, setResultsExamFilter] = useState("");
  const [resultsStatusFilter, setResultsStatusFilter] = useState("");
  const [resultsSearch, setResultsSearch] = useState("");
  // Unique subjects in the teacher's results
  const resultSubjects = [
    ...new Set(
      studentResults.map((result) => result.subject_name)
    ),
  ].filter(Boolean).sort();

  // Unique classes
  const resultClasses = [
    ...new Set(
      studentResults.map((result) => result.class_name)
    ),
  ].filter(Boolean).sort();

  // Unique examinations
  const resultExams = Array.from(
    new Map(
      studentResults.map((result) => [
        String(result.exam_id),
        {
          id: String(result.exam_id),
          title: result.exam_title,
        },
      ])
    ).values()
  ).sort((a, b) => a.title.localeCompare(b.title));

  // Apply all selected filters together
  const filteredStudentResults = studentResults.filter((result) => {
    const searchText = resultsSearch.trim().toLowerCase();

    let submissionDate = "";

    if (result.submitted_at) {
      const date = new Date(result.submitted_at);

      if (!Number.isNaN(date.getTime())) {
        submissionDate = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      }
    }

    const matchesDate =
      !resultsDateFilter ||
      submissionDate === resultsDateFilter;

    const matchesSubject =
      !resultsSubjectFilter ||
      result.subject_name === resultsSubjectFilter;

    const matchesClass =
      !resultsClassFilter ||
      result.class_name === resultsClassFilter;

    const matchesExam =
      !resultsExamFilter ||
      String(result.exam_id) === resultsExamFilter;

    const matchesStatus =
      !resultsStatusFilter ||
      result.evaluation_status === resultsStatusFilter;

    const matchesSearch =
      !searchText ||
      [
        result.student_name,
        result.student_email,
        result.exam_title,
        result.subject_name,
        result.class_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchText);

    return (
      matchesDate &&
      matchesSubject &&
      matchesClass &&
      matchesExam &&
      matchesStatus &&
      matchesSearch
    );
  });
  const [retestLoadingAttemptId, setRetestLoadingAttemptId] = useState(null);
  const [selectedStudentResult, setSelectedStudentResult] = useState(null);
  const [currentReviewQuestionIndex, setCurrentReviewQuestionIndex] = useState(0);
  const [passages, setPassages] = useState([]);
  const [examView, setExamView] = useState(null);
  const [loadingPassages, setLoadingPassages] = useState(false);
  const [passageSearch, setPassageSearch] = useState("");
  const [passageError, setPassageError] = useState("");
  const [showCreatePassage, setShowCreatePassage] = useState(false);
  const [questionView, setQuestionView] = useState(null);
  const filteredPassages = passages.filter((passage) => {
  const searchTerm = passageSearch.trim().toLowerCase();

    if (!searchTerm) return true;

    return (
      (passage.title || "").toLowerCase().includes(searchTerm) ||
      (passage.category || "").toLowerCase().includes(searchTerm) ||
      (passage.status || "").toLowerCase().includes(searchTerm)
    );
  });
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
  const [generatingCriteria, setGeneratingCriteria] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [passageTitle, setPassageTitle] = useState("");
  const [passageCategory, setPassageCategory] = useState("Reading comprehension");
  const [passageContent, setPassageContent] = useState("");
  const [showPassageScanner, setShowPassageScanner] = useState(false);
  const [showWebcamScanner, setShowWebcamScanner] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);
  const [webcamImages, setWebcamImages] = useState([]);
  const webcamRef = useRef(null);
  const webcamStreamRef = useRef(null);
  const [scanPurpose, setScanPurpose] = useState("passage");
  const [scanSessionId, setScanSessionId] = useState(null);
  const [scanQrCode, setScanQrCode] = useState("");
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanError, setScanError] = useState("");
  const scanPollingRef = useRef(null);
  const [savingPassage, setSavingPassage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedQuestionPassage, setSelectedQuestionPassage] = useState(null);
  const [selectedQuestionDate, setSelectedQuestionDate] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showAiCreate, setShowAiCreate] = useState(false);
  const [showExamDeleteModal, setShowExamDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState(null);
  const [deletingExam, setDeletingExam] = useState(false);
  const [examDeleteError, setExamDeleteError] = useState("");
  const [
    showSentenceConstructionCreate,
    setShowSentenceConstructionCreate,
  ] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishingExamId, setPublishingExamId] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("English Language");
  const [level, setLevel] = useState("O Level");
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [availableClassSubjects, setAvailableClassSubjects] = useState([]);
  const [selectedClassSubjectId, setSelectedClassSubjectId] = useState("");
  const [loadingClassSubjects, setLoadingClassSubjects] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState("60");
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [loadingExamQuestions, setLoadingExamQuestions] = useState(false);
  const [examQuestionsError, setExamQuestionsError] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [showManageQuestions, setShowManageQuestions] = useState(false);
  // Grouped question creation
  const [showCreateQuestionGroup, setShowCreateQuestionGroup] = useState(false);
  const [groupPrompt, setGroupPrompt] = useState("");
  const [selectedGroupQuestionIds, setSelectedGroupQuestionIds] = useState([]);
  const [groupQuestionError, setGroupQuestionError] = useState("");
  const [savingQuestionGroup, setSavingQuestionGroup] = useState(false);

  async function loadExams() {
    setLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/exams`,
        {},
        accessToken
      );

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
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/content/passages`,
      {},
      accessToken
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
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/content/questions`,
      {},
      accessToken
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
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/${examId}/questions`,
      {},
      accessToken
    );;

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
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/${selectedExam.id}/questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question_id: Number(selectedQuestionId),
          marks_override: null,
        }),
      },
      accessToken
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

async function generateMarkingCriteria() {
  setQuestionError("");
  setGeneratingCriteria(true);

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/content/questions/generate-marking-criteria`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: questionPrompt.trim(),
          correct_answer: questionAnswer.trim(),
          question_type: questionType,
        }),
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to generate marking criteria."
      );
    }

    const criteriaText = data.marking_criteria
      .map((item) => item.criterion)
      .join("\n");

    setQuestionCriteria(criteriaText);

  } catch (error) {
    setQuestionError(
      error.message || "Unable to generate marking criteria."
    );
  } finally {
    setGeneratingCriteria(false);
  }
}


async function createQuestionGroup() {
  setGroupQuestionError("");

  if (!selectedExam) {
    setGroupQuestionError("Please select an examination.");
    return;
  }

  if (!groupPrompt.trim()) {
    setGroupQuestionError("Enter the main question or shared instructions.");
    return;
  }

  if (selectedGroupQuestionIds.length < 2) {
    setGroupQuestionError("Select at least two questions.");
    return;
  }

  setSavingQuestionGroup(true);

  try {
    const payload = {
      prompt: groupPrompt.trim(),
      parts: selectedGroupQuestionIds.map((questionId) => ({
        question_id: Number(questionId),
        marks_override: null,
      })),
    };

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/${selectedExam.id}/question-groups`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to create question group."
      );
    }

    setGroupPrompt("");
    setSelectedGroupQuestionIds([]);
    setShowCreateQuestionGroup(false);

    await loadExamQuestions(selectedExam.id);

  } catch (err) {
    setGroupQuestionError(
      err.message || "Unable to create question group."
    );
  } finally {
    setSavingQuestionGroup(false);
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

    const response = await authenticatedFetch(
      isEditing
        ? `${API_BASE_URL}/api/content/questions/${editingQuestionId}`
        : `${API_BASE_URL}/api/content/questions`,
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      accessToken
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

const startPassageScanning = async (purpose = "passage") => {
  try {
    setScanError("");
    setScanPurpose(purpose);
    setScanStatus("creating");

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/passage-scanner/sessions`,
      {
        method: "POST",
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.detail || "Unable to start the scanning session."
      );
    }

    const session = await response.json();
    console.log("Scanning session created:", session);

    const mobileUrl = new URL(window.location.origin);
    mobileUrl.searchParams.set("scan_token", session.token);
    mobileUrl.searchParams.set("session_id", session.session_id);
    console.log("Generating QR code...");
    const qrCodeDataUrl = await QRCode.toDataURL(
      mobileUrl.toString(),
      {
        width: 280,
        margin: 2,
        errorCorrectionLevel: "M",
      }
    );
    console.log("QR code generated successfully");
    setScanSessionId(session.session_id);
    setScanQrCode(qrCodeDataUrl);
    setScanStatus("waiting");
    setShowPassageScanner(true);
    console.log("Opening scanner panel");

  } catch (error) {
    console.error("Passage scanning error:", error);
    setScanError(error.message || "Unable to start scanning.");
    setScanStatus("error");
  }
};
const startWebcam = async (purpose = "passage") => {
  try {
    setScanError("");
    setScanPurpose(purpose);
    
    setWebcamLoading(true);

    // Create a backend scanning session.
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/passage-scanner/sessions`,
      {
        method: "POST",
      },
      accessToken
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      throw new Error(
        errorData.detail || "Unable to create webcam scanning session."
      );
    }

    const session = await response.json();

    setWebcamSessionId(session.session_id);
    setWebcamScanToken(session.token);

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "Camera access is not supported. Please use HTTPS."
      );
    }

    console.log("Requesting webcam access...");

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });

    console.log("Webcam stream started:", stream);
    console.log(
      "Active video tracks:",
      stream.getVideoTracks().map((track) => ({
        label: track.label,
        readyState: track.readyState,
        settings: track.getSettings(),
      }))
    );

    webcamStreamRef.current = stream;
    setShowWebcamScanner(true);
    setWebcamActive(true);
  } catch (error) {
    console.error("Webcam error:", error);
    setScanError(
      error.message || "Unable to access your webcam."
    );
  } finally {
    setWebcamLoading(false);
  }
};

const stopWebcam = () => {
  if (webcamStreamRef.current) {
    webcamStreamRef.current
      .getTracks()
      .forEach((track) => track.stop());

    webcamStreamRef.current = null;
  }

  setWebcamActive(false);
};

const captureWebcamPage = () => {
  const video = webcamRef.current;

  if (!video || !video.videoWidth || !video.videoHeight) {
    setScanError("Webcam is not ready. Please try again.");
    return;
  }

  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const context = canvas.getContext("2d");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  canvas.toBlob((blob) => {
    if (!blob) {
      setScanError("Unable to capture the image.");
      return;
    }

    const file = new File(
      [blob],
      `webcam-page-${Date.now()}.jpg`,
      { type: "image/jpeg" }
    );

    const previewUrl = URL.createObjectURL(file);

    setWebcamImages((previous) => [
      ...previous,
      { file, previewUrl },
    ]);

    setScanError("");
  }, "image/jpeg", 0.95);
};
const uploadWebcamImages = async () => {
  if (webcamImages.length === 0) {
    setScanError("Please capture at least one page.");
    return;
  }

  if (!webcamSessionId || !webcamScanToken) {
    setScanError("Webcam scanning session is missing.");
    return;
  }

  try {
    setScanError("");
    setScanStatus("uploading");

    const formData = new FormData();

    webcamImages.forEach((image) => {
      formData.append("files", image.file);
    });

    const response = await fetch(
      `${API_BASE_URL}/api/passage-scanner/upload?session_id=${encodeURIComponent(webcamSessionId)}`,
      {
        method: "POST",
        headers: {
          "X-Scan-Token": webcamScanToken,
        },
        body: formData,
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to upload webcam images."
      );
    }

    setScanSessionId(webcamSessionId);
    setScanStatus("waiting");

    stopWebcam();
    setShowWebcamScanner(false);

    setWebcamImages((previous) => {
      previous.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
      return [];
    });

  } catch (error) {
    console.error("Webcam upload error:", error);
    setScanError(
      error.message || "Unable to upload webcam images."
    );
    setScanStatus("error");
  }
};
async function createPassage(event) {
  event.preventDefault();
  setPassageError("");
  setSavingPassage(true);

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/content/passages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: passageTitle.trim(),
          category: passageCategory.trim() || "General",
          content: passageContent.trim(),
        }),
      },
      accessToken
    );;

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
  if (
    showWebcamScanner &&
    webcamActive &&
    webcamRef.current &&
    webcamStreamRef.current
  ) {
    webcamRef.current.srcObject = webcamStreamRef.current;

    webcamRef.current.play().catch((error) => {
      console.error("Webcam preview error:", error);
      setScanError("Unable to display the webcam preview.");
    });
  }
}, [showWebcamScanner, webcamActive]);

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

useEffect(() => {
  if (!scanSessionId) {
    return;
  }

  let isActive = true;
  let isChecking = false;

  const checkScanStatus = async () => {
    if (isChecking) return;

    isChecking = true;

    try {
      console.log(
        "Checking passage scan status:",
        scanSessionId
      );
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/passage-scanner/sessions/${scanSessionId}`,
        {
          method: "GET",
        },
        accessToken
      );
      console.log(
        "Passage status HTTP response:",
        response.status
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.detail || "Unable to check scanning status."
        );
      }

      const data = await response.json();

      if (!isActive) return;

      console.log("Passage scanning status:", data);

      setScanStatus(data.status);

      if (data.status === "completed") {
        if (scanPurpose === "question") {
          setQuestionPrompt(data.extracted_text || "");
        } else if (scanPurpose === "reference_answer") {
          setQuestionAnswer(data.extracted_text || "");
        } else {
          setPassageContent(data.extracted_text || "");
        }
        setShowPassageScanner(false);
        setScanSessionId(null);
        setScanError("");
      }

      if (data.status === "failed") {
        setScanError(
          data.error || "Passage text extraction failed."
        );
      }

    } catch (error) {
      if (!isActive) return;

      console.error("Scanning status error:", error);
      setScanError(
        error.message || "Unable to check scanning status."
      );

    } finally {
      isChecking = false;
    }
  };

  checkScanStatus();

  const interval = setInterval(checkScanStatus, 2000);

  return () => {
    isActive = false;
    clearInterval(interval);
  };

}, [scanSessionId, accessToken, scanPurpose]);


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
useEffect(() => {
  if (activePage === "Student results") {
    loadStudentResults();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activePage, accessToken]);
  
  async function loadAvailableClassSubjects() {
  setLoadingClassSubjects(true);
  setError("");

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/available-class-subjects`,
      {},
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load your assigned subjects."
      );
    }

    setAvailableClassSubjects(data.items || []);
  } catch (err) {
    setError(
      err.message || "Unable to load your assigned subjects."
    );
    setAvailableClassSubjects([]);
  } finally {
    setLoadingClassSubjects(false);
  }
}
  async function loadStudentResults() {
  setLoadingStudentResults(true);
  setStudentResultsError("");

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/teacher/results`,
      {},
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load student results."
      );
    }

    setStudentResults(data.items || []);

  } catch (err) {
    setStudentResultsError(
      err.message || "Unable to load student results."
    );
    setStudentResults([]);

  } finally {
    setLoadingStudentResults(false);
  }
}

  async function allowStudentRetest(result) {
    const confirmed = window.confirm(
      `Allow ${result.student_name} to retake "${result.exam_title}"?`
    );

    if (!confirmed) return;

    setRetestLoadingAttemptId(result.attempt_id);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/exams/${result.exam_id}/students/${result.student_id}/allow-retest`,
        {
          method: "POST",
        },
        accessToken
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to grant retest permission."
        );
      }

      window.alert(
        `Retest permission granted to ${result.student_name}.`
      );

      await loadStudentResults();

    } catch (err) {
      window.alert(
        err.message || "Unable to grant retest permission."
      );
    } finally {
      setRetestLoadingAttemptId(null);
    }
  }
  function getAttemptDisplayInfo(result) {
  const relatedAttempts = studentResults
    .filter(
      (item) =>
        item.student_id === result.student_id &&
        item.exam_id === result.exam_id
    )
    .sort((a, b) => {
      const dateA = new Date(a.started_at || 0).getTime();
      const dateB = new Date(b.started_at || 0).getTime();

      return (
        dateA - dateB ||
        a.attempt_id - b.attempt_id
      );
    });

  const index = relatedAttempts.findIndex(
    (item) => item.attempt_id === result.attempt_id
  );

  return {
    attemptNumber: index + 1,
    isLatest: index === relatedAttempts.length - 1,
  };
}

async function loadAvailableClassSubjects() {
  setLoadingClassSubjects(true);
  setError("");

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/available-class-subjects`,
      {},
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load your assigned subjects."
      );
    }

    setAvailableClassSubjects(data.items || []);
  } catch (err) {
    setError(
      err.message || "Unable to load your assigned subjects."
    );
    setAvailableClassSubjects([]);
  } finally {
    setLoadingClassSubjects(false);
  }
}
  async function createExam(event) {
  event.preventDefault();
  setError("");

  if (!selectedClassSubjectId) {
    setError("Please select a subject and class.");
    return;
  }

  setSubmitting(true);

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          level: level.trim() || null,
          instructions: instructions.trim() || null,
          duration_minutes: duration ? Number(duration) : null,
          class_subject_id: Number(selectedClassSubjectId),
        }),
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to create exam.");
    }

    setExams((current) => [data, ...current]);

    // Reset the form.
    setTitle("");
    setLevel("O Level");
    setInstructions("");
    setDuration("60");
    setSelectedClassSubjectId("");

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
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/${exam.id}/publish`,
      {
        method: "POST",
      },
      accessToken
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
  async function handleExamDeleteAction(action) {
  if (!examToDelete) return;

  setDeletingExam(true);
  setExamDeleteError("");

  try {
    const endpoint =
      action === "archive"
        ? `${API_BASE_URL}/api/exams/${examToDelete.id}/archive`
        : `${API_BASE_URL}/api/exams/${examToDelete.id}`;

    const response = await authenticatedFetch(
      endpoint,
      {
        method: action === "archive" ? "POST" : "DELETE",
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to process the exam."
      );
    }

    // Remove the exam from the active dashboard list.
    setExams((current) =>
      current.filter((exam) => exam.id !== examToDelete.id)
    );

    // Reset navigation if the selected date no longer has exams.
    setShowExamDeleteModal(false);
    setExamToDelete(null);
    setExamDeleteError("");

    setSelectedExamDate(null);
    setSelectedExamSubject(null);

    setError("");
  } catch (err) {
    setExamDeleteError(
      err.message || "Unable to process the exam."
    );
  } finally {
    setDeletingExam(false);
  }
}
  const visibleExams = exams.filter((exam) =>
    `${exam.title} ${exam.subject} ${exam.level || ""} ${exam.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const availableSubjects = [
    ...new Set(
      exams
        .filter((exam) => exam.subject)
        .map((exam) => exam.subject)
    ),
  ].sort();
  const availableQuestionPassages = passages.filter((passage) =>
    questions.some(
      (question) => question.passage_id === passage.id
    )
  );

  const questionsForSelectedPassage = selectedQuestionPassage
    ? questions.filter(
        (question) =>
          question.passage_id === selectedQuestionPassage
      )
    : [];

  const availableQuestionDates = [
    ...new Set(
      questionsForSelectedPassage
        .filter((question) => question.created_at)
        .map((question) => {
          const date = new Date(question.created_at);

          return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");
        })
    ),
  ].sort((a, b) => b.localeCompare(a));

  const questionsForSelectedDate = selectedQuestionDate
    ? questionsForSelectedPassage.filter((question) => {
        if (!question.created_at) return false;

        const date = new Date(question.created_at);

        const questionDate = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");

        return questionDate === selectedQuestionDate;
      })
    : [];
  const examsForSelectedSubject = selectedExamSubject
  ? exams.filter(
      (exam) => exam.subject === selectedExamSubject
    )
  : [];

const availableExamDates = [
  ...new Set(
    examsForSelectedSubject
      .filter((exam) => exam.created_at)
      .map((exam) => {
        const date = new Date(exam.created_at);

        return [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, "0"),
          String(date.getDate()).padStart(2, "0"),
        ].join("-");
      })
  ),
].sort((a, b) => {
  const dateA = new Date(`${a}T00:00:00`);
  const dateB = new Date(`${b}T00:00:00`);

  return dateA - dateB;
});
console.log("Sorted dates:", availableExamDates);

const examsForSelectedDate = selectedExamDate
  ? examsForSelectedSubject.filter((exam) => {
      if (!exam.created_at) return false;

      const date = new Date(exam.created_at);

      const examDate = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      return examDate === selectedExamDate;
    })
  : [];
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
              <div className="exam-view-selector">
                <button
                  type="button"
                  className={
                    examView === "previous"
                      ? "teacher-primary selected"
                      : "teacher-primary"
                  }
                  onClick={() => {
                    setExamView("previous");
                    setSelectedExamSubject(null);
                    setSelectedExamDate(null);
                    setSearch("");
                  }}
                >
                  Previous Exams
                </button>

                <button
                  type="button"
                  className={
                    examView === "create"
                      ? "teacher-primary selected"
                      : "teacher-primary"
                  }
                  onClick={() => {
                    setExamView("create");
                    setSelectedExamSubject(null);
                    setSelectedExamDate(null);
                    setSearch("");
                  }}
                >
                  Create Exams
                </button>
              </div>
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
          {activePage === "Exams" && examView === "create" && (
            <section className="teacher-panel">
              <h2>Create Exams</h2>
              <p>Select how you would like to create your examination.</p>

              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "20px" }}>
                <button
                  className="teacher-primary"
                  type="button"
                  onClick={async () => {
                    setError("");
                    setSelectedClassSubjectId("");
                    setShowCreate(true);
                    await loadAvailableClassSubjects();
                  }}
                >
                  <Plus size={16} /> Create exam
                </button>

                <button
                  className="teacher-primary"
                  type="button"
                  onClick={async () => {
                    setError("");
                    setShowAiCreate(true);
                    await loadAvailableClassSubjects();
                  }}
                >
                  ✨ Create Exam Using AI
                </button>

                <button
                  className="teacher-primary"
                  type="button"
                  onClick={async () => {
                    setError("");
                    setShowSentenceConstructionCreate(true);
                    await loadAvailableClassSubjects();
                  }}
                >
                  ✨ Create Sentence Construction Exam
                </button>
              </div>
            </section>
          )}

          
          {activePage === "Exams" && examView === "previous" && (
            <section className="teacher-panel">

              {/* STEP 1: SUBJECT SELECTION */}
              {!selectedExamSubject && (
                <div className="exam-category-section">
                  <h3>Select a subject</h3>

                  {loading ? (
                    <div className="teacher-empty">Loading exams…</div>
                  ) : availableSubjects.length === 0 ? (
                    <div className="teacher-empty">
                      No subjects or exams available yet.
                    </div>
                  ) : (
                    <div className="exam-category-grid">
                      {availableSubjects.map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          className="exam-category-button"
                          onClick={() => {
                            setSelectedExamSubject(subject);
                            setSelectedExamDate(null);
                          }}
                        >
                          {subject}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: PUBLICATION DATE SELECTION */}
              {selectedExamSubject && !selectedExamDate && (
                <div className="exam-date-section">

                  <button
                    type="button"
                    className="teacher-primary"
                    onClick={() => {
                      setSelectedExamSubject(null);
                      setSelectedExamDate(null);
                    }}
                  >
                    ← Back to subjects
                  </button>

                  <h3>{selectedExamSubject} – Select a date</h3>

                  {loading ? (
                    <div className="teacher-empty">Loading exams…</div>
                  ) : availableExamDates.length === 0 ? (
                    <div className="teacher-empty">
                      No exam creation dates available.
                    </div>
                  ) : (
                    <div className="exam-category-grid">
                      {availableExamDates.map((date) => (
                        <button
                          key={date}
                          type="button"
                          className="exam-category-button"
                          onClick={() => setSelectedExamDate(date)}
                        >
                          {new Date(`${date}T00:00:00`).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: EXAMS FOR SELECTED DATE */}
              {selectedExamSubject && selectedExamDate && (
                <div className="exam-list-section">

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

                  <button
                    type="button"
                    className="teacher-primary"
                    onClick={() => setSelectedExamDate(null)}
                  >
                    ← Back to dates
                  </button>

                  <h3>
                    {selectedExamSubject} –{" "}
                    {new Date(`${selectedExamDate}T00:00:00`).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      }
                    )}
                  </h3>

                  {loading ? (
                    <div className="teacher-empty">Loading exams…</div>
                  ) : examsForSelectedDate.length === 0 ? (
                    <div className="teacher-empty">
                      No exams found for this date.
                    </div>
                  ) : (
                    <div className="teacher-table-wrap">
                      <table className="teacher-table">
                        <thead>
                          <tr>
                            <th>Exam</th>
                            <th>Level</th>
                            <th>Duration</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>

                        <tbody>
                          {examsForSelectedDate
                            .filter((exam) =>
                              exam.title?.toLowerCase().includes(search.toLowerCase())
                            )
                            .map((exam) => (
                              <tr key={exam.id}>
                                <td>
                                  <strong>{exam.title}</strong>
                                  <br />
                                  <small>ID: {exam.id}</small>
                                </td>

                                <td>{exam.level || "—"}</td>

                                <td>
                                  {exam.duration_minutes
                                    ? `${exam.duration_minutes} min`
                                    : "—"}
                                </td>

                                <td>
                                  <span className="teacher-status">
                                    {exam.status}
                                  </span>
                                </td>

                                <td>
                                  {exam.status !== "Published" && (
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
                                  )}

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

                                  <button
                                    type="button"
                                    className="teacher-danger"
                                    onClick={() => {
                                      setExamToDelete(exam);
                                      setExamDeleteError("");
                                      setShowExamDeleteModal(true);
                                    }}
                                  >
                                    Delete Exam
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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
                <label className="teacher-search">
                  <Search size={15} />
                  <input
                      type="text"
                      value={passageSearch}
                      onChange={(event) => setPassageSearch(event.target.value)}
                      placeholder="Search passages..."
                  />
              </label>

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
                ) : filteredPassages.length === 0 ? (
                    <div className="teacher-empty">
                        No matching passages found. Try a different search.
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
                        {filteredPassages.map((passage) => (
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

    {/* PAGE HEADER */}
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
          setEditingQuestionId(null);
          setQuestionPassageId("");
          setQuestionPrompt("");
          setQuestionType("Short answer");
          setQuestionOptions("");
          setQuestionAnswer("");
          setQuestionCriteria("");
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

    {/* LOADING */}
    {loadingQuestions ? (
      <div className="teacher-empty">Loading questions...</div>
    ) : (
      <>
        {/* CATEGORY SELECTION */}
        <div className="exam-view-selector">
          <button
            type="button"
            className={
              questionView === "passage"
                ? "teacher-primary selected"
                : "teacher-primary"
            }
            onClick={() => {
              setQuestionView("passage");
              setSelectedQuestionPassage(null);
              setSelectedQuestionDate(null);
            }}
          >
            Passage-based Questions
          </button>

          <button
            type="button"
            className={
              questionView === "standalone"
                ? "teacher-primary selected"
                : "teacher-primary"
            }
            onClick={() => {
              setQuestionView("standalone");
              setSelectedQuestionPassage(null);
              setSelectedQuestionDate(null);
            }}
          >
            Standalone Questions
          </button>
        </div>

        {/* ===================================== */}
        {/* PASSAGE-BASED QUESTIONS */}
        {/* ===================================== */}

        {questionView === "passage" && (
          <div>

            {/* STEP 1: SELECT PASSAGE */}
            {!selectedQuestionPassage && (
              <div className="exam-category-section">
                <h3>Select a passage</h3>

                {availableQuestionPassages.length === 0 ? (
                  <div className="teacher-empty">
                    No passages available. Create a passage first.
                  </div>
                ) : (
                  <div className="exam-category-grid">
                    {availableQuestionPassages.map((passage) => (
                      <button
                        key={passage.id}
                        type="button"
                        className="exam-category-button"
                        onClick={() => {
                          setSelectedQuestionPassage(passage.id);
                          setSelectedQuestionDate(null);
                        }}
                      >
                        {passage.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT DATE */}
            {selectedQuestionPassage && !selectedQuestionDate && (
              <div className="exam-date-section">

                <button
                  type="button"
                  className="teacher-primary"
                  onClick={() => {
                    setSelectedQuestionPassage(null);
                    setSelectedQuestionDate(null);
                  }}
                >
                  ← Back to passages
                </button>

                <h3>
                  {passages.find(
                    (p) => p.id === selectedQuestionPassage
                  )?.title || "Selected passage"} – Select a date
                </h3>

                {availableQuestionDates.length === 0 ? (
                  <div className="teacher-empty">
                    No question creation dates available.
                  </div>
                ) : (
                  <div className="exam-category-grid">
                    {availableQuestionDates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        className="exam-category-button"
                        onClick={() => setSelectedQuestionDate(date)}
                      >
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-GB",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: QUESTIONS FOR SELECTED DATE */}
            {selectedQuestionPassage && selectedQuestionDate && (
              <div className="exam-list-section">

                <button
                  type="button"
                  className="teacher-primary"
                  onClick={() => setSelectedQuestionDate(null)}
                >
                  ← Back to dates
                </button>

                <h3>
                  {passages.find(
                    (p) => p.id === selectedQuestionPassage
                  )?.title || "Selected passage"}
                  {" – "}
                  {new Date(
                    `${selectedQuestionDate}T00:00:00`
                  ).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </h3>

                {questionsForSelectedDate.length === 0 ? (
                  <div className="teacher-empty">
                    No questions found for this passage and date.
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
                        {questionsForSelectedDate.map((question) => {
                          const linkedPassage = passages.find(
                            (passage) =>
                              passage.id === question.passage_id
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
                                  : "Passage unavailable"}
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
                                    setQuestionType(
                                      question.question_type || "Short answer"
                                    );
                                    setQuestionOptions(
                                      Array.isArray(question.options)
                                        ? question.options.join("\n")
                                        : ""
                                    );
                                    setQuestionAnswer(
                                      question.correct_answer || ""
                                    );
                                    setQuestionCriteria(
                                      (question.marking_criteria || [])
                                        .map((item) =>
                                          typeof item === "string"
                                            ? item
                                            : item.criterion
                                        )
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
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* STANDALONE QUESTIONS */}
        {/* ===================================== */}

        {questionView === "standalone" && (
          <div className="exam-list-section">
            <h3>Standalone Questions</h3>

            <p>
              Questions created independently without being linked to a passage.
            </p>

            {questions.filter(
              (question) => question.passage_id == null
            ).length === 0 ? (
              <div className="teacher-empty">
                No standalone questions found. Click Create question to add one.
              </div>
            ) : (
              <div className="teacher-table-wrap">
                <table className="teacher-table">
                  <thead>
                    <tr>
                      <th>Question</th>
                      <th>Type</th>
                      <th>Marks</th>
                      <th>Marking criteria</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {questions
                      .filter(
                        (question) => question.passage_id == null
                      )
                      .map((question) => (
                        <tr key={question.id}>
                          <td>
                            <strong title={question.prompt}>
                              {question.prompt}
                            </strong>
                            <br />
                            <small>ID: {question.id}</small>
                          </td>

                          <td>{question.question_type}</td>

                          <td>{question.marks}</td>

                          <td>
                            {Array.isArray(question.marking_criteria)
                              ? `${question.marking_criteria.length} criteria`
                              : "Not available"}
                          </td>

                          <td>
                            {question.created_at
                              ? new Date(
                                  question.created_at
                                ).toLocaleDateString("en-GB")
                              : "—"}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="teacher-secondary"
                              onClick={() => {
                                setEditingQuestionId(question.id);
                                setQuestionPassageId("");
                                setQuestionPrompt(question.prompt || "");
                                setQuestionType(
                                  question.question_type || "Short answer"
                                );
                                setQuestionOptions(
                                  Array.isArray(question.options)
                                    ? question.options.join("\n")
                                    : ""
                                );
                                setQuestionAnswer(
                                  question.correct_answer || ""
                                );
                                setQuestionCriteria(
                                  (question.marking_criteria || [])
                                    .map((item) =>
                                      typeof item === "string"
                                        ? item
                                        : item.criterion
                                    )
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
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </>
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

    {!loadingStudentResults && studentResults.length > 0 && (
      <div className="teacher-results-filters">
        <div className="teacher-results-filter-header">
          <div>
            <strong>
              {filteredStudentResults.length}
            </strong>{" "}
            matching attempts
            <span>
              {" "}out of {studentResults.length}
            </span>
          </div>

          <button
            type="button"
            className="teacher-secondary"
            onClick={() => {
              setResultsDateFilter("");
              setResultsSubjectFilter("");
              setResultsClassFilter("");
              setResultsExamFilter("");
              setResultsStatusFilter("");
              setResultsSearch("");
            }}
          >
            Clear filters
          </button>
        </div>

        <div className="teacher-results-filter-grid">
          <div>
            <label className="teacher-results-filter-label">
              Submission date
            </label>
            <input
              type="date"
              className="teacher-results-filter-input"
              value={resultsDateFilter}
              onChange={(event) =>
                setResultsDateFilter(event.target.value)
              }
            />
          </div>

          <div>
            <label className="teacher-results-filter-label">
              Subject
            </label>
            <select
              className="teacher-results-filter-input"
              value={resultsSubjectFilter}
              onChange={(event) =>
                setResultsSubjectFilter(event.target.value)
              }
            >
              <option value="">All subjects</option>
              {resultSubjects.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="teacher-results-filter-label">
              Class
            </label>
            <select
              className="teacher-results-filter-input"
              value={resultsClassFilter}
              onChange={(event) =>
                setResultsClassFilter(event.target.value)
              }
            >
              <option value="">All classes</option>
              {resultClasses.map((className) => (
                <option key={className} value={className}>
                  {className}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="teacher-results-filter-label">
              Examination
            </label>
            <select
              className="teacher-results-filter-input"
              value={resultsExamFilter}
              onChange={(event) =>
                setResultsExamFilter(event.target.value)
              }
            >
              <option value="">All examinations</option>
              {resultExams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="teacher-results-filter-label">
              Evaluation status
            </label>
            <select
              className="teacher-results-filter-input"
              value={resultsStatusFilter}
              onChange={(event) =>
                setResultsStatusFilter(event.target.value)
              }
            >
              <option value="">All statuses</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="teacher-results-filter-label">
              Search student or examination
            </label>
            <input
              type="text"
              className="teacher-results-filter-input"
              value={resultsSearch}
              onChange={(event) =>
                setResultsSearch(event.target.value)
              }
              placeholder="Name, email or examination..."
            />
          </div>
        </div>
      </div>
    )}

    {loadingStudentResults ? (
      <div className="teacher-empty">
        Loading student results...
      </div>
    ) : studentResults.length === 0 ? (
      <div className="teacher-empty">
        No submitted student attempts found for your assigned subjects.
      </div>
    ) : (
      <div className="teacher-table-wrap">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Exam</th>
              <th>Subject / Class</th>
              <th>Submitted</th>
              <th>Marks</th>
              <th>Evaluation</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredStudentResults.map((result) => (
              <tr key={result.attempt_id}>
                <td>
                  <strong>{result.student_name}</strong>
                  <br />
                  <small>{result.student_email}</small>
                </td>

                <td>
                  <strong>{result.exam_title}</strong>
                  <br />

                  <small>
                    Attempt {getAttemptDisplayInfo(result).attemptNumber}
                  </small>

                  <br />

                  <span
                    style={{
                      display: "inline-block",
                      marginTop: "5px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      fontSize: "11px",
                      fontWeight: 600,
                      background: getAttemptDisplayInfo(result).isLatest
                        ? "#e6f4ea"
                        : "#f1f5f9",
                      color: getAttemptDisplayInfo(result).isLatest
                        ? "#237a43"
                        : "#64748b",
                    }}
                  >
                    {getAttemptDisplayInfo(result).isLatest
                      ? "Latest Attempt"
                      : "Previous Attempt"}
                  </span>
                </td>

                <td>
                  {result.subject_name}
                  <br />
                  <small>{result.class_name}</small>
                </td>

                <td>
                  {result.submitted_at
                    ? new Date(result.submitted_at).toLocaleDateString()
                    : "—"}
                </td>

                <td>
                  {result.evaluation_status === "completed"
                    ? `${result.evaluation_summary.marks_awarded} / ${result.evaluation_summary.max_marks}`
                    : result.evaluation_status === "pending"
                      ? "Pending"
                      : result.evaluation_status === "failed"
                        ? "Failed"
                        : "—"}
                </td>

                <td>
                  <span className="teacher-status">
                    {result.evaluation_status}
                  </span>
                </td>

                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      className="teacher-primary"
                      onClick={() => {
                        setCurrentReviewQuestionIndex(0);
                        setSelectedStudentResult(result);
                      }}
                    >
                      View results
                    </button>

                    <button
                      type="button"
                      className="teacher-primary"
                      disabled={retestLoadingAttemptId === result.attempt_id}
                      onClick={() => allowStudentRetest(result)}
                    >
                      {retestLoadingAttemptId === result.attempt_id
                        ? "Granting..."
                        : "Allow Retest"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          {filteredStudentResults.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{
                  padding: "30px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                No examination results match your selected filters.
              </td>
            </tr>
          )}
          </tbody>
        </table>
      </div>
    )}

    {/* INDIVIDUAL STUDENT RESULT REVIEW */}
    
    {selectedStudentResult && (
      <div
        onClick={() => setSelectedStudentResult(null)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
          background: "rgba(15, 23, 42, 0.60)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          overflowY: "auto",
        }}
      >
        <section
          className="teacher-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-result-dialog-title"
          onClick={(event) => event.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "1100px",
            maxHeight: "calc(100vh - 48px)",
            overflowY: "auto",
            margin: "auto",
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >

        <div className="teacher-panel-head">
          <div>
            <h2 id="student-result-dialog-title">
              {selectedStudentResult.student_name}
            </h2>
            <p>
              {selectedStudentResult.exam_title}
              {" · "}
              {selectedStudentResult.subject_name}
              {" · "}
              {selectedStudentResult.class_name}
            </p>
          </div>

          <button
            type="button"
            className="teacher-secondary"
            onClick={() => setSelectedStudentResult(null)}
          >
            Close review
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div className="teacher-stats">
            <article className="teacher-stat">
              <span>Marks awarded</span>
              <strong>
                {selectedStudentResult.evaluation_summary.marks_awarded}
                {" / "}
                {selectedStudentResult.evaluation_summary.max_marks}
              </strong>
            </article>

            <article className="teacher-stat">
              <span>Evaluations completed</span>
              <strong>
                {selectedStudentResult.evaluation_summary.completed}
                {" / "}
                {selectedStudentResult.evaluation_summary.total}
              </strong>
            </article>

            <article className="teacher-stat">
              <span>Evaluation status</span>
              <strong>
                {selectedStudentResult.evaluation_status}
              </strong>
            </article>
          </div>

          <h3 style={{ marginTop: "25px", fontSize: "15px" }}>
            Question-by-question review
          </h3>

          {selectedStudentResult.question_results?.length > 0 && (
  <>
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "20px",
        marginBottom: "15px",
      }}
    >
      <strong>
        Question {currentReviewQuestionIndex + 1} of{" "}
        {selectedStudentResult.question_results.length}
      </strong>

      <span className="teacher-status">
        {selectedStudentResult.evaluation_status}
      </span>
    </div>

    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "20px",
      }}
    >
      <h4 style={{ fontSize: "14px", marginBottom: "12px" }}>
        Question{" "}
        {selectedStudentResult.question_results[currentReviewQuestionIndex].display_number ??
          selectedStudentResult.question_results[currentReviewQuestionIndex].position ??
          currentReviewQuestionIndex + 1}
        {selectedStudentResult.question_results[currentReviewQuestionIndex].part_label
          ? `(${selectedStudentResult.question_results[currentReviewQuestionIndex].part_label})`
          : ""}
      </h4>

      <p style={{ fontWeight: 600 }}>
        {selectedStudentResult.question_results[currentReviewQuestionIndex].prompt}
      </p>

      <div style={{ marginTop: "20px" }}>
        <strong>Your student's answer</strong>

        <p style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
          {selectedStudentResult.question_results[currentReviewQuestionIndex].answer_text ||
            "No answer submitted."}
        </p>
      </div>
      
      {selectedStudentResult.question_results[currentReviewQuestionIndex].sentence_construction_data ? (
        <>
          {(() => {
            const currentQuestion =
              selectedStudentResult.question_results[currentReviewQuestionIndex];

            const sentenceData = currentQuestion.sentence_construction_data;

            const evaluation =
              currentQuestion.sentence_construction_evaluation || {};

            const achievedLevel = evaluation.highest_level ?? 0;

            return (
              <>
                <div style={{ marginTop: "20px" }}>
                  <strong>Target vocabulary</strong>
                  <p>{sentenceData.target_word}</p>

                  <strong>Intended meaning</strong>
                  <p>{sentenceData.intended_meaning}</p>
                </div>

                <h3 style={{ marginTop: "25px" }}>
                  Four Levels of Sentence Development
                </h3>

                {sentenceData.levels?.map((level) => {
                  const isCurrentLevel =
                    level.level === achievedLevel;

                  const isAchieved =
                    level.level <= achievedLevel;

                  return (
                    <div
                      key={level.level}
                      style={{
                        marginTop: "14px",
                        padding: "18px",
                        borderRadius: "8px",
                        background: isCurrentLevel
                          ? "#ecfdf5"
                          : "#f8fafc",
                        border: isCurrentLevel
                          ? "2px solid #26966b"
                          : "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <strong>Level {level.level}</strong>
                        <strong>{level.level} / 4 marks</strong>
                      </div>

                      <p>
                        <strong>{level.description}</strong>
                      </p>

                      <p>{level.example}</p>

                      {isCurrentLevel && (
                        <strong style={{ color: "#15803d" }}>
                          ✓ Student's achieved level
                        </strong>
                      )}

                      {!isCurrentLevel && isAchieved && (
                        <span style={{ color: "#15803d" }}>
                          ✓ Achieved
                        </span>
                      )}
                    </div>
                  );
                })}

                {evaluation.next_level_sentence && (
                  <div
                    style={{
                      marginTop: "20px",
                      padding: "18px",
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      borderRadius: "8px",
                    }}
                  >
                    <h4>Suggested Next-Level Sentence</h4>

                    <p>{evaluation.next_level_sentence}</p>

                    <p>{evaluation.next_level_explanation}</p>
                  </div>
                )}

                {evaluation.level_4_model_example && (
                  <div style={{ marginTop: "20px" }}>
                    <h4>Level 4 Model Example</h4>

                    <p>{evaluation.level_4_model_example}</p>

                    <p>{evaluation.level_4_model_explanation}</p>
                  </div>
                )}
              </>
            );
          })()}
        </>
      ) : (
        <>
          {/* Existing conventional examination review */}

          {/* REFERENCE ANSWER */}
          <div style={{ marginTop: "20px" }}>
            <strong>Reference answer</strong>

            <p
              style={{
                marginTop: "8px",
                whiteSpace: "pre-wrap",
                lineHeight: "1.6",
              }}
            >
              {selectedStudentResult.question_results[currentReviewQuestionIndex].reference_answer ||
                "No reference answer available."}
            </p>
          </div>

          {/* MARKING CRITERIA */}
          <div style={{ marginTop: "20px" }}>
            <strong>Marking criteria</strong>

            {selectedStudentResult.question_results[currentReviewQuestionIndex].marking_criteria?.length > 0 ? (
              <ol style={{ marginTop: "8px", paddingLeft: "22px", lineHeight: "1.8" }}>
                {selectedStudentResult.question_results[currentReviewQuestionIndex].marking_criteria.map(
                  (criterion, index) => (
                    <li key={index}>
                      {typeof criterion === "string"
                        ? criterion
                        : criterion.criterion || criterion.description || "Criterion unavailable"}

                      {typeof criterion === "object" && criterion?.marks != null
                        ? ` (${criterion.marks} marks)`
                        : ""}
                    </li>
                  )
                )}
              </ol>
            ) : (
              <p style={{ marginTop: "8px" }}>
                No marking criteria available.
              </p>
            )}
          </div>
        </>
      )}


      <div style={{ marginTop: "20px" }}>
        <strong>Marks</strong>

        <p style={{ marginTop: "8px" }}>
          {selectedStudentResult.question_results[currentReviewQuestionIndex].evaluation_status === "completed"
            ? `${selectedStudentResult.question_results[currentReviewQuestionIndex].marks_awarded} / ${selectedStudentResult.question_results[currentReviewQuestionIndex].max_marks}`
            : `Evaluation ${selectedStudentResult.question_results[currentReviewQuestionIndex].evaluation_status}`}
        </p>
      </div>

      {selectedStudentResult.question_results[currentReviewQuestionIndex].feedback && (
        <div style={{ marginTop: "20px" }}>
          <strong>AI feedback</strong>

          <p style={{ marginTop: "8px", whiteSpace: "pre-wrap" }}>
            {selectedStudentResult.question_results[currentReviewQuestionIndex].feedback}
          </p>
        </div>
      )}
    </div>

    {/* QUESTION NAVIGATION */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: "20px",
      }}
    >
      <button
        type="button"
        className="teacher-secondary"
        disabled={currentReviewQuestionIndex === 0}
        onClick={() =>
          setCurrentReviewQuestionIndex((current) =>
            Math.max(0, current - 1)
          )
        }
      >
        Previous
      </button>

      <strong>
      Review item {currentReviewQuestionIndex + 1} of{" "}
      {selectedStudentResult.question_results.length}
    </strong>

      <button
        type="button"
        className="teacher-primary"
        disabled={
          currentReviewQuestionIndex >=
          selectedStudentResult.question_results.length - 1
        }
        onClick={() =>
          setCurrentReviewQuestionIndex((current) =>
            Math.min(
              selectedStudentResult.question_results.length - 1,
              current + 1
            )
          )
        }
      >
        Next
      </button>
    </div>
  </>
)}
        </div>
          </section>
  </div>
)}
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
      <div style={{ marginBottom: "18px" }}>
        <button
          type="button"
          className="teacher-primary"
          onClick={() => {
            setGroupPrompt("");
            setSelectedGroupQuestionIds([]);
            setGroupQuestionError("");
            setShowCreateQuestionGroup(true);
          }}
        >
          Create Question Group
        </button>

        <p className="teacher-description">
          Combine multiple existing questions into one numbered
          question with parts such as (a), (b) and (c).
        </p>
      </div>
      
      {showCreateQuestionGroup && (
        <div
          style={{
            marginBottom: "22px",
            padding: "20px",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            background: "#f8fafc",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Create Grouped Question
          </h3>

          <p className="teacher-description">
            Enter the main question or shared instructions, then select
            at least two existing questions to create its parts.
          </p>

          <label className="teacher-field">
            Main question / shared instructions
            <textarea
              value={groupPrompt}
              onChange={(event) =>
                setGroupPrompt(event.target.value)
              }
              rows={3}
              maxLength={10000}
              placeholder="Enter the introductory question or shared instructions..."
            />
          </label>

          <h4>Select question parts</h4>

          <p className="teacher-description">
            The selected questions will automatically become parts
            (a), (b), (c), etc., in the order you select them.
          </p>

          <div
            style={{
              display: "grid",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            {questions
              .filter(
                (question) =>
                  !examQuestions.some(
                    (item) => item.question_id === question.id
                  )
              )
              .map((question) => {
                const questionId = String(question.id);

                const isSelected =
                  selectedGroupQuestionIds.includes(questionId);

                return (
                  <label
                    key={question.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      padding: "12px",
                      background: isSelected ? "#eff6ff" : "#ffffff",
                      border: isSelected
                        ? "1px solid #285b71"
                        : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => {
                        setSelectedGroupQuestionIds((current) =>
                          event.target.checked
                            ? [...current, questionId]
                            : current.filter(
                                (id) => id !== questionId
                              )
                        );
                      }}
                      style={{ marginTop: "4px" }}
                    />

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>
                        Question ID {question.id}
                      </div>

                      <div style={{ marginTop: "5px" }}>
                        {question.prompt}
                      </div>

                      <small style={{ color: "#64748b" }}>
                        {question.question_type}
                        {" · "}
                        {question.marks} marks
                      </small>
                    </div>
                  </label>
                );
              })}

            {!loadingQuestions &&
              questions.filter(
                (question) =>
                  !examQuestions.some(
                    (item) => item.question_id === question.id
                  )
              ).length === 0 && (
                <p>
                  No unassigned questions are available.
                </p>
              )}
          </div>

          <div
            style={{
              marginTop: "18px",
              padding: "12px",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <strong>
              Selected parts: {selectedGroupQuestionIds.length}
            </strong>

            <p style={{ marginBottom: 0, color: "#64748b" }}>
              Total marks:{" "}
              {questions
                .filter((question) =>
                  selectedGroupQuestionIds.includes(
                    String(question.id)
                  )
                )
                .reduce(
                  (total, question) =>
                    total + (Number(question.marks) || 0),
                  0
                )}
            </p>
          </div>

          {groupQuestionError && (
            <div
              className="teacher-notice teacher-error"
              role="alert"
              style={{ marginTop: "14px" }}
            >
              {groupQuestionError}
            </div>
          )}

          
          <div className="teacher-modal-actions">
            <button
              type="button"
              className="teacher-secondary"
              onClick={() => {
                setShowCreateQuestionGroup(false);
                setGroupQuestionError("");
              }}
              disabled={savingQuestionGroup}
            >
              Cancel
            </button>

            <button
              type="button"
              className="teacher-primary"
              onClick={createQuestionGroup}
              disabled={
                savingQuestionGroup ||
                !groupPrompt.trim() ||
                selectedGroupQuestionIds.length < 2
              }
            >
              {savingQuestionGroup ? "Saving Group..." : "Save Question Group"}
            </button>
          </div>

        </div>
      )}

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
      {showExamDeleteModal && examToDelete && (
  <div className="teacher-modal-overlay">
    <div className="teacher-modal">
      <h2>Manage Exam</h2>

      <p>
        What would you like to do with{" "}
        <strong>{examToDelete.title}</strong>?
      </p>

      <div className="exam-delete-options">
        <button
          type="button"
          className="teacher-primary"
          disabled={deletingExam}
          onClick={() => handleExamDeleteAction("archive")}
        >
          {deletingExam ? "Processing..." : "Archive Exam"}
        </button>

        <p>
          Hide this exam from the active list while preserving
          student attempts, answers, and evaluations.
        </p>

        <button
          type="button"
          className="teacher-danger"
          disabled={deletingExam}
          onClick={() => handleExamDeleteAction("delete")}
        >
          {deletingExam ? "Processing..." : "Delete Permanently"}
        </button>

        <p>
          Permanently delete the exam and its student attempts,
          submitted answers, and AI evaluations. Questions and
          passages will be preserved.
        </p>
      </div>

      {examDeleteError && (
        <div className="teacher-error">
          {examDeleteError}
        </div>
      )}

      <button
        type="button"
        className="teacher-secondary"
        disabled={deletingExam}
        onClick={() => {
          setShowExamDeleteModal(false);
          setExamToDelete(null);
          setExamDeleteError("");
        }}
      >
        Cancel
      </button>
    </div>
  </div>
)}
      {showAiCreate && (
        <AiExamGenerator
          onClose={() => setShowAiCreate(false)}
          accessToken={accessToken}
          availableClassSubjects={availableClassSubjects}
          loadingClassSubjects={loadingClassSubjects}
        />
      )}
      {showSentenceConstructionCreate && (
        <SentenceConstructionGenerator
          onClose={() => setShowSentenceConstructionCreate(false)}
          accessToken={accessToken}
          availableClassSubjects={availableClassSubjects}
          loadingClassSubjects={loadingClassSubjects}
          onExamGenerated={loadExams}
        />
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
                Level
                <input
                  value={level}
                  onChange={(event) => setLevel(event.target.value)}
                  maxLength={50}
                  placeholder="e.g. O Level"
                />
              </label>
              <label className="teacher-field">
                Subject and class

                {loadingClassSubjects ? (
                  <p>Loading your assigned subjects...</p>
                ) : availableClassSubjects.length === 0 ? (
                  <p>
                    No subjects have been assigned to you yet.
                    Please contact your institution administrator.
                  </p>
                ) : (
                  <select
                    value={selectedClassSubjectId}
                    onChange={(event) =>
                      setSelectedClassSubjectId(event.target.value)
                    }
                    required
                  >
                    <option value="">Select a subject...</option>

                    {availableClassSubjects.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.subject_name} — {item.class_name}
                      </option>
                    ))}
                  </select>
                )}
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
                <button
                  type="submit"
                  className="teacher-primary"
                  disabled={
                    submitting ||
                    loadingClassSubjects ||
                    availableClassSubjects.length === 0 ||
                    !selectedClassSubjectId
                  }
                >
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
        <div className="passage-scan-actions">
          <button
            type="button"
            className="teacher-secondary"
            onClick={startPassageScanning}
            disabled={scanStatus === "creating"}
          >
            {scanStatus === "creating"
              ? "Preparing scanner..."
              : "Scan passage with phone"}
          </button>

          <span className="passage-scan-hint">
            Scan printed pages using your mobile camera and convert them into text.
          </span>
        </div>

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
                {showPassageScanner && (
          <div className="passage-scan-panel">
            <div className="passage-scan-panel-header">
              <h3>Scan passage using your phone</h3>

              <button
                type="button"
                onClick={() => setShowPassageScanner(false)}
                aria-label="Close scanner"
              >
                <X size={18} />
              </button>
            </div>

            <p>
              Open your phone camera and scan this QR code.
            </p>

            {scanQrCode && (
              <img
                src={scanQrCode}
                alt="QR code to connect mobile scanner"
                className="passage-scan-qr"
              />
            )}

            <p>
              Waiting for your phone to upload the passage...
            </p>
          </div>
        )}
        {showWebcamScanner && (
  <div className="passage-scan-panel">
    <div className="passage-scan-panel-header">
      <h3>Scan using your webcam</h3>

      <button
        type="button"
        onClick={() => {
          stopWebcam();
          setShowWebcamScanner(false);
        }}
        aria-label="Close webcam scanner"
      >
        <X size={18} />
      </button>
    </div>

    {webcamActive && (
      <>
        <video
          ref={webcamRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            maxWidth: "650px",
            borderRadius: "10px",
            background: "#000",
          }}
        />

        <div className="passage-scan-actions">
          <button
            type="button"
            className="teacher-primary"
            onClick={captureWebcamPage}
          >
            Capture Page
          </button>

          <button
            type="button"
            className="teacher-secondary"
            onClick={stopWebcam}
          >
            Stop Camera
          </button>
        </div>
      </>
    )}

    {webcamImages.length > 0 && (
      <div>
        <h4>Captured pages: {webcamImages.length}</h4>

        {webcamImages.map((image, index) => (
          <div key={image.previewUrl}>
            <p>Page {index + 1}</p>

            <img
              src={image.previewUrl}
              alt={`Captured page ${index + 1}`}
              style={{
                width: "100%",
                maxWidth: "300px",
                borderRadius: "8px",
              }}
            />

            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(image.previewUrl);
                setWebcamImages((previous) =>
                  previous.filter((_, i) => i !== index)
                );
              }}
            >
              Remove Page
            </button>
          </div>
        ))}
      <button
        type="button"
        className="teacher-primary"
        onClick={uploadWebcamImages}
        disabled={scanStatus === "uploading"}
      >
        {scanStatus === "uploading"
          ? "Uploading Pages..."
          : "Upload All Pages"}
      </button>
      </div>
    )}
  </div>
)}

        {scanError && (
          <p className="passage-scan-error">{scanError}</p>
        )}

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

              <div className="teacher-field">
                <label htmlFor="question-prompt">Question text</label>

                <div className="passage-scan-actions">
                  <button
                    type="button"
                    className="teacher-secondary"
                    onClick={() => startPassageScanning("question")}
                    disabled={scanStatus === "creating"}
                  >
                    {scanStatus === "creating"
                      ? "Preparing scanner..."
                      : "Scan question with phone"}
                  </button>

                  <button
                    type="button"
                    className="teacher-secondary"
                    onClick={() => startWebcam("question")}
                    disabled={webcamLoading}
                  >
                    <Camera size={16} />
                    {webcamLoading ? "Preparing webcam..." : "Use Webcam"}
                  </button>

                  <span>
                    Scan a printed question using your mobile camera and convert it into text.
                  </span>
                </div>

                <textarea
                  id="question-prompt"
                  value={questionPrompt}
                  onChange={(event) => setQuestionPrompt(event.target.value)}
                  rows={3}
                  minLength={3}
                  placeholder="Enter the question shown to students..."
                  required
                />
              </div>
              {showPassageScanner && (
                <div className="passage-scan-panel">
                  <div className="passage-scan-panel-header">
                    <h3>
                      {scanPurpose === "reference_answer"
                        ? "Scan reference answer using your phone"
                        : "Scan question using your phone"}
                    </h3>

                    <button
                      type="button"
                      onClick={() => setShowPassageScanner(false)}
                      aria-label="Close scanner"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  <p>Open your phone camera and scan this QR code.</p>

                  {scanQrCode && (
                    <img
                      src={scanQrCode}
                      alt="QR code for question scanning"
                    />
                  )}

                  <p>
                    Waiting for your phone to upload the{" "}
                    {scanPurpose === "reference_answer" ? "reference answer" : "question"}...
                  </p>
                </div>
              )}

              {scanError && (
                <p className="teacher-error">{scanError}</p>
              )}


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

              <div className="teacher-field">
                <label htmlFor="reference-answer">Reference answer</label>

                <div className="passage-scan-actions">
                  <button
                    type="button"
                    className="teacher-secondary"
                    onClick={() => startPassageScanning("reference_answer")}
                    disabled={scanStatus === "creating"}
                  >
                    {scanStatus === "creating"
                      ? "Preparing scanner..."
                      : "Scan reference answer with phone"}
                  </button>
                  <button
                    type="button"
                    className="teacher-secondary"
                    onClick={() => startWebcam("reference_answer")}
                    disabled={webcamLoading}
                  >
                    <Camera size={16} />
                    {webcamLoading ? "Preparing webcam..." : "Use Webcam"}
                  </button>

                  <span>
                    Scan a handwritten or printed reference answer using your mobile camera.
                  </span>
                </div>

                <textarea
                  id="reference-answer"
                  value={questionAnswer}
                  onChange={(event) =>
                    setQuestionAnswer(event.target.value)
                  }
                  rows={4}
                  placeholder="Enter the expected answer or acceptable answer guidance..."
                  required
                />
              </div>

              <label className="teacher-field">
                Marking criteria (one criterion per line)
                <div className="passage-scan-actions">
                  <button
                    type="button"
                    className="teacher-secondary"
                    onClick={generateMarkingCriteria}
                    disabled={
                      !questionPrompt.trim() ||
                      !questionAnswer.trim() ||
                      generatingCriteria
                    }
                  >
                    {generatingCriteria
                      ? "Generating criteria..."
                      : "Generate marking criteria"}
                  </button>

                  <span>
                    Generate suggested marking criteria using the question and reference answer.
                  </span>
                </div>
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
