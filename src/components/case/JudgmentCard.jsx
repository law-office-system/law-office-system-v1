import React, { useState } from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, 
  Edit2, Trash2, Eye, Download, Scale, Calendar, 
  User, FileText, ChevronDown, ChevronUp, Bell, FolderOpen
} from 'lucide-react';
import { formatDate } from '../../utils/date';

// ========== CONFIGS - MATCHING JUDGMENT FORM ==========

const categoryLabels = {
  order: 'أمر',
  preliminary: 'حكم تمهيدي',
  final: 'حكم قطعي',
};

const categoryConfig = {
  order: {
    label: 'أمر',
    color: '#6b7280',
    bg: 'rgba(107, 114, 128, 0.15)',
    border: 'rgba(107, 114, 128, 0.3)',
  },
  preliminary: {
    label: 'حكم تمهيدي',
    color: '#d97706',
    bg: 'rgba(217, 119, 6, 0.15)',
    border: 'rgba(217, 119, 6, 0.3)',
  },
  final: {
    label: 'حكم قطعي',
    color: '#1e40af',
    bg: 'rgba(30, 64, 175, 0.15)',
    border: 'rgba(30, 64, 175, 0.3)',
  },
};

const resultConfig = {
  win: { label: 'لصالحنا', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: CheckCircle2 },
  lose: { label: 'ضدنا', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: AlertCircle },
  draw: { label: 'متعادل', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: Scale },
};

export default function JudgmentCard({ judgment, caseInfo, onEdit, onDelete, onToggleFollowUp }) {
  const [expanded, setExpanded] = useState(false);

  const handleEdit = () => {
    onEdit?.(judgment);
  };

  const handleDelete = () => {
    if (window.confirm('هل أنت متأكد من حذف هذا الحكم؟')) {
      onDelete?.(judgment.id);
    }
  };

  const handleToggleFollowUp = () => {
    onToggleFollowUp?.(judgment.id, judgment.needsFollowUp);
  };

  // ========== DERIVED VALUES ==========
  const category = judgment.category || 'final';
  const catConfig = categoryConfig[category] || categoryConfig.final;

  const result = (category === 'final' && judgment.result) 
    ? resultConfig[judgment.result] 
    : null;

  const isOrder = category === 'order';
  const isPreliminary = category === 'preliminary';
  const isFinal = category === 'final';

  const needsFollowUp = judgment.needsFollowUp;
  const isOverdue = judgment.appealDeadline && new Date(judgment.appealDeadline) < new Date();

  return (
    <div 
      style={{
        ...styles.card,
        borderRight: result ? `4px solid ${result.color}` : '4px solid transparent',
        borderColor: needsFollowUp ? 'rgba(217, 119, 6, 0.5)' : 'rgba(55, 65, 81, 0.5)',
      }}
    >
      {/* Case Header */}
      {caseInfo && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color="#60a5fa" />
          <span style={styles.caseTitle}>{caseInfo.title}</span>
          {caseInfo.number && (
            <span style={styles.caseNumber}>(رقم: {caseInfo.number})</span>
          )}
        </div>
      )}
      {judgment.caseId === 'general' && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color="#6b7280" />
          <span style={{ ...styles.caseTitle, color: '#6b7280' }}>حكم عام (غير مرتبط بقضية)</span>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.cardInner}>
        <div style={styles.topRow}>
          {/* Category & Result */}
          <div style={styles.badgeRow}>
            {/* Category Badge */}
            <div style={{
              ...styles.categoryBadge,
              background: catConfig.bg,
              border: `1px solid ${catConfig.border}`,
              color: catConfig.color,
            }}>
              <Scale size={13} strokeWidth={2.5} />
              {catConfig.label}
            </div>

            {/* Type Badge (free text from form) */}
            {judgment.type && (
              <div style={{
                ...styles.typeBadge,
                background: 'rgba(31, 41, 55, 0.5)',
                border: '1px solid rgba(55, 65, 81, 0.3)',
                color: '#d1d5db',
              }}>
                {judgment.type}
              </div>
            )}

            {/* Result - ONLY for final */}
            {result && (
              <div style={{
                ...styles.resultBadge,
                background: result.bg,
                color: result.color,
              }}>
                <result.icon size={13} strokeWidth={2.5} />
                {result.label}
              </div>
            )}

            {/* Follow Up - for order & preliminary */}
            {(isOrder || isPreliminary) && needsFollowUp && (
              <div style={styles.followUpBadge}>
                <Bell size={12} />
                يحتاج متابعة
              </div>
            )}

            {isOverdue && (
              <div style={styles.overdueBadge}>
                <AlertCircle size={12} />
                انتهى الموعد
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            {(isOrder || isPreliminary) && onToggleFollowUp && (
              <button
                onClick={handleToggleFollowUp}
                style={{
                  ...styles.actionBtn,
                  background: needsFollowUp ? 'rgba(217, 119, 6, 0.15)' : 'transparent',
                  color: needsFollowUp ? '#d97706' : '#6b7280',
                }}
                title={needsFollowUp ? 'إلغاء المتابعة' : 'تحديد للمتابعة'}
              >
                <Bell size={16} />
              </button>
            )}

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
            <button
              onClick={() => setExpanded(!expanded)}
              style={styles.actionBtn}
            >
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Title */}
        <h4 style={styles.title}>
          {judgment.title || `${catConfig.label} - ${judgment.type || ''}`}
        </h4>

        {/* Meta Info */}
        <div style={styles.metaRow}>
          <div style={styles.metaItem}>
            <Calendar size={13} color="#8b5cf6" />
            <span>تاريخ {isOrder ? 'الأمر' : 'الحكم'}: {formatDate(judgment.date)}</span>
          </div>

          {judgment.sessionDate && (
            <div style={styles.metaItem}>
              <Clock size={13} color="#60a5fa" />
              <span>الجلسة: {formatDate(judgment.sessionDate)}</span>
            </div>
          )}

          {judgment.judge && (
            <div style={styles.metaItem}>
              <User size={13} color="#fbbf24" />
              <span>القاضي: {judgment.judge}</span>
            </div>
          )}

          {judgment.caseNumber && (
            <div style={styles.metaItem}>
              <FileText size={13} color="#9ca3af" />
              <span>القضية: {judgment.caseNumber}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={styles.expandedContent}>
          {judgment.summary && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <FileText size={14} color="#8b5cf6" />
                ملخص {isOrder ? 'الأمر' : 'الحكم'}
              </h5>
              <p style={styles.detailText}>{judgment.summary}</p>
            </div>
          )}

          {/* Details & Obligations - ONLY for final */}
          {isFinal && judgment.details && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <FileText size={14} color="#60a5fa" />
                التفاصيل الكاملة
              </h5>
              <p style={styles.detailText}>{judgment.details}</p>
            </div>
          )}

          {isFinal && judgment.obligations && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <AlertCircle size={14} color="#ef4444" />
                الالتزامات
              </h5>
              <p style={styles.detailText}>{judgment.obligations}</p>
            </div>
          )}

          {/* Follow Up Deadline - for order & preliminary */}
          {(isOrder || isPreliminary) && judgment.appealDeadline && (
            <div style={{
              ...styles.followUpBox,
              background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 119, 6, 0.1)',
              borderColor: isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(217, 119, 6, 0.3)',
            }}>
              <h5 style={{
                ...styles.followUpTitle,
                color: isOverdue ? '#ef4444' : '#d97706',
              }}>
                <Clock size={14} />
                موعد المتابعة
              </h5>
              <p style={{
                ...styles.followUpText,
                color: isOverdue ? '#ef4444' : '#d97706',
              }}>
                {formatDate(judgment.appealDeadline)}
                {isOverdue && <span style={{ marginRight: '8px', fontWeight: 700 }}>(انتهى الموعد)</span>}
              </p>
            </div>
          )}

          {/* Appeal Deadline - ONLY for final */}
          {isFinal && judgment.appealDeadline && (
            <div style={{
              ...styles.appealBox,
              background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              borderColor: isOverdue ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
            }}>
              <h5 style={{
                ...styles.appealTitle,
                color: isOverdue ? '#ef4444' : '#f59e0b',
              }}>
                <Clock size={14} />
                موعد الاستئناف
              </h5>
              <p style={{
                ...styles.appealText,
                color: isOverdue ? '#ef4444' : '#f59e0b',
              }}>
                {formatDate(judgment.appealDeadline)}
                {isOverdue && <span style={{ marginRight: '8px', fontWeight: 700 }}>(انتهى الموعد)</span>}
              </p>
            </div>
          )}

          {judgment.attachments?.length > 0 && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <FileText size={14} color="#10b981" />
                المرفقات
              </h5>
              <div style={styles.attachmentsGrid}>
                {judgment.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.attachmentLink}
                  >
                    <Download size={14} />
                    {file.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
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
    justifyContent: 'space-between',
    marginBottom: '10px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  typeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  resultBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '5px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '700',
  },
  followUpBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: 'rgba(217, 119, 6, 0.15)',
    color: '#d97706',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  },
  overdueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#ef4444',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
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
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#f3f4f6',
    margin: '0 0 10px 0',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '13px',
    color: '#9ca3af',
    padding: '4px 10px',
    background: 'rgba(31, 41, 55, 0.5)',
    borderRadius: '8px',
  },
  expandedContent: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(55, 65, 81, 0.3)',
  },
  detailSection: {
    marginBottom: '16px',
  },
  detailTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '600',
    color: '#d1d5db',
    margin: '0 0 8px 0',
  },
  detailText: {
    fontSize: '14px',
    color: '#9ca3af',
    lineHeight: 1.7,
    margin: 0,
    padding: '12px',
    background: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
  },
  followUpBox: {
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid',
    marginBottom: '16px',
  },
  followUpTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '700',
    margin: '0 0 6px 0',
  },
  followUpText: {
    fontSize: '14px',
    margin: 0,
  },
  appealBox: {
    padding: '14px',
    borderRadius: '12px',
    border: '1px solid',
    marginBottom: '16px',
  },
  appealTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '700',
    margin: '0 0 6px 0',
  },
  appealText: {
    fontSize: '14px',
    margin: 0,
  },
  attachmentsGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  attachmentLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: 'rgba(55, 65, 81, 0.5)',
    color: '#d1d5db',
    borderRadius: '10px',
    fontSize: '13px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
};