import React, { useState } from "react";
import { useAdminTasks } from "../../hooks/useAdminTasks";
import { Link2, Calendar, Briefcase, Clock } from "lucide-react";
import AdminTaskForm from "./AdminTaskForm";
import AdminTaskCard from "./AdminTaskCard";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function AdminTasksSection({ caseId, sessions = [], tasks: externalTasks = null }) {
  const hookData = useAdminTasks(caseId);
  const tasks = externalTasks || hookData.tasks;
  const loading = externalTasks ? false : hookData.loading;
  const deleteTask = hookData.deleteTask;
  const toggleTaskStatus = hookData.toggleTaskStatus;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

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
    await deleteTask(id);
  };

  // Helper to find session title
  const getSessionInfo = (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return null;
    return {
      title: session.title || `الجلسة ${sessions.indexOf(session) + 1}`,
      date: session.date || session.nextSessionDate,
      decisionType: session.decisionType,
      decisionLabel: session.decisionLabel,
    };
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "clamp(16px, 4vw, 20px)", display: "flex", alignItems: "center", gap: 8 }}>
          <Briefcase size={22} color="#d97706" />
          الأعمال الإدارية
        </h3>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>+</span> إضافة عمل
          </span>
        </Button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#64748b" }}>جاري التحميل...</p>
      ) : tasks.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Briefcase size={32} color="#6b7280" style={{ marginBottom: 8 }} />
            <p style={{ color: "#6b7280", margin: 0 }}>لا توجد أعمال إدارية مرتبطة</p>
            {sessions.length > 0 && (
              <p style={{ color: "#9ca3af", fontSize: "13px", marginTop: 4 }}>
                يمكنك إضافة أعمال من نموذج الجلسة مباشرة
              </p>
            )}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {tasks.map((task) => {
            const sessionInfo = task.sessionId ? getSessionInfo(task.sessionId) : null;
            return (
              <div key={task.id} style={{ position: "relative" }}>
                {/* Session Link Badge (NEW) */}
                {sessionInfo && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 12px",
                    background: "rgba(96, 165, 250, 0.1)",
                    color: "#60a5fa",
                    borderRadius: "20px 20px 0 0",
                    fontSize: "11px",
                    fontWeight: 600,
                    width: "fit-content",
                    marginBottom: "-1px",
                    border: "1px solid rgba(96, 165, 250, 0.2)",
                    borderBottom: "none",
                  }}>
                    <Link2 size={11} />
                    <Calendar size={11} />
                    {sessionInfo.title}
                    {sessionInfo.date && (
                      <span style={{ color: "#9ca3af" }}>
                        ({new Date(sessionInfo.date).toLocaleDateString("ar-EG")})
                      </span>
                    )}
                    {sessionInfo.decisionLabel && (
                      <span style={{ color: "#f59e0b", marginRight: 4 }}>
                        — {sessionInfo.decisionLabel}
                      </span>
                    )}
                  </div>
                )}
                <AdminTaskCard
                  task={task}
                  onToggle={() => toggleTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
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
          caseId={caseId}
          sessions={sessions}
          task={editing}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}