import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  CheckCircle2, Circle, Clock,
  Edit2, Trash2, User, Calendar, Tag, ArrowRight, FolderOpen
} from 'lucide-react';

const statusConfig = {
  pending:       { label: 'معلقة',      colorKey: 'amber',  icon: Circle },
  'in-progress': { label: 'قيد التنفيذ', colorKey: 'blue',   icon: Clock },
  completed:     { label: 'منجزة',      colorKey: 'green',  icon: CheckCircle2 },
};

const QUICK_STATUSES = [
  { value: 'pending',     label: 'معلقة' },
  { value: 'in-progress', label: 'قيد التنفيذ' },
  { value: 'completed',   label: 'منجزة' },
];

const priorityConfig = {
  high:   { label: 'عالية',  colorKey: 'red' },
  medium: { label: 'متوسطة', colorKey: 'amber' },
  low:    { label: 'منخفضة', colorKey: 'green' },
};

function QuickIcon({ value, colors }) {
  if (value === 'completed') return <CheckCircle2 size={11} color={colors.accent.green.main} />;
  if (value === 'in-progress') return <Clock size={11} color={colors.accent.blue.light} />;
  return <Circle size={11} color={colors.accent.amber.main} />;
}

export default function AdminTaskCard({ task, caseInfo, onEdit, onDelete, onToggle, onStatusChange }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const A = colors.accent;

  const statusKey = task.status === 'completed' ? 'completed' : task.status === 'in-progress' ? 'in-progress' : 'pending';
  const status = statusConfig[statusKey];
  const sc = A[status.colorKey]; // ألوان الحالة من الثيم
  const pc = A[(priorityConfig[task.priority] || priorityConfig.medium).colorKey];

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && statusKey !== 'completed';
  const isCompleted = statusKey === 'completed';

  const stop = (fn) => (e) => { e.stopPropagation(); fn?.(); };
  const handleQuickStatus = (e, value) => {
    e.stopPropagation();
    if (value !== statusKey) onStatusChange?.(task.id, value);
  };
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={{
      background: colors.bg.card,
      border: `1px solid ${colors.border.default}`,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 8,
      borderRight: isOverdue ? `3px solid ${A.red.main}` : '3px solid transparent',
      opacity: isCompleted ? 0.75 : 1,
      transition: 'all 0.2s ease',
    }}>
      {/* ترويسة القضية — مضغوطة */}
      {caseInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: colors.bg.page, borderBottom: `1px solid ${colors.border.default}` }}>
          <FolderOpen size={12} color={A.blue.light} />
          <span style={{ fontSize: 11, fontWeight: 600, color: A.blue.light, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '60%' }}>
            {caseInfo.title}
          </span>
          <span style={{ fontSize: 10, color: colors.text.muted, whiteSpace: 'nowrap' }}>
            (رقم: {caseInfo.number || '—'}{caseInfo.year ? ` · سنة ${caseInfo.year}` : ''})
          </span>
          <ArrowRight size={11} color={colors.text.muted} style={{ marginRight: 'auto' }} />
        </div>
      )}
      {task.caseId === 'general' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: colors.bg.page, borderBottom: `1px solid ${colors.border.default}` }}>
          <FolderOpen size={12} color={colors.text.muted} />
          <span style={{ fontSize: 11, fontWeight: 600, color: colors.text.muted }}>عمل عام</span>
        </div>
      )}

      <div style={{ padding: '8px 12px 9px' }}>
        {/* الصف 1: دائرة + العنوان + أولوية + أزرار */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <button
            onClick={stop(() => onToggle?.(task.id, isCompleted ? 'pending' : 'completed'))}
            title={isCompleted ? 'إلغاء الإنجاز' : 'تأكيد الإنجاز يدويًا'}
            style={{
              flexShrink: 0, marginTop: 0, padding: 5, borderRadius: 7, border: 'none', cursor: 'pointer',
              background: isCompleted ? A.green.bg : colors.bg.hover,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isCompleted
              ? <CheckCircle2 size={18} color={A.green.main} strokeWidth={2.5} />
              : <Circle size={18} color={isOverdue ? A.red.main : colors.text.muted} strokeWidth={2} />}
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 13, fontWeight: 600, lineHeight: 1.4, wordBreak: 'break-word',
                textDecoration: isCompleted ? 'line-through' : 'none',
                color: isCompleted ? colors.text.disabled : colors.text.primary,
              }}>
                {task.title}
              </span>
              <span style={{
                padding: '1px 7px', borderRadius: 20, fontSize: 9, fontWeight: 700, flexShrink: 0,
                background: pc.bg, color: pc.main, border: `1px solid ${pc.main}30`,
              }}>
                {(priorityConfig[task.priority] || priorityConfig.medium).label}
              </span>
            </div>
            {task.description && (
              <p style={{ fontSize: 11, margin: '2px 0 0 0', lineHeight: 1.4, wordBreak: 'break-word', color: isCompleted ? colors.text.disabled : colors.text.muted }}>
                {task.description}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
            {onEdit && (
              <button onClick={stop(() => onEdit(task))} title="تعديل" style={iconBtn(colors)}>
                <Edit2 size={14} />
              </button>
            )}
            {onDelete && (
              <button onClick={stop(() => { if (window.confirm('حذف هذا العمل الإداري؟')) onDelete(task.id); })} title="حذف" style={iconBtn(colors)}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>

        {/* الصف 2: حالات سريعة + بيانات — في سطر واحد مضغوط */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, marginRight: 33, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
          {/* الحالات السريعة = مؤشر الحالة الوحيد (لا شارة مكررة) */}
          {onStatusChange ? (
            <>
              {QUICK_STATUSES.map((s) => {
                const active = statusKey === s.value;
                const c = A[statusConfig[s.value].colorKey];
                return (
                  <button key={s.value} onClick={(e) => handleQuickStatus(e, s.value)} style={{
                    padding: '2px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                    fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s ease',
                    border: `1px solid ${active ? c.main : colors.border.default}`,
                    background: active ? c.bg : 'transparent',
                    color: active ? c.main : colors.text.muted,
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    {active && <QuickIcon value={s.value} colors={colors} />}
                    {s.label}
                  </button>
                );
              })}
            </>
          ) : (
            /* داخل صفحة القضية (بلا onStatusChange): شارة الحالة العادية */
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '2px 9px', borderRadius: 20,
              fontSize: 10, fontWeight: 700, background: sc.bg, border: `1px solid ${sc.main}30`, color: sc.main,
            }}>
              <status.icon size={11} strokeWidth={2.5} />
              {status.label}
            </span>
          )}

          {isOverdue && (
            <span style={{ background: A.red.bg, color: A.red.main, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700 }}>
              متأخر — لم يُنجز
            </span>
          )}

          {task.dueDate && (
            <span style={metaChip(colors, isOverdue ? A.red.main : colors.text.muted)}>
              <Calendar size={11} color={isOverdue ? A.red.main : colors.text.muted} />
              {formatDate(task.dueDate)}
            </span>
          )}
          {task.assignedTo && (
            <span style={metaChip(colors, colors.text.muted)}>
              <User size={11} color={colors.text.muted} />
              {task.assignedTo}
            </span>
          )}
          {task.category && (
            <span style={metaChip(colors, colors.text.muted)}>
              <Tag size={11} color={colors.text.muted} />
              {task.category}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

const iconBtn = (colors) => ({
  padding: 5, borderRadius: 7, border: 'none', background: 'transparent',
  color: colors.text.muted, cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
});

const metaChip = (colors, color) => ({
  display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color,
  padding: '2px 7px', background: colors.bg.hover, borderRadius: 6,
});