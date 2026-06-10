import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function Layout() {
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : false;
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={styles.app}>
      {/* 1. التوب بار في طبقة مستقلة في الأعلى */}
      <div style={styles.topbarContainer}>
        <Topbar open={open} setOpen={setOpen} />
      </div>

      {/* 2. منطقة القائمة والمحتوى */}
      <div style={styles.bodyContainer}>
        
        {/* الـ Sidebar */}
        <aside style={styles.sidebar(open, isMobile)}>
          <Sidebar open={open} />
        </aside>

        {/* الـ Overlay (قناع الموبايل) - يغلق القائمة بضغطة واحدة */}
        {isMobile && open && (
          <div style={styles.overlay} onClick={() => setOpen(false)} />
        )}

        {/* المحتوى الرئيسي */}
        <main style={styles.mainContent}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  app: { display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" },
  
  topbarContainer: { zIndex: 1001, background: "#fff" }, // Z-index أعلى من القائمة دائماً

  bodyContainer: { display: "flex", flex: 1, overflow: "hidden", position: "relative" },

  sidebar: (open, isMobile) => ({
    width: isMobile ? (open ? "240px" : "0px") : (open ? "240px" : "70px"),
    position: isMobile ? "absolute" : "relative",
    height: "100%",
    zIndex: 1000, // أقل من التوب بار
    transition: "all 0.3s ease",
    background: "#1f2a36",
    overflow: "hidden",
  }),

  overlay: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.3)",
    zIndex: 999, // بين القائمة والمحتوى
  },

  mainContent: { flex: 1, overflowY: "auto", padding: "20px", background: "#f5f7fb" },
};