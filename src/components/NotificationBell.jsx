import { useState } from "react";
import useNotifications from "../hooks/useNotifications";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { count, hasNotifications } = useNotifications();
  const [isHovered, setIsHovered] = useState(false);

  const displayCount = count > 99 ? "99+" : count;

  return (
    <Link
      to="/notifications"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        fontSize: "clamp(20px, 5vw, 24px)",
        color: hasNotifications ? "#dc2626" : "#374151",
        textDecoration: "none",
        padding: "clamp(6px, 2vw, 10px)",
        borderRadius: "50%",
        transition: "all 0.2s ease",
        background: isHovered ? "#f3f4f6" : "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "clamp(36px, 10vw, 44px)",
        height: "clamp(36px, 10vw, 44px)",
      }}
      title={hasNotifications ? `${count} إشعارات جديدة` : "الإشعارات"}
    >
      {/* الأيقونة مع تأثير اهتزاز عند وجود إشعارات */}
      <span
        style={{
          display: "inline-block",
          animation: hasNotifications ? "bellShake 2s ease-in-out infinite" : "none",
        }}
      >
        🔔
      </span>

      {/* الشارة الحمراء */}
      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "clamp(-2px, 0.5vw, -4px)",
            right: "clamp(-2px, 0.5vw, -4px)",
            background: "#dc2626",
            color: "#fff",
            borderRadius: "999px",
            minWidth: "clamp(16px, 4vw, 20px)",
            height: "clamp(16px, 4vw, 20px)",
            fontSize: "clamp(10px, 2.5vw, 12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            padding: "0 4px",
            boxShadow: "0 2px 4px rgba(220, 38, 38, 0.3)",
            border: "2px solid #fff",
          }}
        >
          {displayCount}
        </span>
      )}

      {/* نقطة صغيرة بدون رقم (للشاشات الصغيرة جداً) */}
      {count > 0 && count < 10 && (
        <span
          style={{
            position: "absolute",
            top: "2px",
            right: "2px",
            width: "8px",
            height: "8px",
            background: "#dc2626",
            borderRadius: "50%",
            display: "none", // يظهر فقط على الشاشات الصغيرة
          }}
          className="mobile-dot"
        />
      )}

      {/* تأثير الاهتزاز */}
      <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          5% { transform: rotate(8deg); }
          10% { transform: rotate(-8deg); }
          15% { transform: rotate(4deg); }
          20% { transform: rotate(-4deg); }
          25% { transform: rotate(0deg); }
        }
      `}</style>
    </Link>
  );
}