import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateProfile,
} from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { auth } from "../firebaseAuth";

export default function OfficeInfo() {
  const { userData, currentUser } = useAuth();
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const isAdmin = userData?.role === "admin";

  // Office form
  const [officeForm, setOfficeForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    description: "",
    foundedYear: "",
  });

  // Account form
  const [accountForm, setAccountForm] = useState({
    displayName: "",
    newEmail: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Show/hide password states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const [stats, setStats] = useState({
    lawyers: 0,
    cases: 0,
    activeCases: 0,
    closedCases: 0,
    clients: 0,
    upcomingSessions: 0,
  });

  const [members, setMembers] = useState([]);

  useEffect(() => {
    const load = async () => {
      if (!userData?.officeId) return;

      try {
        // Load office
        const officeSnap = await getDoc(doc(db, "offices", userData.officeId));
        if (officeSnap.exists()) {
          const data = officeSnap.data();
          setOffice(data);
          setOfficeForm({
            name: data.name || "",
            address: data.address || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            description: data.description || "",
            foundedYear: data.foundedYear || "",
          });
        }

        // Load user data for account
        if (currentUser) {
          setAccountForm((prev) => ({
            ...prev,
            displayName: currentUser.displayName || userData?.name || "",
            newEmail: currentUser.email || "",
          }));
        }

        const officeId = userData.officeId;

        // Load all users (members)
        const usersQuery = query(
          collection(db, "users"),
          where("officeId", "==", officeId)
        );
        const usersSnap = await getDocs(usersQuery);
        const allUsers = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setMembers(allUsers);

        const lawyers = allUsers.filter((u) => u.role !== "client").length;
        const clients = allUsers.filter((u) => u.role === "client").length;

        // Cases
        const casesQuery = query(
          collection(db, "cases"),
          where("officeId", "==", officeId)
        );
        const casesSnap = await getDocs(casesQuery);
        const cases = casesSnap.size;
        const casesData = casesSnap.docs.map((d) => d.data());
        const activeCases = casesData.filter(
          (c) => c.status !== "closed" && c.status !== "archived"
        ).length;
        const closedCases = casesData.filter(
          (c) => c.status === "closed" || c.status === "archived"
        ).length;

        // Upcoming sessions
        const sessionsQuery = query(
          collection(db, "sessions"),
          where("officeId", "==", officeId)
        );
        const sessionsSnap = await getDocs(sessionsQuery);
        const now = new Date();
        const upcomingSessions = sessionsSnap.docs.filter((d) => {
          const sessionDate = d.data().date?.toDate?.() || new Date(d.data().date);
          return sessionDate > now;
        }).length;

        setStats({
          lawyers,
          cases,
          activeCases,
          closedCases,
          clients,
          upcomingSessions,
        });
      } catch (err) {
        console.error("Error loading data:", err);
      }

      setLoading(false);
    };

    load();
  }, [userData, currentUser]);

  const showMessage = (text, type = "success") => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 4000);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(office.inviteCode);
    showMessage("تم نسخ الكود ✔", "success");
  };

  // Office Handlers
  const handleOfficeChange = (e) => {
    setOfficeForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAccountChange = (e) => {
    setAccountForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const cancelEdit = () => {
    // Reset forms to original values
    if (office) {
      setOfficeForm({
        name: office.name || "",
        address: office.address || "",
        phone: office.phone || "",
        email: office.email || "",
        website: office.website || "",
        description: office.description || "",
        foundedYear: office.foundedYear || "",
      });
    }
    if (currentUser) {
      setAccountForm((prev) => ({
        ...prev,
        displayName: currentUser.displayName || userData?.name || "",
        newEmail: currentUser.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    }
    // Reset password visibility
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setEditMode(false);
  };

  const saveAll = async () => {
    if (!userData?.officeId || !currentUser) return;
    setSaving(true);

    try {
      // Save office data
      await updateDoc(doc(db, "offices", userData.officeId), {
        ...officeForm,
        updatedAt: new Date(),
      });
      setOffice((prev) => ({ ...prev, ...officeForm, updatedAt: new Date() }));

      // Save account data
      if (accountForm.displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName: accountForm.displayName });
        await updateDoc(doc(db, "users", currentUser.uid), {
          name: accountForm.displayName,
        });
      }

      if (accountForm.newEmail && accountForm.newEmail !== currentUser.email) {
        if (!accountForm.currentPassword) {
          showMessage("يرجى إدخال كلمة المرور الحالية لتغيير البريد", "error");
          setSaving(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          accountForm.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updateEmail(currentUser, accountForm.newEmail);
        await updateDoc(doc(db, "users", currentUser.uid), {
          email: accountForm.newEmail,
        });
      }

      if (accountForm.newPassword) {
        if (accountForm.newPassword !== accountForm.confirmPassword) {
          showMessage("كلمة المرور الجديدة غير متطابقة", "error");
          setSaving(false);
          return;
        }
        if (!accountForm.currentPassword) {
          showMessage("يرجى إدخال كلمة المرور الحالية", "error");
          setSaving(false);
          return;
        }
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          accountForm.currentPassword
        );
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, accountForm.newPassword);
        setAccountForm((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      }

      // Reset password visibility
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      setEditMode(false);
      showMessage("تم حفظ جميع البيانات بنجاح ✔", "success");
    } catch (err) {
      console.error(err);
      if (err.code === "auth/wrong-password") {
        showMessage("كلمة المرور الحالية غير صحيحة", "error");
      } else if (err.code === "auth/weak-password") {
        showMessage("كلمة المرور الجديدة ضعيفة", "error");
      } else if (err.code === "auth/email-already-in-use") {
        showMessage("البريد الإلكتروني الجديد مستخدم بالفعل", "error");
      } else {
        showMessage("حدث خطأ أثناء الحفظ", "error");
      }
    }

    setSaving(false);
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: "مدير المكتب",
      lawyer: "محامي",
      client: "عميل",
      secretary: "سكرتير",
      accountant: "محاسب",
    };
    return labels[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "#3b82f6",
      lawyer: "#10b981",
      client: "#f59e0b",
      secretary: "#8b5cf6",
      accountant: "#ec4899",
    };
    return colors[role] || "#94a3b8";
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader}>جاري تحميل البيانات...</div>
      </div>
    );
  }

  if (!office) {
    return (
      <div style={styles.center}>
        <p>لا يوجد مكتب</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.headerCard}>
          <div style={styles.headerContent}>
            <div style={styles.logoPlaceholder}>
              {office.name?.charAt(0) || "🏢"}
            </div>
            <div style={styles.headerInfo}>
              <h1 style={styles.officeName}>{office.name}</h1>
              <p style={styles.officeMeta}>
                {office.address || "لا يوجد عنوان"}
              </p>
            </div>
          </div>
          {isAdmin && !editMode && (
            <button onClick={() => setEditMode(true)} style={styles.editBtn}>
              ✏️ تعديل البيانات
            </button>
          )}
          {isAdmin && editMode && (
            <div style={styles.editActions}>
              <button
                onClick={cancelEdit}
                disabled={saving}
                style={{ ...styles.cancelBtn, opacity: saving ? 0.5 : 1 }}
              >
                ❌ إلغاء
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                style={{
                  ...styles.saveBtnHeader,
                  opacity: saving ? 0.7 : 1,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "⏳ جاري الحفظ..." : "💾 حفظ الكل"}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={styles.statsGrid}>
          <StatCard icon="📁" value={stats.cases} label="إجمالي القضايا" />
          <StatCard icon="⚖️" value={stats.activeCases} label="قضايا نشطة" />
          <StatCard icon="✅" value={stats.closedCases} label="قضايا مغلقة" />
          <StatCard icon="📅" value={stats.upcomingSessions} label="جلسات قادمة" />
          <StatCard icon="👨‍⚖️" value={stats.lawyers} label="المحامون" />
          <StatCard icon="👥" value={stats.clients} label="العملاء" />
        </div>

        {/* Invite Code */}
        <div style={styles.inviteCard}>
          <div style={styles.inviteContent}>
            <div>
              <h3 style={styles.inviteTitle}>🔗 كود الانضمام للمكتب</h3>
              <p style={styles.inviteDesc}>
                شارك هذا الكود مع المحامين والموظفين للانضمام إلى مكتبك
              </p>
            </div>
            <div style={styles.codeBox}>
              <span style={styles.code}>{office.inviteCode}</span>
              <button onClick={copyCode} style={styles.copyBtn}>
                📋 نسخ
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            style={
              message.type === "error" ? styles.msgError : styles.msgSuccess
            }
          >
            {message.text}
          </div>
        )}

        {/* Single Content Card */}
        <div style={styles.contentCard}>
          {/* Section 1: Office Details */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>🏢 بيانات المكتب</h2>

            {isAdmin && editMode ? (
              <div style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>اسم المكتب *</label>
                  <input
                    type="text"
                    name="name"
                    value={officeForm.name}
                    onChange={handleOfficeChange}
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>العنوان</label>
                  <input
                    type="text"
                    name="address"
                    value={officeForm.address}
                    onChange={handleOfficeChange}
                    style={styles.input}
                    placeholder="عنوان المكتب"
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroupHalf}>
                    <label style={styles.formLabel}>رقم التليفون</label>
                    <input
                      type="tel"
                      name="phone"
                      value={officeForm.phone}
                      onChange={handleOfficeChange}
                      style={styles.input}
                      placeholder="01xxxxxxxxx"
                    />
                  </div>
                  <div style={styles.formGroupHalf}>
                    <label style={styles.formLabel}>بريد المكتب</label>
                    <input
                      type="email"
                      name="email"
                      value={officeForm.email}
                      onChange={handleOfficeChange}
                      style={styles.input}
                      placeholder="office@example.com"
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>الموقع الإلكتروني</label>
                  <input
                    type="url"
                    name="website"
                    value={officeForm.website}
                    onChange={handleOfficeChange}
                    style={styles.input}
                    placeholder="www.example.com"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.formLabel}>وصف المكتب</label>
                  <textarea
                    name="description"
                    value={officeForm.description}
                    onChange={handleOfficeChange}
                    style={styles.textarea}
                    rows={4}
                    placeholder="وصف مختصر عن المكتب والتخصصات..."
                  />
                </div>
              </div>
            ) : (
              <div style={styles.detailsList}>
                <DetailItem icon="📍" label="العنوان" value={office.address || "غير محدد"} />
                <DetailItem icon="📞" label="رقم التليفون" value={office.phone || "غير محدد"} />
                <DetailItem icon="📧" label="بريد المكتب" value={office.email || "غير محدد"} />
                <DetailItem icon="🌐" label="الموقع الإلكتروني" value={office.website || "غير محدد"} />
                <DetailItem icon="📝" label="الوصف" value={office.description || "لا يوجد وصف"} fullWidth />
              </div>
            )}
          </div>

          <div style={styles.sectionDivider} />

          {/* Section 2: Account Settings (Admin Only) */}
          {isAdmin && (
            <div style={styles.section}>
              <h2 style={styles.sectionTitle}>⚙️ إعدادات الحساب</h2>

              {editMode ? (
                <div style={styles.form}>
                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>الاسم المعروض</label>
                    <input
                      type="text"
                      name="displayName"
                      value={accountForm.displayName}
                      onChange={handleAccountChange}
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>البريد الإلكتروني الجديد</label>
                    <input
                      type="email"
                      name="newEmail"
                      value={accountForm.newEmail}
                      onChange={handleAccountChange}
                      style={styles.input}
                      placeholder="أدخل البريد الجديد"
                    />
                    <span style={styles.hint}>اتركه فارغاً إذا لم ترغب في التغيير</span>
                  </div>

                  <div style={styles.divider} />

                  <h3 style={styles.subSectionTitle}>🔐 تغيير كلمة المرور</h3>

                  <div style={styles.formGroup}>
                    <label style={styles.formLabel}>كلمة المرور الحالية *</label>
                    <div style={styles.passwordWrapper}>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={accountForm.currentPassword}
                        onChange={handleAccountChange}
                        style={{ ...styles.input, ...styles.passwordInput }}
                        placeholder="مطلوب لتغيير البريد أو كلمة المرور"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={styles.eyeBtn}
                      >
                        {showCurrentPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <div style={styles.formRow}>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.formLabel}>كلمة المرور الجديدة</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showNewPassword ? "text" : "password"}
                          name="newPassword"
                          value={accountForm.newPassword}
                          onChange={handleAccountChange}
                          style={{ ...styles.input, ...styles.passwordInput }}
                          placeholder="6 أحرف على الأقل"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={styles.eyeBtn}
                        >
                          {showNewPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                    <div style={styles.formGroupHalf}>
                      <label style={styles.formLabel}>تأكيد كلمة المرور</label>
                      <div style={styles.passwordWrapper}>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          value={accountForm.confirmPassword}
                          onChange={handleAccountChange}
                          style={{ ...styles.input, ...styles.passwordInput }}
                          placeholder="أعد كتابة كلمة المرور"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeBtn}
                        >
                          {showConfirmPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.accountInfoGrid}>
                  <div style={styles.accountInfoCard}>
                    <h3 style={styles.accountInfoTitle}>📇 الحساب الحالي</h3>
                    <InfoRow label="الاسم" value={currentUser?.displayName || userData?.name || "غير معروف"} />
                    <InfoRow label="البريد الإلكتروني" value={currentUser?.email || "غير معروف"} />
                    <InfoRow label="الدور" value={getRoleLabel(userData?.role)} />
                    <InfoRow label="المكتب" value={office.name} />
                  </div>
                  <div style={styles.accountInfoCard}>
                    <h3 style={styles.accountInfoTitle}>ℹ️ معلومات المكتب</h3>
                    <InfoRow label="معرف المكتب" value={office.id || userData?.officeId} />
                    <InfoRow
                      label="تاريخ الإنشاء"
                      value={
                        office.createdAt
                          ? new Date(office.createdAt.toDate?.() || office.createdAt).toLocaleDateString("ar-EG")
                          : "غير معروف"
                      }
                    />
                    <InfoRow
                      label="آخر تحديث"
                      value={
                        office.updatedAt
                          ? new Date(office.updatedAt.toDate?.() || office.updatedAt).toLocaleDateString("ar-EG")
                          : "لم يتم التحديث"
                      }
                    />
                    <InfoRow label="مدير المكتب" value={userData?.name || currentUser?.displayName || "غير معروف"} />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={styles.sectionDivider} />

          {/* Section 3: Members (Last) */}
          <div style={styles.section}>
            <div style={styles.membersHeader}>
              <h2 style={styles.sectionTitle}>👥 أعضاء المكتب</h2>
              <span style={styles.membersCount}>{members.length} عضو</span>
            </div>

            <div style={styles.membersList}>
              {members.map((member) => (
                <div key={member.id} style={styles.memberRow}>
                  <div style={styles.memberAvatar}>
                    {member.name?.charAt(0) || "👤"}
                  </div>
                  <div style={styles.memberInfo}>
                    <div style={styles.memberName}>{member.name || "غير معروف"}</div>
                    <div style={styles.memberEmail}>{member.email || ""}</div>
                  </div>
                  <span
                    style={{
                      ...styles.roleBadge,
                      background: `${getRoleColor(member.role)}20`,
                      color: getRoleColor(member.role),
                      border: `1px solid ${getRoleColor(member.role)}40`,
                    }}
                  >
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>

            {members.length === 0 && (
              <div style={styles.emptyState}>
                <p style={styles.emptyText}>لا يوجد أعضاء في المكتب</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({ icon, value, label }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statIcon}>{icon}</div>
      <div style={styles.statValue}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function DetailItem({ icon, label, value, fullWidth }) {
  return (
    <div style={{ ...styles.detailItem, gridColumn: fullWidth ? "1 / -1" : "auto" }}>
      <span style={styles.detailIcon}>{icon}</span>
      <div style={styles.detailContent}>
        <span style={styles.detailLabel}>{label}</span>
        <span style={styles.detailValue}>{value}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

/* 🎨 STYLES */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "16px",
    fontFamily: "'Segoe UI', Tahoma, sans-serif",
  },

  container: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  // Header
  headerCard: {
    background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)",
    borderRadius: 20,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
  },

  headerContent: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minWidth: 0,
    overflow: "hidden",
  },

  logoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    boxShadow: "0 8px 20px rgba(59,130,246,0.3)",
    flexShrink: 0,
  },

  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
    overflow: "hidden",
    flex: 1,
    width: "100%",
  },

  officeName: {
    margin: 0,
    fontSize: "clamp(14px, 4vw, 24px)",
    fontWeight: 700,
    color: "#f1f5f9",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
    lineHeight: 1.3,
  },

  officeMeta: {
    margin: 0,
    fontSize: 13,
    color: "#94a3b8",
    wordBreak: "break-word",
    lineHeight: 1.5,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },

  editBtn: {
    padding: "10px 18px",
    border: "1px solid rgba(59,130,246,0.3)",
    borderRadius: 12,
    background: "rgba(59,130,246,0.1)",
    color: "#60a5fa",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.2s",
    backdropFilter: "blur(10px)",
    whiteSpace: "nowrap",
    alignSelf: "flex-end",
  },

  editActions: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    justifyContent: "flex-end",
    width: "100%",
  },

  cancelBtn: {
    padding: "10px 16px",
    border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 12,
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  saveBtnHeader: {
    padding: "10px 18px",
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
    whiteSpace: "nowrap",
  },

  // Stats
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
  },

  statCard: {
    background: "rgba(30,41,59,0.8)",
    borderRadius: 16,
    padding: "20px 16px",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
  },

  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },

  statValue: {
    fontSize: "clamp(22px, 4vw, 28px)",
    fontWeight: 700,
    color: "#f1f5f9",
    marginBottom: 4,
  },

  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },

  // Invite Card
  inviteCard: {
    background: "rgba(30,41,59,0.8)",
    borderRadius: 16,
    padding: "20px 24px",
    border: "1px solid rgba(255,255,255,0.05)",
    backdropFilter: "blur(10px)",
  },

  inviteContent: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },

  inviteTitle: {
    margin: "0 0 6px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#f1f5f9",
  },

  inviteDesc: {
    margin: 0,
    fontSize: 12,
    color: "#94a3b8",
  },

  // Code Box
  codeBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(15,23,42,0.6)",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px dashed rgba(59,130,246,0.3)",
    flexWrap: "wrap",
  },

  code: {
    fontSize: 16,
    fontWeight: 700,
    color: "#60a5fa",
    fontFamily: "monospace",
    letterSpacing: 1,
  },

  copyBtn: {
    padding: "6px 14px",
    border: "none",
    borderRadius: 8,
    background: "rgba(59,130,246,0.15)",
    color: "#60a5fa",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 500,
    whiteSpace: "nowrap",
  },

  // Messages
  msgSuccess: {
    background: "rgba(34,197,94,0.1)",
    color: "#4ade80",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(34,197,94,0.2)",
    fontSize: 14,
  },

  msgError: {
    background: "rgba(239,68,68,0.1)",
    color: "#f87171",
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid rgba(239,68,68,0.2)",
    fontSize: 14,
  },

  // Content Card (Single Tab)
  contentCard: {
    background: "rgba(30,41,59,0.6)",
    borderRadius: 20,
    border: "1px solid rgba(255,255,255,0.05)",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },

  section: {
    padding: "20px",
  },

  sectionDivider: {
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: "0 20px",
  },

  sectionTitle: {
    margin: "0 0 16px 0",
    fontSize: "clamp(16px, 3vw, 18px)",
    fontWeight: 600,
    color: "#f1f5f9",
  },

  subSectionTitle: {
    margin: "0 0 12px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#e2e8f0",
  },

  // Details List
  detailsList: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: 12,
  },

  detailItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px",
    background: "rgba(15,23,42,0.5)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.03)",
  },

  detailIcon: {
    fontSize: 18,
    flexShrink: 0,
  },

  detailContent: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
    minWidth: 0,
    flex: 1,
  },

  detailLabel: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: 500,
  },

  detailValue: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: 500,
    wordBreak: "break-word",
    lineHeight: 1.5,
  },

  // Form
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
  },

  formGroupHalf: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  formLabel: {
    fontSize: 12,
    fontWeight: 500,
    color: "#94a3b8",
  },

  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.6)",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },

  textarea: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(15,23,42,0.6)",
    color: "#e2e8f0",
    fontSize: 14,
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.6,
    width: "100%",
    boxSizing: "border-box",
  },

  // Password
  passwordWrapper: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },

  passwordInput: {
    paddingRight: 44,
  },

  eyeBtn: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    padding: "4px 8px",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  hint: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 3,
  },

  divider: {
    height: 1,
    background: "rgba(255,255,255,0.05)",
    margin: "6px 0",
  },

  // Members
  membersHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },

  membersCount: {
    fontSize: 12,
    color: "#64748b",
    background: "rgba(15,23,42,0.5)",
    padding: "4px 12px",
    borderRadius: 20,
  },

  membersList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },

  memberRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 14px",
    background: "rgba(15,23,42,0.4)",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,0.03)",
    transition: "background 0.2s",
    flexWrap: "wrap",
  },

  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
    flexShrink: 0,
  },

  memberInfo: {
    flex: 1,
    minWidth: 0,
  },

  memberName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
  },

  memberEmail: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
    wordBreak: "break-all",
  },

  roleBadge: {
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    flexShrink: 0,
  },

  emptyState: {
    textAlign: "center",
    padding: "32px 16px",
  },

  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },

  // Account Info
  accountInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
  },

  accountInfoCard: {
    background: "rgba(15,23,42,0.5)",
    borderRadius: 16,
    padding: "16px",
    border: "1px solid rgba(255,255,255,0.03)",
  },

  accountInfoTitle: {
    margin: "0 0 14px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#e2e8f0",
  },

  // Info Row
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    gap: 12,
    flexWrap: "wrap",
  },

  infoLabel: {
    fontSize: 12,
    color: "#64748b",
    flexShrink: 0,
  },

  infoValue: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "monospace",
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    textAlign: "right",
    flex: 1,
  },

  // Loading
  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#0f172a",
  },

  loader: {
    fontSize: 16,
    color: "#94a3b8",
  },
};