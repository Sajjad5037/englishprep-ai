import { useEffect, useRef, useState } from "react";
import { authenticatedFetch } from "./api";
import QRCode from "qrcode";
import ReactMarkdown from "react-markdown";
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");
function getSubjectDisplayName(subject) {
  const name = String(subject || "").trim();

  if (name.toLowerCase() === "english language") {
    return "English";
  }

  return name || "Other";
}
function getPublishedDateKey(value) {
  if (!value) return "date-unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "date-unavailable";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatPublishedDate(dateKey) {
  if (dateKey === "date-unavailable") {
    return "Publication date unavailable";
  }

  const date = new Date(`${dateKey}T12:00:00`);

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export default function StudentDashboard({
  user,
  accessToken,
  onLogout,
}) {
  const [exams, setExams] = useState([]);
  const [answerMode, setAnswerMode] = useState({});
  const questionPromptRef = useRef(null);
  const [showQuestionAIChat, setShowQuestionAIChat] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState("");
  const aiChatBottomRef = useRef(null);
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [inactivityNoticeCount, setInactivityNoticeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [activeExam, setActiveExam] = useState(null);
  const [attemptId, setAttemptId] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  // Examination timer
  const [remainingTime, setRemainingTime] = useState(0);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [aiChatError, setAiChatError] = useState("");
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Inactivity detection
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [isInactive, setIsInactive] = useState(false);

  // Timer references
  const countdownIntervalRef = useRef(null);
  const inactivityTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const examSubmittedRef = useRef(false);


  const startPassageScanning = async (purpose = "passage") => {
  try {
    setScanError("");
    setScanPurpose(purpose);
    setScanStatus("creating");

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/passage-scanner/sessions?purpose=${encodeURIComponent(purpose)}`,
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
    mobileUrl.searchParams.set("purpose", purpose);
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
  
  
// Build navigation items: standalone questions or grouped questions.
const examDisplayItems = [];
const groupItemById = new Map();

for (const item of examQuestions) {
  // Standalone question
  if (item.group_id == null) {
    examDisplayItems.push({
      type: "single",
      key: `question-${item.question_id}`,
      position: item.position,
      question: item,
    });

    continue;
  }

  // Find or create the parent group. hello 123
  let groupItem = groupItemById.get(item.group_id);

  if (!groupItem) {
    groupItem = {
      type: "group",
      key: `group-${item.group_id}`,
      group_id: item.group_id,
      group_prompt: item.group_prompt,
      position: item.position,
      parts: [],
    };

    groupItemById.set(item.group_id, groupItem);
    examDisplayItems.push(groupItem);
  }

  // Add this question as a part of the group.
  groupItem.parts.push(item);
}
// Select the current standalone question or grouped question.
  const currentDisplayItem =
    examDisplayItems[currentQuestionIndex] || null;

  // Keep the existing currentQuestion variable available
  // for the passage and existing question-display logic.
  const currentQuestion =
    currentDisplayItem?.type === "single"
      ? currentDisplayItem.question
      : currentDisplayItem?.parts?.[0] || null;
  // Questions displayed on the current screen.
const questionsToRender =
  currentDisplayItem?.type === "group"
    ? currentDisplayItem.parts
    : currentDisplayItem?.question
      ? [currentDisplayItem.question]
      : [];

// Shared introductory text for grouped questions.
const currentGroupPrompt =
  currentDisplayItem?.type === "group"
    ? currentDisplayItem.group_prompt
    : null;

  const currentPassage =
    currentQuestion?.passage ||
    examQuestions.find((item) => item.passage)?.passage ||
    null;
  const [answers, setAnswers] = useState({});
  const [isPassageVisible, setIsPassageVisible] = useState(true);
  const [examLoading, setExamLoading] = useState(false);
  const [examError, setExamError] = useState("");
  const [savingAnswer, setSavingAnswer] = useState(false);
  const [answerSaveStatus, setAnswerSaveStatus] = useState({});
  const autoSaveTimerRef = useRef(null);
  const [scanPurpose, setScanPurpose] = useState("passage");
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanSessionId, setScanSessionId] = useState(null);
  const [scanQrCode, setScanQrCode] = useState(null);
  const [scanQuestionId, setScanQuestionId] = useState(null);
  const [showPassageScanner, setShowPassageScanner] = useState(false);

  const [submittingAttempt, setSubmittingAttempt] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [submissionResults, setSubmissionResults] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedPublishedDate, setSelectedPublishedDate] = useState(null);
  const [scanError, setScanError] = useState("");
const availableSubjects = Array.from(
  new Set(
    exams
      .map((exam) => getSubjectDisplayName(exam.subject))
      .filter(Boolean)
  )
).sort((a, b) => a.localeCompare(b));

const selectedSubjectExams = exams.filter(
  (exam) =>
    getSubjectDisplayName(exam.subject) === selectedSubject
);
const examsByPublishedDate = selectedSubjectExams.reduce(
  (groups, exam) => {
    const dateKey = getPublishedDateKey(exam.published_at);

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }

    groups[dateKey].push(exam);

    return groups;
  },
  {}
);

const sortedPublishedDates = Object.keys(
  examsByPublishedDate
).sort((a, b) => {
  if (a === "date-unavailable") return 1;
  if (b === "date-unavailable") return -1;

  return b.localeCompare(a);
});
const publishedDateNumbers = [...sortedPublishedDates]
  .sort((a, b) => a.localeCompare(b))
  .reduce((acc, dateKey, index) => {
    acc[dateKey] = index + 1;
    return acc;
  }, {});

const selectedDateExams = selectedPublishedDate
  ? examsByPublishedDate[selectedPublishedDate] || []
  : [];

async function sendAIChatMessage() {
  const message = aiChatInput.trim();

  if (!message || aiChatLoading) return;

  const previousMessages = aiChatMessages;

  setAiChatLoading(true);
  setAiChatError("");
  setAiChatInput("");

  // Display the student's message immediately.
  setAiChatMessages((prev) => [
    ...prev,
    { role: "user", content: message },
  ]);

  try {
    const currentResult =
      submissionResults.question_results[currentResultIndex];

    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/attempts/${submissionResults.attempt_id}/questions/${currentResult.question_id}/ai-chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          history: previousMessages,
        }),
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to get an AI response."
      );
    }

    setAiChatMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.reply },
    ]);
  } catch (err) {
    setAiChatError(
      err.message || "Something went wrong. Please try again."
    );
  } finally {
    setAiChatLoading(false);
  }
}
useEffect(() => {
  if (!scanSessionId || !scanQuestionId || scanPurpose !== "student_answer") {
    return;
  }

  let isActive = true;

  const checkStudentAnswerScanStatus = async () => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/passage-scanner/sessions/${scanSessionId}`,
        {
          method: "GET",
        },
        accessToken
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || "Unable to check scanning status."
        );
      }

      const data = await response.json();

      if (!isActive) return;

      setScanStatus(data.status);

      if (data.status === "completed") {
        const extractedText = data.extracted_text || "";

        setAnswers((previous) => ({
          ...previous,
          [scanQuestionId]: extractedText,
        }));
        requestAnimationFrame(() => {
          const textarea = document.querySelector(
            `textarea[data-question-id="${scanQuestionId}"]`
          );

          if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
          }
          });

        setAnswerSaveStatus((previous) => ({
          ...previous,
          [scanQuestionId]: "unsaved",
        }));

        setScanError("");
        setScanStatus("completed");
        setScanSessionId(null);
        setScanQuestionId(null);
      }

      if (data.status === "failed") {
        setScanError(data.error || "Handwritten answer extraction failed.");
        setScanSessionId(null);
        setScanQuestionId(null);
      }
    } catch (error) {
      if (!isActive) return;

      console.error("Student scanning status error:", error);
      setScanError(error.message || "Unable to check scanning status.");
    }
  };

  checkStudentAnswerScanStatus();

  const pollingInterval = setInterval(
    checkStudentAnswerScanStatus,
    3000
  );

  return () => {
    isActive = false;
    clearInterval(pollingInterval);
  };
}, [
  scanSessionId,
  scanQuestionId,
  scanPurpose,
  accessToken,
]);
useEffect(() => {
  aiChatBottomRef.current?.scrollIntoView({
    behavior: "smooth",
    block: "end",
  });
}, [aiChatMessages, aiChatLoading]);
// Countdown timer: runs only while the exam timer is active.
useEffect(() => {
  setShowQuestionAIChat(false);
  setAiChatMessages([]);
  setAiChatInput("");
  setAiChatError("");
  setAiChatLoading(false);
}, [currentResultIndex, submissionResults?.attempt_id]);
// Countdown timer
useEffect(() => {
  if (!activeExam || !isTimerRunning || remainingTime <= 0) {
    return;
  }

  countdownIntervalRef.current = setInterval(() => {
    setRemainingTime((previousTime) => {
      if (previousTime <= 1) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setIsTimerRunning(false);
        return 0;
      }

      return previousTime - 1;
    });
  }, 1000);

  return () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  };
}, [activeExam, isTimerRunning, remainingTime]);
useEffect(() => {
  if (
    !activeExam ||
    remainingTime !== 0 ||
    examSubmittedRef.current ||
    !attemptId
  ) {
    return;
  }

  examSubmittedRef.current = true;
  setShowInactivityModal(false);
  setIsInactive(false);

  submitExam(true);
}, [remainingTime, activeExam, attemptId]);
// Automatically submit the exam when the countdown reaches zero.
useEffect(() => {
  const textarea = questionPromptRef.current;

  if (!textarea) return;

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}, [questionPrompt]);
useEffect(() => {
  if (
    !activeExam ||
    remainingTime !== 0 ||
    examSubmittedRef.current ||
    !attemptId
  ) {
    return;
  }

  examSubmittedRef.current = true;
  setShowInactivityModal(false);
  setIsInactive(false);

  submitExam(true);
}, [remainingTime, activeExam]);


useEffect(() => {
  if (!activeExam || !isTimerRunning || showInactivityModal) return;

  const resetInactivityTimeout = () => {
    lastActivityRef.current = Date.now();

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    inactivityTimeoutRef.current = setTimeout(() => {
      setIsTimerRunning(false);
      setIsInactive(true);
      setInactivityNoticeCount((previous) => previous + 1);
      setShowInactivityModal(true);
    }, 2 * 60 * 1000);
  };

  const activityEvents = [
    "mousemove",
    "mousedown",
    "keydown",
    "click",
    "scroll",
    "touchstart",
  ];

  activityEvents.forEach((event) => {
    window.addEventListener(event, resetInactivityTimeout);
  });

  resetInactivityTimeout();

  return () => {
    activityEvents.forEach((event) => {
      window.removeEventListener(event, resetInactivityTimeout);
    });

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };
}, [activeExam, isTimerRunning, showInactivityModal]);

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      setError("");

      try {
        const response = await authenticatedFetch(
          `${API_BASE_URL}/api/exams/student/available`,
          {},
          accessToken
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.detail || "Unable to load available exams."
          );
        }

        setExams(Array.isArray(data.items) ? data.items : []);
      } catch (err) {
        setError(err.message || "Unable to load exams.");
      } finally {
        setLoading(false);
      }
    }

    loadExams();
  }, [accessToken]);
  
async function viewResults(exam) {
  if (!exam.attempt_id) {
    setError("No submitted exam attempt was found.");
    return;
  }

  setExamLoading(true);
  setError("");

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/attempts/${exam.attempt_id}/results`,
      {},
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to retrieve exam results."
      );
    }

    setSubmissionResults(data);

    setActiveExam(null);
    setAttemptId(null);
    setExamQuestions([]);
    setAnswers({});
  } catch (err) {
    setError(err.message || "Unable to retrieve exam results.");
  } finally {
    setExamLoading(false);
  }
}

async function startExam(exam) {
  setExamLoading(true);
  setExamError("");

  try {
    // Prevent opening an already submitted exam.
    if (
      exam.attempt_status === "submitted" &&
      !exam.retest_allowed
    ) {
      throw new Error(
        "You have already submitted this exam. Your teacher must allow a retest."
      );
    }

    // Retrieve the published exam and its questions.
    const examResponse = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/${exam.id}`,
      {},
      accessToken
    );

    const examData = await examResponse.json().catch(() => ({}));
    console.log("EXAM DATA RECEIVED:", examData);
    console.log("EXAM DETAILS:", examData.exam);

    if (!examResponse.ok) {
      throw new Error(
        examData.detail || "Unable to open this exam."
      );
    }

    // Start a new attempt or resume the existing one.
    const attemptResponse = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/${exam.id}/attempts`,
      {
        method: "POST",
      },
      accessToken
    );

    const attemptData = await attemptResponse.json().catch(() => ({}));

    if (!attemptResponse.ok) {
      throw new Error(
        attemptData.detail || "Unable to start this exam."
      );
    }

    // Restore previously saved answers.
    const restoredAnswers = {};

    if (Array.isArray(attemptData.answers)) {
      attemptData.answers.forEach((answer) => {
        restoredAnswers[answer.question_id] =
          answer.answer_text || "";
      });
    }

    setActiveExam(examData.exam);
    // Start the exam countdown using the exam duration.
    const durationInSeconds =
      Number(examData.exam.duration_minutes || 0) * 60;

    setRemainingTime(durationInSeconds);
    setIsTimerRunning(durationInSeconds > 0);
    setShowInactivityModal(false);
    setIsInactive(false);
    lastActivityRef.current = Date.now();
    examSubmittedRef.current = false;

    setExamQuestions(
      Array.isArray(examData.items) ? examData.items : []
    );

    setAttemptId(attemptData.attempt_id);
    setAnswers(restoredAnswers);
    setCurrentQuestionIndex(0);
    setSubmissionResults(null);

    // Start a fixed 2-hour examination timer.
    setRemainingTime(120 * 60);
    setIsTimerRunning(true);
    setIsInactive(false);
    setShowInactivityModal(false);
    examSubmittedRef.current = false;

  } catch (err) {
    setExamError(err.message || "Unable to start this exam.");
  } finally {
    setExamLoading(false);
  }
}

  
async function saveStudentAnswer(
  questionId,
  answerText = answers[questionId] || ""
) {
  if (!attemptId) {
    setExamError("No active exam attempt was found.");
    return false;
  }

  setSavingAnswer(true);

  setAnswerSaveStatus((previous) => ({
    ...previous,
    [questionId]: "saving",
  }));

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/attempts/${attemptId}/answers/${questionId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answer_text: answerText,
        }),
      },
      accessToken
    );
    

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to save your answer.");
    }

    setAnswerSaveStatus((previous) => ({
      ...previous,
      [questionId]: "saved",
    }));

    return true;

  } catch (err) {
    setAnswerSaveStatus((previous) => ({
      ...previous,
      [questionId]: "error",
    }));

    setExamError(err.message || "Unable to save your answer.");
    return false;

  } finally {
    setSavingAnswer(false);
  }
}

  async function submitExam(isAutomatic = false) {
  if (!attemptId) {
    setExamError("No active exam attempt was found.");
    return;
  }

  if (!isAutomatic && !showSubmitConfirmation) {
    setShowSubmitConfirmation(true);
    return;
  }

  setSubmittingAttempt(true);
  setExamError("");

  try {
    // Save the latest answer for every question first.
    for (const item of examQuestions) {
      const saved = await saveStudentAnswer(item.question_id);

      if (!saved) {
        throw new Error(
          `Unable to save Question ${item.position}. Please try again.`
        );
      }
    }

    // Submit the attempt after all answers are saved.
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/student/attempts/${attemptId}/submit`,
      {
        method: "POST",
      },
      accessToken
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to submit the exam.");
    }
    
    setSubmissionResults(data);

    // Stop all exam timers and inactivity detection.
    setIsTimerRunning(false);
    setRemainingTime(0);
    setShowInactivityModal(false);
    setIsInactive(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }

    examSubmittedRef.current = false;

    window.alert("Your exam has been submitted successfully.");

    setActiveExam(null);
    setAttemptId(null);
    setExamQuestions([]);
    setAnswers({});

  } catch (err) {
    if (isAutomatic) {
      examSubmittedRef.current = false;
    }

    setExamError(err.message || "Unable to submit the exam.");
  } finally {
    setSubmittingAttempt(false);
  }
}
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background: "#f5f7fb",
        color: "#26394d",
        fontFamily: '"Segoe UI", sans-serif',
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div>
          <h1 style={{ marginBottom: "8px" }}>Student Dashboard</h1>
          <p style={{ margin: 0, color: "#64748b" }}>
            Welcome, {user?.full_name || user?.email || "Student"}
          </p>
        </div>

        <button type="button" onClick={onLogout}>
          Sign out
        </button>
      </header>
      
      
      {/* EXAM RESULTS */}
      {submissionResults && (
        <section
          style={{
            padding: "24px",
            marginBottom: "24px",
            borderRadius: "12px",
            background: "#ffffff",
            boxShadow: "0 2px 10px #172c4010",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setSubmissionResults(null);
              setCurrentResultIndex(-1);
            }}
            style={{
              marginBottom: "20px",
              padding: "10px 16px",
              border: "1px solid #dce4eb",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#285b71",
              cursor: "pointer",
            }}
          >
            ← Back to Student Dashboard
          </button>
          {currentResultIndex === -1 ? (
            <>
              <h2>Exam Results</h2>

              <p style={{ color: "#64748b" }}>
                Your submitted answers have been evaluated.
              </p>

              <div
                style={{
                  padding: "20px",
                  background: "#f0f7fa",
                  borderRadius: "10px",
                  marginTop: "20px",
                }}
              >
                <h3>Evaluation Summary</h3>

                <p>
                  Completed:{" "}
                  {submissionResults.evaluation_summary?.completed ?? 0}
                  {" / "}
                  {submissionResults.evaluation_summary?.total ?? 0}
                </p>

                <p>
                  Failed:{" "}
                  {submissionResults.evaluation_summary?.failed ?? 0}
                </p>

                <p>
                  Pending:{" "}
                  {submissionResults.evaluation_summary?.pending ?? 0}
                </p>

                {submissionResults.question_results?.every(
                  (item) => item.status === "completed"
                ) && (
                  <h2 style={{ color: "#285b71" }}>
                    Total Score:{" "}
                    {submissionResults.question_results.reduce(
                      (total, item) =>
                        total + (item.marks_awarded ?? 0),
                      0
                    )}
                    {" / "}
                    {submissionResults.question_results.reduce(
                      (total, item) =>
                        total + (item.max_marks ?? 0),
                      0
                    )}
                  </h2>
                )}
              </div>

              {submissionResults.question_results?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentResultIndex(0)}
                  style={{
                    marginTop: "24px",
                    padding: "12px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#285b71",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Next: Review Question 1 →
                </button>
              )}
            </>
          ) : submissionResults.question_results?.[currentResultIndex] ? (
            <>
              {(() => {
                const result =
                  submissionResults.question_results[currentResultIndex];

                return (
                  <>
                    <p style={{ color: "#64748b" }}>
                      Question {currentResultIndex + 1} of{" "}
                      {submissionResults.question_results.length}
                    </p>

                    <h2>
                      Question {result.position ?? currentResultIndex + 1}
                      {" "}Evaluation
                    </h2>

                    
              {result.status === "completed" ? (
                <>
                  <h2 style={{ color: "#285b71" }}>
                    Marks: {result.marks_awarded}
                    {" / "}
                    {result.max_marks}
                  </h2>

                  {result.sentence_construction_data ? (
                    <>
                      {/* Student's submitted sentence */}
                      <h3>Your Submitted Sentence</h3>

                      <div
                        style={{
                          padding: "16px",
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          marginBottom: "20px",
                        }}
                      >
                        {result.answer_text || "No answer provided."}
                      </div>

                      {/* Four levels of sentence development */}
                      <h3>Four Levels of Sentence Development</h3>

                      <p style={{ color: "#64748b" }}>
                        Compare your sentence with the four levels to understand
                        how vocabulary and sentence construction can improve.
                      </p>

                      {(
                        result.sentence_construction_data.levels || []
                      ).map((level) => {
                        const achievedLevel =
                          result.sentence_construction_evaluation?.highest_level ?? 0;

                        const isCurrentLevel = level.level === achievedLevel;
                        const isAchieved = level.level <= achievedLevel;

                        return (
                          <div
                            key={level.level}
                            style={{
                              padding: "18px",
                              marginTop: "14px",
                              background: isCurrentLevel
                                ? "#ecfdf5"
                                : "#f8fafc",
                              borderRadius: "8px",
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
                                flexWrap: "wrap",
                                gap: "8px",
                              }}
                            >
                              <h4 style={{ margin: 0 }}>
                                Level {level.level}
                              </h4>

                              <strong>
                                {level.level} / 4 marks
                              </strong>
                            </div>

                            <p>
                              <strong>{level.description}</strong>
                            </p>

                            <p>{level.example}</p>

                            {isCurrentLevel && (
                              <span
                                style={{
                                  color: "#15803d",
                                  fontWeight: "bold",
                                }}
                              >
                                ✓ Your achieved level
                              </span>
                            )}

                            {!isCurrentLevel && isAchieved && (
                              <span style={{ color: "#15803d" }}>
                                ✓ Achieved
                              </span>
                            )}
                          </div>
                        );
                      })}

                      {/* Assessment feedback */}
                      <div style={{ marginTop: "24px" }}>
                        <h3>Assessment Feedback</h3>
                        <p>{result.feedback}</p>
                      </div>

                      {/* Next-level improvement */}
                      {result.sentence_construction_evaluation
                        ?.next_level_sentence && (
                        <div
                          style={{
                            padding: "18px",
                            marginTop: "20px",
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: "8px",
                          }}
                        >
                          <h3>Your Next-Level Sentence</h3>

                          <p>
                            {
                              result.sentence_construction_evaluation
                                .next_level_sentence
                            }
                          </p>

                          <p>
                            {
                              result.sentence_construction_evaluation
                                .next_level_explanation
                            }
                          </p>
                        </div>
                      )}

                      {/* Level 4 model explanation */}
                      {result.sentence_construction_evaluation
                        ?.level_4_model_explanation && (
                        <div style={{ marginTop: "20px" }}>
                          <h3>Understanding Level 4</h3>

                          <p>
                            {
                              result.sentence_construction_evaluation
                                .level_4_model_explanation
                            }
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Existing conventional examination results */}
                      <h3>Marking Criteria</h3>

                      {(result.criterion_results || []).map(
                        (criterion, criterionIndex) => (
                          <div
                            key={criterionIndex}
                            style={{
                              padding: "16px",
                              marginTop: "12px",
                              background: "#f8fafc",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            <h4>
                              Criterion {criterionIndex + 1}
                            </h4>

                            <p>
                              {criterion.met ? "Point identified" : "Point not identified"}
                            </p>

                            {criterion.evidence && (
                              <p>
                                <strong>Evidence:</strong>{" "}
                                {criterion.evidence}
                              </p>
                            )}

                            <p>
                              <strong>Feedback:</strong>{" "}
                              {criterion.feedback}
                            </p>
                          </div>
                        )
                      )}

                      <div style={{ marginTop: "20px" }}>
                        <h3>Overall Feedback</h3>
                        <p>{result.feedback}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAiChatMessages([]);
                          setAiChatInput("");
                          setShowQuestionAIChat(true);
                        }}
                        style={{
                          marginTop: "20px",
                          padding: "12px 20px",
                          border: "none",
                          borderRadius: "8px",
                          background: "#285b71",
                          color: "#ffffff",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        💬 Ask AI about this question
                      </button>
                      
{showQuestionAIChat && (
  <div
    style={{
      marginTop: "24px",
      border: "1px solid #dce3eb",
      borderRadius: "16px",
      background: "#ffffff",
      overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
    }}
  >
    {/* Chat Header */}
    <div
      style={{
        padding: "18px 22px",
        background: "#f8fafc",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "#e0f2fe",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "23px",
          }}
        >
          🎓
        </div>

        <div>
          <h3 style={{ margin: 0, color: "#1e293b", fontSize: "17px" }}>
            AI Learning Assistant
          </h3>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
            Understanding your exam results
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowQuestionAIChat(false)}
        style={{
          border: "1px solid #d1d5db",
          background: "#ffffff",
          color: "#475569",
          borderRadius: "8px",
          padding: "8px 13px",
          cursor: "pointer",
          fontSize: "13px",
        }}
      >
        ✕ Close
      </button>
    </div>

    {/* Messages */}
    <div
      style={{
        height: "380px",
        overflowY: "auto",
        padding: "22px",
        background: "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      {aiChatMessages.length === 0 && (
        <div
          style={{
            margin: "auto",
            textAlign: "center",
            maxWidth: "360px",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: "38px", marginBottom: "12px" }}>💬</div>
          <h3 style={{ color: "#334155", marginBottom: "8px" }}>
            Let's understand your results
          </h3>
          <p style={{ fontSize: "13px", lineHeight: 1.6 }}>
            Ask me why you received certain marks, what you missed,
            or how you can improve your answers.
          </p>
        </div>
      )}

      {aiChatMessages.map((message, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent:
              message.role === "user" ? "flex-end" : "flex-start",
          }}
        >
          <div
            style={{
              maxWidth: "85%",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "#64748b",
                textAlign: message.role === "user" ? "right" : "left",
              }}
            >
              {message.role === "user" ? "YOU" : "AI ASSISTANT"}
            </span>

            <div
              style={{
                padding: "13px 17px",
                borderRadius:
                  message.role === "user"
                    ? "16px 16px 4px 16px"
                    : "16px 16px 16px 4px",
                background:
                  message.role === "user" ? "#e0f2fe" : "#f1f5f9",
                color: "#1e293b",
                fontSize: "14px",
                lineHeight: 1.7,
                overflowWrap: "anywhere",
              }}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p style={{ margin: "0 0 10px" }}>{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ paddingLeft: "22px", margin: "8px 0" }}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ paddingLeft: "22px", margin: "8px 0" }}>
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: "5px" }}>{children}</li>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      ))}

      {/* AI Loading Indicator */}
      {aiChatLoading && (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "14px",
              background: "#f1f5f9",
              color: "#64748b",
              fontSize: "13px",
            }}
          >
            AI is thinking...
          </div>
        </div>
      )}

      <div ref={aiChatBottomRef} />
    </div>

    {/* Error */}
    {aiChatError && (
      <div
        style={{
          margin: "0 20px 12px",
          padding: "10px 14px",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#b91c1c",
          fontSize: "13px",
        }}
      >
        {aiChatError}
      </div>
    )}

    {/* Message Composer */}
    <div
      style={{
        padding: "16px 20px",
        borderTop: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "10px",
        }}
      >
        <textarea
          value={aiChatInput}
          onChange={(e) => setAiChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendAIChatMessage();
            }
          }}
          placeholder="Ask a question about your marks..."
          rows={2}
          disabled={aiChatLoading}
          style={{
            flex: 1,
            resize: "vertical",
            padding: "13px 15px",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            fontSize: "14px",
            lineHeight: 1.5,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />

        <button
          type="button"
          onClick={sendAIChatMessage}
          disabled={!aiChatInput.trim() || aiChatLoading}
          style={{
            minWidth: "95px",
            height: "45px",
            border: "none",
            borderRadius: "10px",
            background: "#285b71",
            color: "#ffffff",
            fontWeight: "600",
            fontSize: "13px",
            cursor:
              !aiChatInput.trim() || aiChatLoading
                ? "not-allowed"
                : "pointer",
            opacity:
              !aiChatInput.trim() || aiChatLoading ? 0.55 : 1,
          }}
        >
          {aiChatLoading ? "Thinking..." : "➤ Send"}
        </button>
      </div>

      <p
        style={{
          margin: "9px 0 0",
          fontSize: "11px",
          color: "#94a3b8",
          textAlign: "center",
        }}
      >
        AI explanations are based on your saved exam evaluation.
        Press Enter to send · Shift + Enter for a new line
      </p>
    </div>
  </div>
)}

                    </>
                  )}
                </>
              ) : (
                <p>
                  Evaluation status: {result.status}
                </p>
              )}

                  </>
                );
              })()}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "28px",
                  paddingTop: "20px",
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setCurrentResultIndex((index) =>
                      index === 0 ? -1 : index - 1
                    )
                  }
                  style={{
                    padding: "12px 18px",
                    border: "1px solid #dce4eb",
                    borderRadius: "8px",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  ← Previous
                </button>

                {currentResultIndex <
                submissionResults.question_results.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentResultIndex((index) => index + 1)
                    }
                    style={{
                      padding: "12px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#285b71",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setSubmissionResults(null);
                      setCurrentResultIndex(-1);
                    }}
                    style={{
                      padding: "12px 18px",
                      border: "none",
                      borderRadius: "8px",
                      background: "#285b71",
                      color: "#ffffff",
                      cursor: "pointer",
                    }}
                  >
                    Finish Review
                  </button>
                )}
              </div>
            </>
          ) : (
            <p>No question evaluation results are available.</p>
          )}
        </section>
      )}


      {activeExam && (
        
  <section
    style={{
      padding: "24px",
      marginBottom: "24px",
      borderRadius: "12px",
      background: "#ffffff",
      boxShadow: "0 2px 10px #172c4010",
    }}
  >
    <button
      type="button"
      onClick={() => {
        setIsTimerRunning(false);
        setRemainingTime(0);
        setShowInactivityModal(false);
        setIsInactive(false);

        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }

        if (inactivityTimeoutRef.current) {
          clearTimeout(inactivityTimeoutRef.current);
          inactivityTimeoutRef.current = null;
        }

        examSubmittedRef.current = false;

        setActiveExam(null);
        setAttemptId(null);
        setExamQuestions([]);
        setAnswers({});
      }}
      style={{ marginBottom: "20px" }}
    >
      Back to exams
    </button>

    <h2>{activeExam.title}</h2>

  

<div
  className="exam-timer"
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    padding: "12px 20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    width: "fit-content",
  }}
>
  {/* Time Remaining */}
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span
      style={{
        fontSize: "11px",
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
      }}
    >
      Time Remaining
    </span>

    <strong
      style={{
        fontSize: "24px",
        color: "#2563eb",
        fontWeight: "700",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {Math.floor(remainingTime / 3600)}:
      {String(Math.floor((remainingTime % 3600) / 60)).padStart(2, "0")}:
      {String(remainingTime % 60).padStart(2, "0")}
    </strong>
  </div>

  <div
    style={{
      width: "1px",
      height: "42px",
      background: "#cbd5e1",
    }}
  />

  {/* Inactivity Notices */}
  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
    <span
      style={{
        fontSize: "11px",
        fontWeight: "700",
        color: "#64748b",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
      }}
    >
      Inactivity Notices
    </span>

    <strong
      style={{
        fontSize: "24px",
        color: "#d97706",
        fontWeight: "700",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {inactivityNoticeCount}
    </strong>
  </div>
</div>




    {activeExam.instructions && (
      <p>{activeExam.instructions}</p>
    )}

    <p>
      Duration:{" "}
      {activeExam.duration_minutes
        ? `${activeExam.duration_minutes} minutes`
        : "Not specified"}
    </p>

    {examError && (
      <p role="alert" style={{ color: "#b42318" }}>
        {examError}
      </p>
    )}

    {examQuestions.length > 0 && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns:
        currentPassage && isPassageVisible
          ? "repeat(auto-fit, minmax(min(100%, 340px), 1fr))"
          : "minmax(0, 1fr)",
      gap: "24px",
      alignItems: "start",
      marginTop: "24px",
    }}
  >
    {/* LEFT: Reading passage - show only when available */}
    {currentPassage && isPassageVisible && (
  <section
    style={{
      padding: "22px",
      borderRadius: "12px",
      background: "#f5f7fb",
      border: "1px solid #e2e8f0",
      lineHeight: 1.8,
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
      }}
    >
      <h3 style={{ margin: 0 }}>Reading passage</h3>

      <button
        type="button"
        onClick={() => setIsPassageVisible((previous) => !previous)}
        style={{
          padding: "8px 14px",
          borderRadius: "8px",
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#2563eb",
          fontWeight: "600",
          cursor: "pointer",
        }}
      >
        {isPassageVisible ? "Hide passage" : "Show passage"}
      </button>
    </div>

    {isPassageVisible && (
      <>
        <h4>{currentPassage.title}</h4>

        <div style={{ whiteSpace: "pre-wrap" }}>
          {currentPassage.content}
        </div>
      </>
    )}
  </section>
)}

    {/* RIGHT: One question at a time */}
    
{currentDisplayItem && (
  <section
    style={{
      position: "sticky",
      top: "20px",
      alignSelf: "start",
      maxHeight: "calc(100vh - 40px)",
      overflowY: "auto",
      padding: "22px",
      border: "1px solid #e2e8f0",
      borderRadius: "12px",
      background: "#ffffff",
    }}
  >
    {/* Main question heading */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        alignItems: "center",
      }}
    >
      {currentPassage && !isPassageVisible && (
        <button
          type="button"
          onClick={() => setIsPassageVisible(true)}
          style={{
            padding: "8px 14px",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
            background: "#f8fafc",
            color: "#2563eb",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Show passage
        </button>
      )}
      <h3 style={{ marginTop: 0 }}>
        Question {currentQuestionIndex + 1}
      </h3>

      <span style={{ color: "#64748b", fontSize: "13px" }}>
        {questionsToRender.reduce(
          (total, question) =>
            total + (Number(question.marks) || 0),
          0
        )} marks
      </span>
    </div>

    {/* Shared parent question */}
    {currentDisplayItem.type === "group" && (
      <div
        style={{
          padding: "14px",
          marginBottom: "20px",
          background: "#f5f7fb",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
        }}
      >
        <strong>Shared instructions</strong>

        <p style={{ lineHeight: 1.8, marginBottom: 0 }}>
          {currentGroupPrompt}
        </p>
      </div>
    )}

    {/* Render every question or subquestion */}
    {questionsToRender.map((question, index) => {
      const questionId = question.question_id;
      
      const isSentenceConstruction =
        String(question.question_type || "")
          .trim()
          .toLowerCase() === "sentence construction";

      const sentenceData = question.sentence_construction_data;
      const isMultipleChoice = [
        "multiple choice",
        "mcq",
      ].includes(
        String(question.question_type || "")
          .trim()
          .toLowerCase()
      );

      const partTitle =
        currentDisplayItem.type === "group"
          ? `Question ${currentQuestionIndex + 1}(${question.part_label})`
          : `Question ${currentQuestionIndex + 1}`;

      return (
        <div
          key={questionId}
          style={{
            padding: "0",
            marginTop: index === 0 ? "0" : "22px",
            border: "none",
            borderRadius: "0",
          }}
        >
          <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
          }}
        >
          
        </div>

          <p style={{ lineHeight: 1.8, whiteSpace: "pre-line" }}>
            {question.prompt}
          </p>

          <div style={{ marginTop: "20px" }}>
            {!isSentenceConstruction && <strong>Your answer</strong>}

            {isSentenceConstruction ? (
              <div style={{ marginTop: "12px" }}>

                <div
                  style={{
                    padding: "18px",
                    background: "#f0f7fa",
                    border: "1px solid #dce8ee",
                    borderRadius: "10px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    Target word
                  </div>

                  <h3 style={{ margin: "6px 0 12px", color: "#285b71" }}>
                    {sentenceData?.target_word || "Target word unavailable"}
                  </h3>

                  <strong>Intended meaning</strong>

                  <p style={{ marginBottom: 0, lineHeight: 1.6 }}>
                    {sentenceData?.intended_meaning || ""}
                  </p>
                </div>

                <strong>Write your sentence below:</strong>

                <textarea
                  onPaste={(event) => {
                    event.preventDefault();
                  }}
                  value={answers[questionId] || ""}
                  onChange={(event) => {
                    const latestAnswer = event.target.value;
                    // Automatically expand textarea as the student types
                    event.target.style.height = "auto";
                    event.target.style.height = `${event.target.scrollHeight}px`;

                    setAnswers((previous) => ({
                      ...previous,
                      [questionId]: latestAnswer,
                    }));

                    setAnswerSaveStatus((previous) => ({
                      ...previous,
                      [questionId]: "unsaved",
                    }));

                    if (autoSaveTimerRef.current) {
                      clearTimeout(autoSaveTimerRef.current);
                    }

                    autoSaveTimerRef.current = setTimeout(() => {
                      saveStudentAnswer(questionId, latestAnswer);
                    }, 1000);
                  }}
                  onBlur={(event) => {
                    const latestAnswer = event.target.value;
                    event.target.style.height = "auto";
                    event.target.style.height = `${event.target.scrollHeight}px`;

                    if (autoSaveTimerRef.current) {
                      clearTimeout(autoSaveTimerRef.current);
                      autoSaveTimerRef.current = null;
                    }

                    saveStudentAnswer(questionId, latestAnswer);
                  }}
                  rows={4}
                  maxLength={20000}
                  placeholder="Write your original sentence here..."
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "10px",
                    padding: "12px",
                    border: "1px solid #dce4eb",
                    borderRadius: "8px",
                    font: "inherit",
                    resize: "none",
                    overflowY: "hidden",
                    boxSizing: "border-box",
                  }}
                />
              </div>

            ) : isMultipleChoice ? (
              <div
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gap: "12px",
                }}
              >
                {Array.isArray(question.options) &&
                question.options.length > 0 ? (
                  question.options.map((option, optionIndex) => {
                    const optionText =
                      typeof option === "string"
                        ? option
                        : option?.label ||
                          option?.text ||
                          option?.value ||
                          "";

                    const isSelected =
                      answers[questionId] === optionText;

                    return (
                      <label
                        key={optionIndex}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "14px",
                          border: isSelected
                            ? "2px solid #285b71"
                            : "1px solid #dce4eb",
                          borderRadius: "9px",
                          background: isSelected
                            ? "#f0f7fa"
                            : "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="radio"
                          name={`question-${questionId}`}
                          value={optionText}
                          checked={isSelected}
                          onChange={(event) => {
                            const latestAnswer =
                              event.target.value;

                            setAnswers((previous) => ({
                              ...previous,
                              [questionId]: latestAnswer,
                            }));

                            setAnswerSaveStatus((previous) => ({
                              ...previous,
                              [questionId]: "unsaved",
                            }));

                            if (autoSaveTimerRef.current) {
                              clearTimeout(autoSaveTimerRef.current);
                            }

                            autoSaveTimerRef.current = setTimeout(
                              () => {
                                saveStudentAnswer(
                                  questionId,
                                  latestAnswer
                                );
                              },
                              1000
                            );
                          }}
                          style={{
                            width: "18px",
                            height: "18px",
                            flexShrink: 0,
                            accentColor: "#285b71",
                          }}
                        />

                        <span>{optionText}</span>
                      </label>
                    );
                  })
                ) : (
                  <p>No answer options are available.</p>
                )}
              </div>
            
) : (
  <>
    <div
      style={{
        display: "flex",
        gap: "10px",
        marginTop: "12px",
        marginBottom: "10px",
      }}
    >
      <button
        type="button"
        onClick={() =>
          setAnswerMode((previous) => ({
            ...previous,
            [questionId]: "typed",
          }))
        }
        style={{
          padding: "9px 16px",
          borderRadius: "8px",
          border: "1px solid #285b71",
          background:
            answerMode[questionId] !== "handwritten"
              ? "#285b71"
              : "#ffffff",
          color:
            answerMode[questionId] !== "handwritten"
              ? "#ffffff"
              : "#285b71",
          cursor: "pointer",
        }}
      >
        Type answer
      </button>

      <button
        type="button"
        onClick={() => {
          console.log("Handwritten answer button clicked");

          setAnswerMode((previous) => ({
            ...previous,
            [questionId]: "handwritten",
          }));

          setScanQuestionId(questionId);

          console.log("Calling scanner...");
          startPassageScanning("student_answer");
        }}
        style={{
          padding: "9px 16px",
          borderRadius: "8px",
          border: "1px solid #285b71",
          background:
            answerMode[questionId] === "handwritten"
              ? "#285b71"
              : "#ffffff",
          color:
            answerMode[questionId] === "handwritten"
              ? "#ffffff"
              : "#285b71",
          cursor: "pointer",
        }}
      >
        Handwritten answer
      </button>
    </div>

    <textarea
     data-question-id={questionId}
      onPaste={(event) => {
        event.preventDefault();
      }}
      value={answers[questionId] || ""}
      onChange={(event) => {
        const latestAnswer = event.target.value;

        event.target.style.height = "auto";
        event.target.style.height = `${event.target.scrollHeight}px`;

        setAnswers((previous) => ({
          ...previous,
          [questionId]: latestAnswer,
        }));
        
        

        setAnswerSaveStatus((previous) => ({
          ...previous,
          [questionId]: "unsaved",
        }));

        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
        }

        autoSaveTimerRef.current = setTimeout(() => {
          saveStudentAnswer(questionId, latestAnswer);
        }, 1000);
      }}
      onBlur={(event) => {
        const latestAnswer = event.target.value;

        event.target.style.height = "auto";
        event.target.style.height = `${event.target.scrollHeight}px`;

        if (autoSaveTimerRef.current) {
          clearTimeout(autoSaveTimerRef.current);
          autoSaveTimerRef.current = null;
        }

        saveStudentAnswer(questionId, latestAnswer);
      }}
      rows={6}
      maxLength={20000}
      placeholder="Write your answer here..."
      style={{
        display: "block",
        width: "100%",
        marginTop: "10px",
        padding: "12px",
        border: "1px solid #dce4eb",
        borderRadius: "8px",
        font: "inherit",
        resize: "none",
        overflowY: "hidden",
        boxSizing: "border-box",
      }}
    />
  </>
)}

          </div>

          <button
            type="button"
            onClick={() => saveStudentAnswer(questionId)}
            disabled={savingAnswer}
            style={{
              marginTop: "12px",
              padding: "10px 16px",
              border: "none",
              borderRadius: "8px",
              background: "#285b71",
              color: "#ffffff",
              cursor: savingAnswer ? "wait" : "pointer",
            }}
          >
            {savingAnswer ? "Saving answer..." : "Save answer"}
          </button>
        </div>
      );
    })}
    {showPassageScanner && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.65)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "20px",
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "30px",
        textAlign: "center",
        maxWidth: "420px",
        width: "100%",
      }}
    >
      <h2>Scan Handwritten Answer using your phone camera... </h2>

      <p>
        Open your phone camera and scan this QR code.
      </p>

      {scanQrCode && (
        <img
          src={scanQrCode}
          alt="Handwritten answer scanning QR code"
          style={{
            width: "280px",
            maxWidth: "100%",
            height: "auto",
          }}
        />
      )}

      <p>Status: {scanStatus}</p>

      {scanError && (
        <p style={{ color: "red" }}>{scanError}</p>
      )}

      <button
        onClick={() => {
          setShowPassageScanner(false);
          setScanQrCode(null);
          setScanSessionId(null);
          setScanStatus("idle");
        }}
      >
        Close
      </button>
    </div>
  </div>
)}

    {/* Previous / Next / Submit navigation */}
<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginTop: "28px",
    paddingTop: "18px",
    borderTop: "1px solid #e2e8f0",
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    disabled={currentQuestionIndex === 0}
    onClick={() =>
      setCurrentQuestionIndex((index) =>
        Math.max(0, index - 1)
      )
    }
    style={{
      padding: "10px 14px",
      border: "1px solid #dce4eb",
      borderRadius: "8px",
      background: "#ffffff",
      cursor:
        currentQuestionIndex === 0
          ? "not-allowed"
          : "pointer",
      opacity: currentQuestionIndex === 0 ? 0.5 : 1,
    }}
  >
    ← Previous
  </button>

  <span style={{ color: "#64748b", fontSize: "13px" }}>
    {currentQuestionIndex + 1} of {examDisplayItems.length}
  </span>

  <button
    type="button"
    disabled={
      currentQuestionIndex === examDisplayItems.length - 1
    }
    onClick={() =>
      setCurrentQuestionIndex((index) =>
        Math.min(examDisplayItems.length - 1, index + 1)
      )
    }
    style={{
      padding: "10px 14px",
      border: "none",
      borderRadius: "8px",
      background: "#285b71",
      color: "#ffffff",
      cursor:
        currentQuestionIndex === examDisplayItems.length - 1
          ? "not-allowed"
          : "pointer",
      opacity:
        currentQuestionIndex === examDisplayItems.length - 1
          ? 0.5
          : 1,
    }}
  >
    Next →
  </button>

  <button
    type="button"
    onClick={() => setShowSubmitConfirmation(true)}
    disabled={submittingAttempt || savingAnswer}
    style={{
      padding: "10px 18px",
      border: "none",
      borderRadius: "8px",
      background: "#15803d",
      color: "#ffffff",
      fontWeight: "600",
      cursor:
        submittingAttempt || savingAnswer
          ? "not-allowed"
          : "pointer",
      opacity: submittingAttempt || savingAnswer ? 0.6 : 1,
    }}
  >
    {submittingAttempt ? "Submitting exam..." : "Submit Exam"}
  </button>
</div>
</section>
)}
 {/* Submit Exam Confirmation Popup */}
  {showSubmitConfirmation && (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100000,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          padding: "30px",
          borderRadius: "14px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 15px 45px rgba(0,0,0,0.2)",
        }}
      >
        <h2 style={{ marginTop: 0, color: "#1e293b" }}>
          Submit your exam?
        </h2>

        <p style={{ color: "#475569", lineHeight: 1.7 }}>
          Are you sure you want to submit your exam? Once submitted,
          you will not be able to change your answers.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "25px",
          }}
        >
          <button
            type="button"
            disabled={submittingAttempt}
            onClick={() => setShowSubmitConfirmation(false)}
            style={{
              padding: "11px 18px",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              background: "#ffffff",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submittingAttempt}
            onClick={() => {
              setShowSubmitConfirmation(false);
              submitExam(false);
            }}
            style={{
              padding: "11px 18px",
              border: "none",
              borderRadius: "8px",
              background: "#dc2626",
              color: "#ffffff",
              fontWeight: "600",
              cursor: submittingAttempt ? "wait" : "pointer",
            }}
          >
            {submittingAttempt ? "Submitting..." : "Yes, Submit Exam"}
          </button>
        </div>
      </div>
    </div>
  )}

  </div>
  
)}
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: "24px",
        paddingTop: "20px",
        borderTop: "1px solid #e2e8f0",
      }}
    >
      <button
        type="button"
        onClick={() => submitExam(false)}
        disabled={submittingAttempt || savingAnswer}
        style={{
          padding: "12px 20px",
          border: "none",
          borderRadius: "8px",
          background: "#285b71",
          color: "#ffffff",
          fontWeight: 600,
          cursor:
            submittingAttempt || savingAnswer ? "wait" : "pointer",
        }}
      >
        {submittingAttempt ? "Submitting exam..." : "Submit exam"}
      </button>
    </div>
        {showInactivityModal && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 99999,
            }}
          >
            <div
              style={{
                background: "white",
                padding: "30px",
                borderRadius: "12px",
                maxWidth: "420px",
                width: "90%",
                boxShadow: "0 10px 35px rgba(0, 0, 0, 0.2)",
              }}
            >
              <h2>Are you still around?</h2>

              <p>
                Your exam timer has been paused because there has been
                no mouse or keyboard activity for two minutes.
              </p>

              <p>Would you like to continue your exam?</p>

              <button
                type="button"
                onClick={() => {
                  setShowInactivityModal(false);
                  setIsInactive(false);
                  lastActivityRef.current = Date.now();
                  setIsTimerRunning(true);
                }}
              >
                Yes, I am around
              </button>
            </div>
          </div>
        )}
  </section>
)}



      
{!activeExam && !submissionResults && (
  <section
    style={{
      padding: "24px",
      borderRadius: "12px",
      background: "#ffffff",
      boxShadow: "0 2px 10px #172c4010",
    }}
  >
    {selectedSubject === null ? (
      <>
        <h2>My Subjects</h2>

        <p style={{ color: "#64748b" }}>
          Select a subject to view your exams and results.
        </p>

        {loading && <p>Loading subjects...</p>}

        {error && (
          <p role="alert" style={{ color: "#b42318" }}>
            {error}
          </p>
        )}

        {!loading && !error && availableSubjects.length === 0 && (
          <p>No subjects with published exams are currently available.</p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "20px",
            marginTop: "24px",
          }}
        >
          {availableSubjects.map((subject) => {
            const subjectExams = exams.filter(
              (exam) =>
                getSubjectDisplayName(exam.subject) === subject
            );

            const completedCount = subjectExams.filter(
              (exam) => exam.attempt_status === "submitted"
            ).length;

            return (
              <article
                key={subject}
                style={{
                  padding: "24px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  background: "#ffffff",
                }}
              >
                <h3 style={{ marginTop: 0 }}>{subject}</h3>

                <p style={{ color: "#64748b" }}>
                  {subjectExams.length} available exam(s)
                </p>

                <p style={{ color: "#64748b" }}>
                  {completedCount} completed
                </p>

                <button
                  type="button"
                  onClick={() => setSelectedSubject(subject)}
                  style={{
                    marginTop: "12px",
                    padding: "11px 18px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#285b71",
                    color: "#ffffff",
                    cursor: "pointer",
                  }}
                >
                  Open Subject →
                </button>
              </article>
            );
          })}
        </div>
      </>
    ) : (
      <>
        <button
          type="button"
          onClick={() => setSelectedSubject(null)}
          style={{
            marginBottom: "20px",
            padding: "10px 16px",
            border: "1px solid #dce4eb",
            borderRadius: "8px",
            background: "#ffffff",
            color: "#285b71",
            cursor: "pointer",
          }}
        >
          ← Back to Subjects
        </button>

        <h2>{selectedSubject}</h2>

                
        {selectedPublishedDate === null ? (
          <>
            <h3>Published Dates</h3>

            <p style={{ color: "#64748b" }}>
              Select a publication date to view its exams.
            </p>

            {sortedPublishedDates.length === 0 && (
              <p>No published exam dates are available.</p>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginTop: "20px",
              }}
            >
              {sortedPublishedDates.map((dateKey) => {
                const dateExams = examsByPublishedDate[dateKey] || [];

                return (
                  <article
                    key={dateKey}
                    style={{
                      padding: "20px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "10px",
                    }}
                  >
                    <h3 style={{ marginTop: 0 }}>
                      {publishedDateNumbers[dateKey]}
                    </h3>

                    <p style={{ color: "#64748b" }}>
                      {dateExams.length} exam(s)
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedPublishedDate(dateKey)}
                      style={{
                        padding: "10px 16px",
                        border: "none",
                        borderRadius: "8px",
                        background: "#285b71",
                        color: "#ffffff",
                        cursor: "pointer",
                      }}
                    >
                      View Exams →
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setSelectedPublishedDate(null)}
              style={{
                marginBottom: "20px",
                padding: "10px 16px",
                border: "1px solid #dce4eb",
                borderRadius: "8px",
                background: "#ffffff",
                color: "#285b71",
                cursor: "pointer",
              }}
            >
              ← Back to Published Dates
            </button>

            <h3>
              Exams published on {formatPublishedDate(selectedPublishedDate)}
            </h3>

            {selectedDateExams.map((exam) => (
              <article
                key={exam.id}
                style={{
                  padding: "18px",
                  marginTop: "14px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "10px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>{exam.title}</h3>

                <p>Level: {exam.level || "—"}</p>

                <p>
                  Duration:{" "}
                  {exam.duration_minutes
                    ? `${exam.duration_minutes} minutes`
                    : "Not specified"}
                </p>

                {exam.attempt_status === "submitted" ? (
                  <div style={{ marginTop: "12px" }}>
                    {exam.evaluation_status === "completed" && (
                      <p style={{ fontWeight: 600, color: "#285b71" }}>
                        Your score:{" "}
                        {exam.evaluation_summary?.marks_awarded ?? 0}
                        {" / "}
                        {exam.evaluation_summary?.max_marks ?? 0}
                      </p>
                    )}

                    {exam.evaluation_status === "pending" && (
                      <p>Evaluation is pending.</p>
                    )}

                    {exam.evaluation_status === "failed" && (
                      <p style={{ color: "#b42318" }}>
                        Some answers could not be evaluated.
                      </p>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => viewResults(exam)}
                        disabled={examLoading}
                      >
                        {examLoading ? "Loading results..." : "View Results"}
                      </button>

                      {exam.retest_allowed && (
                        <button
                          type="button"
                          onClick={() => startExam(exam)}
                          disabled={examLoading}
                          style={{
                            padding: "10px 16px",
                            border: "none",
                            borderRadius: "8px",
                            background: "#285b71",
                            color: "#ffffff",
                            cursor: examLoading ? "wait" : "pointer",
                          }}
                        >
                          {examLoading ? "Opening exam..." : "Retake Exam"}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startExam(exam)}
                    disabled={examLoading}
                  >
                    {examLoading
                      ? "Opening exam..."
                      : exam.attempt_status === "in_progress"
                        ? "Resume Exam"
                        : "Start Exam"}
                  </button>
                )}
              </article>
            ))}
          </>
        )}

      </>
    )}
  </section>
)}

    </main>
  );
}