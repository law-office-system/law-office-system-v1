import { useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [open, setOpen] = useState(true);

  return (
    <div style={styles.app}>

      {/* SIDEBAR */}
      <aside style={styles.sidebar(open)}>
        <Sidebar open={open} />
      </aside>

      {/* MAIN AREA */}
      <div style={styles.main}>

        <Topbar open={open} setOpen={setOpen} />

        <div style={styles.content}>
          <Outlet />
        </div>

      </div>

    </div>
  );
}

/* =========================
   STYLES (FIXED LAYOUT CORE)
========================= */

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    width: "100%",

    background: "#f5f7fb",

    /* مهم جدًا */
    overflow: "hidden",
  },

  sidebar: (open) => ({
    width: open ? 240 : 70,
    flexShrink: 0,

    height: "100vh",
    background: "#1f2a36",

    transition: "width 0.3s ease",
    overflow: "hidden",
  }),

  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",

    minWidth: 0, /* 🔥 أهم سطر لمنع التداخل */
    height: "100vh",
  },

  content: {
    flex: 1,
    padding: "16px",

    overflowY: "auto",
    minWidth: 0,

    background: "#f5f7fb",
  },
};