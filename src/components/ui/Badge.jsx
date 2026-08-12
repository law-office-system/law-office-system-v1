import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

const STATUS_MAP = {
  scheduled:  'مجدولة',
  completed:  'منعقدة',
  postponed:  'مؤجلة',
  cancelled:  'ملغاة',
  'in-progress': 'جارية',
  pending:    'معلقة',
};

export default function Badge({ 
  status, 
  children, 
  className = '',
  style = {},
  variant = 'default',
}) {
  const { theme } = useTheme();
  const { badge, colors } = theme;

  if (status) {
    const s = colors.status[status] || colors.status.pending;
    const statusStyle = { ...badge, background: s.bg, color: s.text, border: `1px solid ${s.border}` };
    return (
      <span 
        className={`inline-flex items-center gap-1 ${className}`}
        style={{ ...statusStyle, ...style }}
      >
        {STATUS_MAP[status] || status}
      </span>
    );
  }

  const variants = {
    default: { background: colors.accent.blue.bg, color: colors.accent.blue.light, border: `1px solid ${colors.accent.blue.light}30` },
    success: { background: colors.accent.green.bg, color: colors.accent.green.light, border: `1px solid ${colors.accent.green.light}30` },
    warning: { background: colors.accent.amber.bg, color: colors.accent.amber.light, border: `1px solid ${colors.accent.amber.light}30` },
    danger:  { background: colors.accent.red.bg, color: colors.accent.red.light, border: `1px solid ${colors.accent.red.light}30` },
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 ${className}`}
      style={{ ...badge, ...variants[variant], ...style }}
    >
      {children}
    </span>
  );
}