import React from "react";
import {
  Calendar, Plus, Gavel, Briefcase
} from "lucide-react";
import { colors, spacing, radius, shadows, transitions } from '../../styles/design-system';
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
  // FIX: Sort using `date` ONLY — never fall back to `nextSessionDate`
  const sorted = [...sessions].sort((a, b) => {
    const dateA = new Date(a.date || 0);
    const dateB = new Date(b.date || 0);
    return dateA - dateB;
  });

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
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: spacing.lg, 
        flexWrap: "wrap", 
        gap: 12 
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: shadows.glow(colors.accent.blue.main),
            flexShrink: 0,
          }}>
            <Calendar size={18} color={colors.accent.amber.light} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ 
              margin: 0, 
              color: colors.text.primary, 
              fontSize: "clamp(14px, 4vw, 16px)", 
              fontWeight: 700 
            }}>
              سير الدعوى ({totalSessions} جلسة)
            </h3>
            <p style={{ 
              margin: "2px 0 0 0", 
              color: colors.text.disabled, 
              fontSize: "clamp(11px, 3vw, 12px)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}>
              {sessionsWithJudgments > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Gavel size={11} color={colors.accent.blue.dark} />
                  {sessionsWithJudgments} حكم
                </span>
              )}
              {sessionsWithTasks > 0 && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <Briefcase size={11} color={colors.accent.amber.main} />
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
              padding: `clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 18px)`,
              background: colors.accent.amber.main,
              color: "#fff",
              border: "none",
              borderRadius: radius.md,
              cursor: "pointer",
              fontSize: "clamp(12px, 3.5vw, 14px)",
              fontWeight: 600,
              fontFamily: "inherit",
              boxShadow: shadows.glow(colors.accent.amber.main),
              transition: transitions.default,
              flexShrink: 0,
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = colors.accent.amber.dark;
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = colors.accent.amber.main;
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
          <div 
            className="timeline-line"
            style={{
              position: "absolute",
              right: 19,
              top: 0,
              bottom: 0,
              width: 2,
              background: `linear-gradient(to bottom, ${colors.accent.blue.main}80, ${colors.border.default})`,
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
                  <div 
                    className="timeline-dot"
                    style={{
                      position: "absolute",
                      right: 12,
                      top: 24,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: colors.bg.card,
                      border: linkedJudgment ? `2px solid ${colors.accent.green.main}` : `2px solid ${colors.accent.blue.dark}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                      boxShadow: linkedJudgment 
                        ? `0 0 0 4px ${colors.accent.green.bg}` 
                        : `0 0 0 4px ${colors.accent.blue.bg}`,
                    }} 
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: linkedJudgment ? colors.accent.green.main : colors.accent.blue.main,
                    }} />
                  </div>

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
                      background: colors.accent.green.bg,
                      color: colors.accent.green.main,
                      borderRadius: radius.md,
                      fontSize: "10px",
                      fontWeight: 700,
                      border: `1px solid ${colors.accent.green.main}20`,
                      writingMode: "horizontal-tb",
                    }}>
                      <Gavel size={10} />
                      حكم
                    </div>
                  )}

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
                      background: colors.accent.amber.bg,
                      color: colors.accent.amber.main,
                      borderRadius: radius.md,
                      fontSize: "10px",
                      fontWeight: 700,
                      border: `1px solid ${colors.accent.amber.main}20`,
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