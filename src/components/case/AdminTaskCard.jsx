import React from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, 
  Edit2, Trash2, User, Calendar, Tag, ArrowRight, FolderOpen
} from 'lucide-react';

const statusConfig = {
  pending: {
    label: 'معلقة',
    icon: Circle,
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  'in-progress': {
    label: 'قيد التنفيذ',
    icon: Clock,
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.15)',
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  completed: {
    label: 'منجزة',
    icon: CheckCircle2,
    color: '#4ade80',
    bgColor: 'rgba(74, 222, 128, 0.15)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  overdue: {
    label: 'متأخرة',
    icon: AlertCircle,
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.15)',
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
};

const priorityConfig = {
  high: { 
    label: 'عالية', 
    color: '#f87171', 
    bg: 'rgba(248, 113, 113, 0.15)',
    border: 'rgba(248, 113, 113, 0.3)'
  },
  medium: { 
    label: 'متوسطة', 
    color: '#fbbf24', 
    bg: 'rgba(251, 191, 36, 0.15)',
    border: 'rgba(251, 191, 36, 0.3)'
  },
  low: { 
    label: 'منخفضة', 
    color: '#4ade80', 
    bg: 'rgba(74, 222, 128, 0.15)',
    border: 'rgba(74, 222, 128, 0.3)'
  },
};

export default function AdminTaskCard({ task, caseInfo, onEdit, onDelete, onToggleStatus }) {
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

  // Format date
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
        ...styles.card,
        borderRight: isOverdue ? '4px solid #f87171' : '4px solid transparent',
        opacity: isCompleted ? 0.7 : 1,
      }}
    >
      {/* Case Header - NEW */}
      {caseInfo && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color="#60a5fa" />
          <span style={styles.caseTitle}>{caseInfo.title}</span>
          {caseInfo.number && (
            <span style={styles.caseNumber}>(رقم: {caseInfo.number})</span>
          )}
        </div>
      )}
      {task.caseId === 'general' && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color="#6b7280" />
          <span style={{ ...styles.caseTitle, color: '#6b7280' }}>عمل عام (غير مرتبط بقضية)</span>
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
              background: isCompleted ? 'rgba(74, 222, 128, 0.15)' : 'rgba(55, 65, 81, 0.3)',
            }}
            title={isCompleted ? 'تحديد كمعلق' : 'تحديد كمنجز'}
          >
            {isCompleted ? (
              <CheckCircle2 size={22} color="#4ade80" strokeWidth={2.5} />
            ) : (
              <Circle size={22} color="#6b7280" strokeWidth={2} />
            )}
          </button>

          {/* Title & Priority */}
          <div style={styles.titleSection}>
            <div style={styles.titleRow}>
              <h4 style={{
                ...styles.title,
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? '#6b7280' : '#f3f4f6',
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

            {/* Description - Mobile friendly */}
            {task.description && (
              <p style={{
                ...styles.description,
                color: isCompleted ? '#4b5563' : '#9ca3af',
              }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Actions - Hidden on very small screens, shown as icons */}
          <div style={styles.actions}>
            {onEdit && (
              <button
                onClick={handleEdit}
                style={styles.actionBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  e.currentTarget.style.color = '#60a5fa';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }}
                title="تعديل"
              >
                <Edit2 size={16} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                style={styles.actionBtn}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
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
              ...styles.metaItem,
              color: isOverdue ? '#f87171' : '#6b7280',
            }}>
              <Calendar size={13} color={isOverdue ? '#f87171' : '#6b7280'} />
              <span>{formatDate(task.dueDate)}</span>
              {isOverdue && <span style={styles.overdueLabel}>متأخر</span>}
            </div>
          )}

          {/* Assigned To */}
          {task.assignedTo && (
            <div style={styles.metaItem}>
              <User size={13} color="#6b7280" />
              <span>{task.assignedTo}</span>
            </div>
          )}

          {/* Category */}
          {task.category && (
            <div style={styles.metaItem}>
              <Tag size={13} color="#6b7280" />
              <span>{task.category}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: '#1e293b',
    border: '1px solid rgba(55, 65, 81, 0.5)',
    borderRadius: '16px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    marginBottom: '12px',
  },
  caseHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'rgba(15, 23, 42, 0.6)',
    borderBottom: '1px solid rgba(55, 65, 81, 0.3)',
  },
  caseTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#60a5fa',
  },
  caseNumber: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: '500',
  },
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
  actionBtn: {
    padding: '8px',
    borderRadius: '10px',
    border: 'none',
    background: 'transparent',
    color: '#6b7280',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: '#6b7280',
    padding: '4px 10px',
    background: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '8px',
  },
  overdueLabel: {
    background: 'rgba(248, 113, 113, 0.2)',
    color: '#f87171',
    padding: '2px 8px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: '700',
    marginRight: '4px',
  },
};

// Mobile responsive adjustments via CSS
const mobileStyles = `
  @media (max-width: 640px) {
    .admin-task-card-inner {
      padding: 12px 14px !important;
    }
    .admin-task-meta-row {
      margin-right: 0 !important;
      margin-top: 10px !important;
    }
    .admin-task-title {
      font-size: 14px !important;
    }
    .admin-task-actions {
      position: absolute;
      top: 12px;
      left: 14px;
    }
  }
`;