// ============================================================
// 📁 FILE: src/pages/AddStage.jsx
// Description: Manage Litigation Levels for a case (درجات التقاضي)
// ============================================================

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Landmark, ArrowRight, CheckCircle2, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Plus, X, Gavel
} from "lucide-react";
import {
  getLitigationLevelsByCase,
  createNextLitigationLevel,
  updateLitigationLevel,
} from "../services/litigationLevels";
import {
  getLitigationLevelLabel,
  getLitigationLevelColor,
  getWorkflowStatusLabel,
  getWorkflowStatusColor,
} from "../constants/caseStatusLabels";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebaseDb";
import { doc, getDoc } from "firebase/firestore";

// ✅ كل درجات التقاضي المتاحة — المستخدم يختار أي درجة غير موجودة
const ALL_LITIGATION_LEVELS = [
  { value: "first_instance", label: "أول درجة", desc: "الدرجة الأولى من التقاضي", color: "#3b82f6", order: 1 },
  { value: "partial", label: "جزئية", desc: "محكمة جزئية", color: "#06b6d4", order: 2 },
  { value: "appeal", label: "استئناف", desc: "الطعن على الحكم أمام محكمة الاستئناف", color: "#f59e0b", order: 3 },
  { value: "cassation", label: "نقض", desc: "الطعن على الحكم أمام محكمة النقض", color: "#ef4444", order: 4 },
  { value: "supreme", label: "عليا", desc: "المحكمة العليا", color: "#8b5cf6", order: 5 },
  { value: "retrial", label: "التماس إعادة النظر", desc: "طلب إعادة النظر في الحكم", color: "#ec4899", order: 6 },
  { value: "administrative_court", label: "مجلس الدولة", desc: "القضاء الإداري", color: "#14b8a6", order: 7 },
  { value: "constitutional_court", label: "الدستورية العليا", desc: "المحكمة الدستورية العليا", color: "#f97316", order: 8 },
  { value: "disciplinary", label: "تأديبي", desc: "القضاء التأديبي", color: "#6366f1", order: 9 },
  { value: "military_appeal", label: "استئناف عسكري", desc: "الاستئناف أمام المحكمة العسكرية", color: "#84cc16", order: 10 },
  { value: "military_cassation", label: "نقض عسكري", desc: "النقض أمام المحكمة العسكرية", color: "#a855f7", order: 11 },
  { value: "execution", label: "تنفيذ", desc: "بدء إجراءات التنفيذ", color: "#10b981", order: 12 },
  { value: "urgent", label: "عاجلة", desc: "دعوى عاجلة", color: "#dc2626", order: 13 },
  { value: "summary", label: "موجزة", desc: "دعوى موجزة", color: "#0891b2", order: 14 },
  { value: "plenary", label: "الأحكام الكلية", desc: "الدائرة الكلية", color: "#7c3aed", order: 15 },
];

export default function AddStage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();

  const [levels, setLevels] = useState([]);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedNextLevel, setSelectedNextLevel] = useState("");
  const [createForm, setCreateForm] = useState({
    court: "",
    caseNumber: "",
    caseYear: new Date().getFullYear(),
    filingDate: "",
    circuit: "",
  });

  // Edit status state
  const [editingLevel, setEditingLevel] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  // Load case and levels
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Get case data
        const caseSnap = await getDoc(doc(db, "cases", id));
        if (caseSnap.exists()) {
          const data = caseSnap.data();
          if (data.officeId !== userData?.officeId) {
            alert("⛔ غير مسموح لك بالوصول لهذه القضية");
            navigate("/cases");
            return;
          }
          setCaseData({ id: caseSnap.id, ...data });
        } else {
          alert("القضية غير موجودة");
          navigate("/cases");
          return;
        }

        // Get litigation levels
        const levelsData = await getLitigationLevelsByCase(id);
        setLevels(levelsData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, userData, navigate]);

  // Get active level
  const activeLevel = levels.find((l) => l.isActive);
  const completedLevels = levels.filter((l) => l.isCompleted);

  // ✅ Get all available levels that don't already exist
  const getAvailableNextLevels = () => {
    const existingTypes = new Set(levels.map(l => l.levelType));
    return ALL_LITIGATION_LEVELS.filter(level => !existingTypes.has(level.value));
  };

  // Handle create next level
  const handleCreateLevel = async () => {
    if (!selectedNextLevel || !createForm.court || !activeLevel) return;

    setSaving(true);
    try {
      await createNextLitigationLevel(id, activeLevel.id, {
        levelType: selectedNextLevel,
        court: createForm.court,
        caseNumber: createForm.caseNumber,
        caseYear: parseInt(createForm.caseYear),
        filingDate: createForm.filingDate,
        circuit: createForm.circuit,
        status: "new",
      }, userData.officeId);

      // Refresh levels
      const updatedLevels = await getLitigationLevelsByCase(id);
      setLevels(updatedLevels);

      // Reset form
      setShowCreateModal(false);
      setSelectedNextLevel("");
      setCreateForm({
        court: "",
        caseNumber: "",
        caseYear: new Date().getFullYear(),
        filingDate: "",
        circuit: "",
      });

      alert("✅ تم إنشاء درجة التقاضي الجديدة بنجاح");
    } catch (error) {
      console.error("Error creating level:", error);
      alert("❌ حدث خطأ أثناء إنشاء الدرجة");
    } finally {
      setSaving(false);
    }
  };

  // Handle update status
  const handleUpdateStatus = async (levelId) => {
    if (!newStatus) return;
    try {
      await updateLitigationLevel(levelId, { status: newStatus });
      const updatedLevels = await getLitigationLevelsByCase(id);
      setLevels(updatedLevels);
      setEditingLevel(null);
      setNewStatus("");
    } catch (error) {
      console.error("Error updating status:", error);
      alert("❌ حدث خطأ أثناء التحديث");
    }
  };

  // Status options
  const STATUS_OPTIONS = [
    { value: "new", label: "جديدة" },
    { value: "registered", label: "تم قيدها" },
    { value: "first_session", label: "أول جلسة" },
    { value: "ongoing", label: "متداولة" },
    { value: "postponed", label: "مؤجلة" },
    { value: "pleading", label: "مرافعة" },
    { value: "reserved_for_judgment", label: "حجز للحكم" },
    { value: "judgment_issued", label: "صدر الحكم" },
    { value: "judgment_announced", label: "تم إعلان الحكم" },
    { value: "closed", label: "مغلقة" },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f172a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#9ca3af",
        direction: "rtl",
      }}>
        <div style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(30, 64, 175, 0.2)",
          borderTopColor: "#1e40af",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
          marginLeft: 12,
        }} />
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={{
      padding: "clamp(8px, 3vw, 24px)",
      background: "#0f172a",
      minHeight: "100vh",
      direction: "rtl",
      fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
    }}>
      {/* Header */}
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: "clamp(12px, 4vw, 24px)",
        marginBottom: 20,
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: "clamp(16px, 5vw, 22px)",
              color: "#f3f4f6",
              fontWeight: 700,
            }}>
              <Landmark size={24} color="#fbbf24" style={{ marginLeft: 10, verticalAlign: "middle" }} />
              درجات التقاضي
            </h1>
            {caseData && (
              <p style={{
                margin: "8px 0 0 0",
                color: "#9ca3af",
                fontSize: "clamp(12px, 3.5vw, 14px)",
              }}>
                القضية رقم {caseData.caseSerial} لسنة {caseData.caseYear} - {caseData.court}
              </p>
            )}
          </div>
          <button
            onClick={() => navigate(`/case/${id}`)}
            style={{
              padding: "8px 16px",
              background: "rgba(55, 65, 81, 0.5)",
              color: "#9ca3af",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <ArrowRight size={16} />
            العودة للقضية
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: "clamp(12px, 4vw, 24px)",
        marginBottom: 20,
      }}>
        <h2 style={{
          margin: "0 0 20px 0",
          color: "#f3f4f6",
          fontSize: "clamp(14px, 4vw, 18px)",
          fontWeight: 700,
          paddingBottom: 12,
          borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
        }}>
          سير درجات التقاضي
        </h2>

        {levels.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
            <Landmark size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>لا توجد درجات تقاضي مسجلة</p>
          </div>
        ) : (
          <div style={{ position: "relative", paddingRight: 24 }}>
            {/* Vertical line */}
            <div style={{
              position: "absolute",
              right: 32,
              top: 16,
              bottom: 16,
              width: 2,
              background: "linear-gradient(to bottom, #3b82f6, #1e40af, #334155)",
              borderRadius: 2,
            }} />

            {levels.map((level, index) => {
              const isActive = level.isActive;
              const isCompleted = level.isCompleted;
              const levelColor = getLitigationLevelColor(level.levelType);
              const statusColor = getWorkflowStatusColor(level.status);

              return (
                <div key={level.id} style={{ marginBottom: 16, position: "relative" }}>
                  {/* Dot */}
                  <div style={{
                    position: "absolute",
                    right: 24,
                    top: 16,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: isActive ? levelColor : isCompleted ? "#10b981" : "#334155",
                    border: `3px solid ${isActive ? levelColor : isCompleted ? "#10b981" : "#475569"}`,
                    boxShadow: isActive ? `0 0 12px ${levelColor}40` : "none",
                    zIndex: 2,
                  }} />

                  {/* Card */}
                  <div style={{
                    marginRight: 48,
                    background: isActive ? `${levelColor}08` : "rgba(15, 23, 42, 0.5)",
                    border: `1px solid ${isActive ? `${levelColor}30` : "rgba(55, 65, 81, 0.3)"}`,
                    borderRadius: 12,
                    padding: "clamp(12px, 3vw, 16px)",
                  }}>
                    {/* Header */}
                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 10,
                    }}>
                      <div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 6,
                        }}>
                          <span style={{
                            fontWeight: 700,
                            color: "#f3f4f6",
                            fontSize: "clamp(14px, 4vw, 16px)",
                          }}>
                            {getLitigationLevelLabel(level.levelType)}
                          </span>
                          {isActive && (
                            <span style={{
                              background: `${levelColor}15`,
                              color: levelColor,
                              padding: "2px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              border: `1px solid ${levelColor}25`,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              <Clock size={10} />
                              نشطة
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{
                              background: "rgba(16, 185, 129, 0.15)",
                              color: "#10b981",
                              padding: "2px 10px",
                              borderRadius: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              border: "1px solid rgba(16, 185, 129, 0.3)",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}>
                              <CheckCircle2 size={10} />
                              منتهية
                            </span>
                          )}
                        </div>

                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                        }}>
                          <span style={{
                            background: `${statusColor}12`,
                            color: statusColor,
                            padding: "3px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                          }}>
                            {getWorkflowStatusLabel(level.status)}
                          </span>

                          {level.court && (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>
                              <Landmark size={12} style={{ display: "inline", marginLeft: 4 }} />
                              {level.court}
                            </span>
                          )}

                          {level.caseNumber && (
                            <span style={{ color: "#9ca3af", fontSize: 12 }}>
                              رقم {level.caseNumber} لسنة {level.caseYear}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Edit status button */}
                      {isActive && (
                        <button
                          onClick={() => {
                            setEditingLevel(level.id);
                            setNewStatus(level.status);
                          }}
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                            borderRadius: 8,
                            padding: "6px 12px",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          تعديل الحالة
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 8,
                      fontSize: 12,
                      color: "#9ca3af",
                    }}>
                      {level.circuit && (
                        <div>الدائرة: <span style={{ color: "#f3f4f6" }}>{level.circuit}</span></div>
                      )}
                      {level.filingDate && (
                        <div>تاريخ الرفع: <span style={{ color: "#f3f4f6" }}>
                          {new Date(level.filingDate).toLocaleDateString("ar-EG")}
                        </span></div>
                      )}
                      {level.judgmentDate && (
                        <div>تاريخ الحكم: <span style={{ color: "#f3f4f6" }}>
                          {new Date(level.judgmentDate).toLocaleDateString("ar-EG")}
                        </span></div>
                      )}
                      {level.sessionCount > 0 && (
                        <div>عدد الجلسات: <span style={{ color: "#f3f4f6" }}>{level.sessionCount}</span></div>
                      )}
                    </div>

                    {/* Edit status form */}
                    {editingLevel === level.id && (
                      <div style={{
                        marginTop: 12,
                        padding: 12,
                        background: "rgba(15, 23, 42, 0.8)",
                        borderRadius: 10,
                        border: "1px solid rgba(55, 65, 81, 0.5)",
                      }}>
                        <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 8 }}>
                          تحديث حالة الدرجة:
                        </label>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                            style={{
                              flex: 1,
                              padding: 10,
                              borderRadius: 8,
                              border: "1px solid #334155",
                              background: "#0f172a",
                              color: "#f8fafc",
                              fontSize: 14,
                              fontFamily: "inherit",
                            }}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleUpdateStatus(level.id)}
                            style={{
                              padding: "10px 16px",
                              background: "#10b981",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 700,
                              fontFamily: "inherit",
                            }}
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => { setEditingLevel(null); setNewStatus(""); }}
                            style={{
                              padding: "10px 16px",
                              background: "rgba(55, 65, 81, 0.5)",
                              color: "#9ca3af",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer",
                              fontSize: 13,
                              fontWeight: 600,
                              fontFamily: "inherit",
                            }}
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Next Level Section */}
      {activeLevel && getAvailableNextLevels().length > 0 && (
        <div style={{
          background: "#1e293b",
          border: "1px solid rgba(55, 65, 81, 0.5)",
          borderRadius: 16,
          padding: "clamp(12px, 4vw, 24px)",
        }}>
          <h2 style={{
            margin: "0 0 16px 0",
            color: "#f3f4f6",
            fontSize: "clamp(14px, 4vw, 18px)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <Gavel size={20} color="#f59e0b" />
            إنشاء درجة تقاضي تالية
          </h2>

          <p style={{
            color: "#9ca3af",
            fontSize: 13,
            marginBottom: 16,
          }}>
            الدرجة الحالية: <strong style={{ color: "#f3f4f6" }}>{getLitigationLevelLabel(activeLevel.levelType)}</strong>
            {" "}— يمكنك إنشاء أي من الدرجات التالية غير المسجلة:
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}>
            {getAvailableNextLevels().map((nextLevel) => (
              <button
                key={nextLevel.value}
                onClick={() => {
                  setSelectedNextLevel(nextLevel.value);
                  setCreateForm((p) => ({ ...p, court: activeLevel.court || "" }));
                  setShowCreateModal(true);
                }}
                style={{
                  padding: 16,
                  background: `${nextLevel.color}10`,
                  border: `2px solid ${nextLevel.color}30`,
                  borderRadius: 12,
                  cursor: "pointer",
                  textAlign: "right",
                  transition: "all 0.2s ease",
                  fontFamily: "inherit",
                }}
              >
                <div style={{
                  fontWeight: 700,
                  color: nextLevel.color,
                  fontSize: 16,
                  marginBottom: 6,
                }}>
                  {nextLevel.label}
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>
                  {nextLevel.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No more levels */}
      {getAvailableNextLevels().length === 0 && (
        <div style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: 16,
          padding: 20,
          textAlign: "center",
        }}>
          <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: 8 }} />
          <p style={{ color: "#10b981", fontWeight: 700, margin: 0 }}>
            تم تسجيل جميع درجات التقاضي الممكنة
          </p>
          <p style={{ color: "#9ca3af", fontSize: 13, margin: "8px 0 0 0" }}>
            لا يوجد درجات تقاضي إضافية متاحة
          </p>
        </div>
      )}

      {/* Create Level Modal */}
      {showCreateModal && selectedNextLevel && (
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
                  fontSize: 18,
                  fontWeight: 700,
                }}>
                  إنشاء {getLitigationLevelLabel(selectedNextLevel)}
                </h2>
                <p style={{
                  margin: "6px 0 0 0",
                  color: "#9ca3af",
                  fontSize: 13,
                }}>
                  بعد {getLitigationLevelLabel(activeLevel?.levelType)}
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9ca3af",
                  cursor: "pointer",
                  padding: 8,
                  borderRadius: 10,
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
                سيتم إغلاق درجة {getLitigationLevelLabel(activeLevel?.levelType)} وإنشاء الدرجة الجديدة.
              </span>
            </div>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                placeholder="المحكمة *"
                value={createForm.court}
                onChange={(e) => setCreateForm((p) => ({ ...p, court: e.target.value }))}
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
                  value={createForm.caseNumber}
                  onChange={(e) => setCreateForm((p) => ({ ...p, caseNumber: e.target.value }))}
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
                  value={createForm.caseYear}
                  onChange={(e) => setCreateForm((p) => ({ ...p, caseYear: e.target.value }))}
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
                value={createForm.circuit}
                onChange={(e) => setCreateForm((p) => ({ ...p, circuit: e.target.value }))}
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
                  value={createForm.filingDate}
                  onChange={(e) => setCreateForm((p) => ({ ...p, filingDate: e.target.value }))}
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

            {/* Actions */}
            <div style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 20,
            }}>
              <button
                onClick={() => setShowCreateModal(false)}
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
                onClick={handleCreateLevel}
                disabled={!createForm.court || saving}
                style={{
                  padding: "10px 24px",
                  background: getLitigationLevelColor(selectedNextLevel),
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  cursor: !createForm.court || saving ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  opacity: !createForm.court || saving ? 0.5 : 1,
                }}
              >
                {saving ? "جاري الإنشاء..." : "إنشاء الدرجة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}