// ============================================================
// 📁 FILE: src/components/case/CreateNextLevelButton.jsx
// Description: Button to create next litigation level (استئناف/نقض/تنفيذ)
// ============================================================

import { useState } from "react";
import { ArrowRight, Gavel, AlertTriangle, X } from "lucide-react";
import {
  getLitigationLevelLabel,
  getLitigationLevelColor,
} from "../../constants/caseStatusLabels";

export default function CreateNextLevelButton({
  currentLevel,
  onCreateLevel,
  loading,
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState("");
  const [formData, setFormData] = useState({
    court: "",
    caseNumber: "",
    caseYear: new Date().getFullYear(),
    filingDate: "",
    circuit: "",
  });

  if (!currentLevel || currentLevel.isCompleted) return null;

  // Determine next possible levels
  const getNextLevels = () => {
    const currentType = currentLevel.levelType;
    const levels = [];

    if (currentType === "first_instance") {
      levels.push({
        value: "appeal",
        label: "استئناف",
        description: "الطعن على الحكم أمام محكمة الاستئناف",
        color: "#f59e0b",
      });
    }
    if (currentType === "appeal") {
      levels.push({
        value: "cassation",
        label: "نقض",
        description: "الطعن على الحكم أمام محكمة النقض",
        color: "#ef4444",
      });
    }
    if (currentType === "cassation") {
      levels.push({
        value: "retrial",
        label: "التماس إعادة النظر",
        description: "طلب إعادة النظر في الحكم",
        color: "#8b5cf6",
      });
    }
    if (["first_instance", "appeal", "cassation", "retrial"].includes(currentType)) {
      levels.push({
        value: "execution",
        label: "تنفيذ",
        description: "بدء إجراءات التنفيذ",
        color: "#10b981",
      });
    }

    return levels;
  };

  const nextLevels = getNextLevels();

  if (nextLevels.length === 0) return null;

  const handleSubmit = async () => {
    if (!selectedLevel) return;

    await onCreateLevel({
      levelType: selectedLevel,
      court: formData.court,
      caseNumber: formData.caseNumber,
      caseYear: parseInt(formData.caseYear),
      filingDate: formData.filingDate,
      circuit: formData.circuit,
      status: "new",
    });

    setShowModal(false);
    setSelectedLevel("");
    setFormData({
      court: "",
      caseNumber: "",
      caseYear: new Date().getFullYear(),
      filingDate: "",
      circuit: "",
    });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "clamp(8px, 2.5vw, 12px) clamp(14px, 3vw, 20px)",
          background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
          color: "#fff",
          border: "none",
          borderRadius: 12,
          cursor: "pointer",
          fontSize: "clamp(12px, 3.5vw, 14px)",
          fontWeight: 700,
          fontFamily: "inherit",
          transition: "all 0.2s ease",
          boxShadow: "0 4px 16px rgba(30, 64, 175, 0.3)",
          width: "100%",
          justifyContent: "center",
        }}
      >
        <ArrowRight size={18} />
        إنشاء درجة تقاضي تالية
      </button>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(8px)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#1e293b",
            border: "1px solid rgba(55, 65, 81, 0.5)",
            borderRadius: 24,
            width: "100%",
            maxWidth: 500,
            maxHeight: "90vh",
            overflow: "auto",
            padding: 24,
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              paddingBottom: 16,
              borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: "#f3f4f6",
                  fontSize: "clamp(14px, 4vw, 18px)",
                  fontWeight: 700,
                }}>
                  <Gavel size={20} style={{ display: "inline", marginLeft: 8, verticalAlign: "middle" }} />
                  إنشاء درجة تقاضي جديدة
                </h2>
                <p style={{
                  margin: "6px 0 0 0",
                  color: "#9ca3af",
                  fontSize: "clamp(11px, 3vw, 13px)",
                }}>
                  الدرجة الحالية: {getLitigationLevelLabel(currentLevel.levelType)}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 10,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Alert */}
            <div style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              borderRadius: 10,
              padding: 12,
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}>
              <AlertTriangle size={18} color="#f59e0b" />
              <span style={{ color: "#fbbf24", fontSize: 13 }}>
                سيتم إغلاق الدرجة الحالية وإنشاء درجة جديدة. هذا الإجراء لا يمكن التراجع عنه.
              </span>
            </div>

            {/* Level Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                color: "#9ca3af",
                fontSize: 13,
                marginBottom: 10,
                fontWeight: 600,
              }}>
                اختر درجة التقاضي التالية:
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nextLevels.map((level) => (
                  <div
                    key={level.value}
                    onClick={() => setSelectedLevel(level.value)}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      border: `2px solid ${selectedLevel === level.value ? level.color : "rgba(55, 65, 81, 0.5)"}`,
                      background: selectedLevel === level.value ? `${level.color}10` : "rgba(15, 23, 42, 0.5)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{
                      fontWeight: 700,
                      color: selectedLevel === level.value ? level.color : "#f3f4f6",
                      fontSize: 15,
                      marginBottom: 4,
                    }}>
                      {level.label}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: 12 }}>
                      {level.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Form Fields */}
            {selectedLevel && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                <input
                  placeholder="المحكمة *"
                  value={formData.court}
                  onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    placeholder="رقم القضية"
                    value={formData.caseNumber}
                    onChange={(e) => setFormData({ ...formData, caseNumber: e.target.value })}
                    style={{
                      flex: 1,
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#f8fafc",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  />
                  <input
                    type="number"
                    placeholder="السنة"
                    value={formData.caseYear}
                    onChange={(e) => setFormData({ ...formData, caseYear: e.target.value })}
                    style={{
                      width: 100,
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#f8fafc",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <input
                  placeholder="الدائرة / الشعبة"
                  value={formData.circuit}
                  onChange={(e) => setFormData({ ...formData, circuit: e.target.value })}
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#0f172a",
                    color: "#f8fafc",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
                <label style={{ color: "#9ca3af", fontSize: 12 }}>
                  تاريخ الرفع:
                  <input
                    type="date"
                    value={formData.filingDate}
                    onChange={(e) => setFormData({ ...formData, filingDate: e.target.value })}
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: 4,
                      padding: 12,
                      borderRadius: 8,
                      border: "1px solid #334155",
                      background: "#0f172a",
                      color: "#f8fafc",
                      fontSize: 14,
                      fontFamily: "inherit",
                    }}
                  />
                </label>
              </div>
            )}

            {/* Actions */}
            <div style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "10px 20px",
                  background: "rgba(55, 65, 81, 0.5)",
                  color: "#9ca3af",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >
                إلغاء
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedLevel || !formData.court || loading}
                style={{
                  padding: "10px 24px",
                  background: selectedLevel ? getLitigationLevelColor(selectedLevel) : "#334155",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  cursor: !selectedLevel || !formData.court || loading ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  opacity: !selectedLevel || !formData.court || loading ? 0.5 : 1,
                }}
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الدرجة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}