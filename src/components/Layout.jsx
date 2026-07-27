import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

// الصفحات العامة اللي مفيش Sidebar/Topbar فيها
const PUBLIC_PAGES = ["/", "/home", "/login", "/register", "/super-login"];

// ✅ صفحات الدردشة اللي مفيش Sidebar عام فيها (عشان ChatSidebar يتحكم لوحده)
const CHAT_PAGES = ["/chat", "/rooms", "/shared-rooms"];

// ✅ Debounce function
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
  // ✅ استخدم useRef عشان مايتعملش reset لما الـ route يتغير
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

  // ✅ Ref للتحكم في الـ resize (مش بيعتمد على open)
  const isMobileRef = useRef(false);
  const openRef = useRef(open);

  // ✅ تحديث الـ ref لما open يتغير
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // 🎯 تحقق هل الصفحة الحالية عامة؟
  const isPublicPage = useMemo(() => {
    return PUBLIC_PAGES.includes(location.pathname);
  }, [location.pathname]);

  // ✅ تحقق هل الصفحة الحالية صفحة دردشة؟
  const isChatPage = useMemo(() => {
    return CHAT_PAGES.some(path => location.pathname.startsWith(path));
  }, [location.pathname]);

  // 🎯 Sidebar يظهر فقط لو:
  const showSidebar = !isPublicPage && !isChatPage && user && userData?.officeId;
  const showTopbar = !isPublicPage && user;

  // ✅ Resize handler (مش بيعتمد على open)
  useEffect(() => {
    const handleResize = debounce(() => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      isMobileRef.current = mobile;

      // ✅ لو بقى موبايل، اقفل القائمة (بس لما الـ resize يحصل، مش لما الـ open يتغير)
      if (mobile && openRef.current) {
        setOpen(false);
      }
    }, 150);

    // Check initial
    const initialMobile = window.innerWidth < 1024;
    setIsMobile(initialMobile);
    isMobileRef.current = initialMobile;
    if (initialMobile) {
      setOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // ✅ مفيش dependencies!

  // ✅ Save sidebar state
  useEffect(() => {
    try {
      localStorage.setItem("sidebarOpen", JSON.stringify(open));
    } catch (err) {
      console.warn("Failed to save sidebar state:", err);
    }
  }, [open]);

  // ✅ Toggle function (مش بيعتمد على الـ state القديم)
  const toggleSidebar = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  // ✅ Close function للموبايل
  const closeSidebar = useCallback(() => {
    if (isMobileRef.current) {
      setOpen(false);
    }
  }, []);

  // ✅ Memoized styles
  const containerStyle = useMemo(() => ({
    display: "flex",
    height: "100vh",
    background: "#0f172a",
    overflow: "hidden",
    direction: "rtl",
  }), []);

  const contentAreaStyle = useMemo(() => ({
    display: "flex",
    flexDirection: "column",
    flex: 1,
    transition: "margin 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
    marginRight: isChatPage 
      ? 0 
      : (showSidebar 
          ? (isMobile ? 0 : (open ? "260px" : "72px"))
          : 0),
    minWidth: 0,
  }), [isChatPage, showSidebar, isMobile, open]);

  // ✅ إصلاح conflict بين padding و paddingTop
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
      background: "#0f172a",
    };
  }, [isMobile, showTopbar]);

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