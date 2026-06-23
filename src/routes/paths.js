export const PATHS = {
  PUBLIC: {
    HOME: "/",
    LOGIN: "/login",
    REGISTER: "/register",
  },

  APP: {
    ROOT: "/app",

    USERS: "/app/users",

    CLIENTS: {
      ROOT: "/app/clients",
      ADD: "/app/clients/add",
      DETAILS: (id) => `/app/clients/${id}`,
      EDIT: (id) => `/app/clients/${id}/edit`,
    },

    CASES: {
      ROOT: "/app/cases",
      ADD: "/app/cases/add",
      ACTIVE: "/app/cases/active",
      JUDGMENTS: "/app/cases/judgments",
      DETAILS: (id) => `/app/cases/${id}`,
      EDIT: (id) => `/app/cases/${id}/edit`,
    },

    FINANCE: "/app/finance",

    CHAT: "/app/chat",
    PROFILE: "/app/profile",

    NOTIFICATIONS: "/app/notifications",
  },
};