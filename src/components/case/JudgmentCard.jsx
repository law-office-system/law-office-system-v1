import React, { useState } from 'react';
import { 
  CheckCircle2, Circle, Clock, AlertCircle, 
  Edit2, Trash2, Eye, Download, Scale, Calendar, 
  User, FileText, ChevronDown, ChevronUp, Bell, FolderOpen
} from 'lucide-react';
import { formatDate } from '../../utils/date';
import { useTheme } from '../../context/ThemeContext.jsx';

// ========== CONFIGS - MATCHING JUDGMENT FORM ==========

const categoryLabels = {
  order: 'أمر',
  preliminary: 'حكم تمهيدي',
  final: 'حكم قطعي',
};

const categoryConfig = {
  order: {
    label: 'أمر',
    getColor: (c) => c.text.muted,
    getBg: (c) => c.text.disabled + '25',
    getBorder: (c) => c.text.disabled + '40',
  },
  preliminary: {
    label: 'حكم تمهيدي',
    getColor: (c) => c.accent.amber.main,
    getBg: (c) => c.accent.amber.bg,
    getBorder: (c) => c.accent.amber.main + '30',
  },
  final: {
    label: 'حكم قطعي',
    getColor: (c) => c.accent.blue.dark,
    getBg: (c) => c.accent.blue.bg,
    getBorder: (c) => c.accent.blue.main + '30',
  },
};

const resultConfig = {
  win: { label: 'لصالحنا', getColor: (c) => c.accent.green.main, getBg: (c) => c.accent.green.bg, icon: CheckCircle2 },
  lose: { label: 'ضدنا', getColor: (c) => c.accent.red.main, getBg: (c) => c.accent.red.bg, icon: AlertCircle },
  draw: { label: 'متعادل', getColor: (c) => c.accent.amber.main, getBg: (c) => c.accent.amber.bg, icon: Scale },
};

export default function JudgmentCard({ judgment, caseInfo, onEdit, onDelete, onToggleFollowUp }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = getStyles(colors);
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
        borderRight: result ? `4px solid ${result.getColor(colors)}` : '4px solid transparent',
        borderColor: needsFollowUp ? colors.accent.amber.main + '50' : colors.border.default,
      }}
    >
      {/* Case Header */}
      {caseInfo && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color={colors.accent.blue.light} />
          <span style={styles.caseTitle}>{caseInfo.title}</span>
          {caseInfo.number && (
            <span style={styles.caseNumber}>(رقم: {caseInfo.number})</span>
          )}
        </div>
      )}
      {judgment.caseId === 'general' && (
        <div style={styles.caseHeader}>
          <FolderOpen size={14} color={colors.text.muted} />
          <span style={{ ...styles.caseTitle, color: colors.text.muted }}>حكم عام (غير مرتبط بقضية)</span>
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
              background: catConfig.getBg(colors),
              border: `1px solid ${catConfig.getBorder(colors)}`,
              color: catConfig.getColor(colors),
            }}>
              <Scale size={13} strokeWidth={2.5} />
              {catConfig.label}
            </div>

            {/* Type Badge (free text from form) */}
            {judgment.type && (
              <div style={{
                ...styles.typeBadge,
                background: colors.bg.hover,
                border: `1px solid ${colors.border.default}`,
                color: colors.text.secondary,
              }}>
                {judgment.type}
              </div>
            )}

            {/* Result - ONLY for final */}
            {result && (
              <div style={{
                ...styles.resultBadge,
                background: result.getBg(colors),
                color: result.getColor(colors),
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
                  background: needsFollowUp ? colors.accent.amber.bg : 'transparent',
                  color: needsFollowUp ? colors.accent.amber.main : colors.text.muted,
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
                style={styles.actionBtn}
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
            <Calendar size={13} color={colors.accent.purple.main} />
            <span>تاريخ {isOrder ? 'الأمر' : 'الحكم'}: {formatDate(judgment.date)}</span>
          </div>

          {judgment.sessionDate && (
            <div style={styles.metaItem}>
              <Clock size={13} color={colors.accent.blue.light} />
              <span>الجلسة: {formatDate(judgment.sessionDate)}</span>
            </div>
          )}

          {judgment.judge && (
            <div style={styles.metaItem}>
              <User size={13} color={colors.accent.amber.light} />
              <span>القاضي: {judgment.judge}</span>
            </div>
          )}

          {judgment.caseNumber && (
            <div style={styles.metaItem}>
              <FileText size={13} color={colors.text.muted} />
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
                <FileText size={14} color={colors.accent.purple.main} />
                ملخص {isOrder ? 'الأمر' : 'الحكم'}
              </h5>
              <p style={styles.detailText}>{judgment.summary}</p>
            </div>
          )}

          {/* Details & Obligations - ONLY for final */}
          {isFinal && judgment.details && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <FileText size={14} color={colors.accent.blue.light} />
                التفاصيل الكاملة
              </h5>
              <p style={styles.detailText}>{judgment.details}</p>
            </div>
          )}

          {isFinal && judgment.obligations && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <AlertCircle size={14} color={colors.accent.red.main} />
                الالتزامات
              </h5>
              <p style={styles.detailText}>{judgment.obligations}</p>
            </div>
          )}

          {/* Follow Up Deadline - for order & preliminary */}
          {(isOrder || isPreliminary) && judgment.appealDeadline && (
            <div style={{
              ...styles.followUpBox,
              background: isOverdue ? colors.accent.red.bg : colors.accent.amber.bg,
              borderColor: isOverdue ? colors.accent.red.main + '30' : colors.accent.amber.main + '30',
            }}>
              <h5 style={{
                ...styles.followUpTitle,
                color: isOverdue ? colors.accent.red.main : colors.accent.amber.main,
              }}>
                <Clock size={14} />
                موعد المتابعة
              </h5>
              <p style={{
                ...styles.followUpText,
                color: isOverdue ? colors.accent.red.main : colors.accent.amber.main,
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
              background: isOverdue ? colors.accent.red.bg : colors.accent.amber.bg,
              borderColor: isOverdue ? colors.accent.red.main + '30' : colors.accent.amber.main + '30',
            }}>
              <h5 style={{
                ...styles.appealTitle,
                color: isOverdue ? colors.accent.red.main : colors.accent.amber.main,
              }}>
                <Clock size={14} />
                موعد الاستئناف
              </h5>
              <p style={{
                ...styles.appealText,
                color: isOverdue ? colors.accent.red.main : colors.accent.amber.main,
              }}>
                {formatDate(judgment.appealDeadline)}
                {isOverdue && <span style={{ marginRight: '8px', fontWeight: 700 }}>(انتهى الموعد)</span>}
              </p>
            </div>
          )}

          {judgment.attachments?.length > 0 && (
            <div style={styles.detailSection}>
              <h5 style={styles.detailTitle}>
                <FileText size={14} color={colors.accent.green.main} />
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

const getStyles = (colors) => ({
  card: {
    background: colors.bg.card,
    border: `1px solid ${colors.border.default}`,
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
    background: colors.bg.page,
    borderBottom: `1px solid ${colors.border.default}`,
  },
  caseTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: colors.accent.blue.light,
  },
  caseNumber: {
    fontSize: '12px',
    color: colors.text.muted,
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
    background: colors.accent.amber.bg,
    color: colors.accent.amber.main,
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
  },
  overdueBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    background: colors.accent.red.bg,
    color: colors.accent.red.main,
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
    color: colors.text.muted,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: '700',
    color: colors.text.primary,
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
    color: colors.text.muted,
    padding: '4px 10px',
    background: colors.bg.hover,
    borderRadius: '8px',
  },
  expandedContent: {
    padding: '16px 20px',
    borderTop: `1px solid ${colors.border.default}`,
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
    color: colors.text.secondary,
    margin: '0 0 8px 0',
  },
  detailText: {
    fontSize: '14px',
    color: colors.text.muted,
    lineHeight: 1.7,
    margin: 0,
    padding: '12px',
    background: colors.bg.input,
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
    background: colors.bg.hover,
    color: colors.text.secondary,
    borderRadius: '10px',
    fontSize: '13px',
    textDecoration: 'none',
    transition: 'all 0.2s',
  },
});