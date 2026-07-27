import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, Briefcase, Users, Calendar, 
  Gavel, ClipboardList, MessageSquare, Bell, 
  LogOut, DollarSign, Archive, Building2,
  X, Scale, ChevronRight,
  Crown, User
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useNotifications from "../hooks/useNotifications";


// ===== navItems will be defined inside the component =====

// ===== Color Palette - Luxury Law Firm =====
const COLORS = {
  bg: "#0a0e1a",
  bgHover: "#111827",
  border: "rgba(212, 175, 55, 0.15)",
  gold: "#d4af37",
  goldLight: "#f0d878",
  goldDark: "#b8941f",
  goldBg: "rgba(212, 175, 55, 0.08)",
  text: "#e5e7eb",
  textMuted: "#6b7280",
  activeBg: "linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))",
  activeBorder: "#d4af37",
  iconBg: "rgba(212, 175, 55, 0.1)",
  iconBgActive: "rgba(212, 175, 55, 0.2)",
};

// الصفحات العامة اللي مفيش Sidebar فيها
const PUBLIC_PAGES = ["/", "/home", "/login", "/register", "/super-login"];

export default function Sidebar({ open, setOpen, isMobile }) {
  const { user, userData, logout } = useAuth();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  // 🏛️ Multi-Tenant: Centralized hooks for accurate per-user, per-office counts
  const { count: unreadNotifications } = useNotifications();

  // 🆕 Multi-Tenant: Chat unread count (per-office isolation)
  const [unreadChats, setUnreadChats] = useState(0);

  // 🆕 Listen for shared rooms and count unread messages (multi-tenant scoped)
  useEffect(() => {
    if (!userData?.uid || !userData?.officeId) {
      setUnreadChats(0);
      return;
    }

    let unsubscribes = [];
    let counts = {};
    let isActive = true;

    const loadFirebase = async () => {
      const { db } = await import("../firebase");
      const { collection, query, where, onSnapshot, getDocs } = await import("firebase/firestore");

      // Get shared rooms for this office (multi-tenant isolation)
      const qA = query(
        collection(db, "sharedRooms"),
        where("officeA", "==", userData.officeId)
      );
      const qB = query(
        collection(db, "sharedRooms"),
        where("officeB", "==", userData.officeId)
      );

      const [snapA, snapB] = await Promise.all([getDocs(qA), getDocs(qB)]);
      const roomIds = [...new Set([
        ...snapA.docs.map(d => d.id),
        ...snapB.docs.map(d => d.id)
      ])];

      if (roomIds.length === 0) {
        if (isActive) setUnreadChats(0);
        return;
      }

      // Listen for unread messages in each room
      roomIds.forEach((roomId) => {
        const q = query(
          collection(db, "sharedMessages"),
          where("roomId", "==", roomId),
          where("senderId", "!=", userData.uid)
        );

        const unsub = onSnapshot(q, (snap) => {
          let roomUnread = 0;
          snap.docs.forEach((docSnap) => {
            const msg = docSnap.data();
            // Multi-tenant: only count if not seen by current user
            if (!msg.seenBy?.includes(userData.uid)) {
              roomUnread++;
            }
          });
          counts[roomId] = roomUnread;

          // Recalculate total
          const totalUnread = Object.values(counts).reduce((sum, count) => sum + count, 0);
          if (isActive) setUnreadChats(totalUnread);
        }, (err) => console.error("Messages listener error:", err));

        unsubscribes.push(unsub);
      });
    };

    loadFirebase();

    return () => {
      isActive = false;
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userData?.uid, userData?.officeId]);

  // 🚨 لا تظهر Sidebar على الصفحات العامة
  if (PUBLIC_PAGES.includes(location.pathname)) {
    return null;
  }

  // 🚨 لا تظهر Sidebar لو مفيش user أو مفيش officeId
  if (!user || !userData?.officeId) {
    return null;
  }

  // 🆕 Dynamic nav items with real badge counts
  const navItems = [
    { path: "/dashboard", label: "الرئيسية", icon: LayoutDashboard },
    { 
      path: "/notifications", 
      label: "الإشعارات", 
      icon: Bell, 
      badge: unreadNotifications > 0 ? unreadNotifications : null 
    },
    { path: "/cases", label: "جميع القضايا", icon: Scale },
    { path: "/cases/active", label: "القضايا النشطة", icon: Briefcase },
    { path: "/archive", label: "الأرشيف", icon: Archive },
    { path: "/judgments", label: "الأحكام", icon: Gavel },
    { path: "/admin-tasks", label: "الأعمال الإدارية", icon: ClipboardList },
    { path: "/clients", label: "العملاء", icon: Users },
    { path: "/finance", label: "المالية", icon: DollarSign },
    { 
      path: "/chat", 
      label: "المحادثات", 
      icon: MessageSquare, 
      badge: unreadChats > 0 ? unreadChats : null 
    },
    { path: "/office-connections", label: "التواصل", icon: Building2 },
  ];

  // ✅ عرض Sidebar: موبايل 280px، مفتوح 260px، مطوي 85px
  const sidebarWidth = isMobile ? 280 : (open ? 260 : 85);

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && open && (
        <div 
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)",
            zIndex: 40,
            transition: "opacity 0.3s",
          }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside style={{
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: `${sidebarWidth}px`,
        background: COLORS.bg,
        borderLeft: `1px solid ${COLORS.border}`,
        zIndex: 50,
        transition: "all 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        flexDirection: "column",
        boxShadow: isMobile && open 
          ? "-8px 0 40px rgba(0,0,0,0.5)" 
          : open 
            ? "-4px 0 24px rgba(0,0,0,0.3)" 
            : "none",
        transform: isMobile ? (open ? "translateX(0)" : "translateX(100%)") : "translateX(0)",
        overflow: "hidden",
      }}>

        {/* ===== HEADER - LOGO ONLY ===== */}
        <div style={{
          padding: open || isMobile ? "16px" : "12px 8px",
          borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          {(open || isMobile) ? (
            /* مفتوح - Logo كامل */
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}>
              <div style={{
                fontSize: "22px",
              }}>
                ⚖️
              </div>
              <div style={{
                fontWeight: 700,
                fontSize: "18px",
                color: COLORS.gold,
                letterSpacing: "0.5px",
              }}>
                Law Office
              </div>
            </div>
          ) : (
            /* مطوي - Logo صغير */
            <div style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
            }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: "10px",
                background: "linear-gradient(135deg, #d4af37, #b8941f)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}>
                ⚖️
              </div>
            </div>
          )}

          {/* Close button for mobile */}
          {isMobile && (
            <button
              onClick={() => setOpen(false)}
              style={{
                position: "absolute",
                left: "16px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "8px",
                color: COLORS.textMuted,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = COLORS.gold}
              onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* ===== NAVIGATION ===== */}
        <nav style={{
          flex: 1,
          padding: open || isMobile ? "16px 10px" : "16px 8px",
          overflowY: "auto",
          overflowX: "hidden",
          position: "relative",
        }}>
          {/* Section Label */}
          {(open || isMobile) && (
            <div style={{
              padding: "0 10px 12px",
              fontSize: "10px",
              fontWeight: 700,
              color: COLORS.textMuted,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}>
              القائمة الرئيسية
            </div>
          )}

          {navItems.map((item) => {
            const active = isActive(item.path);
            const hovered = hoveredItem === item.path;
            const showTooltip = !open && !isMobile && hovered;

            return (
              <div 
                key={item.path}
                style={{ position: "relative" }}
                onMouseEnter={() => {
                  setHoveredItem(item.path);
                  setTooltip(item.label);
                }}
                onMouseLeave={() => {
                  setHoveredItem(null);
                  setTooltip(null);
                }}
              >
                <NavLink
                  to={item.path}
                  onClick={() => isMobile && setOpen(false)}
                  style={{
                    textDecoration: "none",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: open || isMobile ? "flex-start" : "center",
                    gap: open || isMobile ? "12px" : "0",
                    padding: open || isMobile ? "11px 14px" : "12px",
                    borderRadius: "14px",
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                    background: active 
                      ? COLORS.activeBg 
                      : hovered 
                        ? COLORS.bgHover 
                        : "transparent",
                    borderRight: active 
                      ? `3px solid ${COLORS.activeBorder}` 
                      : "3px solid transparent",
                    position: "relative",
                    overflow: "hidden",
                  }}>
                    {/* Gold glow effect for active */}
                    {active && (
                      <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(90deg, rgba(212, 175, 55, 0.05), transparent)",
                        pointerEvents: "none",
                      }} />
                    )}

                    {/* Icon */}
                    <div style={{
                      width: open || isMobile ? 36 : 32,
                      height: open || isMobile ? 36 : 32,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      background: active 
                        ? COLORS.iconBgActive 
                        : hovered 
                          ? COLORS.iconBg 
                          : "rgba(255,255,255,0.03)",
                      transition: "all 0.25s ease",
                      border: active 
                        ? `1px solid rgba(212, 175, 55, 0.3)` 
                        : "1px solid transparent",
                    }}>
                      <item.icon 
                        size={open || isMobile ? 18 : 16} 
                        color={active ? COLORS.gold : hovered ? COLORS.goldLight : COLORS.textMuted} 
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </div>

                    {/* Label */}
                    {(open || isMobile) && (
                      <div style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        minWidth: 0,
                      }}>
                        <span style={{
                          fontSize: "14px",
                          fontWeight: active ? 700 : 600,
                          color: active ? COLORS.gold : hovered ? COLORS.text : COLORS.textMuted,
                          transition: "all 0.25s ease",
                          whiteSpace: "nowrap",
                          letterSpacing: "0.2px",
                        }}>
                          {item.label}
                        </span>

                        {/* Badge */}
                        {item.badge && (
                          <span style={{
                            minWidth: "22px",
                            height: "22px",
                            padding: "0 7px",
                            background: active 
                              ? "linear-gradient(135deg, #d4af37, #b8941f)" 
                              : "linear-gradient(135deg, #ef4444, #dc2626)",
                            color: active ? "#0a0e1a" : "white",
                            fontSize: "11px",
                            fontWeight: "bold",
                            borderRadius: "11px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            boxShadow: active 
                              ? "0 2px 8px rgba(212, 175, 55, 0.3)" 
                              : "0 2px 8px rgba(239, 68, 68, 0.3)",
                          }}>
                            {item.badge}
                          </span>
                        )}

                        {/* Active indicator arrow */}
                        {active && (
                          <ChevronRight 
                            size={14} 
                            color={COLORS.gold} 
                            style={{ 
                              marginRight: "4px",
                              opacity: 0.6,
                            }} 
                          />
                        )}
                      </div>
                    )}
                  </div>
                </NavLink>

                {/* Tooltip for collapsed sidebar */}
                {showTooltip && (
                  <div style={{
                    position: "absolute",
                    left: "100%",
                    top: "50%",
                    transform: "translateY(-50%)",
                    marginLeft: "12px",
                    padding: "8px 14px",
                    background: "#1e293b",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    zIndex: 100,
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    pointerEvents: "none",
                  }}>
                    {item.label}
                    {/* Arrow */}
                    <div style={{
                      position: "absolute",
                      right: "100%",
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 0,
                      height: 0,
                      borderTop: "6px solid transparent",
                      borderBottom: "6px solid transparent",
                      borderLeft: "6px solid #1e293b",
                    }} />
                  </div>
                )}
              </div>
            );
          })}

          {/* ===== DIVIDER قبل تسجيل الخروج ===== */}
          <div style={{
            height: "1px",
            background: COLORS.border,
            margin: "12px 10px",
          }} />

          {/* ===== تسجيل الخروج - آخر عنصر ===== */}
          <div 
            style={{ position: "relative" }}
            onMouseEnter={() => {
              setHoveredItem("logout");
              setTooltip("تسجيل الخروج");
            }}
            onMouseLeave={() => {
              setHoveredItem(null);
              setTooltip(null);
            }}
          >
            <button
              onClick={logout}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: open || isMobile ? "flex-start" : "center",
                gap: open || isMobile ? "12px" : "0",
                padding: open || isMobile ? "11px 14px" : "12px",
                borderRadius: "14px",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.25s ease",
                fontFamily: "inherit",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Icon */}
              <div style={{
                width: open || isMobile ? 36 : 32,
                height: open || isMobile ? 36 : 32,
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                background: hoveredItem === "logout" 
                  ? "rgba(239, 68, 68, 0.15)" 
                  : "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.15)",
                transition: "all 0.25s ease",
              }}>
                <LogOut 
                  size={open || isMobile ? 18 : 16} 
                  color="#f87171" 
                />
              </div>

              {/* Label */}
              {(open || isMobile) && (
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#f87171",
                  transition: "all 0.25s ease",
                  whiteSpace: "nowrap",
                }}>
                  تسجيل الخروج
                </span>
              )}
            </button>

            {/* Tooltip for logout */}
            {!open && !isMobile && hoveredItem === "logout" && (
              <div style={{
                position: "absolute",
                left: "100%",
                top: "50%",
                transform: "translateY(-50%)",
                marginLeft: "12px",
                padding: "8px 14px",
                background: "#1e293b",
                color: "#f87171",
                borderRadius: "8px",
                fontSize: "13px",
                fontWeight: 600,
                whiteSpace: "nowrap",
                zIndex: 100,
                border: "1px solid rgba(239, 68, 68, 0.2)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                pointerEvents: "none",
              }}>
                تسجيل الخروج
                <div style={{
                  position: "absolute",
                  right: "100%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 0,
                  height: 0,
                  borderTop: "6px solid transparent",
                  borderBottom: "6px solid transparent",
                  borderLeft: "6px solid #1e293b",
                }} />
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}