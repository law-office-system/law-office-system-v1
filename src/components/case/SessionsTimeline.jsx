import React, { useState } from "react";
import {
  Calendar, Plus
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

  return (
    <div>
      {/* Header with Add Button */}
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
              الجلسات ({sessions.length})
            </h3>
            <p style={{ 
              margin: "2px 0 0 0", 
              color: "#6b7280", 
              fontSize: "clamp(11px, 3vw, 12px)" 
            }}>
              سجل الجلسات المرتبطة بالقضية
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
            {sorted.map((session, index) => (
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
                    border: "2px solid #1e40af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1,
                    boxShadow: "0 0 0 4px rgba(30, 64, 175, 0.15)",
                  }} 
                >
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#3b82f6",
                  }} />
                </div>

                <SessionCard
                  session={session}
                  index={index}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddDecision={onAddDecision}
                  onAddJudgment={onAddJudgment}
                  onAddTask={onAddTask}
                  linkedJudgment={getLinkedJudgment?.(session.id) || null}
                  linkedTasks={getLinkedTasks?.(session.id) || []}
                  isAdmin={canEdit}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}