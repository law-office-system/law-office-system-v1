import { Landmark, Scale, Briefcase } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext.jsx";
import CreateNextLevelButton from "../CreateNextLevelButton";
import { translateLevelType, translateWorkflowStatus } from "../../../utils/caseTranslations";
import { getLitigationLevelColor, getWorkflowStatusColor } from "../../../constants/caseStatusLabels";
import { formatDate } from "../../../utils/caseHelpers";

/**
 * قسم درجات التقاضي:
 * - شريط زمني (Stepper) أفقي بدل قائمة الأزرار + عنوان "اختر درجة التقاضي".
 * - شريط معلومات مضغوط سطر واحد بدل بطاقة InfoBox التي كانت تكرر
 *   رقم القضية/المحكمة/العدّادات (العدّادات الآن فقط في شارات التبويبات).
 */
function WorkflowBanner({ lastSession }) {
  const { theme } = useTheme();
  const { colors, spacing, radius } = theme;

  const DECISION_STAGE_MAP = {
    adjourned:       { stageLabel: 'مؤجلة',        color: colors.accent.amber.main },
    adjourned_notice:{ stageLabel: 'مؤجلة لإعلان', color: colors.accent.amber.dark },
    judgment:        { stageLabel: 'حُكمت',        color: colors.accent.green.main },
    referred:        { stageLabel: 'محالة',        color: colors.accent.blue.main },
    absence:         { stageLabel: 'غياب',         color: colors.accent.red.main },
    expert:          { stageLabel: 'معينة خبير',   color: colors.accent.purple.main },
    settlement:      { stageLabel: 'مسوّاة',       color: colors.accent.cyan.main },
  };

  if (!lastSession?.suggestedStage) return null;
  const meta = DECISION_STAGE_MAP[lastSession.suggestedStage];
  if (!meta) return null;
  return (
    <div style={{
      background: `${meta.color}10`, border: `1px solid ${meta.color}25`,
      borderRadius: radius.md, padding: `${spacing.md} ${spacing.lg}`, marginTop: 12,
      display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: radius.md, background: `${meta.color}18`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <Scale size={18} color={meta.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: meta.color, marginBottom: 2 }}>
          المرحلة الحالية: {meta.stageLabel}
        </div>
        <div style={{ fontSize: 12, color: colors.text.secondary }}>
          بناءً على قرار الجلسة الأخيرة ({lastSession.decisionLabel || lastSession.decisionType})
          {lastSession.suggestedTask ? ` — المهمة: ${lastSession.suggestedTask}` : ''}
        </div>
      </div>
      {lastSession.suggestedTask && (
        <div style={{
          padding: "4px 12px", background: `${meta.color}12`, color: meta.color,
          borderRadius: radius.full, fontSize: 11, fontWeight: 600, border: `1px solid ${meta.color}20`,
          whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5,
        }}>
          <Briefcase size={11} /> {lastSession.suggestedTask}
        </div>
      )}
    </div>
  );
}

export default function LevelSection({
  levels, selectedLevel, setSelectedLevelId,
  isAdmin, activeLevel, levelsLoading, onCreateLevel, lastSession,
}) {
  const { theme } = useTheme();
  const { colors, radius } = theme;

  const selectedStatusColor = selectedLevel ? getWorkflowStatusColor(selectedLevel.status) : colors.text.disabled;

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 14,
      }}>
        <h2 style={{
          color: colors.text.primary, fontSize: "clamp(14px, 4vw, 17px)",
          fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8,
        }}>
          <Landmark size={19} color={colors.accent.amber.light} />
          درجات التقاضي
        </h2>
        {isAdmin && activeLevel && (
          <CreateNextLevelButton
            currentLevel={activeLevel}
            onCreateLevel={onCreateLevel}
            loading={levelsLoading}
          />
        )}
      </div>

      {/* ── الشريط الزمني للدرجات ── */}
      <div style={{
        display: "flex", alignItems: "center",
        overflowX: "auto", padding: "4px 2px", gap: 0,
      }}>
        {levels.map((level, idx) => {
          const isSelected = selectedLevel?.id === level.id;
          const lvlColor = getLitigationLevelColor(level.levelType);
          return (
            <div key={level.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
              {idx > 0 && (
                <div style={{
                  width: "clamp(16px, 4vw, 32px)", height: 2, flexShrink: 0,
                  background: idx <= levels.findIndex(l => l.id === selectedLevel?.id)
                    ? colors.accent.blue.main
                    : colors.border.default,
                }} />
              )}
              <button
                onClick={() => setSelectedLevelId(level.id)}
                style={{
                  padding: "8px 14px", borderRadius: radius.full, cursor: "pointer",
                  border: isSelected ? `2px solid ${lvlColor}` : `1px solid ${colors.border.default}`,
                  background: isSelected ? `${lvlColor}15` : colors.bg.card,
                  color: isSelected ? lvlColor : colors.text.secondary,
                  fontFamily: "inherit", fontWeight: isSelected ? 700 : 500,
                  fontSize: "clamp(11px, 3vw, 13px)",
                  display: "flex", alignItems: "center", gap: 7,
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: level.isActive ? colors.accent.green.main : colors.text.disabled,
                  boxShadow: level.isActive ? `0 0 6px ${colors.accent.green.main}` : "none",
                }} />
                {translateLevelType(level.levelType)}
                <span style={{
                  background: isSelected ? `${lvlColor}25` : colors.bg.hover,
                  color: isSelected ? lvlColor : colors.text.muted,
                  padding: "1px 7px", borderRadius: radius.sm, fontSize: 10,
                }}>
                  {translateWorkflowStatus(level.status)}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── شريط معلومات الدرجة المختارة (سطر واحد مضغوط) ── */}
      {selectedLevel && (
        <div style={{
          marginTop: 12,
          background: colors.bg.card,
          border: `1px solid ${colors.border.default}`,
          borderRadius: radius.lg,
          padding: "clamp(10px, 2.5vw, 14px) clamp(12px, 3vw, 18px)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontWeight: 700, color: colors.text.primary,
              fontSize: "clamp(13px, 3.5vw, 15px)",
            }}>
              {translateLevelType(selectedLevel.levelType)} — رقم {selectedLevel.caseNumber}
              {selectedLevel.filingDate && (
                <span style={{ color: colors.text.muted, fontWeight: 500, fontSize: "clamp(11px, 3vw, 12px)" }}>
                  {" "}• إيداع: {formatDate(selectedLevel.filingDate)}
                </span>
              )}
              {selectedLevel.judgmentDate && (
                <span style={{ color: colors.accent.red.main, fontWeight: 500, fontSize: "clamp(11px, 3vw, 12px)" }}>
                  {" "}• حكم: {formatDate(selectedLevel.judgmentDate)}
                </span>
              )}
            </div>
            <div style={{ color: colors.text.secondary, fontSize: "clamp(11px, 3vw, 13px)", marginTop: 3 }}>
              سنة {selectedLevel.caseYear}
              {selectedLevel.court ? ` • ${selectedLevel.court}` : ""}
              {selectedLevel.circuit ? ` • ${selectedLevel.circuit}` : ""}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: `${selectedStatusColor}12`, color: selectedStatusColor,
              border: `1px solid ${selectedStatusColor}25`,
              padding: "4px 12px", borderRadius: radius.full, fontWeight: 700,
              fontSize: "clamp(11px, 3vw, 12px)", whiteSpace: "nowrap",
            }}>
              {translateWorkflowStatus(selectedLevel.status)}
            </span>
            {selectedLevel.isActive && (
              <span style={{
                background: colors.accent.green.bg, color: colors.accent.green.main,
                border: `1px solid ${colors.accent.green.main}30`,
                padding: "4px 12px", borderRadius: radius.full, fontWeight: 700,
                fontSize: "clamp(11px, 3vw, 12px)", whiteSpace: "nowrap",
              }}>
                الدرجة النشطة
              </span>
            )}
          </div>
        </div>
      )}

      <WorkflowBanner lastSession={lastSession} />
    </div>
  );
}
