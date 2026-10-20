import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import LinkAccountsSection from "../components/LinkAccountsSection";

const GOLD = "#d4af37";

export default function Profile() {
  const { user, userData } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phoneNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  useEffect(() => {
    if (userData) {
      setForm({
        name: userData.name || "",
        phoneNumber: userData.phoneNumber || "",
      });
    }
  }, [userData]);

  const showMsg = (text, type) => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showMsg("الاسم لا يمكن أن يكون فارغًا", "error");
      return;
    }
    setLoading(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...userData,
          name: form.name.trim(),
          phoneNumber: form.phoneNumber,
        },
        { merge: true }
      );
      showMsg("✅ تم حفظ البيانات بنجاح", "success");
    } catch (err) {
      console.error(err);
      showMsg("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = {
    admin: "مدير المكتب",
    lawyer: "محامٍ",
    secretary: "سكرتير",
    client: "موكل",
  }[userData?.role] || "مستخدم";

  const roleColor = {
    admin: "#c0392b",
    lawyer: "#2980b9",
    secretary: "#8e44ad",
    client: "#27ae60",
  }[userData?.role] || "#777";

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ═══ ترويسة البروفايل ═══ */}
        <div style={styles.headerCard}>
          <div style={styles.avatar}>
            {(form.name || "👤").charAt(0)}
          </div>
          <h2 style={styles.name}>{form.name || "المستخدم"}</h2>
          <span style={{ ...styles.roleBadge, color: roleColor, borderColor: roleColor }}>
            {roleLabel}
          </span>
          <p style={styles.contactLine}>
            {userData?.email && <span>📧 {userData.email}</span>}
            {userData?.email && userData?.phoneNumber && <span style={{ margin: "0 8px" }}>•</span>}
            {userData?.phoneNumber && <span>📱 {userData.phoneNumber}</span>}
          </p>
        </div>

        {/* ═══ البيانات الأساسية ═══ */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>📝 البيانات الأساسية</h3>

          <label style={styles.label}>الاسم</label>
          <input
            style={styles.input}
            placeholder="اسمك بالكامل"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <label style={styles.label}>رقم الهاتف</label>
          <input
            style={styles.input}
            placeholder="01XXXXXXXXX"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
            dir="ltr"
          />

          <button
            style={{ ...styles.goldBtn, opacity: loading ? 0.7 : 1 }}
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "⏳ جاري الحفظ..." : "💾 حفظ التعديلات"}
          </button>

          {msg.text && (
            <p style={msg.type === "error" ? styles.error : styles.success}>
              {msg.text}
            </p>
          )}
        </div>

        {/* ═══ ربط وسائل الدخول ═══ */}
        <LinkAccountsSection />

      </div>
    </div>
  );
}

/* ═══ الأنماط (داكن — بنفس هوية المشروع) ═══ */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f172a, #1e293b, #334155)",
    padding: "30px 16px",
    direction: "rtl",
  },
  container: {
    maxWidth: 560,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },

  // الترويسة
  headerCard: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(212,175,55,0.25)",
    borderRadius: 20,
    padding: "28px 20px",
    textAlign: "center",
    backdropFilter: "blur(14px)",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    margin: "0 auto 12px",
    background: `linear-gradient(135deg, ${GOLD}, #b8952e)`,
    color: "#0a0e1a",
    fontSize: 30,
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: `0 8px 24px rgba(212,175,55,0.3)`,
  },
  name: {
    color: "#f1f5f9",
    margin: "0 0 8px",
    fontSize: 22,
  },
  roleBadge: {
    display: "inline-block",
    border: "1px solid",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 10,
  },
  contactLine: {
    color: "#94a3b8",
    fontSize: 13,
    margin: 0,
    direction: "ltr",
  },

  // الكروت
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backdropFilter: "blur(14px)",
  },
  cardTitle: {
    color: GOLD,
    margin: "0 0 6px",
    fontSize: 17,
  },
  label: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 4,
  },
  input: {
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.25)",
    background: "rgba(255,255,255,0.1)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    caretColor: "#fff",
    fontFamily: "inherit",
  },
  goldBtn: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    border: "none",
    background: GOLD,
    color: "#0a0e1a",
    fontWeight: "bold",
    fontSize: 14,
    cursor: "pointer",
  },
  success: { color: "#4ade80", fontSize: 13, margin: "4px 0 0" },
  error: { color: "#f87171", fontSize: 13, margin: "4px 0 0" },
};