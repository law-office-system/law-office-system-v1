import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// الصفحات العامة اللي مفيش Sidebar/Topbar فيها
const PUBLIC_PAGES = ["/", "/home", "/login", "/register", "/super-login"];

export default function Layout() {
  const [open, setOpen] = useState(() => {
    const saved = localStorage.getItem("sidebarOpen");
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [isMobile, setIsMobile] = useState(false);
  const { user, userData } = useAuth();
  const location = useLocation();

  // 🎯 تحقق هل الصفحة الحالية عامة؟
  const isPublicPage = useMemo(() => {
    return PUBLIC_PAGES.includes(location.pathname);
  }, [location.pathname]);

  // 🎯 Sidebar يظهر فقط لو:
  // 1. مش صفحة عامة
  // 2. المستخدم مسجل دخول
  // 3. عنده officeId
  const showSidebar = !isPublicPage && user && userData?.officeId;
  const showTopbar = !isPublicPage && user;

  useEffect(() => {
    localStorage.setItem("sidebarOpen", JSON.stringify(open));
  }, [open]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile && open) setOpen(false);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={styles.container}>
      {/* Sidebar يظهر فقط للمستخدمين المسجلين داخل مكتب */}
      {showSidebar && (
        <Sidebar open={open} setOpen={setOpen} isMobile={isMobile} />
      )}

      <div style={styles.contentArea(showSidebar, isMobile, open)}>
        {/* Topbar يظهر فقط للمستخدمين المسجلين */}
        {showTopbar && (
          <Topbar open={open} setOpen={setOpen} isMobile={isMobile} />
        )}
        <main style={styles.main(isMobile, showTopbar)}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    overflow: "hidden",
    direction: "rtl",
  },
  contentArea: (showSidebar, isMobile, open) => ({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    transition: "margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    marginRight: showSidebar 
      ? (isMobile ? 0 : (open ? "260px" : "72px"))
      : 0,
    minWidth: 0,
  }),
  main: (isMobile, showTopbar) => ({
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    padding: isMobile ? "12px" : "20px",
    background: "#0f172a",
    // لو مفيش Topbar، نضيف padding-top عشان المحتوى مايلزقش فوق
    paddingTop: showTopbar ? undefined : "20px",
  }),
};