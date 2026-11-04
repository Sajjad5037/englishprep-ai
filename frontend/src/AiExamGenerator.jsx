
import { useState } from "react";
import { authenticatedFetch } from "./api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

const QUESTION_TYPES = [
  "Short answer",
  "Inference",
  "Multiple choice",
  "Language analysis",
  "Vocabulary",
  "Extended response",
];

const emptyQuestionCounts = () =>
  Object.fromEntries(QUESTION_TYPES.map((type) => [type, 0]));
const emptyQuestionSelections = () =>
  Object.fromEntries(
    QUESTION_TYPES.map((type) => [type, false])
  );
  const emptyQuestionMarks = () =>
  Object.fromEntries(
    QUESTION_TYPES.map((type) => [type, 1])
  );
const inputStyle = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid #dce4eb",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};

const sectionStyle = {
  padding: "20px",
  marginTop: "20px",
  border: "1px solid #e2e8f0",
  borderRadius: "10px",
};

export default function AiExamGenerator({
  onClose,
  accessToken,
  availableClassSubjects = [],
  loadingClassSubjects = false,
}) {
  const [level, setLevel] = useState("");
  const [topic, setTopic] = useState("");
  const [classSubjectId, setClassSubjectId] = useState("");
  const [includePassages, setIncludePassages] = useState("yes");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generationResult, setGenerationResult] = useState(null);

  const [passageCount, setPassageCount] = useState(1);

  const [passageBlueprints, setPassageBlueprints] = useState([
    emptyQuestionCounts(),
  ]);

  const [passageQuestionSelections, setPassageQuestionSelections] =
    useState([emptyQuestionSelections()]);

  const [passageQuestionMarks, setPassageQuestionMarks] =
    useState([emptyQuestionMarks()]);

  const [standaloneCounts, setStandaloneCounts] = useState(
    emptyQuestionCounts()
  );

  const [standaloneQuestionSelections, setStandaloneQuestionSelections] =
    useState(emptyQuestionSelections());
  
  const [standaloneQuestionMarks, setStandaloneQuestionMarks] =
    useState(emptyQuestionMarks());

  const updatePassageCount = (value) => {
  const count = Math.min(10, Math.max(1, Number(value) || 1));

  setPassageCount(count);

  setPassageBlueprints((previous) =>
    Array.from(
      { length: count },
      (_, index) => previous[index] || emptyQuestionCounts()
    )
  );

  setPassageQuestionSelections((previous) =>
    Array.from(
      { length: count },
      (_, index) => previous[index] || emptyQuestionSelections()
    )
  );

  setPassageQuestionMarks((previous) =>
    Array.from(
      { length: count },
      (_, index) => previous[index] || emptyQuestionMarks()
    )
  );
};
  const updatePassageQuestionSelection = (
  passageIndex,
  questionType,
  enabled
) => {
  setPassageQuestionSelections((previous) =>
    previous.map((selection, index) =>
      index === passageIndex
        ? {
            ...selection,
            [questionType]: enabled,
          }
        : selection
    )
  );

  setPassageBlueprints((previous) =>
    previous.map((blueprint, index) =>
      index === passageIndex
        ? {
            ...blueprint,
            [questionType]: enabled
              ? blueprint[questionType] || 1
              : 0,
          }
        : blueprint
    )
  );
};

const updateStandaloneQuestionSelection = (
  questionType,
  enabled
) => {
  setStandaloneQuestionSelections((previous) => ({
    ...previous,
    [questionType]: enabled,
  }));

  setStandaloneCounts((previous) => ({
    ...previous,
    [questionType]: enabled ? 1 : 0,
  }));
};

  const updatePassageQuestionCount = (
    passageIndex,
    questionType,
    value
  ) => {
    const count = Math.min(100, Math.max(0, Number(value) || 0));

    setPassageBlueprints((previous) =>
      previous.map((blueprint, index) =>
        index === passageIndex
          ? { ...blueprint, [questionType]: count }
          : blueprint
      )
    );
  };

  const updateStandaloneCount = (questionType, value) => {
    const count = Math.min(100, Math.max(0, Number(value) || 0));

    setStandaloneCounts((previous) => ({
      ...previous,
      [questionType]: count,
    }));
  };
  const updatePassageQuestionMark = (
    passageIndex,
    questionType,
    value
  ) => {
    const marks = Math.min(100, Math.max(1, Number(value) || 1));

    setPassageQuestionMarks((previous) =>
      previous.map((item, index) =>
        index === passageIndex
          ? { ...item, [questionType]: marks }
          : item
      )
    );
  };

  const updateStandaloneQuestionMark = (questionType, value) => {
    const marks = Math.min(100, Math.max(1, Number(value) || 1));

    setStandaloneQuestionMarks((previous) => ({
      ...previous,
      [questionType]: marks,
    }));
  };

  const passageQuestionTotal = passageBlueprints.reduce(
    (total, blueprint) =>
      total +
      Object.values(blueprint).reduce(
        (sum, count) => sum + count,
        0
      ),
    0
  );

  const standaloneQuestionTotal = Object.values(
    standaloneCounts
  ).reduce((sum, count) => sum + count, 0);

  const totalQuestions =
    includePassages === "yes"
      ? passageQuestionTotal
      : standaloneQuestionTotal;
  
  const passageTotalMarks = passageBlueprints.reduce(
    (total, blueprint, passageIndex) =>
      total +
      QUESTION_TYPES.reduce(
        (sum, type) =>
          sum +
          (blueprint[type] || 0) *
            (passageQuestionMarks[passageIndex]?.[type] || 0),
        0
      ),
    0
  );

  const standaloneTotalMarks = QUESTION_TYPES.reduce(
    (total, type) =>
      total +
      (standaloneCounts[type] || 0) *
        (standaloneQuestionMarks[type] || 0),
    0
  );

  const totalExamMarks =
    includePassages === "yes"
      ? passageTotalMarks
      : standaloneTotalMarks;

  const selectedClassSubject = availableClassSubjects.find(
    (item) => String(item.id) === String(classSubjectId)
  );

  const handleSubmit = async (event) => {
  event.preventDefault();

  setGenerationError("");
  setGenerationResult(null);

  const payload = {
    class_subject_id: Number(classSubjectId),
    level: level.trim(),
    topic: topic.trim(),

    include_passages: includePassages === "yes",

    passage_count:
      includePassages === "yes" ? passageCount : 0,

    passages:
      includePassages === "yes"
        ? passageBlueprints.map((blueprint, passageIndex) => ({
            question_types: QUESTION_TYPES
              .filter(
                (type) =>
                  passageQuestionSelections[passageIndex]?.[type]
              )
              .map((type) => ({
                question_type: type,
                count: Number(blueprint[type]),
                marks_per_question: Number(
                  passageQuestionMarks[passageIndex]?.[type] || 1
                ),
              })),
          }))
        : [],

    standalone_question_types:
      includePassages === "no"
        ? QUESTION_TYPES
            .filter(
              (type) => standaloneQuestionSelections[type]
            )
            .map((type) => ({
              question_type: type,
              count: Number(standaloneCounts[type]),
              marks_per_question: Number(
                standaloneQuestionMarks[type] || 1
              ),
            }))
        : [],
  };

  setIsGenerating(true);

  try {
    const response = await authenticatedFetch(
      `${API_BASE_URL}/api/exams/ai-generate`,
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
        data.detail || "Unable to generate the examination."
      );
    }

    setGenerationResult(data);

  } catch (err) {
    setGenerationError(
      err.message || "AI examination generation failed."
    );
  } finally {
    setIsGenerating(false);
  }
};

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.60)",
        zIndex: 1000,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "20px",
      }}
    >
      <section
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          width: "100%",
          maxWidth: "950px",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: "28px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div>
            <p
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1px",
              }}
            >
              ENGLISHPREP AI
            </p>

            <h2 style={{ margin: "4px 0" }}>
              AI Exam Generator
            </h2>
          </div>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          Configure your examination structure. AI will generate
          the passages, questions, reference answers and marking
          criteria according to your requirements.
        </p>
        {generationError && (
          <div
            role="alert"
            style={{
              padding: "14px",
              marginTop: "16px",
              background: "#fef2f2",
              color: "#b42318",
              borderRadius: "8px",
            }}
          >
            {generationError}
          </div>
        )}

        {generationResult && (
          <div
            style={{
              padding: "18px",
              marginTop: "16px",
              background: "#f0f7fa",
              border: "1px solid #c8e0e9",
              borderRadius: "10px",
            }}
          >
            <h3 style={{ color: "#285b71", marginTop: 0 }}>
              Examination generated successfully!
            </h3>

            <p>
              <strong>Title:</strong> {generationResult.exam.title}
            </p>

            <p>
              <strong>Exam ID:</strong> {generationResult.exam.id}
            </p>

            <p>
              <strong>Questions:</strong> {generationResult.total_questions}
            </p>

            <p>
              <strong>Total marks:</strong> {generationResult.total_marks}
            </p>

            <p>
              <strong>Status:</strong> Draft
            </p>

            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* BASIC EXAM INFORMATION */}

          <section style={sectionStyle}>
            <h3>1. Examination Information</h3>

            <div style={{ marginTop: "18px" }}>
              <label style={{ display: "block", fontWeight: 600 }}>
                Examination level
              </label>

              <input
                style={{ ...inputStyle, marginTop: "8px" }}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder="e.g. O Level, Year 7, Year 9"
                required
              />
            </div>
            <div style={{ marginTop: "18px" }}>
              <label style={{ display: "block", fontWeight: 600 }}>
                Examination topic
              </label>

              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Describe the topic or theme for this examination..."
                rows={3}
                required
                style={{
                  ...inputStyle,
                  marginTop: "8px",
                  resize: "vertical",
                }}
              />
              <p style={{ color: "#64748b", fontSize: "13px" }}>
                AI will use this topic when generating the reading passages
                and examination questions.
              </p>
            </div>

            <div style={{ marginTop: "18px" }}>
              <label style={{ display: "block", fontWeight: 600 }}>
                Subject and class
              </label>

              <select
                style={{ ...inputStyle, marginTop: "8px" }}
                value={classSubjectId}
                onChange={(event) =>
                  setClassSubjectId(event.target.value)
                }
                required
              >
                <option value="">
                  Select subject and class
                </option>

                {availableClassSubjects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.subject_name} — {item.class_name}
                  </option>
                ))}
              </select>

              {loadingClassSubjects && (
                <p style={{ color: "#64748b" }}>
                  Loading assigned subjects...
                </p>
              )}

              {!loadingClassSubjects &&
                availableClassSubjects.length === 0 && (
                  <p style={{ color: "#b42318" }}>
                    No subject/class assignments are available.
                  </p>
                )}
            </div>
          </section>

          {/* PASSAGE CONFIGURATION */}

          <section style={sectionStyle}>
            <h3>2. Reading Passage Configuration</h3>

            <p style={{ color: "#64748b" }}>
              Should this examination include reading passages?
            </p>

            <div
              style={{
                display: "flex",
                gap: "24px",
                marginTop: "16px",
              }}
            >
              {["yes", "no"].map((value) => (
                <label
                  key={value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name="includePassages"
                    value={value}
                    checked={includePassages === value}
                    onChange={(event) =>
                      setIncludePassages(event.target.value)
                    }
                  />

                  {value === "yes" ? "Yes" : "No"}
                </label>
              ))}
            </div>

            {includePassages === "yes" && (
              <div style={{ marginTop: "22px" }}>
                <label style={{ display: "block", fontWeight: 600 }}>
                  Number of reading passages
                </label>

                <input
                  type="number"
                  min="1"
                  max="10"
                  style={{ ...inputStyle, marginTop: "8px", maxWidth: "160px" }}
                  value={passageCount}
                  onChange={(event) =>
                    updatePassageCount(event.target.value)
                  }
                />

                <p style={{ color: "#64748b", fontSize: "13px" }}>
                  You can configure a different question distribution
                  for every passage.
                </p>
              </div>
            )}
          </section>

          {/* PASSAGE QUESTION BLUEPRINTS */}

          {includePassages === "yes" && (
            <section style={sectionStyle}>
              <h3>3. Question Distribution Per Passage</h3>

              {passageBlueprints.map((blueprint, passageIndex) => {
                const passageTotal = Object.values(
                  blueprint
                ).reduce((sum, count) => sum + count, 0);

                return (
                  <div
                    key={passageIndex}
                    style={{
                      marginTop: "20px",
                      padding: "20px",
                      border: "1px solid #dce4eb",
                      borderRadius: "10px",
                    }}
                  >
                    <h4>
                      Passage {passageIndex + 1}
                    </h4>

                    <p style={{ color: "#64748b", fontSize: "13px" }}>
                      Specify how many questions should be generated
                      from this passage.
                    </p>

                    {QUESTION_TYPES.map((type) => {
                      const isSelected =
                        passageQuestionSelections[passageIndex]?.[type] || false;

                      return (
                        <div
                          key={type}
                          style={{
                            marginTop: "16px",
                            paddingBottom: "14px",
                            borderBottom: "1px solid #eef2f6",
                          }}
                        >
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) =>
                                updatePassageQuestionSelection(
                                  passageIndex,
                                  type,
                                  event.target.checked
                                )
                              }
                            />

                            {type}
                          </label>

                          {isSelected && (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1fr 1fr",
                                gap: "16px",
                                marginTop: "14px",
                                marginLeft: "28px",
                              }}
                            >
                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "13px",
                                  }}
                                >
                                  Number of questions
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={blueprint[type]}
                                  style={inputStyle}
                                  onChange={(event) =>
                                    updatePassageQuestionCount(
                                      passageIndex,
                                      type,
                                      event.target.value
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label
                                  style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "13px",
                                  }}
                                >
                                  Marks per question
                                </label>

                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={passageQuestionMarks[passageIndex]?.[type] ?? 1}
                                  style={inputStyle}
                                  onChange={(event) =>
                                    updatePassageQuestionMark(
                                      passageIndex,
                                      type,
                                      event.target.value
                                    )
                                  }
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <p
                      style={{
                        marginTop: "18px",
                        fontWeight: 700,
                        color: "#285b71",
                      }}
                    >
                      Questions from Passage {passageIndex + 1}:{" "}
                      {passageTotal}
                    </p>
                  </div>
                );
              })}
            </section>
          )}

          {/* STANDALONE QUESTION BLUEPRINT */}

          {includePassages === "no" && (
            <section style={sectionStyle}>
              <h3>3. Question Distribution</h3>

              <p style={{ color: "#64748b" }}>
                Specify the number of questions required for each type.
                These questions will be generated without reading passages.
              </p>

              {QUESTION_TYPES.map((type) => (
                <div
                  key={type}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px",
                    gap: "16px",
                    alignItems: "center",
                    marginTop: "14px",
                  }}
                >
                  <label>{type}</label>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={standaloneCounts[type]}
                    style={inputStyle}
                    onChange={(event) =>
                      updateStandaloneCount(type, event.target.value)
                    }
                  />
                </div>
              ))}
            </section>
          )}

          {/* EXAM SUMMARY */}

          <section
            style={{
              ...sectionStyle,
              background: "#f5f9fc",
            }}
          >
            <h3>Exam Configuration Summary</h3>

            <p>
              <strong>Level:</strong> {level || "Not selected"}
            </p>

            <p>
              <strong>Subject:</strong>{" "}
              {selectedClassSubject
                ? `${selectedClassSubject.subject_name} — ${selectedClassSubject.class_name}`
                : "Not selected"}
            </p>

            <p>
              <strong>Reading passages:</strong>{" "}
              {includePassages === "yes" ? passageCount : 0}
            </p>

            <h3 style={{ color: "#285b71" }}>
              Total Questions: {totalQuestions}
            </h3>
            <h3 style={{ color: "#285b71" }}>
              Total Examination Marks: {totalExamMarks}
            </h3>
          </section>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "24px",
            }}
          >
            <button type="button" onClick={onClose}>
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isGenerating ||
                !level.trim() ||
                !topic.trim() ||
                !classSubjectId ||
                totalQuestions === 0
              }
              style={{
                padding: "12px 20px",
                border: "none",
                borderRadius: "8px",
                background: "#285b71",
                color: "#ffffff",
                cursor: isGenerating ? "wait" : "pointer",
                opacity:
                  isGenerating ||
                  !level.trim() ||
                  !topic.trim() ||
                  !classSubjectId ||
                  totalQuestions === 0
                    ? 0.5
                    : 1,
              }}
            >
              {isGenerating
                ? "Generating examination..."
                : "Generate Examination Using AI"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
