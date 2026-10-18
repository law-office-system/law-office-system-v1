import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RefreshCw, Gavel, Calendar, ClipboardList } from "lucide-react";
import { doc, deleteDoc } from "firebase/firestore";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext.jsx";
import { db } from "../firebaseDb";
import useNotifications from "../hooks/useNotifications";

const getTypeConfig = (colors) => ({
  late: {
    label: "جلسة متأخرة", icon: Calendar,
    color: colors.accent.red.main, bg: colors.accent.red.bg, border: colors.accent.red.main + "35",
  },
  admin_task: {
    label: "عمل إداري متأخر", icon: ClipboardList,
    color: colors.accent.amber.main, bg: colors.accent.amber.bg, border: colors.accent.amber.main + "35",
  },
  judgment: {
    label: "حكم يحتاج متابعة", icon: Gavel,
    color: colors.accent.purple.main, bg: colors.accent.purple.bg, border: colors.accent.purple.main + "35",
  },
});

function TypeBadge({ type, colors, radius }) {
  const config = getTypeConfig(colors)[type] || getTypeConfig(colors).late;
  const Icon = config.icon;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: config.bg, color: config.color,
      border: `1px solid ${config.border}`, borderRadius: 999,
      padding: "5px 12px", fontWeight: 700, fontSize: 13,
    }}>
      <Icon size={14} />
      <span>{config.label}</span>
    </span>
  );
}

function TimeAgo({ timestamp, colors }) {
  const date = timestamp?.toDate?.() || new Date(timestamp);
  if (!date || isNaN(date)) return null;
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  let text = "", color = colors.text.muted;
  if (mins < 1) { text = "الآن"; color = colors.accent.green.main; }
  else if (mins < 60) { text = `منذ ${mins} دقيقة`; color = colors.accent.green.main; }
  else if (hours < 24) { text = `منذ ${hours} ساعة`; color = colors.accent.blue.main; }
  else if (days < 7) { text = `منذ ${days} يوم`; color = colors.accent.amber.main; }
  else { text = date.toLocaleDateString("ar-EG"); }
  return <span style={{ color, fontWeight: 600, fontSize: 13, whiteSpace: "nowrap" }}>🕐 {text}</span>;
}

function NotificationCard({ n, currentUserId, onMarkRead, onDelete, isMobile, colors, radius, spacing }) {
  const navigate = useNavigate();
  const cfg = getTypeConfig(colors)[n.type] || getTypeConfig(colors).late;
  const isRead = (n.isReadBy || {})[currentUserId];

  const chipStyle = {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "7px 12px", borderRadius: 999,
    background: colors.bg.hover, border: `1px solid ${colors.border.default}`,
    color: colors.text.secondary, fontWeight: 600,
  };

  const handleDecision = (e) => {
    e.preventDefault(); e.stopPropagation();
    navigate(`/case/${n.caseId}?action=recordDecision&sessionDate=${n.sessionDate || ""}`);
  };
  const handleDelete = (e) => {
    e.preventDefault(); e.stopPropagation();
    onDelete(n.id);
  };

  return (
    <Link to={`/case/${n.caseId}`} onClick={() => onMarkRead(n.id)}
      style={{ textDecoration: "none", color: "inherit", display: "block", marginBottom: isMobile ? 12 : 16 }}>
      <Card style={{
        padding: 0, overflow: "hidden", borderRadius: isMobile ? radius.lg : radius.xl,
        background: isRead ? colors.bg.card : cfg.bg,
        border: isRead ? `1px solid ${colors.border.default}` : `1px solid ${cfg.border}`,
        boxShadow: isRead ? "0 2px 8px rgba(0,0,0,.05)" : `0 8px 24px ${cfg.color}18`,
        transition: ".25s",
      }}>
        <div style={{ display: "flex" }}>
          <div style={{ width: isMobile ? 4 : 6, background: cfg.color, flexShrink: 0 }} />
          <div style={{ flex: 1, padding: isMobile ? spacing.md : spacing.lg, minWidth: 0 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "flex-start",
              flexWrap: "wrap", gap: 8, marginBottom: isMobile ? 12 : 15,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <TypeBadge type={n.type} colors={colors} radius={radius} />
                {!isRead && <span style={{ width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />}
              </div>
              <TimeAgo timestamp={n.createdAt} colors={colors} />
            </div>

            {n.clientNames?.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                marginBottom: isMobile ? 10 : 12,
                fontSize: isMobile ? 15 : 17, fontWeight: 700,
                color: colors.text.primary, wordBreak: "break-word",
              }}>👤 {n.clientNames.join(" ، ")}</div>
            )}

            <div style={{ display: "flex", gap: isMobile ? 6 : 10, flexWrap: "wrap", marginBottom: isMobile ? 12 : 15 }}>
              <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>⚖️ {n.caseNumber}</span>
              {(n.caseCourt || n.court) && (
                <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>🏛️ {n.caseCourt || n.court}</span>
              )}
              {n.caseType && <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>📂 {n.caseType}</span>}
              {n.sessionDate && <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>📅 {n.sessionDate}</span>}
              {n.dueDate && <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>⏰ {n.dueDate}</span>}
              {n.judgmentDate && <span style={{ ...chipStyle, fontSize: isMobile ? 12 : 13 }}>📅 {n.judgmentDate}</span>}
              {n.daysLate > 0 && (
                <span style={{
                  ...chipStyle, background: colors.accent.red.bg,
                  color: colors.accent.red.main, border: `1px solid ${colors.accent.red.main}35`,
                  fontSize: isMobile ? 12 : 13,
                }}>⚠️ متأخر بـ {n.daysLate} يوم</span>
              )}
            </div>

            <div style={{
              lineHeight: 1.8, color: colors.text.secondary,
              fontSize: isMobile ? 14 : 15,
              marginBottom: isMobile ? 14 : 18,
              fontWeight: isRead ? 500 : 700, wordBreak: "break-word",
            }}>{n.message}</div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {n.type === "late" && (
                  <button onClick={handleDecision} style={{
                    background: cfg.color, color: "#fff", border: "none",
                    padding: isMobile ? "8px 14px" : "9px 18px",
                    borderRadius: radius.md, cursor: "pointer", fontWeight: 700,
                    fontSize: isMobile ? 13 : 14, whiteSpace: "nowrap",
                  }}>✍️ تسجيل القرار</button>
                )}
                <button onClick={handleDelete} style={{
                  background: colors.bg.card, border: `1px solid ${colors.border.default}`,
                  borderRadius: radius.md, cursor: "pointer",
                  padding: isMobile ? "8px 12px" : "9px 14px",
                  fontSize: isMobile ? 13 : 14, whiteSpace: "nowrap",
                  color: colors.text.secondary,
                }}>🗑️ حذف</button>
              </div>
              <div style={{ color: colors.text.muted, fontSize: isMobile ? 12 : 13, fontWeight: 600 }}>اضغط لفتح الملف</div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function Notifications() {
  const { theme } = useTheme();
  const { colors, radius, spacing } = theme;
  const pageStyle = theme.page || {};
  const { userData } = useAuth();
  const [filter, setFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isMobile, setIsMobile] = useState(false);

  const {
    notifications, count, hasNotifications, loading, refreshing,
    countsByType, markAsRead, markAllAsRead, removeNotification, refreshNotifications,
  } = useNotifications();

  const currentUserId = userData?.uid;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const deleteNotification = async (id) => {
    if (!window.confirm("حذف الإشعار ؟")) return;
    try {
      await deleteDoc(doc(db, "notifications", id));
      removeNotification(id);
    } catch (e) { console.error(e); }
  };

  const handleRefresh = async () => {
    try { await refreshNotifications(); }
    catch { alert("حدث خطأ أثناء التحديث"); }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread" && (n.isReadBy || {})[currentUserId]) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    return true;
  });

  // ✅ إصلاح التكرار: إزالة أي إشعارات بنفس الـ id (يمنع خطأ React key)
  const uniqueNotifications = [...new Map(filteredNotifications.map(n => [n.id, n])).values()];

  const typeFilterButtons = [
    { key: "all", label: "الكل", count: countsByType.total, color: colors.accent.blue.main },
    { key: "late", label: "جلسات متأخرة", count: countsByType.late, color: colors.accent.red.main },
    { key: "admin_task", label: "أعمال إدارية", count: countsByType.admin_task, color: colors.accent.amber.main },
    { key: "judgment", label: "أحكام", count: countsByType.judgment, color: colors.accent.purple.main },
  ];
  const filterButtons = [
    { key: "all", label: "الكل", count: notifications.length },
    { key: "unread", label: "غير مقروء", count },
  ];

  if (loading) {
    return <div style={{ direction: "rtl", padding: 18, textAlign: "center", color: colors.text.muted }}>جاري التحميل...</div>;
  }

  return (
    <div style={{
      ...pageStyle,
      padding: isMobile ? spacing.md : spacing.lg,
      background: colors.bg.page,
      minHeight: "100vh",
    }}>
      <Card style={{
        marginBottom: isMobile ? 14 : 18, borderRadius: isMobile ? radius.lg : radius.xl,
        background: colors.bg.card,
        boxShadow: "0 8px 25px rgba(15,23,42,.06)",
        border: `1px solid ${colors.border.default}`,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: isMobile ? 10 : 15,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
            <div style={{
              width: isMobile ? 40 : 46, height: isMobile ? 40 : 46,
              borderRadius: radius.md,
              background: `linear-gradient(135deg, ${colors.accent.red.main}, ${colors.accent.red.dark || colors.accent.red.main})`,
              display: "flex", justifyContent: "center", alignItems: "center",
              color: "#fff", fontSize: isMobile ? 18 : 22, flexShrink: 0,
            }}>🔔</div>
            <div>
              <h2 style={{ margin: 0, color: colors.text.primary, fontSize: isMobile ? 19 : 22, fontWeight: 700 }}>
                الإشعارات
                {hasNotifications && (
                  <span style={{
                    marginRight: 8, fontSize: 12, fontWeight: 700,
                    color: colors.accent.red.main, background: colors.accent.red.bg,
                    padding: "2px 10px", borderRadius: 999,
                  }}>{count}</span>
                )}
              </h2>
              <div style={{ marginTop: 2, color: colors.text.muted, fontSize: isMobile ? 12 : 13 }}>
                {hasNotifications ? "لديك إشعارات غير مقروءة" : "لا توجد إشعارات جديدة"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={handleRefresh} disabled={refreshing} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: isMobile ? "8px 14px" : "10px 18px",
              background: refreshing ? colors.text.disabled : colors.accent.blue.main,
              color: "#fff", border: "none", borderRadius: radius.md,
              cursor: refreshing ? "not-allowed" : "pointer",
              fontWeight: 700, fontSize: isMobile ? 13 : 14,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}>
              <RefreshCw size={isMobile ? 14 : 16} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
              {refreshing ? "جاري..." : "تحديث"}
            </button>
            {hasNotifications && (
              <Button variant="secondary" size="small" onClick={markAllAsRead}>✓ الكل</Button>
            )}
          </div>
        </div>
      </Card>

      <div style={{
        display: "flex", gap: isMobile ? 6 : 10, flexWrap: "wrap",
        marginBottom: isMobile ? 10 : 12,
        overflowX: isMobile ? "auto" : "visible",
        WebkitOverflowScrolling: "touch",
        paddingBottom: isMobile ? 4 : 0,
      }}>
        {typeFilterButtons.map((btn) => (
          <button key={btn.key} onClick={() => setTypeFilter(btn.key)} style={{
            border: "none", cursor: "pointer", borderRadius: radius.md,
            padding: isMobile ? "6px 12px" : "8px 16px", fontWeight: 700, transition: ".25s",
            background: typeFilter === btn.key ? btn.color : colors.bg.card,
            color: typeFilter === btn.key ? "#fff" : colors.text.secondary,
            boxShadow: typeFilter === btn.key ? `0 6px 18px ${btn.color}40` : "0 2px 8px rgba(0,0,0,.05)",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: isMobile ? 12 : 14, whiteSpace: "nowrap", flexShrink: 0,
          }}>
            {btn.label}
            {btn.count > 0 && (
              <span style={{
                background: typeFilter === btn.key ? "rgba(255,255,255,.2)" : colors.bg.hover,
                borderRadius: 999, padding: "2px 6px", fontSize: 11,
              }}>{btn.count}</span>
            )}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: isMobile ? 6 : 10, flexWrap: "wrap", marginBottom: isMobile ? 16 : 20 }}>
        {filterButtons.map((btn) => (
          <button key={btn.key} onClick={() => setFilter(btn.key)} style={{
            border: "none", cursor: "pointer", borderRadius: radius.md,
            padding: isMobile ? "7px 12px" : "8px 14px", fontWeight: 700, transition: ".25s",
            background: filter === btn.key ? colors.text.secondary : colors.bg.card,
            color: filter === btn.key ? "#fff" : colors.text.secondary,
            boxShadow: filter === btn.key ? "0 6px 18px rgba(51,65,85,.25)" : "0 2px 8px rgba(0,0,0,.05)",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: isMobile ? 13 : 14, whiteSpace: "nowrap",
          }}>
            {btn.label}
            {btn.count > 0 && (
              <span style={{
                background: filter === btn.key ? "rgba(255,255,255,.2)" : colors.bg.hover,
                borderRadius: 999, padding: "2px 6px", fontSize: 11,
              }}>{btn.count}</span>
            )}
          </button>
        ))}
      </div>

      {uniqueNotifications.length === 0 ? (
        <Card style={{ padding: isMobile ? 40 : 70, textAlign: "center", borderRadius: isMobile ? radius.lg : radius.xl }}>
          <div style={{ fontSize: isMobile ? 50 : 70, marginBottom: 15 }}>✅</div>
          <h3 style={{ margin: 0, color: colors.text.secondary, fontSize: isMobile ? 16 : 18 }}>لا توجد إشعارات</h3>
          <p style={{ marginTop: 10, color: colors.text.muted, fontSize: isMobile ? 13 : 14 }}>
            {filter === "all" && typeFilter === "all" ? "جميع الأمور محدثة." : "لا توجد نتائج مطابقة للفلاتر المحددة."}
          </p>
        </Card>
      ) : (
        <div>
          {uniqueNotifications.map((n) => (
            <NotificationCard
              key={n.id}
              n={n}
              currentUserId={currentUserId}
              onMarkRead={markAsRead}
              onDelete={deleteNotification}
              isMobile={isMobile}
              colors={colors}
              radius={radius}
              spacing={spacing}
            />
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}