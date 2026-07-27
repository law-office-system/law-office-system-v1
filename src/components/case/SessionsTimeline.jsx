import React from "react";
import {
  Calendar, Plus, Gavel, Briefcase, Link2, Sparkles
} from "lucide-react";
import SessionCard from "./SessionCard";
import SessionEmpty from "./SessionEmpty";

export default function SessionsTimeline({
  caseId,
  sessions = [],
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  onAddClick,
  onAddDecision,
  onAddJudgment,
  onAddTask,
  getLinkedJudgment,
  getLinkedTasks,
}) {
  // Sort: oldest first (chronological order)
  const sorted = [...sessions].sort((a, b) => {
    const dateA = new Date(a.nextSessionDate || a.date || 0);
    const dateB = new Date(b.nextSessionDate || b.date || 0);
    return dateA - dateB;
  });

  // Count stats
  const totalSessions = sessions.length;
  const sessionsWithJudgments = sessions.filter(s => {
    const j = getLinkedJudgment?.(s.id);
    return j && j.id;
  }).length;
  const sessionsWithTasks = sessions.filter(s => {
    const t = getLinkedTasks?.(s.id);
    return t && t.length > 0;
  }).length;

  return (
    <div>
      {/* Header with Stats */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: 24, 
        flexWrap: "wrap", 
        gap: 12 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1e3a8a, #1e40af)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 16px rgba(30, 64, 175, 0.3)",
            flexShrink: 0,
          }}>
            <Calendar size={18} color="#fbbf24" />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ 
              margin: 0, 
              color: "#f3f4f6", 
              fontSize: "clamp(14px, 4vw, 16px)", 
              fontWeight: 700 
            }}>
              سير الدعوى ({totalSessions} جلسة)
            </h3>
            <p style={{ 
              margin: "2px 0 0 0", 
              color: "#6b7280", 
              fontSize: "clamp(11px, 3vw, 12px)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              {sessionsWithJudgments > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Gavel size={11} color="#1e40af" />
                  {sessionsWithJudgments} حكم
                </span>
              )}
              {sessionsWithTasks > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Briefcase size={11} color="#d97706" />
                  {sessionsWithTasks} بأعمال
                </span>
              )}
            </p>
          </div>
        </div>

        {onAddClick && (
          <button
            onClick={onAddClick}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 18px)",
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: "0 4px 16px rgba(217, 119, 6, 0.3)",
              transition: "all 0.2s ease",
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#b45309";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#d97706";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <Plus size={16} />
            جلسة جديدة
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <SessionEmpty onAddClick={onAddClick} />
      ) : (
        <div style={{ position: "relative" }}>
          {/* Timeline vertical line - hidden on mobile */}
          <div 
            className="timeline-line"
            style={{
              position: "absolute",
              right: 19,
              top: 0,
              bottom: 0,
              width: 2,
              background: "linear-gradient(to bottom, rgba(30, 64, 175, 0.5), rgba(55, 65, 81, 0.3))",
              borderRadius: 1,
              zIndex: 0,
            }} 
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sorted.map((session, index) => {
              const linkedJudgment = getLinkedJudgment?.(session.id) || null;
              const linkedTasks = getLinkedTasks?.(session.id) || [];

              return (
                <div key={session.id} style={{ 
                  position: "relative", 
                  paddingRight: "clamp(0px, 5vw, 48px)" 
                }}>
                  {/* Timeline dot - hidden on mobile */}
                  <div 
                    className="timeline-dot"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 24,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: "#1e293b",
                      border: linkedJudgment ? "2px solid #10b981" : "2px solid #1e40af",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                      boxShadow: linkedJudgment 
                        ? "0 0 0 4px rgba(16, 185, 129, 0.15)" 
                        : "0 0 0 4px rgba(30, 64, 175, 0.15)",
                    }} 
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: linkedJudgment ? "#10b981" : "#3b82f6",
                    }} />
                  </div>

                  {/* Judgment indicator on timeline (NEW) */}
                  {linkedJudgment && (
                    <div style={{
                      position: "absolute",
                      right: 4,
                      top: 48,
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      borderRadius: 10,
                      fontSize: "10px",
                      fontWeight: 700,
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      writingMode: "horizontal-tb",
                    }}>
                      <Gavel size={10} />
                      حكم
                    </div>
                  )}

                  {/* Tasks indicator on timeline (NEW) */}
                  {linkedTasks.length > 0 && (
                    <div style={{
                      position: "absolute",
                      right: 4,
                      top: linkedJudgment ? 72 : 48,
                      zIndex: 2,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 8px",
                      background: "rgba(217, 119, 6, 0.15)",
                      color: "#d97706",
                      borderRadius: 10,
                      fontSize: "10px",
                      fontWeight: 700,
                      border: "1px solid rgba(217, 119, 6, 0.2)",
                    }}>
                      <Briefcase size={10} />
                      {linkedTasks.length}
                    </div>
                  )}

                  <SessionCard
                    session={session}
                    index={index}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onAddDecision={onAddDecision}
                    onAddJudgment={onAddJudgment}
                    onAddTask={onAddTask}
                    linkedJudgment={linkedJudgment}
                    linkedTasks={linkedTasks}
                    isAdmin={canEdit}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}