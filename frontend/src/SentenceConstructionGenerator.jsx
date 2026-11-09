
import { useState } from "react";
import { authenticatedFetch } from "./api";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/$/, "");

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

export default function SentenceConstructionGenerator({
  onClose,
  accessToken,
  availableClassSubjects = [],
  loadingClassSubjects = false,
  onExamGenerated,
}) {
  const [level, setLevel] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [classSubjectId, setClassSubjectId] = useState("");

  const [teacherWords, setTeacherWords] = useState([
    { word: "", intended_meaning: "" },
  ]);

  const [aiGeneratedCount, setAiGeneratedCount] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");
  const [generationResult, setGenerationResult] = useState(null);

  const updateTeacherWord = (index, field, value) => {
    setTeacherWords((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  const addTeacherWord = () => {
    setTeacherWords((previous) => [
      ...previous,
      { word: "", intended_meaning: "" },
    ]);
  };

  const removeTeacherWord = (index) => {
    setTeacherWords((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const selectedClassSubject = availableClassSubjects.find(
    (item) => String(item.id) === String(classSubjectId)
  );

  const validTeacherWords = teacherWords
    .filter((item) => item.word.trim())
    .map((item) => ({
      word: item.word.trim(),
      intended_meaning: item.intended_meaning.trim() || null,
    }));

  const totalQuestions =
    validTeacherWords.length + Number(aiGeneratedCount || 0);

  const totalMarks = totalQuestions * 4;

  const handleSubmit = async (event) => {
    event.preventDefault();

    setGenerationError("");
    setGenerationResult(null);

    const payload = {
      class_subject_id: Number(classSubjectId),
      level: level.trim(),
      difficulty,
      teacher_words: validTeacherWords,
      ai_generated_count: Number(aiGeneratedCount),
    };

    setIsGenerating(true);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/api/exams/sentence-construction/generate`,
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
      await onExamGenerated?.();

    } catch (error) {
      setGenerationError(
        error.message || "Sentence construction generation failed."
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
              Sentence Construction Exam Generator
            </h2>
          </div>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          Create an examination that measures students' ability to
          construct increasingly developed and sophisticated sentences.
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

        <form onSubmit={handleSubmit}>
          <section style={sectionStyle}>
            <h3>1. Examination Information</h3>

            <div style={{ marginTop: "18px" }}>
              <label>Examination level</label>

              <input
                style={{ ...inputStyle, marginTop: "8px" }}
                value={level}
                onChange={(event) => setLevel(event.target.value)}
                placeholder="e.g. Year 7, Year 9, O Level"
                required
              />
            </div>

            <div style={{ marginTop: "18px" }}>
              <label>Examination difficulty</label>

              <select
                style={{ ...inputStyle, marginTop: "8px" }}
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div style={{ marginTop: "18px" }}>
              <label>Subject and class</label>

              <select
                style={{ ...inputStyle, marginTop: "8px" }}
                value={classSubjectId}
                onChange={(event) =>
                  setClassSubjectId(event.target.value)
                }
                required
              >
                <option value="">Select subject and class</option>

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

          <section style={sectionStyle}>
            <h3>2. Teacher-Provided Vocabulary</h3>

            <p style={{ color: "#64748b", fontSize: "13px" }}>
              Add words that you want students to use. You can also
              specify the intended meaning of each word.
            </p>

            {teacherWords.map((item, index) => (
              <div
                key={index}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.5fr auto",
                  gap: "12px",
                  marginTop: "16px",
                  alignItems: "end",
                }}
              >
                <div>
                  <label>Vocabulary word</label>
                  <input
                    style={{ ...inputStyle, marginTop: "7px" }}
                    value={item.word}
                    onChange={(event) =>
                      updateTeacherWord(index, "word", event.target.value)
                    }
                    placeholder="e.g. adequate"
                  />
                </div>

                <div>
                  <label>Intended meaning (optional)</label>
                  <input
                    style={{ ...inputStyle, marginTop: "7px" }}
                    value={item.intended_meaning}
                    onChange={(event) =>
                      updateTeacherWord(
                        index,
                        "intended_meaning",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Sufficient for a purpose"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeTeacherWord(index)}
                  style={{
                    padding: "11px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: "#ffffff",
                    cursor: "pointer",
                  }}
                  aria-label={`Remove vocabulary word ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={addTeacherWord}
              style={{
                marginTop: "18px",
                padding: "10px 14px",
                border: "1px solid #285b71",
                borderRadius: "8px",
                color: "#285b71",
                background: "#ffffff",
                cursor: "pointer",
              }}
            >
              + Add another word
            </button>
          </section>

          <section style={sectionStyle}>
            <h3>3. AI-Generated Vocabulary</h3>

            <p style={{ color: "#64748b", fontSize: "13px" }}>
              Ask AI to select additional vocabulary suitable for
              the examination level and difficulty.
            </p>

            <div style={{ marginTop: "16px", maxWidth: "220px" }}>
              <label>Number of additional words</label>

              <input
                type="number"
                min="0"
                max="100"
                style={{ ...inputStyle, marginTop: "8px" }}
                value={aiGeneratedCount}
                onChange={(event) =>
                  setAiGeneratedCount(
                    Math.min(
                      100,
                      Math.max(0, Number(event.target.value) || 0)
                    )
                  )
                }
              />
            </div>
          </section>

          <section
            style={{
              ...sectionStyle,
              background: "#f5f9fc",
            }}
          >
            <h3>Examination Summary</h3>

            <p>
              <strong>Level:</strong> {level || "Not selected"}
            </p>

            <p>
              <strong>Difficulty:</strong> {difficulty}
            </p>

            <p>
              <strong>Subject:</strong>{" "}
              {selectedClassSubject
                ? `${selectedClassSubject.subject_name} — ${selectedClassSubject.class_name}`
                : "Not selected"}
            </p>

            <p>
              <strong>Teacher-provided words:</strong>{" "}
              {validTeacherWords.length}
            </p>

            <p>
              <strong>AI-generated words:</strong>{" "}
              {Number(aiGeneratedCount || 0)}
            </p>

            <h3 style={{ color: "#285b71" }}>
              Total Questions: {totalQuestions}
            </h3>

            <h3 style={{ color: "#285b71" }}>
              Total Examination Marks: {totalMarks}
            </h3>

            <p style={{ fontSize: "12px", color: "#64748b" }}>
              Each question carries four marks, corresponding to
              the four levels of sentence construction.
            </p>
          </section>

          {generationResult && (
            <section
              style={{
                ...sectionStyle,
                background: "#f0f7fa",
                borderColor: "#c8e0e9",
              }}
            >
              <h3 style={{ color: "#285b71" }}>
                Examination generated successfully
              </h3>

              <p>
                <strong>Title:</strong> {generationResult.exam.title}
              </p>

              <p>
                <strong>Exam ID:</strong> {generationResult.exam.id}
              </p>

              <p>
                <strong>Status:</strong> Draft
              </p>

              <p>
                <strong>Total questions:</strong>{" "}
                {generationResult.total_questions}
              </p>

              <p>
                <strong>Total marks:</strong>{" "}
                {generationResult.total_marks}
              </p>

              <h3>Generated Questions</h3>

              {generationResult.questions.map((question) => (
                <div
                  key={question.id}
                  style={{
                    marginTop: "18px",
                    padding: "16px",
                    background: "#ffffff",
                    border: "1px solid #dce4eb",
                    borderRadius: "9px",
                  }}
                >
                  <h4>
                    Question {question.position}: {question.target_word}
                  </h4>

                  <p>{question.prompt}</p>

                  <p>
                    <strong>Intended meaning:</strong>{" "}
                    {question.intended_meaning}
                  </p>

                  {question.sentence_construction_data.levels
                    .slice()
                    .sort((a, b) => a.level - b.level)
                    .map((item) => (
                      <div key={item.level} style={{ marginTop: "14px" }}>
                        <strong>
                          Level {item.level} – {item.description}
                        </strong>
                        <p style={{ marginTop: "5px" }}>
                          {item.example}
                        </p>
                      </div>
                    ))}
                </div>
              ))}

              <p style={{ color: "#64748b", fontSize: "12px" }}>
                This examination has been saved as a draft. It has
                not been published to students.
              </p>
            </section>
          )}

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
                !classSubjectId ||
                totalQuestions < 1 ||
                totalQuestions > 100
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
                  !classSubjectId ||
                  totalQuestions < 1 ||
                  totalQuestions > 100
                    ? 0.5
                    : 1,
              }}
            >
              {isGenerating
                ? "Generating examination..."
                : "Generate Sentence Construction Exam"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
