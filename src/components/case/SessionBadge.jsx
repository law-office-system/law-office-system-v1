import React from 'react';
import { Badge } from '../ui';

const statusColors = {
  scheduled: 'bg-blue-900 text-blue-200 border-blue-700',
  completed: 'bg-green-900 text-green-200 border-green-700',
  postponed: 'bg-yellow-900 text-yellow-200 border-yellow-700',
  cancelled: 'bg-red-900 text-red-200 border-red-700',
  'in-progress': 'bg-purple-900 text-purple-200 border-purple-700',
};

const statusLabels = {
  scheduled: 'مجدولة',
  completed: 'منعقدة',
  postponed: 'مؤجلة',
  cancelled: 'ملغاة',
  'in-progress': 'جارية',
};

export default function SessionBadge({ status, className = '' }) {
  return (
    <Badge
      className={`${statusColors[status] || statusColors.scheduled} border ${className}`}
    >
      {statusLabels[status] || status}
    </Badge>
  );
}
