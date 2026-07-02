import React, { useState, useEffect } from "react";
import { useJudgments } from "../../hooks/useJudgments";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import JudgmentForm from "./JudgmentForm";
import JudgmentCard from "./JudgmentCard";
import Card from "../ui/Card";
import Button from "../ui/Button";

export default function JudgmentsSection({ caseId }) {
  const { judgments, loading, deleteJudgment, toggleFollowUp } = useJudgments(caseId);
  const [caseData, setCaseData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Fetch case data for header display
  useEffect(() => {
    if (!caseId || caseId === 'general') return;
    const fetchCase = async () => {
      try {
        const caseDoc = await getDoc(doc(db, 'cases', caseId));
        if (caseDoc.exists()) {
          setCaseData(caseDoc.data());
        }
      } catch (err) {
        console.error('Error fetching case:', err);
      }
    };
    fetchCase();
  }, [caseId]);

  const handleEdit = (judgment) => {
    setEditing(judgment);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    await deleteJudgment(id);
  };

  const handleToggleFollowUp = async (id, currentStatus) => {
    await toggleFollowUp(id, currentStatus);
  };

  // Get case display name
  const getCaseDisplayName = () => {
    if (!caseData) return 'جاري التحميل...';
    if (caseData.caseNumber && caseData.caseYear) {
      return `قضية رقم ${caseData.caseNumber} / ${caseData.caseYear}`;
    }
    if (caseData.caseSerial && caseData.caseYear) {
      return `قضية رقم ${caseData.caseSerial} / ${caseData.caseYear}`;
    }
    if (caseData.clientName) return caseData.clientName;
    if (caseData.court) return `محكمة ${caseData.court}`;
    return 'قضية بدون اسم';
  };

  const caseInfo = caseData ? {
    title: getCaseDisplayName(),
    number: caseData.caseNumber || caseData.caseSerial || '',
  } : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, color: "#f3f4f6", fontSize: "clamp(16px, 4vw, 20px)" }}>⚖️ الأحكام</h3>
          {judgments.length > 0 && (
            <span style={{ 
              background: 'rgba(30, 64, 175, 0.2)', 
              color: '#60a5fa', 
              padding: '2px 10px', 
              borderRadius: '12px', 
              fontSize: '13px',
              fontWeight: 600 
            }}>
              {judgments.length}
            </span>
          )}
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ إضافة حكم</Button>
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "#64748b" }}>جاري التحميل...</p>
      ) : judgments.length === 0 ? (
        <Card>
          <p style={{ color: "#64748b", textAlign: "center" }}>لا توجد أحكام مسجلة</p>
        </Card>
      ) : (
        judgments.map((judgment) => (
          <JudgmentCard
            key={judgment.id}
            judgment={judgment}
            caseInfo={caseInfo}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleFollowUp={handleToggleFollowUp}
          />
        ))
      )}

      {showForm && (
        <JudgmentForm
          caseId={caseId}
          judgment={editing}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}