import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Landmark, Users, Shield, Edit3, DollarSign, Archive, RefreshCw } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext.jsx";
import { translateCaseType, getStatusLabel } from "../../../utils/caseTranslations";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../firebaseDb"; // تأكد من مطابقة مسار قاعدة البيانات لديك

/**
 * ترويسة صفحة تفاصيل القضية — ملخص مركّز:
 * الاسم + النوع + الحالة + السنة + عدادات الأطراف + أزرار التنقل الأساسية + أرشفة.
 */
export default function CaseHeader({ caseData, caseId, clientsCount, opponentsCount, canViewFinance, onUpdate }) {
  const { theme } = useTheme();
  const { colors, radius, shadows } = theme;
  const [loading, setLoading] = useState(false);

  // التحقق مما إذا كانت القضية مؤرشفة (تدعم الحالات المختلفة التي تستخدمها في النظام)
  const isArchived = 
    caseData?.status === "ARCHIVED" || 
    caseData?.status === "archived" || 
    caseData?.status === "مؤرشفة" || 
    caseData?.status === "CLOSED" || 
    caseData?.status === "منتهية";

  const handleToggleArchive = async () => {
    const newStatus = isArchived ? "ACTIVE" : "archived";
    const confirmMsg = isArchived 
      ? "هل تريد بالتأكيد إرجاع هذه القضية إلى القضايا النشطة؟" 
      : "هل تريد أرشفة هذه القضية؟ سيتم إخراجها من القضايا النشطة.";

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const caseRef = doc(db, "cases", caseId || caseData?.id);
      await updateDoc(caseRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      if (onUpdate) {
        onUpdate({ ...caseData, status: newStatus });
      }
      
      alert(isArchived ? "تمت إرجاع القضية للقضايا النشطة بنجاح" : "تمت أرشفة القضية بنجاح");
    } catch (err) {
      alert("حدث خطأ أثناء تغيير حالة الأرشيف: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      ACTIVE: { bg: colors.accent.green.bg, color: colors.accent.green.main, border: colors.accent.green.main + '30', dot: colors.accent.green.main },
      CLOSED: { bg: colors.text.disabled + '15', color: colors.text.disabled, border: colors.text.disabled + '30', dot: colors.text.disabled },
      archived: { bg: colors.accent.amber.bg, color: colors.accent.amber.main, border: colors.accent.amber.main + '30', dot: colors.accent.amber.main },
    };
    return statusStyles[status] || { bg: colors.accent.amber.bg, color: colors.accent.amber.main, border: colors.accent.amber.main + '30', dot: colors.accent.amber.main };
  };

  const statusStyle = getStatusStyle(caseData.status);

  const headerAction = (to, icon, label, color) => (
    <Link to={to} style={{ textDecoration: "none" }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "7px 14px", borderRadius: radius.md,
        background: `${color}12`, color: color,
        border: `1px solid ${color}25`,
        fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}>
        {icon} {label}
      </span>
    </Link>
  );

  return (
    <div style={{
      background: `linear-gradient(135deg, ${colors.bg.card} 0%, ${colors.bg.page} 100%)`,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.xl,
      padding: "clamp(14px, 3vw, 22px)",
      marginBottom: 20,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: -50, right: -50,
        width: 200, height: 200,
        background: `radial-gradient(circle, ${colors.accent.blue.main}15 0%, transparent 70%)`,
        borderRadius: "50%", pointerEvents: "none",
      }} />
      <div style={{
        display: "flex", alignItems: "center", gap: "clamp(12px, 3vw, 20px)",
        position: "relative", zIndex: 1, flexWrap: "wrap",
      }}>
        <div style={{
          width: "clamp(44px, 9vw, 56px)",
          height: "clamp(44px, 9vw, 56px)",
          background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
          borderRadius: 16,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: shadows.glow(colors.accent.blue.main),
          flexShrink: 0,
          border: `1px solid ${colors.accent.blue.main}20`,
        }}>
          <Landmark color={colors.accent.amber.light} size={26} strokeWidth={2.5} />
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            flexWrap: "wrap", marginBottom: 6,
          }}>
            <h1 style={{
              margin: 0, fontSize: "clamp(17px, 4.5vw, 24px)",
              color: colors.text.primary, fontWeight: 800,
              letterSpacing: "-0.5px",
            }}>
              {caseData.caseName || `ملف القضية رقم ${caseData.caseSerial || caseData.caseNumber || ""}`}
            </h1>
            <span style={{
              background: colors.accent.blue.bg,
              color: colors.accent.blue.light,
              border: `1px solid ${colors.accent.blue.main}25`,
              padding: "3px 10px", borderRadius: radius.full,
              fontSize: "clamp(11px, 3vw, 12px)", fontWeight: 600,
            }}>
              {translateCaseType(caseData.caseType)}
            </span>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "clamp(8px, 2vw, 14px)",
            flexWrap: "wrap",
          }}>
            <span style={{
              background: statusStyle.bg, color: statusStyle.color,
              border: `1px solid ${statusStyle.border}`,
              padding: "4px 12px", borderRadius: radius.full,
              fontSize: "clamp(11px, 3vw, 12px)", fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: statusStyle.dot,
                boxShadow: `0 0 8px ${statusStyle.dot}`,
              }} />
              {getStatusLabel(caseData.status)}
            </span>
            <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 13px)" }}>
              سنة {caseData.caseYear || "-"}
            </span>
            <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 13px)", display: "flex", alignItems: "center", gap: 5 }}>
              <Users size={13} /> {clientsCount} موكل
            </span>
            <span style={{ color: colors.text.muted, fontSize: "clamp(12px, 3.5vw, 13px)", display: "flex", alignItems: "center", gap: 5 }}>
              <Shield size={13} /> {opponentsCount} خصم
            </span>
          </div>
        </div>

        {/* الأزرار الإجراءات الأساسية + زر الأرشفة */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {canViewFinance && headerAction(`/case-finance/${caseData.id || caseId}`, <DollarSign size={14} />, "الحسابات", colors.accent.purple.light)}
          {headerAction(`/add-stage/${caseData.id || caseId}`, <Landmark size= {14} />, "إدارة المراحل", colors.accent.amber.main)}
          {headerAction(`/edit/${caseData.id || caseId}`, <Edit3 size={14} />, "تعديل القضية", colors.accent.blue.light)}

          {/* زر الأرشفة الديناميكي */}
          <button
            onClick={handleToggleArchive}
            disabled={loading}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: radius.md,
              background: isArchived ? `${colors.accent.blue.main}12` : `${colors.accent.red?.main || '#ef4444'}12`,
              color: isArchived ? colors.accent.blue.light : (colors.accent.red?.main || '#ef4444'),
              border: `1px solid ${isArchived ? colors.accent.blue.main + '25' : (colors.accent.red?.main || '#ef4444') + '25'}`,
              fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s ease",
            }}
          >
            {isArchived ? <RefreshCw size={14} /> : <Archive size={14} />}
            {loading ? "جاري..." : (isArchived ? "إلغاء الأرشفة" : "أرشفة القضية")}
          </button>
        </div>
      </div>
    </div>
  );
}