
import { useState } from "react";
import { BookOpen, ShieldCheck, Eye, EyeOff, ArrowRight } from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const pageStyles = `
.admin-setup-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #f5f7fb;
  color: #233448;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}
.admin-setup-card {
  width: 100%;
  max-width: 440px;
  padding: 36px;
  border: 1px solid #e7edf3;
  border-radius: 18px;
  background: #fff;
  box-shadow: 0 18px 55px #1d334a0d;
}
.admin-setup-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 32px;
  color: #21384b;
  font-size: 19px;
  font-weight: 800;
}
.admin-setup-brand em { color: #398b86; font-style: normal; }
.admin-setup-icon {
  display: grid;
  place-items: center;
  width: 43px;
  height: 43px;
  border-radius: 12px;
  color: #285b71;
  background: #eaf5f3;
}
.admin-setup-eyebrow {
  margin: 0 0 9px;
  color: #39817e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}
.admin-setup-card h1 {
  margin: 0;
  color: #203449;
  font-size: 27px;
  letter-spacing: -.8px;
}
.admin-setup-description {
  margin: 12px 0 25px;
  color: #778597;
  font-size: 13px;
  line-height: 1.8;
}
.admin-setup-field {
  display: block;
  margin-bottom: 18px;
  color: #425267;
  font-size: 12px;
  font-weight: 700;
}
.admin-setup-input-wrap { position: relative; margin-top: 8px; }
.admin-setup-input {
  width: 100%;
  height: 46px;
  padding: 0 45px 0 12px;
  border: 1px solid #dce4eb;
  border-radius: 8px;
  outline: none;
  color: #26394d;
  background: #fff;
  font: inherit;
  font-size: 13px;
  box-sizing: border-box;
}
.admin-setup-input:focus {
  border-color: #4d8799;
  box-shadow: 0 0 0 3px #285b7117;
}
.admin-setup-toggle {
  position: absolute;
  top: 0;
  right: 0;
  display: grid;
  place-items: center;
  width: 43px;
  height: 46px;
  border: 0;
  color: #82909e;
  background: transparent;
  cursor: pointer;
}
.admin-setup-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  width: 100%;
  min-height: 47px;
  margin-top: 8px;
  border: 0;
  border-radius: 9px;
  color: white;
  background: #285b71;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.admin-setup-submit:hover { background: #1c4356; }
.admin-setup-submit:disabled { opacity: .65; cursor: wait; }
.admin-setup-message {
  margin: 0 0 17px;
  padding: 12px;
  border: 1px solid #f0cece;
  border-radius: 8px;
  color: #963e3e;
  background: #fff5f5;
  font-size: 12px;
  line-height: 1.6;
}
.admin-setup-success {
  border-color: #cce8da;
  color: #286b50;
  background: #f0faf5;
}
.admin-setup-security {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 23px;
  padding: 13px;
  border: 1px solid #e2eeeb;
  border-radius: 9px;
  color: #4d8278;
  background: #f3f9f7;
  font-size: 11px;
  line-height: 1.7;
}
.admin-setup-security svg { flex-shrink: 0; }
@media(max-width:480px) {
  .admin-setup-card { padding: 26px 21px; }
  .admin-setup-card h1 { font-size: 24px; }
}
`;

export default function AdminSetup() {
  const token =
    new URLSearchParams(window.location.search).get("setup_token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("The setup link is missing its invitation token.");
      return;
    }

    if (password.length < 12 || password.length > 128) {
      setError("Your password must be between 12 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/institutions/accept-invitation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token, password }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to set up your administrator account."
        );
      }

      setSuccess(
        `Your administrator account for ${data.institution_name} has been created successfully. You can now sign in.`
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof TypeError
          ? "Unable to reach the server. Please try again."
          : err.message || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-setup-page">
      <style>{pageStyles}</style>

      <section className="admin-setup-card">
        <div className="admin-setup-brand">
          <span className="admin-setup-icon">
            <BookOpen size={22} />
          </span>
          <span>EnglishPrep <em>AI</em></span>
        </div>

        <p className="admin-setup-eyebrow">INSTITUTION ADMINISTRATOR</p>
        <h1>Set up your account</h1>
        <p className="admin-setup-description">
          Create a secure password to activate your institution administrator
          account. Once activated, you can sign in to your institution's
          workspace.
        </p>

        {!token && (
          <p className="admin-setup-message" role="alert">
            No invitation token was found in this URL. Please open the complete
            setup link sent to you by your platform administrator.
          </p>
        )}

        {error && (
          <p className="admin-setup-message" role="alert">
            {error}
          </p>
        )}

        {success ? (
          <div>
            <p className="admin-setup-message admin-setup-success" role="status">
              {success}
            </p>
            <button
              type="button"
              className="admin-setup-submit"
              onClick={() => {
                window.location.href = window.location.origin;
              }}
            >
              Go to sign in <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="admin-setup-field">
              Create password
              <div className="admin-setup-input-wrap">
                <input
                  className="admin-setup-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  placeholder="At least 12 characters"
                  required
                  disabled={!token || loading}
                />
                <button
                  type="button"
                  className="admin-setup-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>

            <label className="admin-setup-field">
              Confirm password
              <div className="admin-setup-input-wrap">
                <input
                  className="admin-setup-input"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  placeholder="Enter the same password again"
                  required
                  disabled={!token || loading}
                />
                <button
                  type="button"
                  className="admin-setup-toggle"
                  onClick={() =>
                    setShowConfirmPassword((current) => !current)
                  }
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword
                    ? <EyeOff size={17} />
                    : <Eye size={17} />}
                </button>
              </div>
            </label>

            <button
              className="admin-setup-submit"
              type="submit"
              disabled={!token || loading}
            >
              {loading ? "Creating account..." : "Activate account"}
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        )}

        <div className="admin-setup-security">
          <ShieldCheck size={18} />
          <span>
            Your password is securely hashed. Invitation links expire after
            seven days and can only be used once.
          </span>
        </div>
      </section>
    </main>
  );
}
