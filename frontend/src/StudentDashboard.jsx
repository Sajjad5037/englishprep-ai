import { useEffect, useRef, useState } from "react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export default function StudentDashboard({
  user,
  accessToken,
  onLogout,
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeExam, setActiveExam] = useState(null);
const [attemptId, setAttemptId] = useState(null);
const [examQuestions, setExamQuestions] = useState([]);
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const currentQuestion = examQuestions[currentQuestionIndex];

const currentPassage =
  currentQuestion?.passage ||
  examQuestions.find((item) => item.passage)?.passage ||
  null;
const [answers, setAnswers] = useState({});
const [examLoading, setExamLoading] = useState(false);
const [examError, setExamError] = useState("");
const [savingAnswer, setSavingAnswer] = useState(false);
const [answerSaveStatus, setAnswerSaveStatus] = useState({});
const autoSaveTimerRef = useRef(null);

const [submittingAttempt, setSubmittingAttempt] = useState(false);
const [currentResultIndex, setCurrentResultIndex] = useState(-1);
const [submissionResults, setSubmissionResults] = useState(null);

  useEffect(() => {
    async function loadExams() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/api/exams/student/available`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
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
    const response = await fetch(
      `${API_BASE_URL}/api/exams/student/attempts/${exam.attempt_id}/results`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
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
    if (exam.attempt_status === "submitted") {
      throw new Error(
        "You have already submitted this exam. Please view your results."
      );
    }

    // Retrieve the published exam and its questions.
    const examResponse = await fetch(
      `${API_BASE_URL}/api/exams/student/${exam.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const examData = await examResponse.json().catch(() => ({}));

    if (!examResponse.ok) {
      throw new Error(
        examData.detail || "Unable to open this exam."
      );
    }

    // Start a new attempt or resume the existing one.
    const attemptResponse = await fetch(
      `${API_BASE_URL}/api/exams/student/${exam.id}/attempts`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
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

    setExamQuestions(
      Array.isArray(examData.items) ? examData.items : []
    );

    setAttemptId(attemptData.attempt_id);
    setAnswers(restoredAnswers);
    setCurrentQuestionIndex(0);
    setSubmissionResults(null);

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
    const response = await fetch(
      `${API_BASE_URL}/api/exams/student/attempts/${attemptId}/answers/${questionId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          answer_text: answerText,
        }),
      }
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

  async function submitExam() {
  if (!attemptId) {
    setExamError("No active exam attempt was found.");
    return;
  }

  const confirmed = window.confirm(
    "Are you sure you want to submit this exam? You will not be able to change your answers afterward."
  );

  if (!confirmed) {
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
    const response = await fetch(
      `${API_BASE_URL}/api/exams/student/attempts/${attemptId}/submit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to submit the exam.");
    }
    setSubmissionResults(data);

    window.alert("Your exam has been submitted successfully.");

    setActiveExam(null);
    setAttemptId(null);
    setExamQuestions([]);
    setAnswers({});
  } catch (err) {
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
                                Marks: {criterion.marks_awarded}
                                {" / "}
                                {criterion.max_marks}
                              </p>

                              <p>
                                {criterion.met
                                  ? "Criterion achieved"
                                  : "Criterion not achieved"}
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
        "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
      gap: "24px",
      alignItems: "start",
      marginTop: "24px",
    }}
  >
    {/* LEFT: Reading passage */}
    <section
      style={{
        padding: "22px",
        borderRadius: "12px",
        background: "#f5f7fb",
        border: "1px solid #e2e8f0",
        lineHeight: 1.8,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Reading passage</h3>

      {currentPassage ? (
        <>
          <h4>{currentPassage.title}</h4>
          <div style={{ whiteSpace: "pre-wrap" }}>
            {currentPassage.content}
          </div>
        </>
      ) : (
        <p>No reading passage is linked to this question.</p>
      )}
    </section>

    {/* RIGHT: One question at a time */}
    {currentQuestion && (
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
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Question {currentQuestion.position}
          </h3>

          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {currentQuestion.marks} marks
          </span>
        </div>

        <p style={{ lineHeight: 1.8 }}>
          {currentQuestion.prompt}
        </p>

        <label
          style={{
            display: "block",
            marginTop: "24px",
            fontWeight: 600,
          }}
        >
          Your answer

          <textarea
            value={answers[currentQuestion.question_id] || ""}
            onChange={(event) => {
              const questionId = currentQuestion.question_id;
              const latestAnswer = event.target.value;

              setAnswers((previous) => ({
                ...previous,
                [questionId]: latestAnswer,
              }));

              setAnswerSaveStatus((previous) => ({
                ...previous,
                [questionId]: "unsaved",
              }));

              // Reset the previous autosave timer.
              if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
              }

              // Save automatically one second after typing stops.
              autoSaveTimerRef.current = setTimeout(() => {
                saveStudentAnswer(questionId, latestAnswer);
              }, 1000);
            }}
            onBlur={(event) => {
              const questionId = currentQuestion.question_id;
              const latestAnswer = event.target.value;

              if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
                autoSaveTimerRef.current = null;
              }

              // Save immediately when the student leaves the answer box.
              saveStudentAnswer(questionId, latestAnswer);
            }}
            rows={8}
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
              resize: "vertical",
              boxSizing: "border-box",
            }}
          />
        </label>

        <button
          type="button"
          onClick={() =>
            saveStudentAnswer(currentQuestion.question_id)
          }
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

        {/* Previous / Next navigation */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginTop: "28px",
            paddingTop: "18px",
            borderTop: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            disabled={currentQuestionIndex === 0}
            onClick={() =>
              setCurrentQuestionIndex((index) => index - 1)
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
            {currentQuestionIndex + 1} of {examQuestions.length}
          </span>

          <button
            type="button"
            disabled={
              currentQuestionIndex === examQuestions.length - 1
            }
            onClick={() =>
              setCurrentQuestionIndex((index) => index + 1)
            }
            style={{
              padding: "10px 14px",
              border: "none",
              borderRadius: "8px",
              background: "#285b71",
              color: "#ffffff",
              cursor:
                currentQuestionIndex === examQuestions.length - 1
                  ? "not-allowed"
                  : "pointer",
              opacity:
                currentQuestionIndex === examQuestions.length - 1
                  ? 0.5
                  : 1,
            }}
          >
            Next →
          </button>
        </div>
      </section>
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
        onClick={submitExam}
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
        <h2>Available exams</h2>

        {loading && <p>Loading available exams...</p>}

        {error && (
          <p role="alert" style={{ color: "#b42318" }}>
            {error}
          </p>
        )}

        {!loading && !error && exams.length === 0 && (
          <p>
            No published exams are currently available.
          </p>
        )}

        {!loading &&
          exams.map((exam) => (
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

              <p>Subject: {exam.subject}</p>
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

    <button
            type="button"
            onClick={() => viewResults(exam)}
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
            {examLoading ? "Loading results..." : "View Results"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => startExam(exam)}
          disabled={examLoading}
          style={{
            marginTop: "12px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "8px",
            background: "#285b71",
            color: "#ffffff",
            cursor: examLoading ? "wait" : "pointer",
          }}
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
      </section>
      )}
    </main>
  );
}