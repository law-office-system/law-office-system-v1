import { Users, Shield, FileText } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext.jsx";

/**
 * تبويب "نظرة عامة": الأطراف (موكلون/خصوم) + موضوع الدعوى.
 * انتقلتا من قسمين منفصلين مفتوحين دائماً إلى داخل تبويب واحد.
 * الموضوع الفارغ يظهر كسطر واحد مكتوم بدل صندوق فارغ كبير.
 */
export default function CaseOverviewTab({ clients, safeClients, safeOpponents, caseData }) {
  const { theme } = useTheme();
  const { colors, radius } = theme;

  const subject = caseData?.caseSubject || caseData?.notes || "";

  const PersonCard = ({ item, color, fallback }) => {
    const name = typeof item === "object" ? (item.name || item.fullName || fallback) : (item || fallback);
    const phone = typeof item === "object" ? item.phone : null;
    return (
      <div style={{
        padding: "clamp(8px, 2.5vw, 10px)",
        background: colors.bg.hover,
        borderRadius: radius.md,
        border: `1px solid ${colors.border.default}`,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: color + "20", color: color,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0, fontWeight: 700,
        }}>
          {name?.charAt(0) || "؟"}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "clamp(12px, 3.5vw, 13px)", color: colors.text.primary, wordBreak: "break-word" }}>
            {name}
          </div>
          {phone && (
            <div style={{ fontSize: "clamp(10px, 3vw, 11px)", color: colors.text.muted, marginTop: 2 }}>
              {phone}
            </div>
          )}
        </div>
      </div>
    );
  };

  const PartyColumn = ({ title, icon: Icon, color, items, resolvedItems, fallback }) => (
    <div>
      <h4 style={{
        margin: "0 0 10px 0", color,
        fontSize: "clamp(12px, 3.5vw, 13px)", fontWeight: 700,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <Icon size={15} />
        {title} ({items.length})
      </h4>
      {items.length === 0 ? (
        <p style={{ color: colors.text.muted, fontSize: "clamp(11px, 3vw, 12px)", margin: 0 }}>لا يوجد</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {resolvedItems.map((item, idx) => (
            <PersonCard key={item?.id || idx} item={item} color={color} fallback={fallback} />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* الأطراف */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, clamp(260px, 45vw, 400px)), 1fr))",
        gap: 16,
        marginBottom: 20,
      }}>
        <PartyColumn
          title="الموكلون"
          icon={Users}
          color={colors.accent.green.main}
          items={safeClients}
          resolvedItems={clients}
          fallback="موكل"
        />
        <PartyColumn
          title="الخصوم"
          icon={Shield}
          color={colors.accent.red.main}
          items={safeOpponents}
          resolvedItems={safeOpponents}
          fallback="خصم"
        />
      </div>

      {/* موضوع الدعوى — مضغوط، ولا يستهلك مساحة عندما يكون فارغاً */}
      <div>
        <h4 style={{
          margin: "0 0 8px 0", color: colors.accent.purple.light,
          fontSize: "clamp(12px, 3.5vw, 13px)", fontWeight: 700,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <FileText size={15} />
          موضوع الدعوى
        </h4>
        {subject ? (
          <div style={{
            padding: "clamp(10px, 2.5vw, 14px)",
            background: colors.bg.hover,
            borderRadius: radius.md,
            border: `1px solid ${colors.border.default}`,
            color: colors.text.primary,
            fontSize: "clamp(12px, 3.5vw, 13px)",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            {subject}
          </div>
        ) : (
          <p style={{ color: colors.text.muted, fontSize: "clamp(11px, 3vw, 12px)", margin: 0 }}>
            لم يتم تحديد موضوع الدعوى
          </p>
        )}
      </div>
    </div>
  );
}
