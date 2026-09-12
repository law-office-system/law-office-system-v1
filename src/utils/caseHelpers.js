// ============================================================
// دوال مساعدة مشتركة لصفحات القضايا (تواريخ + أدوار)
// ============================================================

export const ADMIN_ROLES = ["admin", "superadmin"];
export const isAdminRole = (role) => ADMIN_ROLES.includes(role);

export const normalizeDate = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'object' && dateValue?.toDate) {
    return dateValue.toDate();
  }
  if (dateValue instanceof Date) return dateValue;
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const formatDate = (dateValue) => {
  const date = normalizeDate(dateValue);
  return date ? date.toLocaleDateString('ar-EG') : '-';
};

export const sortSessionsByDate = (sessions) => {
  return [...sessions].sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    return dateB - dateA;
  });
};

export const validateTenant = (caseTenantId, userTenantId) => {
  if (!caseTenantId) return true;
  if (caseTenantId !== userTenantId) {
    throw new Error("Unauthorized: Tenant mismatch. Access denied.");
  }
  return true;
};
