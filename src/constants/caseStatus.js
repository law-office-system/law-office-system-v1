export const CASE_STATUS = {
  ACTIVE: 'active',
  PENDING: 'pending',
  CLOSED: 'closed',
  APPEALED: 'appealed',
  ARCHIVED: 'archived',
  CANCELLED: 'cancelled',
  EXECUTION: 'execution',
};

export const CASE_STATUS_LIST = [
  { value: 'active', label: 'نشطة', color: '#059669' },
  { value: 'pending', label: 'معلقة', color: '#d97706' },
  { value: 'closed', label: 'مغلقة', color: '#6b7280' },
  { value: 'appealed', label: 'مستأنفة', color: '#7c3aed' },
  { value: 'archived', label: 'مؤرشفة', color: '#374151' },
  { value: 'cancelled', label: 'ملغاة', color: '#dc2626' },
  { value: 'execution', label: 'تنفيذ', color: '#f59e0b' },
];

export default CASE_STATUS;