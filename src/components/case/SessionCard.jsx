import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, FileText, ChevronDown, ChevronUp,
  Edit2, Trash2, CheckCircle2, Landmark, Gavel, Briefcase,
  MoreVertical, Link2, AlertTriangle, RotateCcw, Scale,
  Send, FileCheck, Sparkles, ArrowRight, UserCheck
} from 'lucide-react';
import { formatDate, formatTime } from '../../utils/date';

// ─── Decision Type Config (sync with SessionForm) ────────────────
const DECISION_CONFIG = {
  pending:        { label: 'لم يُصدر',      color: '#6b7280', icon: Clock,       stageLabel: '' },
  adjourned:      { label: 'تأجيل',         color: '#f59e0b', icon: RotateCcw,   stageLabel: 'مؤجلة' },
  adjourned_notice:{ label: 'تأجيل لإعلان', color: '#f97316', icon: Send,        stageLabel: 'مؤجلة لإعلان' },
  judgment:       { label: 'حكم',           color: '#10b981', icon: Gavel,       stageLabel: 'حُكمت' },
  referred:       { label: 'إحالة',         color: '#3b82f6', icon: ArrowRight,  stageLabel: 'محالة' },
  absence:        { label: 'غياب',          color: '#ef4444', icon: UserCheck,   stageLabel: 'غياب' },
  expert:         { label: 'خبير',          color: '#8b5cf6', icon: Scale,       stageLabel: 'معينة خبير' },
  settlement:     { label: 'تسوية',         color: '#14b8a6', icon: FileCheck,   stageLabel: 'مسوّاة' },
};

const JUDGMENT_TYPE_LABELS = {
  accept: { label: 'قبول', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.25)' },
  reject: { label: 'رفض', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.25)' },
  partial:{ label: 'جزئي', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.25)' },
};

const statusConfig = {
  scheduled:  { label: "مجدولة", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.25)", icon: Calendar, glow: "0 0 12px rgba(96, 165, 250, 0.15)" },
  completed:  { label: "منعقدة", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", icon: CheckCircle2, glow: "0 0 12px rgba(16, 185, 129, 0.15)" },
  postponed:  { label: "مؤجلة", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", icon: Clock, glow: "0 0 12px rgba(245, 158, 11, 0.15)" },
  cancelled:  { label: "ملغاة", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", icon: Trash2, glow: "0 0 12px rgba(239, 68, 68, 0.15)" },
  "in-progress":{ label: "جارية", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)", border: "rgba(167, 139, 250, 0.25)", icon: Clock, glow: "0 0 12px rgba(167, 139, 250, 0.15)" },
  default:    { label: "غير محدد", color: "#6b7280", bg: "rgba(107, 114, 128, 0.12)", border: "rgba(107, 114, 128, 0.25)", icon: Calendar, glow: "none" },
};

export default function SessionCard({
  session,
  index,
  onEdit,
  onDelete,
  onAddTask,
  linkedTasks = [],
  isAdmin = false
}) {
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

  // ─── NEW: Decision metadata ─────────────────────────────────────
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
        background: "#1e293b",
        border: "1px solid rgba(55, 65, 81, 0.5)",
        borderRadius: 20,
        marginBottom: 16,
        overflow: "visible",
        borderRight: `4px solid ${overdue ? "#ef4444" : hasDecision ? decisionMeta.color : sc.color}`,
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: hovered
          ? `0 8px 32px rgba(0, 0, 0, 0.3), ${hasDecision ? `0 0 16px ${decisionMeta.color}15` : sc.glow}`
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        position: "relative",
        zIndex: menuOpen ? 50 : hovered ? 2 : 1,
      }}
    >
      {/* ═══ HEADER ═══ */}
      <div style={{ padding: "clamp(14px, 4vw, 18px) clamp(14px, 4vw, 20px)" }}>
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
              gap: "clamp(4px, 1.5vw, 8px)",
              marginBottom: 12,
              flexWrap: "wrap"
            }}>
              {/* Session Number */}
              <div style={{
                width: "clamp(28px, 8vw, 32px)",
                height: "clamp(28px, 8vw, 32px)",
                borderRadius: "50%",
                background: hasDecision ? `${decisionMeta.color}18` : sc.color + "18",
                color: hasDecision ? decisionMeta.color : sc.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "clamp(11px, 3vw, 13px)",
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
                padding: "clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)",
                background: sc.bg,
                color: sc.color,
                borderRadius: 20,
                fontSize: "clamp(10px, 3vw, 12px)",
                fontWeight: 700,
                border: `1px solid ${sc.border}`,
                boxShadow: sc.glow,
                flexShrink: 0,
              }}>
                <StatusIcon size={12} />
                {sc.label}
              </div>

              {/* ── NEW: Decision Type Badge ── */}
              {hasDecision && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)",
                  background: `${decisionMeta.color}12`,
                  color: decisionMeta.color,
                  borderRadius: 20,
                  fontSize: "clamp(10px, 3vw, 12px)",
                  fontWeight: 700,
                  border: `1px solid ${decisionMeta.color}25`,
                  flexShrink: 0,
                }}>
                  <DecisionIcon size={12} />
                  {decisionMeta.label}
                </div>
              )}

              {/* ── NEW: Auto Stage Badge ── */}
              {session.suggestedStage && decisionMeta.stageLabel && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)",
                  background: `${decisionMeta.color}10`,
                  color: decisionMeta.color,
                  borderRadius: 20,
                  fontSize: "clamp(9px, 2.5vw, 11px)",
                  fontWeight: 700,
                  border: `1px solid ${decisionMeta.color}20`,
                  flexShrink: 0,
                }}>
                  <Sparkles size={11} />
                  {decisionMeta.stageLabel}
                </div>
              )}

              {/* ── NEW: Judgment Result Badge ── */}
              {hasJudgment && judgmentMeta && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "clamp(3px, 1vw, 5px) clamp(8px, 2.5vw, 12px)",
                  background: judgmentMeta.bg,
                  color: judgmentMeta.color,
                  borderRadius: 20,
                  fontSize: "clamp(10px, 3vw, 12px)",
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
                  padding: "clamp(3px, 1vw, 4px) clamp(8px, 2.5vw, 10px)",
                  background: "rgba(217, 119, 6, 0.12)",
                  color: "#d97706",
                  borderRadius: 20,
                  fontSize: "clamp(9px, 2.5vw, 11px)",
                  fontWeight: 700,
                  border: "1px solid rgba(217, 119, 6, 0.25)",
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
                  padding: "clamp(3px, 1vw, 4px) clamp(8px, 2.5vw, 10px)",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "#ef4444",
                  borderRadius: 20,
                  fontSize: "clamp(9px, 2.5vw, 11px)",
                  fontWeight: 700,
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  animation: "pulse 2s ease-in-out infinite",
                  flexShrink: 0,
                }}>
                  <AlertTriangle size={11} />
                  متأخرة
                </div>
              )}

              <span style={{
                color: "#4b5563",
                fontSize: "clamp(9px, 2.5vw, 11px)",
                fontFamily: "monospace",
                flexShrink: 0,
              }}>
                #{String(session.id || "").slice(-6)}
              </span>
            </div>

            {/* ── Title ── */}
            <h4 style={{
              margin: "0 0 12px 0",
              color: "#f3f4f6",
              fontSize: "clamp(14px, 4.5vw, 17px)",
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
              gap: "clamp(6px, 2vw, 10px)"
            }}>
              <MetaItem
                icon={Calendar}
                iconColor="#60a5fa"
                label={formatDate(session.nextSessionDate || session.date)}
              />

              {session.time && (
                <MetaItem
                  icon={Clock}
                  iconColor="#a78bfa"
                  label={formatTime(session.time)}
                  highlight
                />
              )}

              {session.location && (
                <MetaItem
                  icon={MapPin}
                  iconColor="#fbbf24"
                  label={session.location}
                />
              )}

              {session.roll && (
                <MetaItem
                  icon={Landmark}
                  iconColor="#10b981"
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
                    padding: "clamp(6px, 2vw, 8px)",
                    borderRadius: 10,
                    border: "none",
                    background: menuOpen ? "rgba(59, 130, 246, 0.15)" : hovered ? "rgba(55, 65, 81, 0.5)" : "transparent",
                    color: menuOpen ? "#60a5fa" : "#6b7280",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
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
                    width: "clamp(180px, 50vw, 210px)",
                    background: "#1f2937",
                    border: "1px solid rgba(55, 65, 81, 0.6)",
                    borderRadius: 14,
                    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
                    zIndex: 9999,
                    overflow: "hidden",
                    animation: "dropdownIn 0.15s ease-out",
                  }}>
                    <MenuItem icon={Edit2} label="تعديل الجلسة" color="#60a5fa" onClick={() => handleMenuAction('edit')} />
                    <MenuItem icon={Briefcase} label="إضافة عمل إداري" color="#d97706" onClick={() => handleMenuAction('task')} />
                    <div style={{ height: 1, background: "rgba(55, 65, 81, 0.5)", margin: "4px 8px" }} />
                    <MenuItem icon={Trash2} label="حذف الجلسة" color="#ef4444" danger onClick={() => handleMenuAction('delete')} />
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                padding: "clamp(6px, 2vw, 8px)",
                borderRadius: 10,
                border: "none",
                background: hovered ? "rgba(55, 65, 81, 0.5)" : "transparent",
                color: "#6b7280",
                cursor: "pointer",
                transition: "all 0.2s ease",
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
          padding: "0 clamp(14px, 4vw, 20px) clamp(14px, 4vw, 20px)",
          borderTop: "1px solid rgba(55, 65, 81, 0.2)",
          animation: "expandIn 0.2s ease-out",
        }}>
          <div style={{ paddingTop: 16, display: "flex", flexDirection: "column", gap: 14 }}>

            {/* ── Decision Details (NEW) ── */}
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
                    fontSize: "clamp(12px, 3.5vw, 14px)",
                    color: "#d1d5db",
                    margin: 0,
                    lineHeight: 1.7,
                    padding: "clamp(10px, 3vw, 14px)",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: 12,
                  }}>
                    {session.decisionDetails}
                  </p>
                ) : (
                  <p style={{ fontSize: "13px", color: "#6b7280", margin: 0, fontStyle: "italic" }}>
                    لا توجد تفاصيل إضافية للقرار
                  </p>
                )}

                {/* Decision Date */}
                {session.decisionDate && (
                  <div style={{
                    marginTop: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: "12px",
                    color: "#9ca3af",
                  }}>
                    <Calendar size={12} />
                    تاريخ صدور القرار: {formatDate(session.decisionDate)}
                  </div>
                )}
              </DetailBox>
            )}

            {/* ── Judgment Details (NEW, conditional) ── */}
            {hasJudgment && (
              <DetailBox
                icon={Gavel}
                title="بيانات الحكم"
                color="#10b981"
                bg="rgba(16, 185, 129, 0.06)"
                border="rgba(16, 185, 129, 0.2)"
              >
                {/* Judgment Type */}
                {judgmentMeta && (
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 14px",
                    background: judgmentMeta.bg,
                    color: judgmentMeta.color,
                    borderRadius: 20,
                    fontSize: "clamp(12px, 3.5vw, 13px)",
                    fontWeight: 700,
                    border: `1px solid ${judgmentMeta.border}`,
                    marginBottom: 12,
                  }}>
                    <Gavel size={13} />
                    {judgmentMeta.label}
                  </div>
                )}

                {/* Judgment Summary */}
                {session.judgmentSummary && (
                  <p style={{
                    fontSize: "clamp(12px, 3.5vw, 14px)",
                    color: "#d1d5db",
                    margin: 0,
                    lineHeight: 1.7,
                    padding: "clamp(10px, 3vw, 14px)",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: 12,
                  }}>
                    {session.judgmentSummary}
                  </p>
                )}

                {/* Appeal Info */}
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
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(107, 114, 128, 0.1)',
                    color: session.judgmentAppealable !== false ? '#10b981' : '#6b7280',
                    borderRadius: 8,
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
                      background: 'rgba(245, 158, 11, 0.1)',
                      color: '#f59e0b',
                      borderRadius: 8,
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

            {/* ── Suggested Task (NEW) ── */}
            {session.suggestedTask && (
              <DetailBox
                icon={Sparkles}
                title="المهمة المقترحة"
                color="#60a5fa"
                bg="rgba(30, 64, 175, 0.06)"
                border="rgba(30, 64, 175, 0.15)"
              >
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "clamp(10px, 3vw, 14px)",
                  background: "rgba(15, 23, 42, 0.4)",
                  borderRadius: 12,
                }}>
                  <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#60a5fa",
                    boxShadow: "0 0 8px rgba(96, 165, 250, 0.4)",
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", color: "#d1d5db", fontWeight: 500 }}>
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
                color="#d97706"
                bg="rgba(217, 119, 6, 0.06)"
                border="rgba(217, 119, 6, 0.15)"
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {linkedTasks.map((task, idx) => (
                    <div key={task.id || idx} style={{
                      padding: "clamp(8px, 3vw, 10px) clamp(10px, 3vw, 14px)",
                      background: "rgba(31, 41, 55, 0.5)",
                      borderRadius: 10,
                      fontSize: "clamp(12px, 3.5vw, 14px)",
                      color: "#d1d5db",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: task.status === 'completed' ? '#10b981' : '#d97706',
                        flexShrink: 0,
                        boxShadow: task.status === 'completed'
                          ? '0 0 6px rgba(16, 185, 129, 0.4)'
                          : '0 0 6px rgba(217, 119, 6, 0.4)',
                      }} />
                      {task.title || task.name || `عمل إداري ${idx + 1}`}
                    </div>
                  ))}
                </div>
              </DetailBox>
            )}

            {/* ── Description ── */}
            {session.description && (
              <DetailSection icon={FileText} iconColor="#8b5cf6" title="تفاصيل الجلسة">
                <p style={{
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  color: "#9ca3af",
                  lineHeight: 1.7,
                  margin: 0,
                  padding: "clamp(10px, 3vw, 14px)",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: 12,
                  border: "1px solid rgba(139, 92, 246, 0.1)",
                }}>
                  {session.description}
                </p>
              </DetailSection>
            )}

            {/* ── Notes ── */}
            {session.notes && (
              <DetailSection icon={FileText} iconColor="#60a5fa" title="ملاحظات">
                <p style={{
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  color: "#9ca3af",
                  lineHeight: 1.7,
                  margin: 0,
                  padding: "clamp(10px, 3vw, 14px)",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: 12,
                  border: "1px solid rgba(96, 165, 250, 0.1)",
                }}>
                  {session.notes}
                </p>
              </DetailSection>
            )}

            {/* ── Attachments ── */}
            {session.attachments?.length > 0 && (
              <DetailSection icon={Link2} iconColor="#4ade80" title="المرفقات">
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
                        padding: "clamp(6px, 2vw, 8px) clamp(10px, 3vw, 14px)",
                        background: "rgba(55, 65, 81, 0.4)",
                        color: "#d1d5db",
                        borderRadius: 10,
                        fontSize: "clamp(11px, 3vw, 13px)",
                        textDecoration: "none",
                        border: "1px solid rgba(55, 65, 81, 0.3)",
                        transition: "all 0.2s ease",
                        wordBreak: "break-all",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(55, 65, 81, 0.7)";
                        e.currentTarget.style.borderColor = "rgba(96, 165, 250, 0.3)";
                        e.currentTarget.style.color = "#f3f4f6";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(55, 65, 81, 0.4)";
                        e.currentTarget.style.borderColor = "rgba(55, 65, 81, 0.3)";
                        e.currentTarget.style.color = "#d1d5db";
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
// SUB COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function MetaItem({ icon: Icon, iconColor, label, highlight = false }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: highlight ? "clamp(12px, 3.5vw, 14px)" : "clamp(11px, 3vw, 13px)",
      fontWeight: highlight ? 600 : 400,
      color: highlight ? "#f3f4f6" : "#9ca3af",
      padding: "clamp(4px, 1.5vw, 6px) clamp(8px, 2.5vw, 12px)",
      background: highlight ? "rgba(139, 92, 246, 0.1)" : "rgba(31, 41, 55, 0.4)",
      border: highlight ? "1px solid rgba(139, 92, 246, 0.2)" : "1px solid transparent",
      borderRadius: 10,
      transition: "all 0.2s ease",
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
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "clamp(8px, 2.5vw, 10px) clamp(12px, 3vw, 16px)",
        background: "none",
        border: "none",
        color: danger ? "#ef4444" : "#d1d5db",
        fontSize: "clamp(12px, 3.5vw, 13px)",
        fontWeight: 500,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "inherit",
        transition: "all 0.15s",
        textAlign: "right",
        direction: "rtl",
        minHeight: 44,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? "rgba(239, 68, 68, 0.1)"
          : color + "15";
        e.currentTarget.style.color = danger ? "#ef4444" : color;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color = danger ? "#ef4444" : "#d1d5db";
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function DetailBox({ icon: Icon, title, color, bg, border, children }) {
  return (
    <div style={{
      padding: "clamp(12px, 3.5vw, 16px)",
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 14,
    }}>
      <h5 style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "clamp(12px, 3.5vw, 13px)",
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
  return (
    <div>
      <h5 style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "clamp(12px, 3.5vw, 13px)",
        fontWeight: 600,
        color: "#d1d5db",
        margin: "0 0 10px 0",
      }}>
        <Icon size={14} color={iconColor} />
        {title}
      </h5>
      {children}
    </div>
  );
}