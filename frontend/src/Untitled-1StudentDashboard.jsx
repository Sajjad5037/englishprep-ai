import { useEffect, useState } from "react";

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
            </article>
          ))}
      </section>
    </main>
  );
}