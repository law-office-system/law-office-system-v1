import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, 
  Edit2, Trash2, User, Calendar, Tag, ArrowRight, FolderOpen
} from 'lucide-react';

const statusConfig = {
  pending: {
    label: 'معلقة',
    icon: Circle,
    color: 'var(--theme-accent-amber-main)',
    bgColor: 'var(--theme-accent-amber-bg)',
    borderColor: 'var(--theme-accent-amber-border)',
  },
  'in-progress': {
    label: 'قيد التنفيذ',
    icon: Clock,
    color: 'var(--theme-accent-blue-light)',
    bgColor: 'var(--theme-accent-blue-bg)',
    borderColor: 'var(--theme-accent-blue-border)',
  },
  completed: {
    label: 'منجزة',
    icon: CheckCircle2,
    color: 'var(--theme-accent-green-main)',
    bgColor: 'var(--theme-accent-green-bg)',
    borderColor: 'var(--theme-accent-green-border)',
  },
  overdue: {
    label: 'متأخرة',
    icon: AlertCircle,
    color: 'var(--theme-accent-red-main)',
    bgColor: 'var(--theme-accent-red-bg)',
    borderColor: 'var(--theme-accent-red-border)',
  },
};

const priorityConfig = {
  high: { 
    label: 'عالية', 
    color: 'var(--theme-accent-red-main)', 
    bg: 'var(--theme-accent-red-bg)',
    border: 'var(--theme-accent-red-border)'
  },
  medium: { 
    label: 'متوسطة', 
    color: 'var(--theme-accent-amber-main)', 
    bg: 'var(--theme-accent-amber-bg)',
    border: 'var(--theme-accent-amber-border)'
  },
  low: { 
    label: 'منخفضة', 
    color: 'var(--theme-accent-green-main)', 
    bg: 'var(--theme-accent-green-bg)',
    border: 'var(--theme-accent-green-border)'
  },
};

export default function AdminTaskCard({ task, caseInfo, onEdit, onDelete, onToggleStatus }) {
  const { theme } = useTheme();
  const { colors } = theme;

  const status = statusConfig[task.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const priority = priorityConfig[task.priority] || priorityConfig.medium;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
  const isCompleted = task.status === 'completed';

  const handleToggle = () => {
    const newStatus = isCompleted ? 'pending' : 'completed';
    onToggleStatus?.(task.id, newStatus);
  };

  const handleEdit = () => {
    onEdit?.(task);
  };

  const handleDelete = () => {
    if (window.confirm('هل أنت متأكد من حذف هذا العمل الإداري؟')) {
      onDelete?.(task.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div 
      style={{
        ...styles.card(colors),
        borderRight: isOverdue ? `4px solid ${colors.accent.red.main}` : '4px solid transparent',
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      {/* Case Header */}
      {caseInfo && (
        <div style={styles.caseHeader(colors)}>
          <FolderOpen size={14} color={colors.accent.blue.light} />
          <span style={styles.caseTitle(colors)}>{caseInfo.title}</span>
          {caseInfo.number && (
            <span style={styles.caseNumber(colors)}>(رقم: {caseInfo.number})</span>
          )}
        </div>
      )}
      {task.caseId === 'general' && (
        <div style={styles.caseHeader(colors)}>
          <FolderOpen size={14} color={colors.text.muted} />
          <span style={{ ...styles.caseTitle(colors), color: colors.text.muted }}>
            عمل عام (غير مرتبط بقضية)
          </span>
        </div>
      )}

      <div style={styles.cardInner}>
        {/* Top Row: Toggle + Title + Actions */}
        <div style={styles.topRow}>
          {/* Status Toggle */}
          <button
            onClick={handleToggle}
            style={{
              ...styles.toggleBtn,
              background: isCompleted ? colors.accent.green.bg : colors.bg.hover,
            }}
            title={isCompleted ? 'تحديد كمعلق' : 'تحديد كمنجز'}
          >
            {isCompleted ? (
              <CheckCircle2 size={22} color={colors.accent.green.main} strokeWidth={2.5} />
            ) : (
              <Circle size={22} color={colors.text.muted} strokeWidth={2} />
            )}
          </button>

          {/* Title & Priority */}
          <div style={styles.titleSection}>
            <div style={styles.titleRow}>
              <h4 style={{
                ...styles.title,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? colors.text.disabled : colors.text.primary,
              }}>
                {task.title}
              </h4>
              <span style={{
                ...styles.priorityBadge,
                background: priority.bg,
                color: priority.color,
                border: `1px solid ${priority.border}`,
              }}>
                {priority.label}
              </span>
            </div>

            {task.description && (
              <p style={{
                ...styles.description,
                color: isCompleted ? colors.text.disabled : colors.text.muted,
              }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            {onEdit && (
              <button
                onClick={handleEdit}
                style={styles.actionBtn(colors)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.accent.blue.bg;
                  e.currentTarget.style.color = colors.accent.blue.light;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.text.muted;
                }}
                title="تعديل"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                style={styles.actionBtn(colors)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = colors.accent.red.bg;
                  e.currentTarget.style.color = colors.accent.red.light;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.text.muted;
                }}
                title="حذف"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Meta Info */}
        <div style={styles.metaRow}>
          {/* Status Badge */}
          <div style={{
            ...styles.metaBadge,
            background: status.bgColor,
            border: `1px solid ${status.borderColor}`,
          }}>
            <StatusIcon size={13} color={status.color} strokeWidth={2.5} />
            <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div style={{
              ...styles.metaItem(colors),
              color: isOverdue ? colors.accent.red.main : colors.text.muted,
            }}>
              <Calendar size={13} color={isOverdue ? colors.accent.red.main : colors.text.muted} />
              <span>{formatDate(task.dueDate)}</span>
              {isOverdue && <span style={styles.overdueLabel(colors)}>متأخر</span>}
            </div>
          )}

          {/* Assigned To */}
          {task.assignedTo && (
            <div style={styles.metaItem(colors)}>
              <User size={13} color={colors.text.muted} />
              <span>{task.assignedTo}</span>
            </div>
          )}

          {/* Category */}
          {task.category && (
            <div style={styles.metaItem(colors)}>
              <Tag size={13} color={colors.text.muted} />
              <span>{task.category}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ Styles factory — بتستقبل colors من الثيم
const styles = {
  card: (colors) => ({
    background: colors.bg.card,
    border: `1px solid ${colors.border.default}`,
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    marginBottom: '12px',
  }),
  caseHeader: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: colors.bg.page,
    borderBottom: `1px solid ${colors.border.default}`,
  }),
  caseTitle: (colors) => ({
    fontSize: '13px',
    fontWeight: '600',
    color: colors.accent.blue.light,
  }),
  caseNumber: (colors) => ({
    fontSize: '12px',
    color: colors.text.muted,
    fontWeight: '500',
  }),
  cardInner: {
    padding: '16px 20px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
  },
  toggleBtn: {
    flexShrink: 0,
    marginTop: '2px',
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleSection: {
    flex: 1,
    minWidth: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '6px',
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  priorityBadge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    flexShrink: 0,
  },
  description: {
    fontSize: '13px',
    margin: '0 0 10px 0',
    lineHeight: 1.5,
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  actionBtn: (colors) => ({
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: colors.text.muted,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '12px',
    marginRight: '46px',
    flexWrap: 'wrap',
  },
  metaBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  metaItem: (colors) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: colors.text.muted,
    padding: '4px 10px',
    background: colors.bg.hover,
    borderRadius: '8px',
  }),
  overdueLabel: (colors) => ({
    background: colors.accent.red.bg,
    color: colors.accent.red.main,
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    marginRight: '4px',
  }),
};