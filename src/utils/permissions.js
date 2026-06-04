export const ROLES = {
  ADMIN: "admin",
  LAWYER: "lawyer",
  CLIENT: "client",
};

export const PERMISSIONS = {
  dashboard: [ROLES.ADMIN, ROLES.LAWYER],

  cases: [ROLES.ADMIN, ROLES.LAWYER],

  addCase: [ROLES.ADMIN, ROLES.LAWYER],

  editCase: [ROLES.ADMIN, ROLES.LAWYER],

  activeCases: [ROLES.ADMIN, ROLES.LAWYER],

  archive: [ROLES.ADMIN, ROLES.LAWYER],

  caseDetails: [
    ROLES.ADMIN,
    ROLES.LAWYER,
    ROLES.CLIENT,
  ],

  addSession: [ROLES.ADMIN, ROLES.LAWYER],

  addStage: [ROLES.ADMIN, ROLES.LAWYER],

  caseFinance: [ROLES.ADMIN, ROLES.LAWYER],

  finance: [ROLES.ADMIN],

  users: [ROLES.ADMIN],
};