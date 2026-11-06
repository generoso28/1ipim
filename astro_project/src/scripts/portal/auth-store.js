const e = {
    TOKEN: "1ipim_auth_token",
    EMAIL: "1ipim_user_email",
    NICENAME: "1ipim_user_nicename",
    DISPLAY_NAME: "1ipim_user_display_name",
    ROLE: "1ipim_user_role",
    ID: "1ipim_user_id",
    MINISTRIES: "1ipim_user_ministries_approved",
  },
  i = {
    getToken: () =>
      typeof window < "u" ? localStorage.getItem(e.TOKEN) : null,
    getUser: () =>
      typeof window > "u"
        ? null
        : {
            email: localStorage.getItem(e.EMAIL),
            nicename: localStorage.getItem(e.NICENAME),
            displayName: localStorage.getItem(e.DISPLAY_NAME),
            role: localStorage.getItem(e.ROLE),
            id: localStorage.getItem(e.ID),
            ministries: JSON.parse(localStorage.getItem(e.MINISTRIES) || "[]"),
          },
    clear: () => {
      typeof window > "u" ||
        Object.values(e).forEach((t) => localStorage.removeItem(t));
    },
    isLoggedIn: () =>
      typeof window > "u" ? !1 : !!localStorage.getItem(e.TOKEN),
  };
export { e as A, i as a };
