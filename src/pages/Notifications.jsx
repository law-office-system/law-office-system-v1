import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, Filter, Gavel, Calendar, ClipboardList } from "lucide-react";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";  // ← NEW
import { db } from "../firebaseDb";
import useNotifications from "../hooks/useNotifications";

/* ===========================
      شارة نوع الإشعار
=========================== */

const TYPE_CONFIG = {
  late: {
    label: "جلسة متأخرة",
    emoji: "🔴",
    bg: "#fef2f2",
    color: "#991b1b",
    border: "#fecaca",
    sidebar: "#dc2626",
    icon: Calendar,
  },
  admin_task: {
    label: "عمل إداري متأخر",
    emoji: "🟠",
    bg: "#fff7ed",
    color: "#9a3412",
    border: "#fed7aa",
    sidebar: "#f97316",
    icon: ClipboardList,
  },
  judgment: {
    label: "حكم يحتاج متابعة",
    emoji: "🟣",
    bg: "#faf5ff",
    color: "#7e22ce",
    border: "#e9d5ff",
    sidebar: "#a855f7",
    icon: Gavel,
  },
};

function TypeBadge({ type }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.late;
  const Icon = config.icon;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.border}`,
        borderRadius: 30,
        padding: "5px 12px",
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <Icon size={14} />
      <span>{config.label}</span>
    </span>
  );
}

/* ===========================
        منذ متى
=========================== */

function TimeAgo({ timestamp }) {
  const date = timestamp?.toDate?.() || new Date(timestamp);

  if (!date || isNaN(date)) return null;

  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  let text = "";
  let color = "#64748b";

  if (mins < 1) {
    text = "الآن";
    color = "#16a34a";
  } else if (mins < 60) {
    text = `منذ ${mins} دقيقة`;
    color = "#16a34a";
  } else if (hours < 24) {
    text = `منذ ${hours} ساعة`;
    color = "#2563eb";
  } else if (days < 7) {
    text = `منذ ${days} يوم`;
    color = "#d97706";
  } else {
    text = date.toLocaleDateString("ar-EG");
  }

  return (
    <span
      style={{
        color,
        fontWeight: 600,
        fontSize: 13,
        whiteSpace: "nowrap",
      }}
    >
      🕐 {text}
    </span>
  );
}

/* ===========================
      بطاقة الإشعار
=========================== */

function NotificationCard({ n, onMarkRead, onDelete, isMobile }) {
  const navigate = useNavigate();
  const isRead = n.isReadBy?.[n.currentUserId];
  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.late;

  const handleDecision = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/case/${n.caseId}?action=recordDecision&sessionDate=${n.sessionDate || ""}`);
  };

  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(n.id, e);
  };

  const showDecisionButton = n.type === "late";

  return (
    <Link
      to={`/case/${n.caseId}`}
      onClick={() => onMarkRead(n.id)}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        marginBottom: isMobile ? 12 : 16,
      }}
    >
      <Card
        style={{
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 14 : 18,
          background: isRead ? "#ffffff" : config.bg,
          border: isRead
            ? "1px solid #e2e8f0"
            : `1px solid ${config.border}`,
          boxShadow: isRead
            ? "0 4px 14px rgba(0,0,0,.05)"
            : `0 8px 24px ${config.sidebar}18`,
          transition: ".25s",
        }}
      >
        <div style={{ display: "flex" }}>
          {/* الشريط الجانبي */}
          <div
            style={{
              width: isMobile ? 4 : 6,
              background: config.sidebar,
              flexShrink: 0,
            }}
          />

          <div style={{ flex: 1, padding: isMobile ? 14 : 18, minWidth: 0 }}>
            {/* الصف الأول */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: isMobile ? 12 : 15,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <TypeBadge type={n.type} />

                {!isRead && (
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: config.sidebar,
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>

              <TimeAgo timestamp={n.createdAt} />
            </div>

            {/* اسم الموكل */}
            {n.clientNames?.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: isMobile ? 10 : 12,
                  fontSize: isMobile ? 15 : 17,
                  fontWeight: 700,
                  color: "#0f172a",
                  wordBreak: "break-word",
                }}
              >
                👤 {n.clientNames.join(" ، ")}
              </div>
            )}

            {/* بيانات القضية */}
            <div
              style={{
                display: "flex",
                gap: isMobile ? 6 : 10,
                flexWrap: "wrap",
                marginBottom: isMobile ? 12 : 15,
              }}
            >
              <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                ⚖️ {n.caseNumber}
              </span>

              {n.court && (
                <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                  🏛️ {n.court}
                </span>
              )}

              {n.caseType && (
                <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                  📂 {n.caseType}
                </span>
              )}

              {n.sessionDate && (
                <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                  📅 {n.sessionDate}
                </span>
              )}

              {n.dueDate && (
                <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                  ⏰ {n.dueDate}
                </span>
              )}

              {n.judgmentDate && (
                <span style={{ ...infoChipStyle, fontSize: isMobile ? 12 : 13 }}>
                  📅 {n.judgmentDate}
                </span>
              )}

              {n.daysLate > 0 && (
                <span style={{ 
                  ...infoChipStyle, 
                  background: "#fef2f2", 
                  color: "#dc2626", 
                  border: "1px solid #fecaca",
                  fontSize: isMobile ? 12 : 13,
                }}>
                  ⚠️ متأخر بـ {n.daysLate} يوم
                </span>
              )}
            </div>

            {/* الرسالة */}
            <div
              style={{
                lineHeight: 1.8,
                color: "#334155",
                fontSize: isMobile ? 14 : 15,
                marginBottom: isMobile ? 14 : 18,
                fontWeight: isRead ? 500 : 700,
                wordBreak: "break-word",
              }}
            >
              {n.message}
            </div>

            {/* الأزرار */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {showDecisionButton && (
                  <button
                    onClick={handleDecision}
                    style={{
                      background: config.sidebar,
                      color: "#fff",
                      border: "none",
                      padding: isMobile ? "8px 14px" : "9px 18px",
                      borderRadius: 10,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: isMobile ? 13 : 14,
                      whiteSpace: "nowrap",
                    }}
                  >
                    ✍️ تسجيل القرار
                  </button>
                )}

                <button
                  onClick={handleDelete}
                  style={{
                    background: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: isMobile ? "8px 12px" : "9px 14px",
                    cursor: "pointer",
                    fontSize: isMobile ? 13 : 14,
                    whiteSpace: "nowrap",
                  }}
                >
                  🗑️ حذف
                </button>
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 600,
                }}
              >
                اضغط لفتح الملف
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/* ===========================
        الصفحة الرئيسية
=========================== */

export default function Notifications() {
  const navigate = useNavigate();
  const { userData } = useAuth();  // ← NEW
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(false);

  const {
    notifications,
    count,
    hasNotifications,
    loading,
    refreshing,
    countsByType,
    markAllAsRead,
    refreshNotifications,  // ← NEW
  } = useNotifications();

  // ✅ Responsive check
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const markAsRead = async (id) => {
    await updateDoc(doc(db, "notifications", id), {
      isRead: true,
    });
  };

  const deleteNotification = async (id, e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm("حذف الإشعار ؟")) return;

    await deleteDoc(doc(db, "notifications", id));
  };

  // ✅ زر التحديث — شغال دلوقتي!
  const handleRefresh = async () => {
    try {
      await refreshNotifications();
    } catch (err) {
      console.error("Error refreshing:", err);
      alert("حدث خطأ أثناء التحديث");
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") {
      const readBy = n.isReadBy || {};
      if (readBy[n.currentUserId]) return false;
    }

    if (typeFilter !== "all" && n.type !== typeFilter) return false;

    return true;
  });

  const filterButtons = [
    { key: "all", label: "الكل", count: notifications.length },
    { key: "unread", label: "غير مقروء", count },
  ];

  const typeFilterButtons = [
    { key: "all", label: "الكل", count: countsByType.total },
    { key: "late", label: "جلسات متأخرة", count: countsByType.late, color: "#dc2626" },
    { key: "admin_task", label: "أعمال إدارية", count: countsByType.admin_task, color: "#f97316" },
    { key: "judgment", label: "أحكام", count: countsByType.judgment, color: "#a855f7" },
  ];

  if (loading) {
    return (
      <div style={{ direction: "rtl", padding: 18, textAlign: "center" }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div
      style={{
        direction: "rtl",
        padding: isMobile ? 12 : 18,
        background: "#f4f7fb",
        minHeight: "100vh",
      }}
    >
      {/* ================= Header ================= */}
      <Card
        style={{
          marginBottom: isMobile ? 14 : 18,
          borderRadius: isMobile ? 14 : 18,
          background: "#fff",
          boxShadow: "0 8px 25px rgba(15,23,42,.06)",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: isMobile ? 10 : 15,
            padding: isMobile ? "4px 0" : 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 15 }}>
            <div
              style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
                borderRadius: 14,
                background: "linear-gradient(135deg,#dc2626,#991b1b)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#fff",
                fontSize: isMobile ? 20 : 24,
                flexShrink: 0,
              }}
            >
              🔔
            </div>

            <div>
              <h2
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 700,
                }}
              >
                الإشعارات
              </h2>

              <div
                style={{
                  marginTop: 4,
                  color: "#64748b",
                  fontSize: isMobile ? 12 : 14,
                }}
              >
                {hasNotifications
                  ? `${count} إشعار غير مقروء`
                  : "لا توجد إشعارات جديدة"}
              </div>
            </div>
          </div>

          {/* ✅ أزرار التحكم */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: isMobile ? "8px 14px" : "10px 18px",
                background: refreshing ? "#94a3b8" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                cursor: refreshing ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: isMobile ? 13 : 14,
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              <RefreshCw
                size={isMobile ? 14 : 16}
                style={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
              {refreshing ? "جاري..." : "تحديث"}
            </button>

            {hasNotifications && (
              <Button
                variant="secondary"
                size="small"
                onClick={markAllAsRead}
              >
                ✓ الكل
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ================= فلتر النوع ================= */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 6 : 10,
          flexWrap: "wrap",
          marginBottom: isMobile ? 10 : 12,
          overflowX: isMobile ? "auto" : "visible",
          WebkitOverflowScrolling: "touch",
          paddingBottom: isMobile ? 4 : 0,
        }}
      >
        {typeFilterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setTypeFilter(btn.key)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 12,
              padding: isMobile ? "6px 12px" : "8px 16px",
              fontWeight: 700,
              transition: ".25s",
              background:
                typeFilter === btn.key
                  ? btn.color || "#dc2626"
                  : "#fff",
              color:
                typeFilter === btn.key
                  ? "#fff"
                  : "#334155",
              boxShadow:
                typeFilter === btn.key
                  ? `0 6px 18px ${(btn.color || "#dc2626")}40`
                  : "0 2px 8px rgba(0,0,0,.05)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: isMobile ? 12 : 14,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {btn.label}

            {btn.count > 0 && (
              <span
                style={{
                  background:
                    typeFilter === btn.key
                      ? "rgba(255,255,255,.2)"
                      : "#f1f5f9",
                  borderRadius: 20,
                  padding: "2px 6px",
                  fontSize: 11,
                }}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= فلتر القراءة ================= */}
      <div
        style={{
          display: "flex",
          gap: isMobile ? 6 : 10,
          flexWrap: "wrap",
          marginBottom: isMobile ? 16 : 20,
        }}
      >
        {filterButtons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: 12,
              padding: isMobile ? "8px 14px" : "10px 18px",
              fontWeight: 700,
              transition: ".25s",
              background:
                filter === btn.key
                  ? "#334155"
                  : "#fff",
              color:
                filter === btn.key
                  ? "#fff"
                  : "#334155",
              boxShadow:
                filter === btn.key
                  ? "0 6px 18px rgba(51,65,85,.25)"
                  : "0 2px 8px rgba(0,0,0,.05)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: isMobile ? 13 : 14,
              whiteSpace: "nowrap",
            }}
          >
            {btn.label}

            {btn.count > 0 && (
              <span
                style={{
                  background:
                    filter === btn.key
                      ? "rgba(255,255,255,.2)"
                      : "#f1f5f9",
                  borderRadius: 20,
                  padding: "2px 6px",
                  fontSize: 11,
                }}
              >
                {btn.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================= List ================= */}
      {filteredNotifications.length === 0 ? (
        <Card
          style={{
            padding: isMobile ? 40 : 70,
            textAlign: "center",
            borderRadius: isMobile ? 16 : 20,
          }}
        >
          <div style={{ fontSize: isMobile ? 50 : 70, marginBottom: 15 }}>✅</div>
          <h3 style={{ margin: 0, color: "#334155", fontSize: isMobile ? 16 : 18 }}>لا توجد إشعارات</h3>
          <p style={{ marginTop: 10, color: "#94a3b8", fontSize: isMobile ? 13 : 14 }}>
            {filter === "all" && typeFilter === "all"
              ? "جميع الأمور محدثة."
              : "لا توجد نتائج مطابقة للفلاتر المحددة."}
          </p>
        </Card>
      ) : (
        <div>
          {filteredNotifications.map((n) => (
            <NotificationCard
              key={n.id}
              n={{ ...n, currentUserId: n.currentUserId }}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              isMobile={isMobile}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ===========================
            Styles
=========================== */

const infoChipStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 12px",
  borderRadius: 999,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#334155",
  fontWeight: 600,
};