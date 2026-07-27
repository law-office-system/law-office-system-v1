import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import Button from "../components/ui/Button";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();
  const { userData } = useAuth();

  // ================= LOAD CLIENTS (LIVE ON-SNAPSHOT & MULTI-TENANT SAFE) =================
  useEffect(() => {
    if (!userData?.officeId) return;

    const q = query(
      collection(db, "clientProfiles"),
      where("officeId", "==", userData.officeId)
    );

    // استخدام onSnapshot لضمان ظهور التحديثات والإضافات الجديدة فوراً بدون Reload
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClients(data);
    }, (error) => {
      console.error("Error streaming clients:", error);
    });

    return () => unsub();
  }, [userData]);

  // ================= DELETE CLIENT =================
  const handleDelete = async (id, name) => {
    const confirmDelete = window.confirm(`هل أنت متأكد من حذف ملف الموكل: (${name || "هذا الموكل"}) بشكل نهائي؟`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "clientProfiles", id));
      // لا نحتاج لتحديث الستيت يدوياً لأن onSnapshot سيتكفل بحذفه فوراً من الشاشة
    } catch (error) {
      console.error("Delete error:", error);
      alert("حدث خطأ أثناء محاولة حذف الموكل.");
    }
  };

  // ================= UPDATE PHONE (INLINE) =================
  const handlePhoneUpdate = async (id, value) => {
    try {
      await updateDoc(doc(db, "clientProfiles", id), {
        phone1: value.trim(),
      });
      // تحديث تلقائي آمن عبر السيرفر
    } catch (error) {
      console.error("Update error:", error);
      alert("حدث خطأ أثناء تحديث رقم الهاتف.");
    }
  };

  // ================= FILTER CLIENTS (OPTIMIZED WITH useMemo) =================
  const filteredClients = useMemo(() => {
    const text = search.toLowerCase().trim();
    return clients.filter((c) => {
      return (
        (c.fullName || "").toLowerCase().includes(text) ||
        (c.nationalId || "").includes(text) ||
        (c.phone1 || "").includes(text)
      );
    });
  }, [clients, search]);

  // ================= LOADING GUARD =================
  if (!userData) {
    return <div style={styles.centerText}><p>جاري فحص صلاحيات الوصول للمكتب...</p></div>;
  }

  return (
    <div style={styles.page}>

      {/* HEADER TITLE */}
      <div style={styles.headerCard}>
        <h2 style={styles.pageTitle}>📋 السجل المركزي لإدارة الموكلين</h2>
        <p style={styles.pageSubtitle}>استعراض ملفات الاتصال، وتتبع التوكيلات الرسمية الصادرة للمكتب والتحكم بها.</p>
      </div>

      {/* SEARCH & ACTIONS BAR */}
      <div style={styles.actionBar}>
        <input
          placeholder="🔍 بحث سريع باسم الموكل، الرقم القومي، أو رقم الهاتف المحمول..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.search}
        />
        
        <Button
          variant="primary"
          onClick={() => navigate("/clients/add")}
          style={styles.addBtn}
        >
          ➕ قيد موكل جديد
        </Button>
      </div>

      {/* COMPREHENSIVE DATA TABLE */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>الاسم الكامل للموكل</th>
              <th style={styles.th}>الرقم القومي</th>
              <th style={styles.th}>الهاتف الأساسي (تعديل مباشر)</th>
              <th style={styles.th}>طبيعة ونوع التوكيل</th>
              <th style={styles.th}>بيانات التوكيل</th>
              <th style={{ ...styles.th, textAlign: "center" }}>إجراءات التحكم</th>
            </tr>
          </thead>

          <tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.noData}>
                  لا توجد سجلات موكلين مقيدة تطابق خيارات البحث الحالية.
                </td>
              </tr>
            ) : (
              filteredClients.map((c) => (
                <tr key={c.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong style={styles.clientName}>{c.fullName || "غير محدد"}</strong>
                  </td>
                  
                  <td style={{ ...styles.td, fontFamily: "monospace", fontSize: "14px" }}>
                    {c.nationalId || "—"}
                  </td>

                  <td style={styles.td}>
                    <input
                      defaultValue={c.phone1}
                      placeholder="أدخل رقم الهاتف"
                      onBlur={(e) => handlePhoneUpdate(c.id, e.target.value)}
                      style={styles.input}
                    />
                  </td>

                  <td style={styles.td}>
                    <span style={styles.typeBadge(c.powerOfAttorney?.type)}>
                      {c.powerOfAttorney?.type || "غير مدرج"}
                    </span>
                  </td>

                  <td style={{ ...styles.td, color: "#475569", fontWeight: "500" }}>
                    {c.powerOfAttorney?.number ? (
                      <span>
                        {c.powerOfAttorney.number}
                        {c.powerOfAttorney.letter && ` / ${c.powerOfAttorney.letter}`}
                        {c.powerOfAttorney.year && ` لـسنة ${c.powerOfAttorney.year}`}
                        {c.powerOfAttorney.office && ` (${c.powerOfAttorney.office})`}
                      </span>
                    ) : (
                      <span style={{ color: "#94a3b8" }}>بدون توكيل مقيد</span>
                    )}
                  </td>

                  <td style={{ ...styles.td, textAlign: "center" }}>
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => navigate(`/clients/${c.id}`)}
                        title="عرض الملف الكامل والقضايا"
                        style={styles.viewBtn}
                      >
                        👁️ عرض السجل
                      </button>

                      <button
                        onClick={() => navigate(`/clients/edit/${c.id}`)}
                        title="تعديل البيانات"
                        style={styles.editBtn}
                      >
                        ✏️
                      </button>

                      <button
                        onClick={() => handleDelete(c.id, c.fullName)}
                        title="حذف نهائي"
                        style={styles.deleteBtn}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}

/* ================= COMPREHENSIVE LUXURY STYLES ================= */
const styles = {
  page: { padding: 20, direction: "rtl", background: "#f5f7fb", minHeight: "100vh", fontFamily: "Segoe UI, Tahoma" },
  centerText: { textAlign: "center", padding: "40px", color: "#64748b" },
  headerCard: { background: "#ffffff", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "15px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  pageTitle: { margin: "0 0 4px 0", fontSize: "20px", color: "#1e293b" },
  pageSubtitle: { margin: 0, fontSize: "13px", color: "#64748b" },
  
  actionBar: { display: "flex", gap: 12, marginBottom: 15, alignItems: "center", flexWrap: "wrap" },
  search: { flex: 3, padding: "11px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "13.5px", background: "#fff", minWidth: "260px" },
  addBtn: { flex: 1, padding: "11px 20px", fontWeight: "600", fontSize: "13.5px", minWidth: "160px", whiteSpace: "nowrap" },
  
  tableWrapper: { overflowX: "auto", background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "right" },
  th: { background: "#f8fafc", padding: "12px 16px", fontSize: "13px", fontWeight: "600", color: "#475569", borderBottom: "2px solid #e2e8f0" },
  tr: { borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" },
  td: { padding: "12px 16px", fontSize: "13.5px", color: "#1e293b", verticalAlign: "middle" },
  
  clientName: { color: "#1e293b", fontSize: "14px", fontWeight: "600" },
  input: { padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", width: "100%", fontSize: "13px", outline: "none", background: "#fdfdfd" },
  noData: { textAlign: "center", color: "#94a3b8", padding: "40px", fontSize: "14px" },
  
  btnGroup: { display: "flex", gap: 6, justifyContent: "center", alignItems: "center" },
  viewBtn: { padding: "6px 12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff", color: "#334155", cursor: "pointer", fontSize: "12px", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" },
  editBtn: { padding: "6px 10px", border: "none", borderRadius: "6px", background: "#f0fdf4", color: "#16a34a", cursor: "pointer", fontSize: "13px" },
  deleteBtn: { padding: "6px 10px", border: "none", borderRadius: "6px", background: "#fef2f2", color: "#dc2626", cursor: "pointer", fontSize: "13px" },

  // كود ديناميكي لتلوين الـ Badge الخاص بنوع التوكيل تلقائياً
  typeBadge: (type) => {
    const isGeneral = type?.includes("عام");
    return {
      fontSize: "11px",
      fontWeight: "600",
      padding: "3px 8px",
      borderRadius: "6px",
      background: isGeneral ? "#eff6ff" : "#fff7ed",
      color: isGeneral ? "#2563eb" : "#ea580c",
      border: isGeneral ? "1px solid #bfdbfe" : "1px solid #ffedd5",
      display: "inline-block",
      whiteSpace: "nowrap"
    };
  }
};