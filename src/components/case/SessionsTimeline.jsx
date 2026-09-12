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
  // Sort using `date` ONLY — never fall back to `nextSessionDate`
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
      {/* ── شريط أدوات مضغوط بدل العنوان المكرر ──
          (تبويب "سير الدعوى" في شريط التبويبات كفاية كعنوان) */}
      {(onAddClick || totalSessions > 0) && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: spacing.md,
          flexWrap: "wrap",
          gap: 10,
        }}>
          <p style={{
            margin: 0,
            color: colors.text.disabled,
            fontSize: "clamp(11px, 3vw, 12px)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}>
            <Calendar size={12} />
            {totalSessions} جلسة
            {sessionsWithJudgments > 0 && ` • ${sessionsWithJudgments} حكم`}
            {sessionsWithTasks > 0 && ` • ${sessionsWithTasks} بأعمال`}
          </p>

          {onAddClick && (
            <button
              onClick={onAddClick}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                background: `${colors.accent.amber.main}12`,
                color: colors.accent.amber.main,
                border: `1px solid ${colors.accent.amber.main}30`,
                borderRadius: radius.md,
                cursor: "pointer",
                fontSize: "clamp(11px, 3vw, 13px)",
                fontWeight: 700,
                fontFamily: "inherit",
                transition: transitions.default,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${colors.accent.amber.main}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `${colors.accent.amber.main}12`;
              }}
            >
              <Plus size={14} />
              جلسة جديدة
            </button>
          )}
        </div>
      )}

      {sorted.length === 0 ? (
        <SessionEmpty onAddClick={onAddClick} />
      ) : (
        <div style={{ position: "relative" }}>
          <div
            className="timeline-line"
            style={{
              position: "absolute",
              right: 15,
              top: 8,
              bottom: 8,
              width: 2,
              background: `linear-gradient(to bottom, ${colors.accent.blue.main}80, ${colors.border.default})`,
              borderRadius: 1,
              zIndex: 0,
            }}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {sorted.map((session, index) => {
              const linkedTasks = getLinkedTasks?.(session.id) || [];

              return (
                <div key={session.id} style={{
                  position: "relative",
                  paddingRight: "clamp(0px, 5vw, 44px)",
                }}>
                  <div
                    className="timeline-dot"
                    style={{
                      position: "absolute",
                      right: 8,
                      top: 20,
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      background: colors.bg.card,
                      border: `2px solid ${colors.accent.blue.dark}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 1,
                      boxShadow: `0 0 0 4px ${colors.accent.blue.bg}`,
                    }}
                  >
                    <div style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: colors.accent.blue.main,
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