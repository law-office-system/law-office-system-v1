import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext.jsx";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// الصفحات العامة اللي مفيش Sidebar/Topbar فيها
const PUBLIC_PAGES = ["/", "/home", "/login", "/register", "/super-login"];

// ✅ REMOVED: CHAT_PAGES — لم نعد نحتاجه

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function Layout() {
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("sidebarOpen");
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const [isMobile, setIsMobile] = useState(false);
  const { user, userData, loading: authLoading } = useAuth();
  const location = useLocation();
  const { theme } = useTheme();
  const { colors } = theme;

  const isMobileRef = useRef(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const isPublicPage = useMemo(() => {
    return PUBLIC_PAGES.includes(location.pathname);
  }, [location.pathname]);

  // ✅ تعديل: Sidebar يظهر في كل الصفحات الداخلية (بما فيها الدردشة)
  const showSidebar = !isPublicPage && user && userData?.officeId;
  const showTopbar = !isPublicPage && user;

  useEffect(() => {
    const handleResize = debounce(() => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      isMobileRef.current = mobile;
      if (mobile && openRef.current) {
        setOpen(false);
      }
    }, 150);

    const initialMobile = window.innerWidth < 1024;
    setIsMobile(initialMobile);
    isMobileRef.current = initialMobile;
    if (initialMobile) {
      setOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("sidebarOpen", JSON.stringify(open));
    } catch (err) {
      console.warn("Failed to save sidebar state:", err);
    }
  }, [open]);

  const toggleSidebar = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    if (isMobileRef.current) {
      setOpen(false);
    }
  }, []);

  const containerStyle = useMemo(() => ({
    display: "flex",
    height: "100vh",
    background: colors.bg.page,
    overflow: "hidden",
    direction: "rtl",
  }), [colors.bg.page]);

  // ✅ تعديل: marginRight دائماً عندما يكون Sidebar ظاهر (بما فيها الدردشة)
  const contentAreaStyle = useMemo(() => ({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    transition: "margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    marginRight: showSidebar 
      ? (isMobile ? 0 : (open ? "260px" : "72px"))
      : 0,
    minWidth: 0,
  }), [showSidebar, isMobile, open]);

  const mainStyle = useMemo(() => {
    const basePadding = isMobile ? "12px" : "20px";
    return {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      paddingTop: showTopbar ? basePadding : "20px",
      paddingRight: basePadding,
      paddingBottom: basePadding,
      paddingLeft: basePadding,
      background: colors.bg.page,
    };
  }, [isMobile, showTopbar, colors.bg.page]);

  return (
    <div style={containerStyle}>
      {showSidebar && (
        <Sidebar 
          open={open} 
          setOpen={setOpen} 
          isMobile={isMobile}
          onToggle={toggleSidebar}
          onClose={closeSidebar}
        />
      )}

      <div style={contentAreaStyle}>
        {showTopbar && (
          <Topbar 
            open={open} 
            setOpen={setOpen} 
            isMobile={isMobile}
            onToggle={toggleSidebar}
          />
        )}
        <main style={mainStyle}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}