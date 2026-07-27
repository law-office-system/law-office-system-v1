import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import AdminTaskCard from "../components/case/AdminTaskCard";
import AdminTaskForm from "../components/case/AdminTaskForm";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";

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

export default function AdminTasks() {
  const { userData } = useAuth();
  const officeId = userData?.officeId;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState("all"); // all, pending, completed

  // ✅ Fetch tasks with officeId filter (getDocs instead of onSnapshot)
  useEffect(() => {
    if (!officeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const fetchTasks = async () => {
      setLoading(true);
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

        // Sort by priority then due date
        data.sort((a, b) => {
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
        });

        if (isMounted) {
          setTasks(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching tasks:", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchTasks();

    return () => {
      isMounted = false;
    };
  }, [officeId]);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "pending") return task.status !== "completed";
    if (filter === "completed") return task.status === "completed";
    return true;
  });

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
    } catch (err) {
      console.error("Error deleting task:", err);
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
    if (!officeId) return;
    setLoading(true);
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
      data.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.dueDate || 0) - new Date(b.dueDate || 0);
      });
      setTasks(data);
    } catch (err) {
      console.error("Error refreshing tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: "0 0 8px 0", color: COLORS.gold, fontSize: "clamp(20px, 5vw, 28px)" }}>
            📋 الأعمال الإدارية
          </h1>
          <p style={{ margin: 0, color: COLORS.textMuted, fontSize: "14px" }}>
            إدارة المهام والأعمال الإدارية للمكتب
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
              {tasks.filter((t) => t.status === "completed").length}
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
          {filteredTasks.map((task) => (
            <AdminTaskCard
              key={task.id}
              task={task}
              onToggle={() => handleToggleStatus(task.id, task.status === "completed" ? "pending" : "completed")}
              onEdit={() => handleEdit(task)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <AdminTaskForm
          task={editing}
          onClose={handleCloseForm}
          onSuccess={refreshTasks}
        />
      )}
    </div>
  );
}