import { useState } from "react";
import useNotifications from "../hooks/useNotifications";
import { Link } from "react-router-dom";

export default function NotificationBell() {
  const { count, hasNotifications, countsByType } = useNotifications();
  const [isHovered, setIsHovered] = useState(false);

  const displayCount = count > 99 ? "99+" : count;

  // ✅ تحديد الأيقونة حسب أولوية النوع
  const getBellIcon = () => {
    if (!hasNotifications) return "🔔";
    if (countsByType?.late > 0) return "🔴"; // أولوية أعلى
    if (countsByType?.admin_task > 0) return "🟠";
    if (countsByType?.judgment > 0) return "🟣";
    return "🔔";
  };

  // ✅ بناء الـ tooltip
  const getTooltip = () => {
    if (!hasNotifications) return "لا توجد إشعارات";

    const parts = [];
    if (countsByType?.late > 0) parts.push(`${countsByType.late} جلسة متأخرة`);
    if (countsByType?.admin_task > 0) parts.push(`${countsByType.admin_task} عمل إداري متأخر`);
    if (countsByType?.judgment > 0) parts.push(`${countsByType.judgment} حكم يحتاج متابعة`);

    return parts.join(" • ") || `${count} إشعارات`;
  };

  // ✅ تحديد لون العداد
  const getBadgeColor = () => {
    if (!hasNotifications) return "#9ca3af";
    if (countsByType?.late > 0) return "#dc2626";
    if (countsByType?.admin_task > 0) return "#f97316";
    if (countsByType?.judgment > 0) return "#a855f7";
    return "#dc2626";
  };

  return (
    <Link
      to="/notifications"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: "relative",
        fontSize: "clamp(20px, 5vw, 24px)",
        color: hasNotifications ? getBadgeColor() : "#374151",
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
      title={getTooltip()}
    >
      <span
        style={{
          display: "inline-block",
          animation: hasNotifications ? "bellShake 2s ease-in-out infinite" : "none",
        }}
      >
        {getBellIcon()}
      </span>

      {count > 0 && (
        <span
          style={{
            position: "absolute",
            top: "clamp(-2px, 0.5vw, -4px)",
            right: "clamp(-2px, 0.5vw, -4px)",
            background: getBadgeColor(),
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
            boxShadow: `0 2px 4px ${getBadgeColor()}40`,
            border: "2px solid #fff",
          }}
        >
          {displayCount}
        </span>
      )}

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