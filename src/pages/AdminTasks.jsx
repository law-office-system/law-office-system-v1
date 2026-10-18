import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import AdminTaskCard from "../components/case/AdminTaskCard";
import AdminTaskForm from "../components/case/AdminTaskForm";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
// ✅ خدمة التنظيف التلقائي والحذف الجماعي
import {
  getOfficeTaskRetention,
  cleanupCompletedTasks,
  deleteAllCompletedTasks,
} from "../services/adminTasksCleanup";

// ===== Color Palette =====
const COLORS = {
  bg: "#0a0e1a",
  bgLight: "#111827",
  bgCard: "#1a1f2e",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  red: "#ef4444",
  green: "#10b981",
  orange: "#f59e0b",
};

// ✅ الأحدث أولاً ← الأولوية ← الاستحقاق
const toMillis = (x) => {
  if (!x) return 0;
  if (x?.toDate) return x.toDate().getTime();
  const d = new Date(x);
  return isNaN(d) ? 0 : d.getTime();
};

function sortTasks(data) {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  data.sort((a, b) => {
    const c = toMillis(b.createdAt) - toMillis(a.createdAt);
    if (c !== 0) return c;
    const p = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    if (p !== 0) return p;
    return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
  });
  return data;
}

export default function AdminTasks() {
  const { userData } = useAuth();
  const officeId = userData?.officeId;
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [casesMap, setCasesMap] = useState({}); // ✅ caseId → {title, number}
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, completed
  const [cleaning, setCleaning] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ✅ جلب خريطة القضايا (لعرض بيانات مختصرة على كل عمل + الانتقال إليها)
  useEffect(() => {
    if (!officeId) return;
    let isMounted = true;
    const loadCases = async () => {
      try {
        const q = query(collection(db, "cases"), where("officeId", "==", officeId));
        const snap = await getDocs(q);

        // ✅ جمع كل معرفات الموكلين أولاً
        const rawCases = [];
        const clientIds = new Set();
        snap.docs.forEach((d) => {
          const data = d.data();
          const refs = Array.isArray(data.clients) ? data.clients : [];
          refs.forEach((c) => {
            const id = typeof c === "object" ? c.id : c;
            if (typeof id === "string" && id) clientIds.add(id);
          });
          rawCases.push({ id: d.id, data, refs });
        });

        // ✅ جلب أسماء الموكلين من clientProfiles (بطريقة فردية آمنة)
        const names = {};
        await Promise.all(
          [...clientIds].map(async (id) => {
            try {
              const s = await getDoc(doc(db, "clientProfiles", id));
              if (s.exists()) {
                const cd = s.data();
                names[id] = cd.fullName || cd.name || "";
              }
            } catch { /* تخطّي المرفوض */ }
          })
        );

        // ✅ بناء الخريطة: اسم القضية ← أسماء الموكلين ← احتياطي برقم
        const map = {};
        rawCases.forEach(({ id, data, refs }) => {
          // ✅ سلسلة الاحتمالات: اسم مضمّن ← ملف clientProfiles ← النص الخام (بيانات قديمة)
          const clientsTitle = refs
            .map((c) => {
              const cid = typeof c === "object" ? c.id : c;
              return (
                (typeof c === "object" && (c.name || c.fullName)) ||
                names[cid] ||
                (typeof c === "string" ? c : "") ||
                ""
              );
            })
            .filter(Boolean)
            .join("، ");
          map[id] = {
            title: data.caseName || clientsTitle || `قضية رقم ${data.caseSerial || data.caseNumber || ""}`,
            number: data.caseSerial || data.caseNumber || "",
            year: data.caseYear || "",
          };
        });
        if (isMounted) setCasesMap(map);
      } catch (e) {
        console.error("Error loading cases map:", e);
      }
    };
    loadCases();
    return () => { isMounted = false; };
  }, [officeId]);

  // ✅ جلب الأعمال (الأحدث أولاً)
  const fetchTasks = async () => {
    if (!officeId) {
      setLoading(false);
      return [];
    }
    try {
      const q = query(
        collection(db, "adminTasks"),
        where("officeId", "==", officeId)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      sortTasks(data);
      setTasks(data);
      return data;
    } catch (err) {
      console.error("Error fetching tasks:", err);
      return [];
    }
  };

  // ✅ عند فتح الصفحة: تنظيف تلقائي (حسب إعداد المكتب) ثم الجلب
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      try {
        const retention = await getOfficeTaskRetention(officeId);
        if (retention.enabled && retention.days > 0) {
          const deleted = await cleanupCompletedTasks(officeId, retention.days);
          if (isMounted && deleted > 0) {
            showToast("info", `🧹 تم حذف ${deleted} عمل منجز تلقائيًا (أقدم من ${retention.days} يوم)`);
          }
        }
      } catch (e) {
        console.warn("تعذر التنظيف التلقائي:", e.message);
      }
      if (isMounted) {
        await fetchTasks();
        setLoading(false);
      }
    };

    if (officeId) init();
    else setLoading(false);

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const handleEdit = (task) => {
    setEditing(task);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await deleteDoc(doc(db, "adminTasks", id));
      setTasks((prev) => prev.filter((t) => t.id !== id));
      showToast("success", "تم حذف العمل");
    } catch (err) {
      console.error("Error deleting task:", err);
      showToast("error", "حدث خطأ أثناء الحذف");
    }
  };

  // ✅ حذف جميع الأعمال المنجزة دفعة واحدة
  const handleDeleteAllCompleted = async () => {
    if (completedCount === 0) return;
    if (!window.confirm(`هل أنت متأكد من حذف جميع الأعمال المنجزة (${completedCount} عمل)؟\nلا يمكن التراجع عن هذا الإجراء.`)) return;
    setCleaning(true);
    try {
      const deleted = await deleteAllCompletedTasks(officeId);
      setTasks((prev) => prev.filter((t) => t.status !== "completed"));
      showToast("success", `تم حذف ${deleted} عمل منجز`);
    } catch (e) {
      console.error(e);
      showToast("error", "حدث خطأ أثناء الحذف الجماعي");
    } finally {
      setCleaning(false);
    }
  };

  const handleToggleStatus = async (taskId, newStatus) => {
    try {
      await updateDoc(doc(db, "adminTasks", taskId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
        completedAt: newStatus === "completed" ? serverTimestamp() : null,
      });
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date() : null }
            : t
        )
      );
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  // Refresh function
  const refreshTasks = async () => {
    setLoading(true);
    await fetchTasks();
    setLoading(false);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "14px 20px", borderRadius: 12,
          background: toast.type === "error" ? COLORS.red : toast.type === "info" ? COLORS.bgCard : COLORS.green,
          color: "#fff", fontWeight: 600, fontSize: 14,
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.border}`,
          maxWidth: 400,
        }}>
          {toast.message}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: COLORS.gold, fontSize: "clamp(20px, 5vw, 28px)" }}>
            📋 الأعمال الإدارية
          </h1>
          <p style={{ margin: 0, color: COLORS.textMuted, fontSize: "14px" }}>
            إدارة المهام والأعمال الإدارية للمكتب — اضغط على أي عمل مرتبط بقضية للانتقال إليها
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {completedCount > 0 && (
            <Button
              onClick={handleDeleteAllCompleted}
              disabled={cleaning}
              style={{ background: "transparent", border: `1px solid ${COLORS.red}`, color: COLORS.red }}
            >
              {cleaning ? "⏳ جاري الحذف..." : `🗑 حذف المنجزة (${completedCount})`}
            </Button>
          )}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "10px 16px",
              borderRadius: "10px",
              border: `1px solid ${COLORS.border}`,
              background: COLORS.bgCard,
              color: COLORS.text,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            <option value="all">الكل</option>
            <option value="pending">قيد التنفيذ</option>
            <option value="completed">مكتملة</option>
          </select>
          <Button onClick={refreshTasks} style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
            🔄 تحديث
          </Button>
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            + إضافة عمل
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <Card style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: COLORS.gold }}>{tasks.length}</div>
            <div style={{ color: COLORS.textMuted, fontSize: "14px" }}>إجمالي الأعمال</div>
          </div>
        </Card>
        <Card style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: COLORS.orange }}>
              {tasks.filter((t) => t.status !== "completed").length}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: "14px" }}>قيد التنفيذ</div>
          </div>
        </Card>
        <Card style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}` }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: COLORS.green }}>
              {completedCount}
            </div>
            <div style={{ color: COLORS.textMuted, fontSize: "14px" }}>مكتملة</div>
          </div>
        </Card>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: COLORS.textMuted }}>⏳ جاري التحميل...</div>
      ) : filteredTasks.length === 0 ? (
        <Card style={{ textAlign: "center", padding: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <h3 style={{ color: COLORS.text, margin: "0 0 8px 0" }}>لا توجد أعمال إدارية</h3>
          <p style={{ color: COLORS.textMuted, margin: 0 }}>اضغط "إضافة عمل" لإنشاء عمل جديد</p>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredTasks.map((task) => {
            const caseInfo = task.caseId && task.caseId !== "general" ? casesMap[task.caseId] : null;
            const canNavigate = Boolean(caseInfo);
            return (
              /* ✅ الضغط على البطاقة ينقل إلى القضية (باستثناء الأزرار الداخلية) */
              <div
                key={task.id}
                onClick={() => canNavigate && navigate(`/case/${task.caseId}`)}
                style={{ cursor: canNavigate ? "pointer" : "default" }}
                title={canNavigate ? "اضغط للانتقال إلى القضية" : undefined}
              >
                <AdminTaskCard
                  task={task}
                  caseInfo={caseInfo}
                  onToggle={() => handleToggleStatus(task.id, task.status === "completed" ? "pending" : "completed")}
                  onStatusChange={(id, status) => handleToggleStatus(id, status)}
                  onEdit={() => handleEdit(task)}
                  onDelete={() => handleDelete(task.id)}
                />
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <AdminTaskForm
          task={editing}
          onSave={refreshTasks}
          onClose={() => {
            handleCloseForm();
            refreshTasks();   // ✅ تحديث مضمون مهما كان زر الإغلاق
          }}
        />
      )}
    </div>
  );
}