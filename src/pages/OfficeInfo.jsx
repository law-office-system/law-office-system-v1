import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function OfficeInfo() {
  const { userData } = useAuth();
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!userData?.officeId) return;

      const snap = await getDoc(doc(db, "offices", userData.officeId));

      if (snap.exists()) {
        setOffice(snap.data());
      }

      setLoading(false);
    };

    load();
  }, [userData]);

  const copyCode = () => {
    navigator.clipboard.writeText(office.inviteCode);
    alert("تم نسخ الكود ✔");
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.loader}>جاري تحميل بيانات المكتب...</div>
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
      <div style={styles.card}>
        <h2 style={styles.title}>🏢 بيانات المكتب</h2>

        <div style={styles.infoBox}>
          <span style={styles.label}>اسم المكتب</span>
          <span style={styles.value}>{office.name}</span>
        </div>

        <div style={styles.infoBox}>
          <span style={styles.label}>كود الانضمام</span>

          <div style={styles.codeBox}>
            <span style={styles.code}>{office.inviteCode}</span>

            <button onClick={copyCode} style={styles.copyBtn}>
              📋 نسخ
            </button>
          </div>
        </div>

        <p style={styles.hint}>
          هذا الكود يتم استخدامه من أي مستخدم للانضمام إلى المكتب
        </p>
      </div>
    </div>
  );
}

/* 🎨 STYLES */

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2f7, #f8fafc)",
    padding: 20,
  },

  card: {
    width: "100%",
    maxWidth: 520,
    background: "#fff",
    borderRadius: 16,
    padding: 25,
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
  },

  title: {
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50",
  },

  infoBox: {
    marginBottom: 18,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  label: {
    fontSize: 13,
    color: "#888",
  },

  value: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
  },

  codeBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f4f6f8",
    padding: "10px 12px",
    borderRadius: 10,
  },

  code: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111",
    wordBreak: "break-all",
  },

  copyBtn: {
    padding: "6px 10px",
    border: "none",
    borderRadius: 8,
    background: "#2c3e50",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },

  hint: {
    marginTop: 15,
    fontSize: 12,
    color: "#777",
    textAlign: "center",
  },

  center: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  loader: {
    fontSize: 14,
    color: "#666",
  },
};