
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Pencil,
  Trash2,
  BookOpen,
  Building2,
  ChevronDown,
  CircleCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  X,
  Link2,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/$/, "");


const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Institutions", icon: Building2 },
  { label: "Administrators", icon: ShieldCheck },
  { label: "Activity & usage", icon: Activity },
  { label: "Settings", icon: Settings },
];

const css = `
.owner-dashboard * { box-sizing: border-box; }
.owner-dashboard {
  min-height: 100vh;
  color: #233448;
  background: #f5f7fb;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}
.owner-shell { display: grid; grid-template-columns: 245px minmax(0,1fr); min-height: 100vh; }
.owner-sidebar {
  position: sticky; top: 0; height: 100vh; display: flex;
  flex-direction: column; padding: 25px 16px 17px;
  color: #d5e0e9; background: #172c40;
}
.owner-brand {
  display: flex; align-items: center; gap: 11px;
  padding: 0 7px 35px; color: #fff;
  font-size: 18px; font-weight: 800; letter-spacing: -.5px;
}
.owner-brand em { color: #8edbd0; font-style: normal; }
.owner-brand-icon {
  display: grid; place-items: center; width: 40px; height: 40px;
  border: 1px solid #466176; border-radius: 12px;
  color: #a9e7dd; background: #29465b;
}
.owner-nav-label { margin: 0 10px 12px; color: #90a5b8;
  font-size: 10px; font-weight: 800; letter-spacing: 1.5px; }
.owner-nav { display: grid; gap: 6px; }
.owner-nav button {
  min-height: 44px; display: flex; align-items: center; gap: 11px;
  padding: 0 12px; border: 1px solid transparent; border-radius: 9px;
  color: #b9c9d7; background: transparent; font: inherit;
  font-size: 12px; text-align: left; cursor: pointer;
}
.owner-nav button:hover { background: #253f54; color: #fff; }
.owner-nav button.selected {
  color: #fff; border-color: #38586d; background: #2b4b60;
  box-shadow: inset 3px 0 #8edbd0;
}
.owner-sidebar-bottom { margin-top: auto; }
.owner-support {
  padding: 15px; border: 1px solid #385165;
  border-radius: 12px; background: #203b50;
}
.owner-support strong { color: #fff; font-size: 12px; }
.owner-support p { margin: 8px 0 0; color: #b4c4d1;
  font-size: 11px; line-height: 1.7; }
.owner-identity {
  display: flex; align-items: center; gap: 10px;
  margin-top: 15px; padding-top: 15px; border-top: 1px solid #385165;
}
.owner-avatar {
  display: grid; flex-shrink: 0; place-items: center;
  width: 37px; height: 37px; border-radius: 50%;
  color: #245365; background: #b9e5de; font-weight: 800;
}
.owner-identity-text { flex: 1; min-width: 0; }
.owner-identity-text strong { display:block; color:#fff; font-size:11px; }
.owner-identity-text span { display:block; margin-top:4px; color:#a9bbca;
  font-size:10px; overflow-wrap:anywhere; }
.owner-logout { border:0; color:#b9c9d7; background:transparent; cursor:pointer; }
.owner-main { min-width:0; }
.owner-topbar {
  min-height:72px; padding:0 32px; display:flex; align-items:center;
  justify-content:space-between; gap:15px; border-bottom:1px solid #e7edf3;
  background:#fff;
}
.owner-breadcrumb { display:flex; align-items:center; gap:9px;
  color:#8491a1; font-size:12px; }
.owner-breadcrumb strong { color:#293b4f; }
.owner-top-actions { display:flex; align-items:center; gap:12px; }
.owner-environment {
  padding:7px 10px; border:1px solid #e5eaf0; border-radius:20px;
  color:#7d8998; font-size:10px; background:#fff;
}
.owner-content { max-width:1600px; margin:auto; padding:32px; }
.owner-heading {
  display:flex; align-items:center; justify-content:space-between;
  gap:20px; margin-bottom:25px;
}
.owner-eyebrow { margin:0 0 9px; color:#548a8e; font-size:10px;
  font-weight:800; letter-spacing:1.5px; }
.owner-heading h1 { margin:0; color:#21354a; font-size:29px;
  font-weight:800; letter-spacing:-1px; }
.owner-description { margin:9px 0 0; color:#798698; font-size:12px; line-height:1.7; }
.owner-primary {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  min-height:41px; padding:0 15px; border:0; border-radius:9px;
  color:white; background:#285b71; font:inherit; font-size:12px;
  font-weight:700; cursor:pointer;
}
.owner-primary:hover { background:#1d4659; }
.owner-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr));
  gap:15px; margin-bottom:22px; }
.owner-stat {
  padding:19px; border:1px solid #e7edf3; border-radius:12px;
  background:#fff; box-shadow:0 4px 15px #1d334a06;
}
.owner-stat-label { display:flex; align-items:center; justify-content:space-between;
  gap:8px; color:#718094; font-size:11px; }
.owner-stat-icon { display:grid; place-items:center; width:34px; height:34px;
  border-radius:10px; color:#397b82; background:#eaf5f3; }
.owner-stat-value { display:block; margin-top:15px; color:#22364a;
  font-size:28px; font-weight:800; letter-spacing:-1px; }
.owner-stat-note { display:block; margin-top:5px; color:#94a0af; font-size:10px; }
.owner-panel { margin-bottom:22px; border:1px solid #e7edf3;
  border-radius:12px; overflow:hidden; background:#fff; }
.owner-panel-head { padding:20px 22px; display:flex; align-items:center;
  justify-content:space-between; gap:14px; }
.owner-panel-head h2 { margin:0; color:#293c50; font-size:14px; }
.owner-panel-head p { margin:6px 0 0; color:#8a96a5; font-size:11px; line-height:1.6; }
.owner-search { display:flex; align-items:center; gap:8px; width:min(100%,270px);
  padding:0 10px; border:1px solid #e2e8ef; border-radius:8px; color:#98a4b1; }
.owner-search input { width:100%; height:36px; border:0; outline:0;
  background:transparent; font:inherit; font-size:11px; }
.owner-table-wrap { width:100%; overflow-x:auto; }
.owner-table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
.owner-table thead { background:#f7f9fc; }
.owner-table th { padding:12px 20px; border-top:1px solid #edf1f5;
  border-bottom:1px solid #e9edf3; color:#8491a0; font-size:10px; font-weight:700; }
.owner-table td { padding:14px 20px; border-bottom:1px solid #eff2f6;
  color:#6c798a; font-size:11px; }
.owner-table tbody tr:last-child td { border-bottom:0; }
.owner-institution { display:flex; align-items:center; gap:10px; }
.owner-institution-icon { display:grid; place-items:center; flex-shrink:0;
  width:34px; height:34px; border-radius:9px; background:#edf5f4; color:#477f85; }
.owner-institution strong { display:block; color:#304155; font-size:11px; }
.owner-institution small { display:block; margin-top:4px; color:#929dac; font-size:10px; }
.owner-status { display:inline-flex; padding:5px 9px; border-radius:20px;
  font-size:10px; font-weight:700; }
.owner-status.active { color:#27745b; background:#e8f6ef; }
.owner-status.setup-pending { color:#986b25; background:#fff4df; }
.owner-status.suspended { color:#a34444; background:#fff0f0; }
.owner-panel-foot { display:flex; justify-content:space-between; gap:12px;
  padding:13px 20px; border-top:1px solid #edf0f5; color:#96a1af; font-size:10px; }
.owner-notice { margin-bottom:20px; padding:13px 15px; border:1px solid #f0e5c5;
  border-radius:9px; color:#7f6a3e; background:#fffaf0; font-size:11px; line-height:1.6; }
.owner-empty { padding:35px 20px; color:#8995a4; text-align:center; font-size:12px; }
.owner-modal-backdrop {
  position:fixed; inset:0; z-index:20; display:grid; place-items:center;
  padding:20px; background:#13273d80;
}
.owner-modal { width:min(100%,480px); padding:25px; border-radius:15px;
  background:white; box-shadow:0 20px 65px #172c4033; }
.owner-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.owner-modal h2 { margin:0; color:#25394c; font-size:19px; }
.owner-modal-head button { border:0; background:transparent; color:#788697; cursor:pointer; }
.owner-modal > p { margin:10px 0 20px; color:#788697; font-size:12px; line-height:1.7; }
.owner-field { display:block; margin-bottom:15px; color:#425267; font-size:11px; font-weight:700; }
.owner-field input { display:block; width:100%; height:42px; margin-top:7px;
  padding:0 11px; border:1px solid #dce4eb; border-radius:8px;
  color:#26394d; background:#fff; font:inherit; font-weight:400; }
.owner-modal-actions { display:flex; justify-content:flex-end; gap:9px; margin-top:20px; }
.owner-secondary { padding:0 14px; min-height:40px; border:1px solid #dce4eb;
  border-radius:8px; color:#536477; background:#fff; font:inherit; font-size:12px; cursor:pointer; }
.owner-footer { display:flex; justify-content:space-between; gap:12px;
  padding:5px 2px; color:#9aa4b1; font-size:10px; }
.owner-row-actions {
  display: flex;
  align-items: center;
  gap: 7px;
}

.owner-row-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 30px;
  padding: 0 9px;
  font-size: 10px;
  white-space: nowrap;
}

.owner-row-action-delete {
  color: #a34444;
  border-color: #f0dada;
}

.owner-row-action-delete:hover {
  background: #fff0f0;
}
@media(max-width:1150px) {
  .owner-content { padding:25px 22px; }
  .owner-stats { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
@media(max-width:760px) {
  .owner-shell { grid-template-columns:1fr; }
  .owner-sidebar { position:static; height:auto; padding:16px; }
  .owner-brand { padding-bottom:18px; }
  .owner-sidebar-bottom { display:none; }
  .owner-nav { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .owner-topbar { min-height:60px; padding:0 16px; }
  .owner-content { padding:22px 15px; }
  .owner-heading { align-items:flex-start; flex-direction:column; }
  .owner-stats { gap:10px; }
  .owner-stat { padding:14px; }
  .owner-panel-head { align-items:flex-start; flex-direction:column; }
  .owner-search { width:100%; }
  .owner-footer { flex-direction:column; }
}
@media(max-width:420px) {
  .owner-nav { grid-template-columns:1fr; }
  .owner-stats { grid-template-columns:1fr; }
  .owner-environment { display:none; }
}
`;

export default function PlatformOwnerDashboard({
  user,
  accessToken,
  onLogout,
}) {
  const [activePage, setActivePage] = useState("Overview");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [invitationError, setInvitationError] = useState("");
  const [generatingInvitationId, setGeneratingInvitationId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [institutions, setInstitutions] = useState([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(true);
  const [apiError, setApiError] = useState("");
  const [newName, setNewName] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const visibleInstitutions = institutions.filter((institution) =>
    `${institution.name} ${institution.code} ${institution.admin}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  useEffect(() => {
  let cancelled = false;

  async function loadInstitutions() {
    setLoadingInstitutions(true);
    setApiError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/institutions`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.detail || "Unable to load institutions."
        );
      }

      if (!cancelled) {
        const loadedInstitutions = Array.isArray(data.items)
          ? data.items.map((institution) => ({
              ...institution,
              admin: institution.admin_email,
              teachers: 0,
              students: 0,
              status: institution.is_active ? "Active" : "Suspended",
            }))
          : [];

        setInstitutions(loadedInstitutions);
      }
    } catch (error) {
      if (!cancelled) {
        setApiError(error.message || "Unable to reach the backend.");
      }
    } finally {
      if (!cancelled) {
        setLoadingInstitutions(false);
      }
    }
  }

  loadInstitutions();

  return () => {
    cancelled = true;
  };
}, [accessToken]);
  
function startEditing(institution) {
  setEditingInstitution(institution);
  setEditName(institution.name);
  setEditAdminEmail(institution.admin_email || institution.admin || "");
  setApiError("");
}

async function saveInstitutionChanges(event) {
  event.preventDefault();

  if (!editingInstitution) return;

  try {
    setApiError("");

    const response = await fetch(
      `${API_BASE_URL}/api/institutions/${editingInstitution.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          admin_email: editAdminEmail.trim().toLowerCase(),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Failed to update institution.");
    }

    setInstitutions((current) =>
      current.map((institution) =>
        institution.id === data.id
          ? {
              ...institution,
              ...data,
              admin: data.admin_email,
              status: data.is_active ? "Active" : "Suspended",
            }
          : institution
      )
    );

    setEditingInstitution(null);
    setEditName("");
    setEditAdminEmail("");
  } catch (error) {
    setApiError(error.message || "Unable to update institution.");
  }
}

async function deleteInstitution(institution) {
  const confirmed = window.confirm(
    `Delete "${institution.name}"? This action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    setApiError("");

    const response = await fetch(
      `${API_BASE_URL}/api/institutions/${institution.id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Failed to delete institution.");
    }

    setInstitutions((current) =>
      current.filter((item) => item.id !== institution.id)
    );
  } catch (error) {
    setApiError(error.message || "Unable to delete institution.");
  }
}
async function generateInvitation(institution) {
  setCopyStatus("");
  setInvitationError("");
  setInvitationData(null);
  setGeneratingInvitationId(institution.id);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/institutions/${institution.id}/invitation`,
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
        data.detail || "Unable to generate the setup link."
      );
    }

    setInvitationData(data);
  } catch (error) {
    setInvitationError(
      error.message || "Unable to generate the setup link."
    );
  } finally {
    setGeneratingInvitationId(null);
  }
}
async function copyInvitationText(text, label) {
  try {
    await navigator.clipboard.writeText(text);
    setCopyStatus(`${label} copied to clipboard.`);
  } catch {
    setCopyStatus(
      "Copy was blocked. Select the link above and copy it manually."
    );
  }
}

async function createInstitution(event) {
  event.preventDefault();

  const name = newName.trim();
  const admin = newAdminEmail.trim().toLowerCase();

  if (!name || !admin) return;

  setApiError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/institutions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name,
          admin_email: admin,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Failed to create institution."
      );
    }

    const institution = {
      ...data,
      admin: data.admin_email,
      teachers: 0,
      students: 0,
      status: data.is_active ? "Active" : "Suspended",
    };

    setInstitutions((current) => [
      institution,
      ...current,
    ]);

    setNewName("");
    setNewAdminEmail("");
    setShowCreate(false);
    setActivePage("Institutions");
    setSearch("");
  } catch (error) {
    setApiError(
      error.message || "Unable to create institution."
    );
  }
}

  const statCards = [
    { label: "Institutions", value: institutions.length, note: "In this preview", icon: Building2 },
    {
      label: "Institution administrators",
      value: institutions.length,
      note: "Illustrative counts", icon: ShieldCheck,
    },
    {
      label: "Teachers", value: institutions.reduce((n, i) => n + i.teachers, 0),
      note: "Illustrative counts", icon: GraduationCap,
    },
    {
      label: "Students", value: institutions.reduce((n, i) => n + i.students, 0),
      note: "Illustrative counts", icon: Users,
    },
  ];

  const pageDescriptions = {
    Overview: "Manage your institutions and monitor your learning platform.",
    Institutions: "Create institutions and keep each institution's workspace separate.",
    Administrators: "View the main administrator assigned to each institution.",
    "Activity & usage": "Platform activity and usage reporting will appear here.",
    Settings: "Platform-level configuration and access policies.",
  };

  const displayedInstitutions =
    activePage === "Administrators"
      ? visibleInstitutions
      : visibleInstitutions;

    

  return (
    <div className="owner-dashboard">
      <style>{css}</style>

      <div className="owner-shell">
        <aside className="owner-sidebar">
          <div className="owner-brand">
            <span className="owner-brand-icon"><BookOpen size={21} /></span>
            <span>EnglishPrep <em>AI</em></span>
          </div>

          <p className="owner-nav-label">PLATFORM CONTROL</p>

          <nav className="owner-nav" aria-label="Platform owner navigation">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className={activePage === label ? "selected" : ""}
                onClick={() => {
                  setActivePage(label);
                  setSearch("");
                }}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="owner-sidebar-bottom">
            <div className="owner-support">
              <ShieldCheck size={19} color="#a9e7dd" />
              <p><strong>Platform owner access</strong></p>
              <p>Manage institutions centrally while keeping their content private by default.</p>
            </div>

            <div className="owner-identity">
              <div className="owner-avatar">
                {(user?.email || "P").charAt(0).toUpperCase()}
              </div>
              <div className="owner-identity-text">
                <strong>Platform Owner</strong>
                <span>{user?.email}</span>
              </div>
              <button className="owner-logout" onClick={onLogout} title="Sign out">
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>

        <main className="owner-main">
          <header className="owner-topbar">
            <div className="owner-breadcrumb">
              <span>Platform</span>
              <span>/</span>
              <strong>{activePage}</strong>
            </div>
            <div className="owner-top-actions">
              <span className="owner-environment">Preview data</span>
              <div className="owner-avatar">
                {(user?.email || "P").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <section className="owner-content">
            <div className="owner-heading">
              <div>
                <p className="owner-eyebrow">ENGLISHPREP AI / PLATFORM OWNER</p>
                <h1>{activePage}</h1>
                <p className="owner-description">{pageDescriptions[activePage]}</p>
              </div>
              {(activePage === "Overview" || activePage === "Institutions") && (
                <button className="owner-primary" onClick={() => setShowCreate(true)}>
                  <Plus size={17} /> Create institution
                </button>
              )}
            </div>

            <div
              className="owner-notice"
              role={apiError ? "alert" : "status"}
            >
              {apiError
                ? `Could not load institutions: ${apiError}`
                : loadingInstitutions
                  ? "Loading institutions from PostgreSQL..."
                  : "Institution records loaded from PostgreSQL. Creating institutions will be connected next."}
            </div>

            {activePage === "Overview" && (
              <div className="owner-stats">
                {statCards.map(({ label, value, note, icon: Icon }) => (
                  <article className="owner-stat" key={label}>
                    <div className="owner-stat-label">
                      <span>{label}</span>
                      <span className="owner-stat-icon"><Icon size={17} /></span>
                    </div>
                    <strong className="owner-stat-value">{value.toLocaleString()}</strong>
                    <span className="owner-stat-note">{note}</span>
                  </article>
                ))}
              </div>
            )}

            <section className="owner-panel">
              <div className="owner-panel-head">
                <div>
                  <h2>
                    {activePage === "Administrators"
                      ? "Institution administrators"
                      : activePage === "Activity & usage"
                        ? "Platform activity"
                        : activePage === "Settings"
                          ? "Platform settings"
                          : "Your institutions"}
                  </h2>
                  <p>
                    {activePage === "Administrators"
                      ? "Each institution has its own main administrator."
                      : activePage === "Settings"
                        ? "Configuration options will be connected in a later step."
                        : "Example records for the dashboard preview."}
                  </p>
                </div>

                {(activePage === "Overview" ||
                  activePage === "Institutions" ||
                  activePage === "Administrators") && (
                  <label className="owner-search">
                    <Search size={16} />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search institutions..."
                    />
                  </label>
                )}
              </div>

              {activePage === "Settings" || activePage === "Activity & usage" ? (
                <div className="owner-empty">
                  <Clock3 size={25} />
                  <p>This section's functionality has not been connected yet.</p>
                </div>
              ) : (
                <div className="owner-table-wrap">
                  <table className="owner-table">
                    <thead>
                      <tr>
                        <th>Institution</th>
                        <th>Main administrator</th>
                        <th>Teachers</th>
                        <th>Students</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInstitutions.map((institution) => (
                        <tr key={institution.id}>
                          <td>
                            <div className="owner-institution">
                              <span className="owner-institution-icon">
                                <Building2 size={17} />
                              </span>
                              <span>
                                <strong>{institution.name}</strong>
                                <small>{institution.code}</small>
                              </span>
                            </div>
                          </td>
                          <td>{institution.admin}</td>
                          <td>{institution.teachers}</td>
                          <td>{institution.students}</td>
                          <td>
                            <span className={`owner-status ${institution.status.toLowerCase().replace(" ", "-")}`}>
                              {institution.status}
                            </span>
                          </td>
                          <td>
                            <div className="owner-row-actions">
                              <button
                                type="button"
                                className="owner-secondary owner-row-action"
                                onClick={() => startEditing(institution)}
                              >
                                <Pencil size={13} />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="owner-secondary owner-row-action owner-row-action-delete"
                                onClick={() => deleteInstitution(institution)}
                              >
                                <Trash2 size={13} />
                                Delete
                              </button>
                              <button
                                type="button"
                                className="owner-secondary owner-row-action"
                                onClick={() => generateInvitation(institution)}
                                disabled={generatingInvitationId === institution.id}
                              >
                                <Link2 size={13} />
                                {generatingInvitationId === institution.id
                                  ? "Generating..."
                                  : "Generate setup link"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {displayedInstitutions.length === 0 && (
                        <tr>
                          <td colSpan={5}>
                            No matching institutions found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="owner-panel-foot">
                <span>{displayedInstitutions.length} institutions</span>
                <span>Institution content is private by default</span>
              </div>
            </section>

            <footer className="owner-footer">
              <span>EnglishPrep AI</span>
              <span>Platform owner workspace · Preview</span>
            </footer>
          </section>
        </main>
      </div>

      {showCreate && (
        <div className="owner-modal-backdrop" onClick={() => setShowCreate(false)}>
          <section
            className="owner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-institution-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="owner-modal-head">
              <h2 id="create-institution-title">Create institution</h2>
              <button onClick={() => setShowCreate(false)} aria-label="Close dialog">
                <X size={19} />
              </button>
            </div>
            <p>
              Add sample details to preview the institution setup workflow.
              This form does not yet create database records or send invitations.
            </p>
            <form onSubmit={createInstitution}>
              <label className="owner-field">
                Institution name
                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Central English Academy"
                  required
                />
              </label>
              <label className="owner-field">
                Main administrator email
                <input
                  type="email"
                  value={newAdminEmail}
                  onChange={(event) => setNewAdminEmail(event.target.value)}
                  placeholder="admin@institution.example"
                  required
                />
              </label>
              <div className="owner-modal-actions">
                <button
                  type="button"
                  className="owner-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button className="owner-primary" type="submit">
                  Add to preview
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
            {/* EXISTING CODE — EDIT INSTITUTION MODAL */}
      {editingInstitution && (
        <div
          className="owner-modal-backdrop"
          onClick={() => setEditingInstitution(null)}
        >
          <section
            className="owner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-institution-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="owner-modal-head">
              <h2 id="edit-institution-title">Edit institution</h2>

              <button
                type="button"
                onClick={() => setEditingInstitution(null)}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            <p>
              Update the institution name and main administrator email.
            </p>

            <form onSubmit={saveInstitutionChanges}>
              <label className="owner-field">
                Institution name
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  minLength={2}
                  maxLength={200}
                  required
                />
              </label>

              <label className="owner-field">
                Main administrator email
                <input
                  type="email"
                  value={editAdminEmail}
                  onChange={(event) =>
                    setEditAdminEmail(event.target.value)
                  }
                  required
                />
              </label>

              <div className="owner-modal-actions">
                <button
                  type="button"
                  className="owner-secondary"
                  onClick={() => setEditingInstitution(null)}
                >
                  Cancel
                </button>

                <button className="owner-primary" type="submit">
                  Save changes
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* NEW CODE — ADMINISTRATOR SETUP LINK POPUP */}
      {(invitationData || invitationError) && (
        <div
          className="owner-modal-backdrop"
          onClick={() => {
            setInvitationData(null);
            setInvitationError("");
            setCopyStatus("");
          }}
        >
          <section
            className="owner-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invitation-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="owner-modal-head">
              <h2 id="invitation-title">
                Administrator setup link
              </h2>

              <button
                type="button"
                onClick={() => {
                  setInvitationData(null);
                  setInvitationError("");
                  setCopyStatus("");
                }}
                aria-label="Close dialog"
              >
                <X size={19} />
              </button>
            </div>

            {invitationError ? (
              <p className="owner-notice" role="alert">
                {invitationError}
              </p>
            ) : (
              <>
                <p>
                  Setup link for{" "}
                  <strong>{invitationData.institution_name}</strong>.
                  Copy the link or the ready-to-send WhatsApp message below.
                </p>

                <label className="owner-field">
                  Administrator setup link
                  <input
                    value={invitationData.setup_url}
                    readOnly
                    onFocus={(event) => event.target.select()}
                  />
                </label>

                <div className="owner-modal-actions">
                  <button
                    type="button"
                    className="owner-secondary"
                    onClick={() =>
                      copyInvitationText(
                        invitationData.setup_url,
                        "Setup link"
                      )
                    }
                  >
                    Copy link
                  </button>

                  <button
                    type="button"
                    className="owner-primary"
                    onClick={() =>
                      copyInvitationText(
                        `Hello!

Please use the following secure link to set up your EnglishPrep AI administrator account for ${invitationData.institution_name}:

${invitationData.setup_url}

This link expires in seven days and can only be used once.`,
                        "WhatsApp message"
                      )
                    }
                  >
                    Copy WhatsApp message
                  </button>
                </div>

                {copyStatus && (
                  <p className="owner-description" role="status">
                    {copyStatus}
                  </p>
                )}

                <p className="owner-description">
                  Invitation expires:{" "}
                  {new Date(
                    invitationData.expires_at
                  ).toLocaleString()}
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
