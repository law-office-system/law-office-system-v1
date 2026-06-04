// roles.js (FINAL FIX)

export function hasPermission(userRole, allowedRoles) {
  if (!userRole) return false;

  const cleanRole = String(userRole).trim();

  return allowedRoles.includes(cleanRole);
}