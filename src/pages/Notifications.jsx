import { useState } from "react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";

// ================= مكون شارة نوع الإشعار =================
function TypeBadge({ type }) {
  const styles = {
    late: { bg: "#fef2f2", color: "#991b1b", border: "#fecaca", icon: "🔴", label: "متأخرة" },
    today: { bg: "#fffbeb", color: "#92400e", border: "#fcd34d", icon: "🟡", label: "اليوم" },
    soon: { bg: "#eff6ff", color: "#1e40af", border: "#bfdbfe", icon: "🔜", label: "قريباً" },
    new: { bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", icon: "✨", label: "جديد" },
    default: { bg: "#f9fafb", color: "#374151", border: "#e5e7eb", icon: "📌", label: "عام" },
  };

  const style = styles[type] || styles.default;

  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: "clamp(11px, 2.5vw, 13px)",
        fontWeight: "700",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {style.icon} {style.label}
    </span>
  );
}

// ================= مكون وقت الإشعار =================
function TimeAgo({ timestamp }) {
  const date = timestamp?.toDate?.() || new Date(timestamp);
  if (!date || isNaN(date)) return null;

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let result, color;
  if (diffMins < 1) { result = "الآن"; color = "#059669"; }
  else if (diffMins < 60) { result = `منذ ${diffMins} دقيقة`; color = "#059669"; }
  else if (diffHours < 24) { result = `منذ ${diffHours} ساعة`; color = "#059669"; }
  else if (diffDays < 7) { result = `منذ ${diffDays} يوم`; color = "#d97706"; }
  else { result = date.toLocaleDateString("ar-EG"); color = "#9ca3af"; }

  return (
    <span style={{ fontSize: "clamp(11px, 2.5vw, 12px)", color, fontWeight: 500 }}>
      🕐 {result}
    </span>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const { notifications, count, hasNotifications } = useNotifications();

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), { isRead: true });
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) => updateDoc(doc(db, "notifications", n.id), { isRead: true }))
    );
  };

  const deleteNotification = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("هل تريد حذف هذا الإشعار؟")) return;
    await deleteDoc(doc(db, "notifications", id));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.isRead;
    if (filter === "late") return n.type === "late";
    if (filter === "today") return n.type === "today";
    if (filter === "soon") return n.type === "soon";
    return true;
  });

  const filterButtons = [
    { key: "all", label: "الكل", count: notifications.length },
    { key: "unread", label: "غير مقروء", count },
    { key: "late", label: "متأخرة", count: notifications.filter((n) => n.type === "late").length },
    { key: "today", label: "اليوم", count: notifications.filter((n) => n.type === "today").length },
    { key: "soon", label: "قريباً", count: notifications.filter((n) => n.type === "soon").length },
  ];

  return (
    <div
      style={{
        padding: "clamp(10px, 3vw, 20px)",
        direction: "rtl",
        background: "#f0f4f8",
        minHeight: "100vh",
        fontFamily: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
      }}
    >
      {/* الهيدر المحسن */}
      <Card style={{ marginBottom: 16, borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: "clamp(40px, 10vw, 48px)",
                height: "clamp(40px, 10vw, 48px)",
                background: "#1e3a8a",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "clamp(18px, 5vw, 22px)",
              }}
            >
              🔔
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(18px, 5vw, 24px)",
                  color: "#1e293b",
                  fontWeight: 700,
                }}
              >
                الإشعارات
              </h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "clamp(12px, 3vw, 14px)" }}>
                {hasNotifications ? `${count} إشعارات غير مقروءة` : "لا توجد إشعارات جديدة"}
              </p>
            </div>
          </div>

          {hasNotifications && (
            <Button
              size="small"
              variant="secondary"
              onClick={markAllAsRead}
              style={{
                fontSize: "clamp(12px, 3vw, 14px)",
                borderRadius: 10,
                padding: "8px 16px",
              }}
            >
              ✓ تعليم الكل كمقروء
            </Button>
          )}
        </div>
      </Card>

      {/* أزرار الفلتر المحسنة */}
      <div
        style={{
          display: "flex",
          gap: "clamp(6px, 1.5vw, 10px)",
          flexWrap: "wrap",
          marginBottom: 20,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              padding: "clamp(8px, 2.5vw, 12px) clamp(14px, 3vw, 20px)",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              fontSize: "clamp(13px, 3vw, 15px)",
              fontWeight: 600,
              background: filter === btn.key ? "#1e3a8a" : "#fff",
              color: filter === btn.key ? "#fff" : "#475569",
              boxShadow: filter === btn.key
                ? "0 4px 12px rgba(30, 58, 138, 0.25)"
                : "0 1px 3px rgba(0,0,0,0.08)",
              transition: "all 0.25s ease",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {btn.label}
            {btn.count > 0 && (
              <span
                style={{
                  background: filter === btn.key ? "rgba(255,255,255,0.2)" : "#f3f4f6",
                  color: filter === btn.key ? "#fff" : "#6b7280",
                  padding: "2px 8px",
                  borderRadius: 10,
                  fontSize: "clamp(11px, 2.5vw, 12px)",
                  fontWeight: 700,
                }}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* قائمة الإشعارات المحسنة */}
      {filteredNotifications.length === 0 ? (
        <Card
          style={{
            textAlign: "center",
            padding: "clamp(40px, 12vw, 80px) 20px",
            borderRadius: 16,
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "clamp(80px, 20vw, 120px)",
              height: "clamp(80px, 20vw, 120px)",
              background: "#f3f4f6",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
              fontSize: "clamp(32px, 8vw, 48px)",
            }}
          >
            🔕
          </div>
          <div
            style={{
              fontSize: "clamp(16px, 4vw, 20px)",
              color: "#374151",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            لا توجد إشعارات
          </div>
          <div style={{ fontSize: "clamp(13px, 3.5vw, 15px)", color: "#9ca3af" }}>
            {filter !== "all" ? "جرب تصنيفاً آخر" : "ستظهر الإشعارات الجديدة هنا"}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 2.5vw, 14px)" }}>
          {filteredNotifications.map((n) => (
            <Link
              key={n.id}
              to={`/case/${n.caseId}`}
              onClick={() => markAsRead(n.id)}
              style={{
                display: "block",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <Card
                style={{
                  padding: 0,
                  background: n.isRead ? "#fff" : "#fffbeb",
                  borderRadius: 14,
                  boxShadow: n.isRead
                    ? "0 2px 8px rgba(0,0,0,0.06)"
                    : "0 4px 12px rgba(251, 191, 36, 0.15)",
                  border: n.isRead ? "1px solid #e5e7eb" : "1px solid #fcd34d",
                  transition: "all 0.3s ease",
                  overflow: "hidden",
                }}
              >
                {/* شريط جانبي ملون */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "stretch",
                  }}
                >
                  <div
                    style={{
                      width: "clamp(4px, 1vw, 6px)",
                      background: n.type === "late" ? "#dc2626" : n.type === "today" ? "#d97706" : "#2563eb",
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1, padding: "clamp(14px, 3.5vw, 18px)", minWidth: 0 }}>
                    {/* الصف العلوي: الشارة + الوقت + حالة القراءة */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <TypeBadge type={n.type} />
                        {!n.isRead && (
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              background: "#dc2626",
                              borderRadius: "50%",
                              boxShadow: "0 0 0 3px rgba(220, 38, 38, 0.2)",
                            }}
                          />
                        )}
                      </div>
                      <TimeAgo timestamp={n.createdAt} />
                    </div>

                    {/* نص الإشعار */}
                    <div
                      style={{
                        fontWeight: n.isRead ? 400 : 600,
                        fontSize: "clamp(14px, 3.5vw, 16px)",
                        color: "#1f2937",
                        lineHeight: 1.6,
                        marginBottom: 12,
                      }}
                    >
                      {n.message}
                    </div>

                    {/* الصف السفلي: رقم القضية + أزرار */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "clamp(12px, 3vw, 14px)",
                          color: "#4b5563",
                          background: "#f3f4f6",
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontWeight: 600,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        ⚖️ {n.caseNumber}
                      </span>

                      <div style={{ display: "flex", gap: 8 }}>
                        {n.type === "late" && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              navigate(`/case/${n.caseId}?action=recordDecision&sessionDate=${n.sessionDate || ""}`);
                            }}
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px)",
                              cursor: "pointer",
                              fontSize: "clamp(12px, 3vw, 14px)",
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                              transition: "all 0.2s",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            ✎ تسجيل القرار
                          </button>
                        )}
                        <button
                          onClick={(e) => deleteNotification(n.id, e)}
                          style={{
                            background: "transparent",
                            border: "1px solid #e5e7eb",
                            cursor: "pointer",
                            padding: "clamp(6px, 2vw, 8px)",
                            color: "#9ca3af",
                            fontSize: 16,
                            borderRadius: 8,
                            transition: "all 0.2s",
                            width: "clamp(32px, 8vw, 36px)",
                            height: "clamp(32px, 8vw, 36px)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title="حذف الإشعار"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}