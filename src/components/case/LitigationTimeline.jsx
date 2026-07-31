// ============================================================
// 📁 FILE: src/components/case/LitigationTimeline.jsx
// Description: Timeline showing all litigation levels (شجرة مراحل التقاضي)
// ============================================================

import { useState } from "react";
import {
  Landmark, CheckCircle2, Clock, ChevronDown, ChevronUp,
  Gavel, FileText, Calendar, DollarSign,
} from "lucide-react";
import {
  getLitigationLevelLabel,
  getLitigationLevelColor,
  getWorkflowStatusLabel,
  getWorkflowStatusColor,
} from "../../constants/caseStatusLabels";

export default function LitigationTimeline({
  levels,
  activeLevel,
  sessions,
  judgments,
  expenses,
  onLevelClick,
  canEdit,
}) {
  const [expandedLevel, setExpandedLevel] = useState(null);

  const toggleExpand = (levelId) => {
    setExpandedLevel(expandedLevel === levelId ? null : levelId);
  };

  const getLevelStats = (levelId) => {
    const levelSessions = sessions?.filter((s) => s.levelId === levelId) || [];
    const levelJudgments = judgments?.filter((j) => j.levelId === levelId) || [];
    const levelExpenses = expenses?.filter((e) => e.levelId === levelId) || [];
    const totalExpenseAmount = levelExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      sessionsCount: levelSessions.length,
      judgmentsCount: levelJudgments.length,
      expensesCount: levelExpenses.length,
      expensesAmount: totalExpenseAmount,
    };
  };

  if (!levels || levels.length === 0) {
    return (
      <div style={{
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 16,
        padding: 24,
        textAlign: "center",
        color: "#6b7280",
      }}>
        <Landmark size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p>لا توجد درجات تقاضي مسجلة لهذه القضية</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#1e293b",
      border: "1px solid rgba(55, 65, 81, 0.5)",
      borderRadius: 16,
      padding: "clamp(12px, 4vw, 24px)",
      marginBottom: 20,
    }}>
      <h2 style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        margin: "0 0 20px 0",
        color: "#f3f4f6",
        fontSize: "clamp(14px, 4vw, 18px)",
        fontWeight: 700,
        paddingBottom: 12,
        borderBottom: "1px solid rgba(55, 65, 81, 0.3)",
      }}>
        <Landmark size={20} color="#fbbf24" strokeWidth={2.5} />
        درجات التقاضي
      </h2>

      <div style={{ position: "relative", paddingRight: 20 }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          right: 28,
          top: 16,
          bottom: 16,
          width: 2,
          background: "linear-gradient(to bottom, #3b82f6, #1e40af, #334155)",
          borderRadius: 2,
        }} />

        {levels.map((level, index) => {
          const isActive = level.isActive;
          const isCompleted = level.isCompleted;
          const isExpanded = expandedLevel === level.id;
          const stats = getLevelStats(level.id);
          const levelColor = getLitigationLevelColor(level.levelType);
          const statusColor = getWorkflowStatusColor(level.status);

          return (
            <div key={level.id} style={{ marginBottom: 16, position: "relative" }}>
              {/* Timeline dot */}
              <div style={{
                position: "absolute",
                right: 20,
                top: 16,
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: isActive ? levelColor : isCompleted ? "#10b981" : "#334155",
                border: `3px solid ${isActive ? levelColor : isCompleted ? "#10b981" : "#475569"}`,
                boxShadow: isActive ? `0 0 12px ${levelColor}40` : "none",
                zIndex: 2,
              }} />

              {/* Level Card */}
              <div
                onClick={() => canEdit && onLevelClick?.(level)}
                style={{
                  marginRight: 44,
                  background: isActive ? `${levelColor}08` : "rgba(15, 23, 42, 0.5)",
                  border: `1px solid ${isActive ? `${levelColor}30` : "rgba(55, 65, 81, 0.3)"}`,
                  borderRadius: 12,
                  padding: "clamp(10px, 3vw, 16px)",
                  cursor: canEdit ? "pointer" : "default",
                  transition: "all 0.2s ease",
                }}
              >
                {/* Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                    }}>
                      <span style={{
                        fontWeight: 700,
                        color: "#f3f4f6",
                        fontSize: "clamp(13px, 4vw, 15px)",
                      }}>
                        {getLitigationLevelLabel(level.levelType)}
                      </span>
                      {isActive && (
                        <span style={{
                          background: `${levelColor}15`,
                          color: levelColor,
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: "clamp(10px, 3vw, 11px)",
                          fontWeight: 700,
                          border: `1px solid ${levelColor}25`,
                        }}>
                          <Clock size={10} style={{ display: "inline", marginLeft: 4 }} />
                          نشطة
                        </span>
                      )}
                      {isCompleted && (
                        <span style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          color: "#10b981",
                          padding: "2px 10px",
                          borderRadius: 20,
                          fontSize: "clamp(10px, 3vw, 11px)",
                          fontWeight: 700,
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                        }}>
                          <CheckCircle2 size={10} style={{ display: "inline", marginLeft: 4 }} />
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
                        fontSize: "clamp(10px, 3vw, 12px)",
                        fontWeight: 600,
                      }}>
                        {getWorkflowStatusLabel(level.status)}
                      </span>

                      {level.court && (
                        <span style={{ color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                          <Landmark size={12} style={{ display: "inline", marginLeft: 4 }} />
                          {level.court}
                        </span>
                      )}

                      {level.caseNumber && (
                        <span style={{ color: "#9ca3af", fontSize: "clamp(11px, 3vw, 13px)" }}>
                          <FileText size={12} style={{ display: "inline", marginLeft: 4 }} />
                          رقم {level.caseNumber} لسنة {level.caseYear}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(level.id);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 8,
                      minWidth: 32,
                      minHeight: 32,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Stats Row */}
                <div style={{
                  display: "flex",
                  gap: 16,
                  marginTop: 10,
                  flexWrap: "wrap",
                }}>
                  <span style={{ color: "#6b7280", fontSize: "clamp(11px, 3vw, 12px)" }}>
                    <Calendar size={12} style={{ display: "inline", marginLeft: 4 }} />
                    {stats.sessionsCount} جلسة
                  </span>
                  <span style={{ color: "#6b7280", fontSize: "clamp(11px, 3vw, 12px)" }}>
                    <Gavel size={12} style={{ display: "inline", marginLeft: 4 }} />
                    {stats.judgmentsCount} حكم
                  </span>
                  {stats.expensesAmount > 0 && (
                    <span style={{ color: "#6b7280", fontSize: "clamp(11px, 3vw, 12px)" }}>
                      <DollarSign size={12} style={{ display: "inline", marginLeft: 4 }} />
                      {stats.expensesAmount.toLocaleString()} ج.م
                    </span>
                  )}
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid rgba(55, 65, 81, 0.3)",
                  }}>
                    {level.filingDate && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>تاريخ الرفع:</span>
                        <span style={{ color: "#f3f4f6", marginRight: 8, fontSize: 13 }}>
                          {new Date(level.filingDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    )}

                    {level.judgmentDate && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>تاريخ الحكم:</span>
                        <span style={{ color: "#f3f4f6", marginRight: 8, fontSize: 13 }}>
                          {new Date(level.judgmentDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    )}

                    {level.judgmentSummary && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>ملخص الحكم:</span>
                        <p style={{ color: "#f3f4f6", margin: "4px 0 0 0", fontSize: 13, lineHeight: 1.6 }}>
                          {level.judgmentSummary}
                        </p>
                      </div>
                    )}

                    {level.circuit && (
                      <div style={{ marginBottom: 8 }}>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>الدائرة:</span>
                        <span style={{ color: "#f3f4f6", marginRight: 8, fontSize: 13 }}>
                          {level.circuit}
                        </span>
                      </div>
                    )}

                    {level.completionDate && (
                      <div>
                        <span style={{ color: "#6b7280", fontSize: 12 }}>تاريخ الانتهاء:</span>
                        <span style={{ color: "#f3f4f6", marginRight: 8, fontSize: 13 }}>
                          {new Date(level.completionDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}