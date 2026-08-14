import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Calendar, Clock, MapPin, FileText, ChevronDown, ChevronUp,
  Edit2, Trash2, CheckCircle2, Landmark, Gavel, Briefcase,
  MoreVertical, Link2, AlertTriangle, RotateCcw, Scale,
  Send, FileCheck, Sparkles, ArrowRight, UserCheck
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

  // ✅ Configs بتتبني داخل المكون عشان تستخدم الألوان الحية من الثيم
  const DECISION_CONFIG = useMemo(() => ({
    pending:        { label: 'لم يُصدر',      color: colors.text.disabled, icon: Clock,       stageLabel: '' },
    adjourned:      { label: 'تأجيل',         color: colors.accent.amber.main, icon: RotateCcw,   stageLabel: 'مؤجلة' },
    adjourned_notice:{ label: 'تأجيل لإعلان', color: colors.accent.amber.dark, icon: Send,        stageLabel: 'مؤجلة لإعلان' },
    judgment:       { label: 'حكم',           color: colors.accent.green.main, icon: Gavel,       stageLabel: 'حُكمت' },
    referred:       { label: 'إحالة',         color: colors.accent.blue.main, icon: ArrowRight,  stageLabel: 'محالة' },
    absence:        { label: 'غياب',          color: colors.accent.red.main, icon: UserCheck,   stageLabel: 'غياب' },
    expert:         { label: 'خبير',          color: colors.accent.purple.main, icon: Scale,       stageLabel: 'معينة خبير' },
    settlement:     { label: 'تسوية',         color: colors.accent.cyan.main, icon: FileCheck,   stageLabel: 'مسوّاة' },
  }), [colors]);

  const JUDGMENT_TYPE_LABELS = useMemo(() => ({
    accept: { label: 'قبول', color: colors.accent.green.main, bg: colors.accent.green.bg, border: colors.accent.green.main + '25' },
    reject: { label: 'رفض', color: colors.accent.red.main, bg: colors.accent.red.bg, border: colors.accent.red.main + '25' },
    partial:{ label: 'جزئي', color: colors.accent.amber.main, bg: colors.accent.amber.bg, border: colors.accent.amber.main + '25' },
  }), [colors]);

  const statusConfig = useMemo(() => ({
    scheduled:  { label: "مجدولة", color: colors.accent.blue.light, bg: colors.accent.blue.bg, border: colors.accent.blue.main + '25', icon: Calendar, glow: shadows.glow(colors.accent.blue.main) },
    completed:  { label: "منعقدة", color: colors.accent.green.main, bg: colors.accent.green.bg, border: colors.accent.green.main + '25', icon: CheckCircle2, glow: shadows.glow(colors.accent.green.main) },
    postponed:  { label: "مؤجلة", color: colors.accent.amber.main, bg: colors.accent.amber.bg, border: colors.accent.amber.main + '25', icon: Clock, glow: shadows.glow(colors.accent.amber.main) },
    cancelled:  { label: "ملغاة", color: colors.accent.red.main, bg: colors.accent.red.bg, border: colors.accent.red.main + '25', icon: Trash2, glow: shadows.glow(colors.accent.red.main) },
    "in-progress":{ label: "جارية", color: colors.accent.purple.light, bg: colors.accent.purple.bg, border: colors.accent.purple.main + '25', icon: Clock, glow: shadows.glow(colors.accent.purple.main) },
    default:    { label: "غير محدد", color: colors.text.disabled, bg: 'rgba(107, 114, 128, 0.12)', border: colors.text.disabled + '25', icon: Calendar, glow: 'none' },
  }), [colors, shadows]);

  const [expanded, setExpanded] = useState(false);
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

  const status = session.status || "scheduled";
  const sc = statusConfig[status] || statusConfig.default;
  const StatusIcon = sc.icon;

  const decisionType = session.decisionType || 'pending';
  const decisionMeta = DECISION_CONFIG[decisionType] || DECISION_CONFIG.pending;
  const DecisionIcon = decisionMeta.icon;
  const hasDecision = decisionType !== 'pending';
  const hasJudgment = decisionType === 'judgment';
  const judgmentMeta = hasJudgment ? JUDGMENT_TYPE_LABELS[session.judgmentType] : null;

  const isOverdue = () => {
    const sessionDate = new Date(session.nextSessionDate || session.date);
    return sessionDate < new Date() && status === 'scheduled';
  };

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

  const overdue = isOverdue();

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
        borderRight: `4px solid ${overdue ? colors.accent.red.main : hasDecision ? decisionMeta.color : sc.color}`,
        transition: transitions.slow,
        boxShadow: hovered
          ? `${shadows.lg}, ${hasDecision ? `0 0 16px ${decisionMeta.color}15` : sc.glow}`
          : shadows.sm,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        position: "relative",
        zIndex: menuOpen ? 50 : hovered ? 2 : 1,
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div style={{ padding: `clamp(14px, 4vw, 18px) clamp(14px, 4vw, 20px)` }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* ── Badges Row ── */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: `clamp(4px, 1.5vw, 8px)`,
              marginBottom: 12,
              flexWrap: "wrap"
            }}>
              {/* Session Number */}
              <div style={{
                width: `clamp(28px, 8vw, 32px)`,
                height: `clamp(28px, 8vw, 32px)`,
                borderRadius: "50%",
                background: hasDecision ? `${decisionMeta.color}18` : sc.color + "18",
                color: hasDecision ? decisionMeta.color : sc.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: `clamp(11px, 3vw, 13px)`,
                flexShrink: 0,
                border: `1px solid ${hasDecision ? `${decisionMeta.color}30` : sc.border}`,
              }}>
                {index + 1}
              </div>

              {/* Session Status */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: `clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)`,
                background: sc.bg,
                color: sc.color,
                borderRadius: radius.full,
                fontSize: `clamp(10px, 3vw, 12px)`,
                fontWeight: 700,
                border: `1px solid ${sc.border}`,
                boxShadow: sc.glow,
                flexShrink: 0,
              }}>
                <StatusIcon size={12} />
                {sc.label}
              </div>

              {/* Decision Type Badge */}
              {hasDecision && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: `clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)`,
                  background: `${decisionMeta.color}12`,
                  color: decisionMeta.color,
                  borderRadius: radius.full,
                  fontSize: `clamp(10px, 3vw, 12px)`,
                  fontWeight: 700,
                  border: `1px solid ${decisionMeta.color}25`,
                  flexShrink: 0,
                }}>
                  <DecisionIcon size={12} />
                  {decisionMeta.label}
                </div>
              )}

              {/* Auto Stage Badge */}
              {session.suggestedStage && decisionMeta.stageLabel && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: `clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)`,
                  background: `${decisionMeta.color}10`,
                  color: decisionMeta.color,
                  borderRadius: radius.full,
                  fontSize: `clamp(9px, 2.5vw, 11px)`,
                  fontWeight: 700,
                  border: `1px solid ${decisionMeta.color}20`,
                  flexShrink: 0,
                }}>
                  <Sparkles size={11} />
                  {decisionMeta.stageLabel}
                </div>
              )}

              {/* Judgment Result Badge */}
              {hasJudgment && judgmentMeta && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: `clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)`,
                  background: judgmentMeta.bg,
                  color: judgmentMeta.color,
                  borderRadius: radius.full,
                  fontSize: `clamp(10px, 3vw, 12px)`,
                  fontWeight: 700,
                  border: `1px solid ${judgmentMeta.border}`,
                  flexShrink: 0,
                }}>
                  <Gavel size={12} />
                  حكم: {judgmentMeta.label}
                </div>
              )}

              {/* Linked Tasks Badge */}
              {linkedTasks.length > 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: `clamp(3px, 1vw, 4px) clamp(8px, 2.5vw, 10px)`,
                  background: colors.accent.amber.bg,
                  color: colors.accent.amber.main,
                  borderRadius: radius.full,
                  fontSize: `clamp(9px, 2.5vw, 11px)`,
                  fontWeight: 700,
                  border: `1px solid ${colors.accent.amber.main}25`,
                  flexShrink: 0,
                }}>
                  <Briefcase size={11} />
                  {linkedTasks.length} عمل
                </div>
              )}

              {/* Overdue Warning */}
              {overdue && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: `clamp(3px, 1vw, 4px) clamp(8px, 2.5vw, 10px)`,
                  background: colors.accent.red.bg,
                  color: colors.accent.red.main,
                  borderRadius: radius.full,
                  fontSize: `clamp(9px, 2.5vw, 11px)`,
                  fontWeight: 700,
                  border: `1px solid ${colors.accent.red.main}25`,
                  animation: "pulse 2s ease-in-out infinite",
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={11} />
                  متأخرة
                </div>
              )}

              <span style={{
                color: colors.text.disabled,
                fontSize: `clamp(9px, 2.5vw, 11px)`,
                fontFamily: "monospace",
                flexShrink: 0,
              }}>
                #{String(session.id || "").slice(-6)}
              </span>
            </div>

            {/* ── Title ── */}
            <h4 style={{
              margin: "0 0 12px 0",
              color: colors.text.primary,
              fontSize: `clamp(14px, 4.5vw, 17px)`,
              fontWeight: 700,
              wordBreak: "break-word",
              lineHeight: 1.4,
            }}>
              {session.title || `الجلسة ${index + 1}`}
            </h4>

            {/* ── Meta Info ── */}
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: `clamp(6px, 2vw, 10px)`
            }}>
              <MetaItem
                icon={Calendar}
                iconColor={colors.accent.blue.light}
                label={formatDate(session.nextSessionDate || session.date)}
              />

              {session.time && (
                <MetaItem
                  icon={Clock}
                  iconColor={colors.accent.purple.light}
                  label={formatTime(session.time)}
                  highlight
                />
              )}

              {session.location && (
                <MetaItem
                  icon={MapPin}
                  iconColor={colors.accent.amber.light}
                  label={session.location}
                />
              )}

              {session.roll && (
                <MetaItem
                  icon={Landmark}
                  iconColor={colors.accent.green.main}
                  label={`رول: ${session.roll}`}
                />
              )}
            </div>
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", gap: 4, flexShrink: 0, alignItems: "flex-start" }}>
            {isAdmin && (
              <div style={{ position: "relative" }} ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{
                    padding: `clamp(6px, 2vw, 8px)`,
                    borderRadius: radius.md,
                    border: "none",
                    background: menuOpen ? `${colors.accent.blue.main}15` : hovered ? colors.bg.hover : "transparent",
                    color: menuOpen ? colors.accent.blue.light : colors.text.disabled,
                    cursor: "pointer",
                    transition: transitions.default,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 44,
                    minHeight: 44,
                  }}
                  title="المزيد"
                >
                  <MoreVertical size={18} />
                </button>

                {menuOpen && (
                  <div style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    width: `clamp(180px, 50vw, 210px)`,
                    background: colors.bg.card,
                    border: `1px solid ${colors.border.default}`,
                    borderRadius: radius.xl,
                    boxShadow: shadows.lg,
                    zIndex: 9999,
                    overflow: "hidden",
                    animation: "dropdownIn 0.15s ease-out",
                  }}>
                    <MenuItem icon={Edit2} label="تعديل الجلسة" color={colors.accent.blue.light} onClick={() => handleMenuAction('edit')} />
                    <MenuItem icon={Scale} label="إضافة قرار" color={colors.accent.purple.light} onClick={() => handleMenuAction('decision')} />
                    <MenuItem icon={Briefcase} label="إضافة عمل إداري" color={colors.accent.amber.main} onClick={() => handleMenuAction('task')} />
                    <div style={{ height: 1, background: colors.border.default, margin: "4px 8px" }} />
                    <MenuItem icon={Trash2} label="حذف الجلسة" color={colors.accent.red.main} danger onClick={() => handleMenuAction('delete')} />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: `clamp(6px, 2vw, 8px)`,
                borderRadius: radius.md,
                border: "none",
                background: hovered ? colors.bg.hover : "transparent",
                color: colors.text.disabled,
                cursor: "pointer",
                transition: transitions.default,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                minWidth: 44,
                minHeight: 44,
              }}
              title={expanded ? "إخفاء التفاصيل" : "عرض التفاصيل"}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ═══ EXPANDED DETAILS ═══ */}
      {expanded && (
        <div style={{
          padding: `0 clamp(14px, 4vw, 20px) clamp(14px, 4vw, 20px)`,
          borderTop: `1px solid ${colors.border.default}`,
          animation: "expandIn 0.2s ease-out",
        }}>
          <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Decision Details ── */}
            {hasDecision && (
              <DetailBox
                icon={DecisionIcon}
                title={`القرار: ${decisionMeta.label}`}
                color={decisionMeta.color}
                bg={`${decisionMeta.color}08`}
                border={`${decisionMeta.color}20`}
              >
                {session.decisionDetails ? (
                  <p style={{
                    fontSize: `clamp(12px, 3.5vw, 14px)`,
                    color: colors.text.secondary,
                    margin: 0,
                    lineHeight: 1.7,
                    padding: `clamp(10px, 3vw, 14px)`,
                    background: colors.bg.input,
                    borderRadius: radius.lg,
                  }}>
                    {session.decisionDetails}
                  </p>
                ) : (
                  <p style={{ fontSize: "13px", color: colors.text.disabled, margin: 0, fontStyle: "italic" }}>
                    لا توجد تفاصيل إضافية للقرار
                  </p>
                )}

                {session.decisionDate && (
                  <div style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "12px",
                    color: colors.text.muted,
                  }}>
                    <Calendar size={12} />
                    تاريخ صدور القرار: {formatDate(session.decisionDate)}
                  </div>
                )}
              </DetailBox>
            )}

            {/* ── Judgment Details ── */}
            {hasJudgment && (
              <DetailBox
                icon={Gavel}
                title="بيانات الحكم"
                color={colors.accent.green.main}
                bg={`${colors.accent.green.main}06`}
                border={`${colors.accent.green.main}20`}
              >
                {judgmentMeta && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 14px",
                    background: judgmentMeta.bg,
                    color: judgmentMeta.color,
                    borderRadius: radius.full,
                    fontSize: `clamp(12px, 3.5vw, 13px)`,
                    fontWeight: 700,
                    border: `1px solid ${judgmentMeta.border}`,
                    marginBottom: 12,
                  }}>
                    <Gavel size={13} />
                    {judgmentMeta.label}
                  </div>
                )}

                {session.judgmentSummary && (
                  <p style={{
                    fontSize: `clamp(12px, 3.5vw, 14px)`,
                    color: colors.text.secondary,
                    margin: 0,
                    lineHeight: 1.7,
                    padding: `clamp(10px, 3vw, 14px)`,
                    background: colors.bg.input,
                    borderRadius: radius.lg,
                  }}>
                    {session.judgmentSummary}
                  </p>
                )}

                <div style={{
                  marginTop: 10,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 10,
                  alignItems: "center",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    background: session.judgmentAppealable !== false
                      ? colors.accent.green.bg
                      : 'rgba(107, 114, 128, 0.1)',
                    color: session.judgmentAppealable !== false ? colors.accent.green.main : colors.text.disabled,
                    borderRadius: radius.md,
                    fontSize: "12px",
                    fontWeight: 600,
                  }}>
                    {session.judgmentAppealable !== false ? (
                      <>
                        <CheckCircle2 size={12} />
                        قابل للاستئناف
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={12} />
                        غير قابل للاستئناف
                      </>
                    )}
                  </div>

                  {session.judgmentAppealable !== false && session.appealDeadline && (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      background: colors.accent.amber.bg,
                      color: colors.accent.amber.main,
                      borderRadius: radius.md,
                      fontSize: "12px",
                      fontWeight: 600,
                    }}>
                      <Clock size={12} />
                      آخر موعد: {formatDate(session.appealDeadline)}
                    </div>
                  )}
                </div>
              </DetailBox>
            )}

            {/* ── Suggested Task ── */}
            {session.suggestedTask && (
              <DetailBox
                icon={Sparkles}
                title="المهمة المقترحة"
                color={colors.accent.blue.light}
                bg={`${colors.accent.blue.main}06`}
                border={`${colors.accent.blue.main}15`}
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: `clamp(10px, 3vw, 14px)`,
                  background: colors.bg.input,
                  borderRadius: radius.lg,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: colors.accent.blue.light,
                    boxShadow: `0 0 8px ${colors.accent.blue.main}40`,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: `clamp(12px, 3.5vw, 14px)`, color: colors.text.secondary, fontWeight: 500 }}>
                    {session.suggestedTask}
                  </span>
                </div>
              </DetailBox>
            )}

            {/* ── Linked Tasks ── */}
            {linkedTasks.length > 0 && (
              <DetailBox
                icon={Briefcase}
                title={`الأعمال الإدارية المرتبطة (${linkedTasks.length})`}
                color={colors.accent.amber.main}
                bg={`${colors.accent.amber.main}06`}
                border={`${colors.accent.amber.main}15`}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {linkedTasks.map((task, idx) => (
                    <div key={task.id || idx} style={{
                      padding: `clamp(8px, 3vw, 10px) clamp(10px, 3vw, 14px)`,
                      background: colors.bg.hover,
                      borderRadius: radius.md,
                      fontSize: `clamp(12px, 3.5vw, 14px)`,
                      color: colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: task.status === 'completed' ? colors.accent.green.main : colors.accent.amber.main,
                        flexShrink: 0,
                        boxShadow: task.status === 'completed'
                          ? `0 0 6px ${colors.accent.green.main}40`
                          : `0 0 6px ${colors.accent.amber.main}40`,
                      }} />
                      {task.title || task.name || `عمل إداري ${idx + 1}`}
                    </div>
                  ))}
                </div>
              </DetailBox>
            )}

            {/* ── Description ── */}
            {session.description && (
              <DetailSection
                icon={FileText}
                iconColor={colors.accent.purple.light}
                title="تفاصيل الجلسة"
              >
                <p style={{
                  fontSize: `clamp(12px, 3.5vw, 14px)`,
                  color: colors.text.muted,
                  lineHeight: 1.7,
                  margin: 0,
                  padding: `clamp(10px, 3vw, 14px)`,
                  background: colors.bg.input,
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.accent.purple.main}10`,
                }}>
                  {session.description}
                </p>
              </DetailSection>
            )}

            {/* ── Notes ── */}
            {session.notes && (
              <DetailSection
                icon={FileText}
                iconColor={colors.accent.blue.light}
                title="ملاحظات"
              >
                <p style={{
                  fontSize: `clamp(12px, 3.5vw, 14px)`,
                  color: colors.text.muted,
                  lineHeight: 1.7,
                  margin: 0,
                  padding: `clamp(10px, 3vw, 14px)`,
                  background: colors.bg.input,
                  borderRadius: radius.lg,
                  border: `1px solid ${colors.accent.blue.main}10`,
                }}>
                  {session.notes}
                </p>
              </DetailSection>
            )}

            {/* ── Attachments ── */}
            {session.attachments?.length > 0 && (
              <DetailSection
                icon={Link2}
                iconColor={colors.accent.green.light}
                title="المرفقات"
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {session.attachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: `clamp(6px, 2vw, 8px) clamp(10px, 3vw, 14px)`,
                        background: colors.bg.hover,
                        color: colors.text.secondary,
                        borderRadius: radius.md,
                        fontSize: `clamp(11px, 3vw, 13px)`,
                        textDecoration: "none",
                        border: `1px solid ${colors.border.default}`,
                        transition: transitions.default,
                        wordBreak: "break-all",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.bg.hover;
                        e.currentTarget.style.borderColor = `${colors.accent.blue.main}30`;
                        e.currentTarget.style.color = colors.text.primary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.bg.hover;
                        e.currentTarget.style.borderColor = colors.border.default;
                        e.currentTarget.style.color = colors.text.secondary;
                      }}
                    >
                      <FileText size={14} />
                      {file.name}
                    </a>
                  ))}
                </div>
              </DetailSection>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SUB COMPONENTS — كل واحد بيستخدم useTheme independently
// ═══════════════════════════════════════════════════════════════════

function MetaItem({ icon: Icon, iconColor, label, highlight = false }) {
  const { theme } = useTheme();
  const { colors, spacing, radius, transitions } = theme;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: highlight ? `clamp(12px, 3.5vw, 14px)` : `clamp(11px, 3vw, 13px)`,
      fontWeight: highlight ? 600 : 400,
      color: highlight ? colors.text.primary : colors.text.muted,
      padding: `clamp(4px, 1.5vw, 6px) clamp(8px, 2.5vw, 12px)`,
      background: highlight ? `${colors.accent.purple.main}10` : colors.bg.hover,
      border: highlight ? `1px solid ${colors.accent.purple.main}20` : `1px solid transparent`,
      borderRadius: radius.md,
      transition: transitions.default,
      wordBreak: "break-word",
    }}>
      <Icon size={highlight ? 15 : 14} color={iconColor} />
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </div>
  );
}

function MenuItem({ icon: Icon, label, color, danger, onClick }) {
  const { theme } = useTheme();
  const { colors, spacing, transitions } = theme;

  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: `clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 16px)`,
        background: "none",
        border: "none",
        color: danger ? colors.accent.red.main : colors.text.secondary,
        fontSize: `clamp(12px, 3.5vw, 13px)`,
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "inherit",
        transition: transitions.fast,
        textAlign: "right",
        direction: "rtl",
        minHeight: 44,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? colors.accent.red.bg
          : color + "15";
        e.currentTarget.style.color = danger ? colors.accent.red.main : color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color = danger ? colors.accent.red.main : colors.text.secondary;
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function DetailBox({ icon: Icon, title, color, bg, border, children }) {
  const { theme } = useTheme();
  const { radius } = theme;

  return (
    <div style={{
      padding: `clamp(12px, 3.5vw, 16px)`,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: radius.lg,
    }}>
      <h5 style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: `clamp(12px, 3.5vw, 13px)`,
        fontWeight: 700,
        color: color,
        margin: "0 0 12px 0",
      }}>
        <Icon size={16} />
        {title}
      </h5>
      {children}
    </div>
  );
}

function DetailSection({ icon: Icon, iconColor, title, children }) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <div>
      <h5 style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: `clamp(12px, 3.5vw, 13px)`,
        fontWeight: 600,
        color: colors.text.secondary,
        margin: "0 0 10px 0",
      }}>
        <Icon size={14} color={iconColor} />
        {title}
      </h5>
      {children}
    </div>
  );
}