import React, { useState, useEffect } from "react";
import { doc, getDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseDb";
import Button from "../ui/Button";
import Card from "../ui/Card";
import JudgmentCard from "./JudgmentCard";
import JudgmentForm from "./JudgmentForm";

// ✅ FIXED: Now accepts judgments from props instead of fetching internally
export default function JudgmentsSection({ 
  caseId, 
  judgments = [],       // ✅ NEW: Accept judgments from parent (CaseDetails)
  sessions = [],        // ✅ NEW: Accept sessions for linking
  onAddJudgment         // ✅ NEW: Accept save handler from parent
}) {
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

  // ✅ NEW: Local delete using Firestore directly
  const handleDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من الحذف؟")) return;
    try {
      await deleteDoc(doc(db, 'judgments', id));
    } catch (err) {
      console.error('Error deleting judgment:', err);
      alert('حدث خطأ أثناء الحذف');
    }
  };

  // ✅ NEW: Local toggle follow-up using Firestore directly
  const handleToggleFollowUp = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'judgments', id), { 
        needsFollowUp: !currentStatus, 
        updatedAt: new Date() 
      });
    } catch (err) {
      console.error('Error toggling follow up:', err);
      alert('حدث خطأ أثناء التحديث');
    }
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
        {onAddJudgment && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>+ إضافة حكم</Button>
        )}
      </div>

      {judgments.length === 0 ? (
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
          sessions={sessions}
          judgment={editing}
          onClose={handleCloseForm}
          onSave={onAddJudgment}
        />
      )}
    </div>
  );
}