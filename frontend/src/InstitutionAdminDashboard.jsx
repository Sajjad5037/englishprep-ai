
import { useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  GraduationCap,
  Plus,
  LogOut,
  Search,
  Copy,
  X,
  ShieldCheck,
  LayoutDashboard,
    ClipboardList,
    FileText,
    BarChart3,
} from "lucide-react";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");
const navigationItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Teachers & Students", icon: Users },
  { label: "Classes", icon: ClipboardList },
  { label: "Subjects", icon: BookOpen },
  { label: "Student results", icon: BarChart3 },
];

const styles = `
.institution-admin * { box-sizing: border-box; }
.institution-admin {
  min-height: 100vh;
  background: #f5f7fb;
  color: #26394d;
  font-family: "DM Sans", "Segoe UI", sans-serif;
}
.ia-header {
  display:flex; align-items:center; justify-content:space-between; gap:15px;
  padding:18px 30px; border-bottom:1px solid #e7edf3; background:#fff;
}
.ia-brand { display:flex; align-items:center; gap:11px; font-weight:800; font-size:18px; }
.ia-brand em { color:#398b86; font-style:normal; }
.ia-brand-icon {
  display:grid; place-items:center; width:40px; height:40px;
  border-radius:11px; color:#285b71; background:#eaf5f3;
}
.ia-account { display:flex; align-items:center; gap:12px; color:#69798b; font-size:12px; }
.ia-account button {
  display:flex; align-items:center; gap:7px; padding:8px 11px;
  border:1px solid #e3e9ef; border-radius:8px; background:white;
  color:#526477; cursor:pointer; font:inherit;
}
.ia-content { max-width:1250px; margin:auto; padding:32px; }
.ia-eyebrow { margin:0 0 9px; color:#548a8e; font-size:10px; font-weight:800; letter-spacing:1.5px; }
.ia-heading { display:flex; align-items:center; justify-content:space-between; gap:20px; margin-bottom:24px; }
.ia-heading h1 { margin:0; font-size:29px; letter-spacing:-.8px; }
.ia-description { margin:8px 0 0; color:#798698; font-size:12px; line-height:1.7; }
.ia-primary {
  display:inline-flex; align-items:center; justify-content:center; gap:8px;
  min-height:40px; padding:0 14px; border:0; border-radius:8px;
  color:white; background:#285b71; font:inherit; font-size:12px;
  font-weight:700; cursor:pointer;
}
.ia-primary:hover { background:#1c4356; }
.ia-primary:disabled { opacity:.6; cursor:wait; }
.ia-stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:15px; margin-bottom:22px; }
.ia-stat { display:flex; align-items:center; gap:14px; padding:19px; border:1px solid #e7edf3; border-radius:12px; background:white; }
.ia-stat-icon { display:grid; place-items:center; width:43px; height:43px; border-radius:11px; color:#397b82; background:#eaf5f3; }
.ia-stat small { color:#8290a0; font-size:11px; }
.ia-stat strong { display:block; margin-top:5px; color:#26394d; font-size:25px; }
.ia-panel { border:1px solid #e7edf3; border-radius:12px; overflow:hidden; background:white; }
.ia-panel-head { display:flex; justify-content:space-between; align-items:center; gap:15px; padding:20px; }
.ia-panel-head h2 { margin:0; font-size:14px; }
.ia-panel-head p { margin:6px 0 0; color:#8793a2; font-size:11px; }
.ia-search { display:flex; align-items:center; gap:8px; width:min(100%,250px); padding:0 10px; border:1px solid #e2e8ef; border-radius:8px; color:#98a4b1; }
.ia-search input { width:100%; height:36px; border:0; outline:0; font:inherit; font-size:11px; }
.ia-table-wrap { width:100%; overflow-x:auto; }
.ia-table { width:100%; border-collapse:collapse; text-align:left; white-space:nowrap; }
.ia-table thead { background:#f7f9fc; }
.ia-table th { padding:12px 18px; border-top:1px solid #edf1f5; border-bottom:1px solid #e9edf3; color:#8491a0; font-size:10px; }
.ia-table td { padding:14px 18px; border-bottom:1px solid #eff2f6; color:#6c798a; font-size:11px; }
.ia-table tbody tr:last-child td { border-bottom:0; }
.ia-person { display:flex; align-items:center; gap:10px; }
.ia-person-icon { display:grid; place-items:center; width:33px; height:33px; border-radius:9px; color:#477f85; background:#edf5f4; }
.ia-person strong { display:block; color:#304155; font-size:11px; }
.ia-person small { display:block; margin-top:4px; color:#929dac; font-size:10px; }
.ia-badge { display:inline-flex; padding:5px 9px; border-radius:20px; font-size:10px; font-weight:700; }
.ia-badge.active { color:#27745b; background:#e8f6ef; }
.ia-badge.pending { color:#986b25; background:#fff4df; }
.ia-badge.inactive { color:#a34444; background:#fff0f0; }
.ia-notice { margin-bottom:18px; padding:12px 14px; border:1px solid #e2eaf0; border-radius:8px; background:#fff; color:#637588; font-size:11px; line-height:1.7; overflow-wrap:anywhere; }
.ia-error { border-color:#f0cece; color:#963e3e; background:#fff5f5; }
.ia-empty { padding:35px 20px; text-align:center; color:#8995a4; font-size:12px; }
.ia-modal-backdrop { position:fixed; inset:0; z-index:20; display:grid; place-items:center; padding:20px; background:#13273d80; }
.ia-modal { width:min(100%,460px); padding:25px; border-radius:15px; background:white; box-shadow:0 20px 65px #172c4033; }
.ia-modal-head { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.ia-modal h2 { margin:0; font-size:19px; }
.ia-modal-head button { border:0; background:transparent; color:#788697; cursor:pointer; }
.ia-modal > p { margin:10px 0 20px; color:#788697; font-size:12px; line-height:1.7; }
.ia-field { display:block; margin-bottom:15px; color:#425267; font-size:11px; font-weight:700; }
.ia-field input { display:block; width:100%; height:42px; margin-top:7px; padding:0 11px; border:1px solid #dce4eb; border-radius:8px; font:inherit; font-weight:400; }
.ia-role-switch { display:flex; gap:8px; margin-bottom:18px; }
.ia-role-switch button { display:flex; flex:1; justify-content:center; align-items:center; gap:7px; min-height:38px; border:1px solid #dce4eb; border-radius:8px; background:#fff; color:#526477; font:inherit; font-size:11px; cursor:pointer; }
.ia-role-switch button.selected { border-color:#7ba9ac; color:#285b71; background:#edf7f5; }
.ia-actions { display:flex; justify-content:flex-end; flex-wrap:wrap; gap:9px; margin-top:20px; }
.ia-secondary { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:39px; padding:0 13px; border:1px solid #dce4eb; border-radius:8px; color:#536477; background:white; font:inherit; font-size:11px; cursor:pointer; }
.ia-footer { margin-top:22px; color:#9aa4b1; font-size:10px; }
/* Institution dashboard sidebar navigation */
.ia-layout {
  display: grid;
  grid-template-columns: 235px minmax(0, 1fr);
  max-width: 1500px;
  margin: 0 auto;
}

.ia-sidebar {
  min-height: calc(100vh - 77px);
  padding: 25px 15px;
  color: #d5e0e9;
  background: #172c40;
}

.ia-sidebar-label {
  margin: 0 10px 13px;
  color: #90a5b8;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
}

.ia-nav {
  display: grid;
  gap: 7px;
}

.ia-nav button {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  color: #b9c9d7;
  background: transparent;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}

.ia-nav button:hover {
  color: #fff;
  background: #253f54;
}

.ia-nav button.selected {
  color: #fff;
  border-color: #38586d;
  background: #2b4b60;
  box-shadow: inset 3px 0 #8edbd0;
}

.ia-layout .ia-content {
  width: 100%;
  min-width: 0;
  max-width: none;
  margin: 0;
}

@media(max-width:650px) {
  .ia-layout {
    grid-template-columns: 1fr;
  }

  .ia-sidebar {
    min-height: auto;
    padding: 13px;
  }

  .ia-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media(max-width:650px) {
  .ia-header { padding:15px; }
  .ia-account > span { display:none; }
  .ia-content { padding:22px 14px; }
  .ia-heading { align-items:flex-start; flex-direction:column; }
  .ia-stats { gap:9px; }
  .ia-stat { padding:13px; }
  .ia-panel-head { align-items:flex-start; flex-direction:column; }
  .ia-search { width:100%; }
}
`;

export default function InstitutionAdminDashboard({ user, accessToken, onLogout }) {
  const [activePage, setActivePage] = useState("Overview");
  const [members, setMembers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [enrollingSubjectId, setEnrollingSubjectId] = useState(null);
  const [selectedSubjectStudentId, setSelectedSubjectStudentId] = useState("");
  const [savingSubjectEnrollment, setSavingSubjectEnrollment] = useState(false);
  const [editingClassSubjectId, setEditingClassSubjectId] = useState(null);
  const [replacementTeacherId, setReplacementTeacherId] = useState("");
  const [updatingClassSubjectTeacher, setUpdatingClassSubjectTeacher] = useState(false);
  const [selectedClassForSubject, setSelectedClassForSubject] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedSubjectTeacherId, setSelectedSubjectTeacherId] = useState("");
  const [assigningClassSubject, setAssigningClassSubject] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectsError, setSubjectsError] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [enrollingStudent, setEnrollingStudent] = useState(false);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [className, setClassName] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [memberRole, setMemberRole] = useState("teacher");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [copyStatus, setCopyStatus] = useState("");

  async function loadMembers() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/institution-users`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load team members.");
      }

      setMembers(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err.message || "Unable to load team members.");
    } finally {
      setLoading(false);
    }
  }
  async function loadClasses() {
  setClassesLoading(true);
  setClassesError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/classes`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load classes."
      );
    }

    setClasses(Array.isArray(data.items) ? data.items : []);

  } catch (err) {
    setClassesError(
      err.message || "Unable to load classes."
    );
  } finally {
    setClassesLoading(false);
  }
}

  async function loadSubjects() {
  setLoadingSubjects(true);
  setSubjectsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to load subjects.");
    }

    setSubjects(data.items || []);
  } catch (err) {
    setSubjectsError(err.message || "Unable to load subjects.");
  } finally {
    setLoadingSubjects(false);
  }
}

async function loadClassSubjects() {
  setSubjectsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects/class-subjects`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to load class subjects."
      );
    }

    setClassSubjects(data.items || []);
  } catch (err) {
    setSubjectsError(err.message || "Unable to load class subjects.");
  }
}
async function createSubject(event) {
  event.preventDefault();

  const name = newSubjectName.trim();

  if (!name) {
    setSubjectsError("Please enter a subject name.");
    return;
  }

  setCreatingSubject(true);
  setSubjectsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ name }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to create subject."
      );
    }

    setNewSubjectName("");
    await loadSubjects();

  } catch (err) {
    setSubjectsError(
      err.message || "Unable to create subject."
    );
  } finally {
    setCreatingSubject(false);
  }
}
async function assignClassSubject(event) {
  event.preventDefault();
  setSubjectsError("");

  if (
    !selectedClassForSubject ||
    !selectedSubjectId ||
    !selectedSubjectTeacherId
  ) {
    setSubjectsError("Please select a class, subject and teacher.");
    return;
  }
  // Check whether this subject is already assigned to this class.
const alreadyAssigned = classSubjects.some(
  (item) =>
    Number(item.class_id) === Number(selectedClassForSubject) &&
    Number(item.subject_id) === Number(selectedSubjectId)
);

if (alreadyAssigned) {
  setSubjectsError(
    "This subject is already assigned to the selected class. Please choose another subject or class."
  );
  return;
}

  setAssigningClassSubject(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects/class-subjects`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          class_id: Number(selectedClassForSubject),
          subject_id: Number(selectedSubjectId),
          teacher_id: Number(selectedSubjectTeacherId),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to assign subject to class."
      );
    }

    setSelectedClassForSubject("");
    setSelectedSubjectId("");
    setSelectedSubjectTeacherId("");

    await loadClassSubjects();
  } catch (err) {
    setSubjectsError(
      err.message || "Unable to assign subject to class."
    );
  } finally {
    setAssigningClassSubject(false);
  }
}
async function saveClassSubjectTeacher(classSubjectId) {
  if (!replacementTeacherId) {
    setSubjectsError("Please select a replacement teacher.");
    return;
  }

  setUpdatingClassSubjectTeacher(true);
  setSubjectsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects/class-subjects/${classSubjectId}/teacher`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          teacher_id: Number(replacementTeacherId),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to change the subject teacher."
      );
    }

    setEditingClassSubjectId(null);
    setReplacementTeacherId("");

    await loadClassSubjects();

  } catch (err) {
    setSubjectsError(
      err.message || "Unable to change the subject teacher."
    );
  } finally {
    setUpdatingClassSubjectTeacher(false);
  }
}
async function enrollStudentInSubject(classSubjectId) {
  if (!selectedSubjectStudentId) {
    setSubjectsError("Please select a student.");
    return;
  }

  setSavingSubjectEnrollment(true);
  setSubjectsError("");

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/subjects/class-subjects/${classSubjectId}/students`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          student_id: Number(selectedSubjectStudentId),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to enrol student in subject."
      );
    }

    setSelectedSubjectStudentId("");
    setEnrollingSubjectId(null);

    await loadClassSubjects();

  } catch (err) {
    setSubjectsError(
      err.message || "Unable to enrol student in subject."
    );
  } finally {
    setSavingSubjectEnrollment(false);
  }
}

async function createClass(event) {
  event.preventDefault();
  setClassesError("");

  if (!className.trim() || !selectedTeacherId) {
    setClassesError("Enter a class name and select a teacher.");
    return;
  }

  setCreatingClass(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/classes`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: className.trim(),
          teacher_id: Number(selectedTeacherId),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Unable to create class.");
    }

    setClasses((previous) => [
      {
        ...data,
        student_count: 0,
        students: [],
      },
      ...previous,
    ]);

    setClassName("");
    setSelectedTeacherId("");
    setShowCreateClass(false);

  } catch (err) {
    setClassesError(err.message || "Unable to create class.");
  } finally {
    setCreatingClass(false);
  }
}
function getAvailableStudentsForSubject(classSubject) {
  const schoolClass = classes.find(
    (item) =>
      Number(item.id) === Number(classSubject.class_id)
  );

  const enrolledStudentIds = new Set(
    (classSubject.students || []).map(
      (student) => Number(student.id)
    )
  );

  return (schoolClass?.students || []).filter(
    (student) =>
      student.is_active &&
      !enrolledStudentIds.has(Number(student.id))
  );
}
async function enrollStudent(event) {
  event.preventDefault();
  setClassesError("");

  if (!selectedClassId || !selectedStudentId) {
    setClassesError("Please select a student.");
    return;
  }

  setEnrollingStudent(true);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/classes/${selectedClassId}/students`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          student_id: Number(selectedStudentId),
        }),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.detail || "Unable to enrol student."
      );
    }

    setSelectedStudentId("");

    // Refresh the class list to display the new enrollment.
    await loadClasses();

  } catch (err) {
    setClassesError(
      err.message || "Unable to enrol student."
    );
  } finally {
    setEnrollingStudent(false);
  }
}



  useEffect(() => {
    loadMembers();
    // Load team members when the authenticated session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
  if (activePage === "Classes") {
    loadClasses();
  }

  if (activePage === "Subjects") {
    loadClasses();
    loadMembers();
    loadSubjects();
    loadClassSubjects();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [activePage, accessToken]);
  const visibleMembers = members.filter((member) =>
    `${member.full_name || ""} ${member.email} ${member.role}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  async function createInvitation(event) {
    event.preventDefault();
    setError("");
    setInvitation(null);
    setCopyStatus("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/institution-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role: memberRole,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Unable to create invitation.");
      }

      setInvitation(data);
      setFullName("");
      setEmail("");
      setShowCreate(false);
      await loadMembers();
    } catch (err) {
      setError(err.message || "Unable to create invitation.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${label} copied to clipboard.`);
    } catch {
      setCopyStatus("Copy was blocked. Please select and copy the text manually.");
    }
  }

  const teachers = members.filter((member) => member.role === "teacher").length;
  const students = members.filter((member) => member.role === "student").length;

  const selectedClass = classes.find(
  (schoolClass) => schoolClass.id === selectedClassId
);

const availableStudents = members.filter(
  (member) =>
    member.role === "student" &&
    !classes.some((schoolClass) =>
      schoolClass.students?.some(
        (student) => student.id === member.id
      )
    )
);

  return (
    <div className="institution-admin">
      <style>{styles}</style>

      <header className="ia-header">
        <div className="ia-brand">
          <span className="ia-brand-icon"><BookOpen size={21} /></span>
          <span>EnglishPrep <em>AI</em></span>
        </div>

        <div className="ia-account">
          <span>{user?.email}</span>
          <button type="button" onClick={onLogout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>
      <div className="ia-layout">
        <aside className="ia-sidebar">
            <p className="ia-sidebar-label">WORKSPACE</p>

            <nav className="ia-nav" aria-label="Institution navigation">
            {navigationItems.map(({ label, icon: Icon }) => (
                <button
                key={label}
                type="button"
                className={activePage === label ? "selected" : ""}
                onClick={() => setActivePage(label)}
                >
                <Icon size={17} />
                <span>{label}</span>
                </button>
            ))}
            </nav>
        </aside>

      
<main className="ia-content">
  <div className="ia-heading">
    <div>
      <p className="ia-eyebrow">
        {activePage === "Overview"
          ? "INSTITUTION OVERVIEW"
          : "INSTITUTION WORKSPACE"}
      </p>

      <h1>
        {activePage === "Overview"
          ? user?.institution_name || "Your institution"
          : activePage}
      </h1>

      <p className="ia-description">
        {activePage === "Overview"
          ? "Monitor your institution and manage learning activities."
          : activePage === "Passages"
            ? "Manage reading passages for your institution."
            : activePage === "Questions"
              ? "Create and organise questions for learning exercises."
              : activePage === "Marking rubrics"
                ? "Define criteria for assessing student responses."
                : activePage === "Teachers & Students"
                  ? "Manage your teachers and students. Share invitations manually."
                  : "Review student attempts, marks and learning progress."}
      </p>
    </div>

    {activePage === "Teachers & Students" && (
      <button
        className="ia-primary"
        type="button"
        onClick={() => {
          setMemberRole("teacher");
          setError("");
          setShowCreate(true);
        }}
      >
        <Plus size={16} /> Add teacher or student
      </button>
    )}
    {activePage === "Classes" && (
      <button
        className="ia-primary"
        type="button"
        onClick={() => {
          setClassesError("");
          setClassName("");
          setSelectedTeacherId("");
          setShowCreateClass(true);
        }}
      >
        <Plus size={16} /> Create Class
      </button>
    )}

  </div>

  {error && (
    <div className="ia-notice ia-error" role="alert">
      {error}
    </div>
  )}

  {/* OVERVIEW */}
  {activePage === "Overview" && (
    <>
      <div className="ia-stats">
        <article className="ia-stat">
          <span className="ia-stat-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <small>Teachers</small>
            <strong>
              {members.filter((member) => member.role === "teacher").length}
            </strong>
          </div>
        </article>

        <article className="ia-stat">
          <span className="ia-stat-icon">
            <Users size={20} />
          </span>
          <div>
            <small>Students</small>
            <strong>
              {members.filter((member) => member.role === "student").length}
            </strong>
          </div>
        </article>
      </div>

      
    </>
  )}

  {/* PASSAGES */}
  {activePage === "Passages" && (
    <section className="ia-panel">
      <div className="ia-panel-head">
        <div>
          <h2>Reading passages</h2>
          <p>
            Reading passages will be managed separately for this institution.
          </p>
        </div>
      </div>

      <div className="ia-empty">
        Passage management has not been connected to the database yet.
      </div>
    </section>
  )}

  {/* QUESTIONS */}
  {activePage === "Questions" && (
    <section className="ia-panel">
      <div className="ia-panel-head">
        <div>
          <h2>Question library</h2>
          <p>
            Organise questions and associate them with reading exercises.
          </p>
        </div>
      </div>

      <div className="ia-empty">
        Question creation and editing will be implemented next.
      </div>
    </section>
  )}

  {/* MARKING RUBRICS */}
  {activePage === "Marking rubrics" && (
    <section className="ia-panel">
      <div className="ia-panel-head">
        <div>
          <h2>Marking rubrics</h2>
          <p>
            Define assessment criteria for student responses.
          </p>
        </div>
      </div>

      <div className="ia-empty">
        Rubric management has not been connected yet.
      </div>
    </section>
  )}

  {/* TEACHERS AND STUDENTS — EXISTING FUNCTIONAL SCREEN */}
  {activePage === "Teachers & Students" && (
    <>
      <div className="ia-stats">
        <article className="ia-stat">
          <span className="ia-stat-icon">
            <GraduationCap size={20} />
          </span>
          <div>
            <small>Teachers</small>
            <strong>
              {members.filter((member) => member.role === "teacher").length}
            </strong>
          </div>
        </article>

        <article className="ia-stat">
          <span className="ia-stat-icon">
            <Users size={20} />
          </span>
          <div>
            <small>Students</small>
            <strong>
              {members.filter((member) => member.role === "student").length}
            </strong>
          </div>
        </article>
      </div>

      <section className="ia-panel">
        <div className="ia-panel-head">
          <div>
            <h2>Teachers and students</h2>
            <p>
              Only accounts assigned to your institution are listed here.
            </p>
          </div>

          <label className="ia-search">
            <Search size={15} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or role..."
            />
          </label>
        </div>

        {loading ? (
          <div className="ia-empty">Loading team members...</div>
        ) : visibleMembers.length === 0 ? (
          <div className="ia-empty">
            {members.length === 0
              ? "No teachers or students have been added yet."
              : "No matching team members found."}
          </div>
        ) : (
          <div className="ia-table-wrap">
            <table className="ia-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Account status</th>
                </tr>
              </thead>

              <tbody>
                {visibleMembers.map((member) => {
                  const statusLabel = member.is_active
                    ? "Active"
                    : member.invitation_pending
                      ? "Invitation pending"
                      : "Inactive";

                  const statusClass = member.is_active
                    ? "active"
                    : member.invitation_pending
                      ? "pending"
                      : "inactive";

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className="ia-person">
                          <span className="ia-person-icon">
                            {member.role === "teacher"
                              ? <GraduationCap size={16} />
                              : <Users size={16} />}
                          </span>

                          <span>
                            <strong>
                              {member.full_name || "Unnamed user"}
                            </strong>
                            <small>ID: {member.id}</small>
                          </span>
                        </div>
                      </td>

                      <td>{member.email}</td>
                      <td>{member.role}</td>

                      <td>
                        <span className={`ia-badge ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )}

  {/* STUDENT RESULTS */}
  {activePage === "Student results" && (
    <section className="ia-panel">
      <div className="ia-panel-head">
        <div>
          <h2>Student results</h2>
          <p>
            Review student attempts and monitor learning progress.
          </p>
        </div>
      </div>

      <div className="ia-empty">
        Student results will appear here once exam and reporting data
        are connected to the institution.
      </div>
    </section>
  )}
  
      
      {/* CLASSES */}
      {activePage === "Classes" && (
        <>
          {/* CLASSES LIST */}
          <section className="ia-panel">
            <div className="ia-panel-head">
              <div>
                <h2>Institution classes</h2>
                <p>
                  Manage classes, assigned teachers and student enrollment.
                </p>
              </div>
            </div>

            {classesError && (
              <div className="ia-notice ia-error" role="alert">
                {classesError}
              </div>
            )}

            {classesLoading ? (
              <div className="ia-empty">
                Loading classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="ia-empty">
                No classes have been created yet.
                Use the Create Class button to get started.
              </div>
            ) : (
              <div className="ia-table-wrap">
                <table className="ia-table">
                  <thead>
                    <tr>
                      <th>Class name</th>
                      <th>Students enrolled</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {classes.map((schoolClass) => (
                      <tr key={schoolClass.id}>
                        <td>
                          <div className="ia-person">
                            <span className="ia-person-icon">
                              <ClipboardList size={16} />
                            </span>

                            <span>
                              <strong>{schoolClass.name}</strong>
                              <small>Class ID: {schoolClass.id}</small>
                            </span>
                          </div>
                        </td>

                       

                        <td>
                          <span className="ia-badge active">
                            {schoolClass.student_count ?? 0} students
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="ia-secondary"
                            onClick={() => {
                              setSelectedClassId(schoolClass.id);
                              setSelectedStudentId("");
                              setClassesError("");
                            }}
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* SELECTED CLASS DETAILS */}
          {selectedClass && (
            <section
              className="ia-panel"
              style={{ marginTop: "20px" }}
            >
              <div className="ia-panel-head">
                <div>
                  <h2>{selectedClass.name}</h2>

                  <p>
                    {selectedClass.student_count} students enrolled
                  </p>
                </div>

                <button
                  type="button"
                  className="ia-secondary"
                  onClick={() => {
                    setSelectedClassId(null);
                    setSelectedStudentId("");
                    setClassesError("");
                  }}
                >
                  Back to classes
                </button>
              </div>

              <div style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "14px" }}>
                  Enrol a student
                </h3>

                <form
                  onSubmit={enrollStudent}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    alignItems: "center",
                    marginTop: "15px",
                  }}
                >
                  <select
                    value={selectedStudentId}
                    onChange={(event) =>
                      setSelectedStudentId(event.target.value)
                    }
                    required
                    style={{
                      flex: "1 1 250px",
                      minHeight: "40px",
                      padding: "8px 10px",
                      border: "1px solid #dce4eb",
                      borderRadius: "8px",
                      font: "inherit",
                    }}
                  >
                    <option value="">Select a student...</option>

                    {availableStudents.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.full_name} ({student.email})
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="ia-primary"
                    disabled={
                      enrollingStudent || !selectedStudentId
                    }
                  >
                    {enrollingStudent
                      ? "Enrolling..."
                      : "Enrol Student"}
                  </button>
                </form>

                {availableStudents.length === 0 && (
                  <p className="ia-description">
                    All active students are already enrolled in this class,
                    or no active students are available.
                  </p>
                )}

                <h3
                  style={{
                    marginTop: "30px",
                    fontSize: "14px",
                  }}
                >
                  Enrolled students
                </h3>

                {!selectedClass.students ||
                selectedClass.students.length === 0 ? (
                  <div className="ia-empty">
                    No students are enrolled in this class yet.
                  </div>
                ) : (
                  <div className="ia-table-wrap">
                    <table className="ia-table">
                      <thead>
                        <tr>
                          <th>Student name</th>
                          <th>Email</th>
                          <th>Account status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {selectedClass.students.map((student) => (
                          <tr key={student.id}>
                            <td>
                              <strong>
                                {student.full_name || "Unnamed student"}
                              </strong>
                            </td>

                            <td>{student.email}</td>

                            <td>
                              <span
                                className={`ia-badge ${
                                  student.is_active
                                    ? "active"
                                    : "inactive"
                                }`}
                              >
                                {student.is_active
                                  ? "Active"
                                  : "Inactive"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
      {/* SUBJECTS */}
{activePage === "Subjects" && (
  <section className="ia-panel">
    <div className="ia-panel-head">
      <div>
        <h2>Subject catalogue</h2>
        <p>
          Create and manage subjects offered by your institution.
        </p>
      </div>
    </div>

    {subjectsError && (
      <div className="ia-notice ia-error" role="alert">
        {subjectsError}
      </div>
    )}

    {/* CREATE SUBJECT */}
    <div style={{ padding: "20px" }}>
      <h3 style={{ fontSize: "14px" }}>Add a new subject</h3>

      <form
        onSubmit={createSubject}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          marginTop: "15px",
          alignItems: "center",
        }}
      >
        <input
          value={newSubjectName}
          onChange={(event) =>
            setNewSubjectName(event.target.value)
          }
          placeholder="e.g. English Language"
          maxLength={100}
          required
          style={{
            flex: "1 1 250px",
            minHeight: "40px",
            padding: "8px 10px",
            border: "1px solid #dce4eb",
            borderRadius: "8px",
            font: "inherit",
          }}
        />

            <button
              type="submit"
              className="ia-primary"
              disabled={creatingSubject || !newSubjectName.trim()}
            >
              {creatingSubject ? "Creating..." : "Add Subject"}
            </button>
            </form>
            </div>
            {/* ASSIGN SUBJECT TO CLASS */}
<div style={{ padding: "20px" }}>
  <h3 style={{ fontSize: "14px" }}>
    Assign a subject to a class
  </h3>

  <p className="ia-description">
    Select a class, subject and the teacher responsible for teaching it.
  </p>

  <form onSubmit={assignClassSubject}>
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "15px",
        marginTop: "15px",
      }}
    >
      {/* SELECT CLASS */}
      <label style={{ display: "grid", gap: "7px" }}>
        **Class**

        <select
          value={selectedClassForSubject}
          onChange={(event) =>
            setSelectedClassForSubject(event.target.value)
          }
          required
          style={{
            minHeight: "42px",
            padding: "8px",
            border: "1px solid #dce4eb",
            borderRadius: "8px",
            font: "inherit",
          }}
        >
          <option value="">Select a class...</option>

          {classes.map((schoolClass) => (
            <option key={schoolClass.id} value={schoolClass.id}>
              {schoolClass.name}
            </option>
          ))}
        </select>
      </label>

      {/* SELECT SUBJECT */}
      <label style={{ display: "grid", gap: "7px" }}>
        **Subject**

        <select
          value={selectedSubjectId}
          onChange={(event) =>
            setSelectedSubjectId(event.target.value)
          }
          required
          style={{
            minHeight: "42px",
            padding: "8px",
            border: "1px solid #dce4eb",
            borderRadius: "8px",
            font: "inherit",
          }}
        >
          <option value="">Select a subject...</option>

          {subjects.map((subject) => {
            const alreadyAssigned = classSubjects.some(
              (item) =>
                Number(item.class_id) === Number(selectedClassForSubject) &&
                Number(item.subject_id) === Number(subject.id)
            );

            return (
              <option
                key={subject.id}
                value={subject.id}
                disabled={Boolean(selectedClassForSubject) && alreadyAssigned}
              >
                {subject.name}
                {alreadyAssigned ? " (Already assigned)" : ""}
              </option>
            );
          })}
        </select>
      </label>

      {/* SELECT TEACHER */}
      <label style={{ display: "grid", gap: "7px" }}>
        **Teacher**

        <select
          value={selectedSubjectTeacherId}
          onChange={(event) =>
            setSelectedSubjectTeacherId(event.target.value)
          }
          required
          style={{
            minHeight: "42px",
            padding: "8px",
            border: "1px solid #dce4eb",
            borderRadius: "8px",
            font: "inherit",
          }}
        >
          <option value="">Select a teacher...</option>

          {members
            .filter(
              (member) =>
                member.role === "teacher" && member.is_active
            )
            .map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.full_name}
              </option>
            ))}
        </select>
      </label>
    </div>

    <button
      type="submit"
      className="ia-primary"
      disabled={
        assigningClassSubject ||
        !selectedClassForSubject ||
        !selectedSubjectId ||
        !selectedSubjectTeacherId
      }
      style={{ marginTop: "18px" }}
    >
      {assigningClassSubject
        ? "Assigning..."
        : "Assign Subject"}
    </button>
  </form>
</div>
            {/* CLASS-SUBJECT ASSIGNMENTS */}
            <div style={{ padding: "20px" }}>
              <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>
                Class-subject assignments
              </h3>

              <p className="ia-description">
                Manage assigned teachers for each subject within a class.
              </p>

              {classSubjects.length === 0 ? (
                <div className="ia-empty">
                  No subjects have been assigned to classes yet.
                </div>
              ) : (
                <div className="ia-table-wrap">
                  <table className="ia-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Subject</th>
                        <th>Assigned teacher</th>
                        <th>Students</th>
                        <th>Actions</th>
                      </tr>
                    </thead>

                    <tbody>
                      {classSubjects.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.class_name}</strong>
                          </td>

                          <td>{item.subject_name}</td>

                          <td>
                            {editingClassSubjectId === item.id ? (
                              <select
                                value={replacementTeacherId}
                                onChange={(event) =>
                                  setReplacementTeacherId(event.target.value)
                                }
                                style={{
                                  minHeight: "36px",
                                  padding: "6px",
                                  border: "1px solid #dce4eb",
                                  borderRadius: "8px",
                                  font: "inherit",
                                }}
                              >
                                <option value="">Select replacement teacher...</option>

                                {members
                                  .filter(
                                    (member) =>
                                      member.role === "teacher" &&
                                      member.is_active
                                  )
                                  .map((teacher) => (
                                    <option
                                      key={teacher.id}
                                      value={teacher.id}
                                    >
                                      {teacher.full_name}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <strong>{item.teacher_name}</strong>
                            )}
                          </td>

                          <td>{item.student_count ?? 0}</td>

                          <td>
                            {editingClassSubjectId === item.id ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <button
                                  type="button"
                                  className="ia-primary"
                                  disabled={
                                    updatingClassSubjectTeacher ||
                                    !replacementTeacherId
                                  }
                                  onClick={() =>
                                    saveClassSubjectTeacher(item.id)
                                  }
                                >
                                  {updatingClassSubjectTeacher
                                    ? "Saving..."
                                    : "Save"}
                                </button>

                                <button
                                  type="button"
                                  className="ia-secondary"
                                  disabled={updatingClassSubjectTeacher}
                                  onClick={() => {
                                    setEditingClassSubjectId(null);
                                    setReplacementTeacherId("");
                                    setSubjectsError("");
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}
                              >
                                <button
                                  type="button"
                                  className="ia-secondary"
                                  onClick={() => {
                                    setEditingClassSubjectId(item.id);
                                    setReplacementTeacherId(
                                      String(item.teacher_id)
                                    );
                                    setSubjectsError("");
                                  }}
                                >
                                  Change teacher
                                </button>

                                <button
                                  type="button"
                                  className="ia-primary"
                                  onClick={() => {
                                    setEnrollingSubjectId(item.id);
                                    setSelectedSubjectStudentId("");
                                    setSubjectsError("");
                                  }}
                                >
                                  Enrol students
                                </button>
                              </div>
                            )}
                            {enrollingSubjectId === item.id && (
                              <div
                                style={{
                                  display: "grid",
                                  gap: "10px",
                                  marginTop: "12px",
                                  minWidth: "200px",
                                }}
                              >
                                {getAvailableStudentsForSubject(item).length === 0 ? (
                                  <p className="ia-description">
                                    No eligible students available in this class.
                                  </p>
                                ) : (
                                  <select
                                    value={selectedSubjectStudentId}
                                    onChange={(event) =>
                                      setSelectedSubjectStudentId(event.target.value)
                                    }
                                    style={{
                                      minHeight: "38px",
                                      padding: "7px",
                                      border: "1px solid #dce4eb",
                                      borderRadius: "8px",
                                      font: "inherit",
                                    }}
                                  >
                                    <option value="">
                                      Select a student...
                                    </option>

                                    {getAvailableStudentsForSubject(item).map((student) => (
                                      <option
                                        key={student.id}
                                        value={student.id}
                                      >
                                        {student.full_name} ({student.email})
                                      </option>
                                    ))}
                                  </select>
                                )}

                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="ia-primary"
                                    disabled={
                                      savingSubjectEnrollment ||
                                      !selectedSubjectStudentId ||
                                      getAvailableStudentsForSubject(item).length === 0
                                    }
                                    onClick={() =>
                                      enrollStudentInSubject(item.id)
                                    }
                                  >
                                    {savingSubjectEnrollment
                                      ? "Enrolling..."
                                      : "Enrol student"}
                                  </button>

                                  <button
                                    type="button"
                                    className="ia-secondary"
                                    disabled={savingSubjectEnrollment}
                                    onClick={() => {
                                      setEnrollingSubjectId(null);
                                      setSelectedSubjectStudentId("");
                                      setSubjectsError("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* SUBJECT LIST */}
            <div style={{ padding: "0 20px 20px" }}>
              <h3 style={{ fontSize: "14px", marginBottom: "15px" }}>
                Existing subjects
              </h3>

              {loadingSubjects ? (
                <div className="ia-empty">Loading subjects...</div>
              ) : subjects.length === 0 ? (
                <div className="ia-empty">
                  No subjects have been created yet.
                </div>
              ) : (
                <div className="ia-table-wrap">
                  <table className="ia-table">
                    <thead>
                      <tr>
                        <th>Subject name</th>
                        <th>Subject ID</th>
                        <th>Created</th>
                      </tr>
                    </thead>

                    <tbody>
                      {subjects.map((subject) => (
                        <tr key={subject.id}>
                          <td>
                            <strong>{subject.name}</strong>
                          </td>
                          <td>{subject.id}</td>
                          <td>
                            {subject.created_at
                              ? new Date(subject.created_at).toLocaleDateString()
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}




  <footer className="ia-footer">
    EnglishPrep AI · {user?.institution_name || "Institution workspace"}
  </footer>
</main>

      </div>

      {showCreate && (
        <div className="ia-modal-backdrop" onClick={() => setShowCreate(false)}>
          <section
            className="ia-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ia-create-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ia-modal-head">
              <h2 id="ia-create-title">Invite a team member</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p>
              Create a pending account for a teacher or student. You can copy the setup link and send it manually.
            </p>

            <form onSubmit={createInvitation}>
              <div className="ia-role-switch">
                <button
                  type="button"
                  className={memberRole === "teacher" ? "selected" : ""}
                  onClick={() => setMemberRole("teacher")}
                >
                  <GraduationCap size={16} /> Teacher
                </button>
                <button
                  type="button"
                  className={memberRole === "student" ? "selected" : ""}
                  onClick={() => setMemberRole("student")}
                >
                  <Users size={16} /> Student
                </button>
              </div>

              <label className="ia-field">
                Full name
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  minLength={2}
                  maxLength={200}
                  required
                  placeholder="Enter full name"
                />
              </label>

              <label className="ia-field">
                Email address
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="person@example.com"
                />
              </label>

              <div className="ia-actions">
                <button
                  type="button"
                  className="ia-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button className="ia-primary" type="submit" disabled={submitting}>
                  {submitting ? "Creating..." : "Create invitation"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      
      {showCreateClass && (
        <div
          className="ia-modal-backdrop"
          onClick={() => {
            if (!creatingClass) {
              setShowCreateClass(false);
            }
          }}
        >
          <section
            className="ia-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-class-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ia-modal-head">
              <h2 id="create-class-title">Create class</h2>

              <button
                type="button"
                onClick={() => setShowCreateClass(false)}
                aria-label="Close"
                disabled={creatingClass}
              >
                <X size={19} />
              </button>
            </div>

            <p>
              Create a class and assign a teacher from your institution.
            </p>

            <form onSubmit={createClass}>
              <label className="ia-field">
                Class name

                <input
                  value={className}
                  onChange={(event) =>
                    setClassName(event.target.value)
                  }
                  minLength={2}
                  maxLength={100}
                  required
                  placeholder="Example: Year 10A"
                />
              </label>

              <label className="ia-field">
                Assign teacher

                <select
                  value={selectedTeacherId}
                  onChange={(event) =>
                    setSelectedTeacherId(event.target.value)
                  }
                  required
                >
                  <option value="">Select a teacher...</option>

                  {members
                    .filter(
                      (member) =>
                        member.role === "teacher" &&
                        member.is_active
                    )
                    .map((teacher) => (
                      <option
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.full_name} ({teacher.email})
                      </option>
                    ))}
                </select>
              </label>

              {members.filter(
                (member) =>
                  member.role === "teacher" && member.is_active
              ).length === 0 && (
                <div className="ia-notice">
                  No active teachers are available. Add and activate
                  a teacher account before creating a class.
                </div>
              )}

              {classesError && (
                <div className="ia-notice ia-error" role="alert">
                  {classesError}
                </div>
              )}

              <div className="ia-actions">
                <button
                  type="button"
                  className="ia-secondary"
                  onClick={() => setShowCreateClass(false)}
                  disabled={creatingClass}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="ia-primary"
                  disabled={
                    creatingClass ||
                    !className.trim() ||
                    !selectedTeacherId
                  }
                >
                  {creatingClass ? "Creating..." : "Create Class"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}


      {invitation && (
        <div className="ia-modal-backdrop" onClick={() => setInvitation(null)}>
          <section className="ia-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="ia-modal-head">
              <h2>Invitation created</h2>
              <button type="button" onClick={() => setInvitation(null)} aria-label="Close">
                <X size={19} />
              </button>
            </div>

            <p>
              Share this setup link with {invitation.full_name}. It expires after seven days and can only be used once.
            </p>

            <label className="ia-field">
              Setup link
              <input value={invitation.setup_url} readOnly onFocus={(event) => event.target.select()} />
            </label>

            <div className="ia-actions">
              <button
                type="button"
                className="ia-secondary"
                onClick={() => copyText(invitation.setup_url, "Setup link")}
              >
                <Copy size={14} /> Copy link
              </button>

              <button
                type="button"
                className="ia-primary"
                onClick={() =>
                  copyText(
                    `Hello ${invitation.full_name},\n\nPlease use this link to set up your EnglishPrep AI ${invitation.role} account:\n\n${invitation.setup_url}\n\nThis link expires after seven days and can only be used once.`,
                    "WhatsApp message"
                  )
                }
              >
                <Copy size={14} /> Copy WhatsApp message
              </button>
            </div>

            {copyStatus && <div className="ia-notice" role="status">{copyStatus}</div>}
            <div className="ia-notice">
              <ShieldCheck size={15} /> Keep this invitation link private and send it only to the intended recipient.
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
