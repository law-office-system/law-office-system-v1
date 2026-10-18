import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Calendar, Clock, MapPin, FileText,
  Edit2, Trash2, Landmark, Gavel, Briefcase,
  MoreVertical, RotateCcw, Scale, Send, FileCheck, ArrowRight, UserCheck
} from 'lucide-react';
import { formatDate, formatTime } from '../../utils/date';

export default function SessionCard({
  session,
  index,
  onEdit,
  onDelete,
  onAddTask,
  onAddDecision,
  linkedTasks = [],
  isAdmin = false
}) {
  const { theme } = useTheme();
  const { colors, spacing, radius, shadows, transitions } = theme;

  const DECISION_CONFIG = useMemo(() => ({
    pending: { label: 'لم يُصدر', color: colors.text.disabled, icon: Clock },
    adjourned: { label: 'تأجيل', color: colors.accent.amber.main, icon: RotateCcw },
    adjourned_notice: { label: 'تأجيل لإعلان', color: colors.accent.amber.dark, icon: Send },
    judgment: { label: 'حكم', color: colors.accent.green.main, icon: Gavel },
    referred: { label: 'إحالة', color: colors.accent.blue.main, icon: ArrowRight },
    absence: { label: 'غياب', color: colors.accent.red.main, icon: UserCheck },
    expert: { label: 'خبير', color: colors.accent.purple.main, icon: Scale },
    settlement: { label: 'تسوية', color: colors.accent.cyan.main, icon: FileCheck },
  }), [colors]);

  const JUDGMENT_TYPE_LABELS = useMemo(() => ({
    accept: { label: 'قبول', color: colors.accent.green.main, bg: colors.accent.green.bg, border: colors.accent.green.main + '25' },
    reject: { label: 'رفض', color: colors.accent.red.main, bg: colors.accent.red.bg, border: colors.accent.red.main + '25' },
    partial: { label: 'جزئي', color: colors.accent.amber.main, bg: colors.accent.amber.bg, border: colors.accent.amber.main + '25' },
  }), [colors]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const decisionType = session.decisionType || 'pending';
  const decisionMeta = DECISION_CONFIG[decisionType] || DECISION_CONFIG.pending;
  const DecisionIcon = decisionMeta.icon;
  const hasDecision = decisionType !== 'pending';
  const hasJudgment = decisionType === 'judgment';
  const judgmentMeta = hasJudgment ? JUDGMENT_TYPE_LABELS[session.judgmentType] : null;

  const handleMenuAction = (action) => {
    setMenuOpen(false);
    switch (action) {
      case 'edit': onEdit?.(session); break;
      case 'decision': onAddDecision?.(session); break;
      case 'delete': onDelete?.(session.id); break;
      case 'task': onAddTask?.(session); break;
      default: break;
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: colors.bg.card,
        border: `1px solid ${colors.border.default}`,
        borderRadius: radius.xl,
        marginBottom: spacing.lg,
        overflow: "visible",
        borderRight: `4px solid ${hasDecision ? decisionMeta.color : colors.accent.blue.main}`,
        transition: transitions.slow,
        boxShadow: hovered ? shadows.md : shadows.sm,
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        position: "relative",
        zIndex: menuOpen ? 50 : hovered ? 2 : 1,
      }}
    >
      <div style={{ padding: `clamp(14px, 3vw, 18px)` }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
          borderBottom: `1px solid ${colors.border.default}`,
          paddingBottom: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: hasDecision ? `${decisionMeta.color}18` : `${colors.accent.blue.main}18`,
              color: hasDecision ? decisionMeta.color : colors.accent.blue.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              fontSize: "12px",
              border: `1px solid ${hasDecision ? `${decisionMeta.color}30` : `${colors.accent.blue.main}30`}`,
            }}>
              {index + 1}
            </div>

            {hasDecision && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                background: `${decisionMeta.color}12`, color: decisionMeta.color,
                borderRadius: radius.full, fontSize: "11px", fontWeight: 700,
                border: `1px solid ${decisionMeta.color}25`,
              }}>
                <DecisionIcon size={12} />
                {decisionMeta.label}
              </div>
            )}

            {hasJudgment && judgmentMeta && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 10px",
                background: judgmentMeta.bg, color: judgmentMeta.color,
                borderRadius: radius.full, fontSize: "11px", fontWeight: 700,
                border: `1px solid ${judgmentMeta.border}`,
              }}>
                <Gavel size={12} />
                حكم: {judgmentMeta.label}
              </div>
            )}

            {linkedTasks.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 4, padding: "3px 8px",
                background: colors.accent.amber.bg, color: colors.accent.amber.main,
                borderRadius: radius.full, fontSize: "10px", fontWeight: 700,
                border: `1px solid ${colors.accent.amber.main}25`,
              }}>
                <Briefcase size={11} />
                {linkedTasks.length} عمل إداري
              </div>
            )}
          </div>

          {isAdmin && (
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                style={{
                  padding: 6, borderRadius: radius.md, border: "none",
                  background: menuOpen ? `${colors.accent.blue.main}15` : "transparent",
                  color: menuOpen ? colors.accent.blue.light : colors.text.disabled,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
                title="خيارات"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, width: 190,
                  background: colors.bg.card, border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.xl, boxShadow: shadows.lg, zIndex: 9999, overflow: "hidden",
                }}>
                  <MenuItem icon={Edit2} label="تعديل الجلسة" onClick={() => handleMenuAction('edit')} />
                  <MenuItem icon={Scale} label="إضافة قرار" onClick={() => handleMenuAction('decision')} />
                  <MenuItem icon={Briefcase} label="إضافة عمل إداري" onClick={() => handleMenuAction('task')} />
                  <div style={{ height: 1, background: colors.border.default, margin: "4px 8px" }} />
                  <MenuItem icon={Trash2} label="حذف الجلسة" danger onClick={() => handleMenuAction('delete')} />
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          alignItems: "start"
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <h4 style={{
              margin: 0, color: colors.text.primary, fontSize: "15px", fontWeight: 700, lineHeight: 1.4,
            }}>
              {session.title || `الجلسة ${index + 1}`}
            </h4>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {/* ✅ FIX: اعرض تاريخ انعقاد الجلسة الفعلي أولًا، وnextSessionDate احتياط فقط */}
              <MetaItem icon={Calendar} iconColor={colors.accent.blue.light} label={formatDate(session.date || session.nextSessionDate)} />
              {session.time && <MetaItem icon={Clock} iconColor={colors.accent.purple.light} label={formatTime(session.time)} highlight />}
              {session.location && <MetaItem icon={MapPin} iconColor={colors.accent.amber.light} label={session.location} />}
              {session.roll && <MetaItem icon={Landmark} iconColor={colors.accent.green.main} label={`رول: ${session.roll}`} />}
            </div>

            {session.description && (
              <div style={{ marginTop: 4, padding: "8px 10px", background: colors.bg.input, borderRadius: radius.md, border: `1px solid ${colors.border.default}` }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: colors.text.secondary, display: "block", marginBottom: 2 }}>وقائع الجلسة:</span>
                <p style={{ fontSize: "12px", color: colors.text.muted, margin: 0, lineHeight: 1.5 }}>{session.description}</p>
              </div>
            )}
          </div>

          {(hasDecision || hasJudgment) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {hasDecision && (
                <div style={{
                  padding: "10px 12px",
                  background: `${decisionMeta.color}08`,
                  border: `1px solid ${decisionMeta.color}25`,
                  borderRadius: radius.lg
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, color: decisionMeta.color, marginBottom: 6 }}>
                    <DecisionIcon size={14} />
                    <span>القرار الصادر: {decisionMeta.label}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: colors.text.secondary, margin: 0, lineHeight: 1.5 }}>
                    {session.decisionDetails || 'لا توجد تفاصيل نصية مكتوبة للقرار'}
                  </p>
                </div>
              )}

              {hasJudgment && (
                <div style={{
                  padding: "10px 12px",
                  background: `${colors.accent.green.main}06`,
                  border: `1px solid ${colors.accent.green.main}20`,
                  borderRadius: radius.lg
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "12px", fontWeight: 700, color: colors.accent.green.main, marginBottom: 6 }}>
                    <Gavel size={14} />
                    <span>بيانات الحكم</span>
                  </div>
                  {judgmentMeta && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", background: judgmentMeta.bg, color: judgmentMeta.color, borderRadius: radius.full, fontSize: "11px", fontWeight: 700, marginBottom: 6 }}>
                      {judgmentMeta.label}
                    </div>
                  )}
                  {session.judgmentSummary && (
                    <p style={{ fontSize: "12px", color: colors.text.secondary, margin: 0, lineHeight: 1.5 }}>
                      {session.judgmentSummary}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({ icon: Icon, iconColor, label, highlight = false }) {
  const { theme } = useTheme();
  const { colors, radius } = theme;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 5, fontSize: "11px",
      fontWeight: highlight ? 600 : 400, color: highlight ? colors.text.primary : colors.text.muted,
      padding: "3px 7px", background: highlight ? `${colors.accent.purple.main}12` : colors.bg.hover,
      borderRadius: radius.md,
    }}>
      <Icon size={12} color={iconColor} />
      <span>{label}</span>
    </div>
  );
}

function MenuItem({ icon: Icon, label, danger, onClick }) {
  const { theme } = useTheme();
  const { colors, transitions } = theme;
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", padding: "9px 12px", background: "none", border: "none",
        color: danger ? colors.accent.red.main : colors.text.secondary,
        fontSize: "12px", fontWeight: 500, cursor: "pointer", display: "flex",
        alignItems: "center", gap: 8, fontFamily: "inherit", transition: transitions.fast,
        textAlign: "right", direction: "rtl",
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}