import React, { useState } from "react";
import { useAdminTasks } from "../../hooks/useAdminTasks";
import AdminTaskForm from "./AdminTaskForm";
import AdminTaskCard from "./AdminTaskCard";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function AdminTasksSection({ caseId }) {
  const { tasks, loading, deleteTask, toggleTaskStatus } = useAdminTasks(caseId);
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "#1e3a8a", fontSize: "clamp(16px, 4vw, 20px)" }}>📋 الأعمال الإدارية</h3>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ إضافة عمل</Button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#64748b" }}>جاري التحميل...</p>
      ) : tasks.length === 0 ? (
        <Card>
          <p style={{ color: "#64748b", textAlign: "center" }}>لا توجد أعمال إدارية</p>
        </Card>
      ) : (
        tasks.map((task) => (
          <AdminTaskCard
            key={task.id}
            task={task}
            onToggle={() => toggleTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")}
            onEdit={() => handleEdit(task)}
            onDelete={() => handleDelete(task.id)}
          />
        ))
      )}

      {showForm && (
        <AdminTaskForm
          caseId={caseId}
          task={editing}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}