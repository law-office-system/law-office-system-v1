export const ROLES = {
  ADMIN: "admin",
  LAWYER: "lawyer",
  CLIENT: "client",
};

export const PERMISSIONS = {
  dashboard: [ROLES.ADMIN, ROLES.LAWYER],
  users: [ROLES.ADMIN],
  cases: [ROLES.ADMIN, ROLES.LAWYER],
  addCase: [ROLES.ADMIN, ROLES.LAWYER],
  editCase: [ROLES.ADMIN, ROLES.LAWYER],
  activeCases: [ROLES.ADMIN, ROLES.LAWYER],
  archive: [ROLES.ADMIN, ROLES.LAWYER],
  caseDetails: [ROLES.ADMIN, ROLES.LAWYER, ROLES.CLIENT],
  addSession: [ROLES.ADMIN, ROLES.LAWYER],
  addStage: [ROLES.ADMIN, ROLES.LAWYER],
  caseFinance: [ROLES.ADMIN, ROLES.LAWYER],
  finance: [ROLES.ADMIN],
  profile: [ROLES.ADMIN, ROLES.LAWYER, ROLES.CLIENT],
  chat: [ROLES.ADMIN, ROLES.LAWYER, ROLES.CLIENT],
  officeRooms: [ROLES.ADMIN, ROLES.LAWYER],
  documents: [ROLES.ADMIN, ROLES.LAWYER],
};

export function canAccess(pageKey, userRole) {
  if (!userRole || !pageKey) return false;

  const role = userRole.trim();

  if (role === "super_admin") return true;

  const allowed = PERMISSIONS?.[pageKey];

  if (!Array.isArray(allowed)) {
    console.warn(`Missing permissions for: ${pageKey}`);
    return false;
  }

  return allowed.includes(role);
}