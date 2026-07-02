import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, FileText, ChevronDown, ChevronUp,
  Edit2, Trash2, CheckCircle2, Landmark, Gavel, Briefcase,
  MoreVertical, Link2, AlertTriangle
} from 'lucide-react';
import { formatDate, formatTime } from '../../utils/date';

const statusConfig = {
  scheduled: { label: "مجدولة", color: "#60a5fa", bg: "rgba(96, 165, 250, 0.12)", border: "rgba(96, 165, 250, 0.25)", icon: Calendar, glow: "0 0 12px rgba(96, 165, 250, 0.15)" },
  completed: { label: "منعقدة", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)", icon: CheckCircle2, glow: "0 0 12px rgba(16, 185, 129, 0.15)" },
  postponed: { label: "مؤجلة", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)", icon: Clock, glow: "0 0 12px rgba(245, 158, 11, 0.15)" },
  cancelled: { label: "ملغاة", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)", icon: Trash2, glow: "0 0 12px rgba(239, 68, 68, 0.15)" },
  "in-progress": { label: "جارية", color: "#a78bfa", bg: "rgba(167, 139, 250, 0.12)", border: "rgba(167, 139, 250, 0.25)", icon: Clock, glow: "0 0 12px rgba(167, 139, 250, 0.15)" },
  default: { label: "غير محدد", color: "#6b7280", bg: "rgba(107, 114, 128, 0.12)", border: "rgba(107, 114, 128, 0.25)", icon: Calendar, glow: "none" },
};

export default function SessionCard({
  session,
  index,
  onEdit,
  onDelete,
  onAddDecision,
  onAddJudgment,
  onAddTask,
  linkedJudgment = null,
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

  const isOverdue = () => {
    const sessionDate = new Date(session.nextSessionDate || session.date);
    return sessionDate < new Date() && status === 'scheduled';
  };

  const handleMenuAction = (action) => {
    setMenuOpen(false);
    switch (action) {
      case 'edit': onEdit?.(session); break;
      case 'delete': onDelete?.(session.id); break;
      case 'decision': onAddDecision?.(session); break;
      case 'judgment': onAddJudgment?.(session); break;
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
        borderRadius: 16,
        marginBottom: 16,
        overflow: "visible",
        borderRight: `4px solid ${overdue ? "#ef4444" : sc.color}`,
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        boxShadow: hovered
          ? `0 8px 32px rgba(0, 0, 0, 0.3), ${sc.glow}`
          : "0 2px 8px rgba(0, 0, 0, 0.2)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        position: "relative",
        zIndex: menuOpen ? 50 : hovered ? 2 : 1,
      }}
    >
      {/* Header */}
      <div style={{ padding: "clamp(12px, 4vw, 18px) clamp(12px, 4vw, 20px)" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "flex-start", 
          gap: 12 
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Badges Row */}
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
                background: sc.color + "18",
                color: sc.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "clamp(11px, 3vw, 13px)",
                flexShrink: 0,
                border: `1px solid ${sc.border}`,
              }}>
                {index + 1}
              </div>

              {/* Status Badge */}
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

              {/* Linked Judgment Badge */}
              {linkedJudgment && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "clamp(3px, 1vw, 4px) clamp(8px, 2.5vw, 10px)",
                  background: "rgba(30, 64, 175, 0.12)",
                  color: "#60a5fa",
                  borderRadius: 20,
                  fontSize: "clamp(9px, 2.5vw, 11px)",
                  fontWeight: 700,
                  border: "1px solid rgba(30, 64, 175, 0.25)",
                  flexShrink: 0,
                }}>
                  <Gavel size={11} />
                  حكم مرتبط
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

            {/* Title */}
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

            {/* Meta Info */}
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

          {/* Actions */}
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
                    <MenuItem icon={CheckCircle2} label="إضافة قرار" color="#10b981" onClick={() => handleMenuAction('decision')} />
                    <MenuItem icon={Gavel} label="إضافة حكم" color="#3b82f6" onClick={() => handleMenuAction('judgment')} />
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

      {/* Expanded Details */}
      {expanded && (
        <div style={{
          padding: "0 clamp(12px, 4vw, 20px) clamp(12px, 4vw, 20px)",
          borderTop: "1px solid rgba(55, 65, 81, 0.2)",
          animation: "expandIn 0.2s ease-out",
        }}>
          <div style={{ paddingTop: 16 }}>
            {/* Linked Judgment Summary */}
            {linkedJudgment && (
              <DetailBox
                icon={Gavel}
                title="الحكم المرتبط"
                color="#60a5fa"
                bg="rgba(30, 64, 175, 0.08)"
                border="rgba(30, 64, 175, 0.2)"
              >
                <p style={{ 
                  fontSize: "clamp(12px, 3.5vw, 14px)", 
                  color: "#9ca3af", 
                  margin: 0, 
                  lineHeight: 1.6 
                }}>
                  {linkedJudgment.title || linkedJudgment.type || 'حكم مرتبط'}
                </p>
                {linkedJudgment.result && (
                  <div style={{
                    marginTop: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    background: linkedJudgment.result === 'win' ? 'rgba(16, 185, 129, 0.12)' :
                      linkedJudgment.result === 'lose' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    color: linkedJudgment.result === 'win' ? '#10b981' :
                      linkedJudgment.result === 'lose' ? '#ef4444' : '#f59e0b',
                    borderRadius: 20,
                    fontSize: "clamp(11px, 3vw, 12px)",
                    fontWeight: 700,
                    border: `1px solid ${linkedJudgment.result === 'win' ? 'rgba(16, 185, 129, 0.3)' :
                      linkedJudgment.result === 'lose' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  }}>
                    {linkedJudgment.result === 'win' ? 'لصالحنا' :
                      linkedJudgment.result === 'lose' ? 'ضدنا' : 'متعادل'}
                  </div>
                )}
              </DetailBox>
            )}

            {/* Linked Tasks Summary */}
            {linkedTasks.length > 0 && (
              <DetailBox
                icon={Briefcase}
                title={`الأعمال الإدارية المرتبطة (${linkedTasks.length})`}
                color="#d97706"
                bg="rgba(217, 119, 6, 0.08)"
                border="rgba(217, 119, 6, 0.2)"
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

            {/* Decision */}
            {session.decision && (
              <DetailSection icon={CheckCircle2} iconColor="#10b981" title="القرار / الإجراء">
                <p style={{
                  fontSize: "clamp(12px, 3.5vw, 14px)",
                  color: "#9ca3af",
                  lineHeight: 1.7,
                  margin: 0,
                  padding: "clamp(10px, 3vw, 14px)",
                  background: "rgba(15, 23, 42, 0.5)",
                  borderRadius: 12,
                  border: "1px solid rgba(16, 185, 129, 0.1)",
                }}>
                  {session.decision}
                </p>
              </DetailSection>
            )}

            {/* Description */}
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

            {/* Notes */}
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

            {/* Attachments */}
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

// ========== Sub Components ==========

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
      marginBottom: 16,
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
    <div style={{ marginBottom: 16 }}>
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