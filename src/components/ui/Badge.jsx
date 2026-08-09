import React from 'react';
import { badge, createBadge, colors } from '../../styles/design-system';

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
  // If status prop is provided, use status badge
  if (status) {
    const statusStyle = createBadge(status);
    return (
      <span 
        className={`inline-flex items-center gap-1 ${className}`}
        style={{ ...statusStyle, ...style }}
      >
        {STATUS_MAP[status] || status}
      </span>
    );
  }

  // Custom badge
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