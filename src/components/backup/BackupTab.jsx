import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../context/ThemeContext.jsx";
import { useOfficeId } from "../../hooks/useOfficeId";
import { listBackups, exportNow } from "../../services/backupService";
import { Card, Button } from "../ui";
import {
  DatabaseBackup, Download, RefreshCw, FileJson,
  Loader2, CloudDownload, ShieldCheck, FileSpreadsheet,
} from "lucide-react";

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(iso));
};

export default function BackupTab() {
  const { theme } = useTheme();
  const { colors, radius } = theme;
  const { officeId, ready, error: hookError } = useOfficeId();

  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);
  const [exportResult, setExportResult] = useState(null);

  const load = useCallback(async () => {
    if (!ready || !officeId) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listBackups(officeId);
      setBackups(list);
    } catch (e) {
      console.error("listBackups error:", e);
      setError("تعذر تحميل قائمة النسخ — حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  }, [ready, officeId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    if (!officeId) return;
    setExporting(true);
    setExportResult(null);
    setError(null);
    try {
      const result = await exportNow(officeId);
      setExportResult(result);
      await load();
    } catch (e) {
      console.error("exportNow error:", e);
      setError("تعذر إنشاء النسخة — حاول مرة أخرى");
    } finally {
      setExporting(false);
    }
  };

  // ── حالات الحماية ──
  if (hookError) {
    return (
      <Card variant="default">
        <p style={{ padding: 20, color: colors.accent.red.light }}>🚫 {hookError}</p>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── زرار التصدير الفوري ── */}
      <Card variant="default">
        <div style={{
          display: "flex", alignItems: "center", justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10,
              background: `${colors.accent.green.main}15`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <DatabaseBackup size={22} color={colors.accent.green.main} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 15, color: colors.text.primary }}>
                نسخة احتياطية فورية
              </h3>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: colors.text.muted }}>
                تصدير كامل بيانات مكتبك الآن — JSON + Excel
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              variant="primary"
              icon={exporting ? Loader2 : CloudDownload}
              onClick={handleExport}
              disabled={exporting || !ready}
            >
              {exporting ? "جاري التصدير..." : "تصدير الآن"}
            </Button>
          </div>
        </div>

        {/* نتيجة التصدير */}
        {exportResult && (
          <div style={{
            marginTop: 14, padding: "12px 16px",
            background: `${colors.accent.green.main}12`,
            border: `1px solid ${colors.accent.green.main}30`,
            borderRadius: radius.md,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>
            <ShieldCheck size={16} color={colors.accent.green.main} />
            <span style={{ fontSize: 13, color: colors.text.secondary, flex: 1 }}>
              تم إنشاء نسخة بنجاح ({exportResult.totalDocs} مستند)
            </span>
            {exportResult.xlsxUrl && (
              <a
                href={exportResult.xlsxUrl}
                download
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                  background: colors.accent.green.main, color: "#fff",
                }}
              >
                <FileSpreadsheet size={14} /> Excel
              </a>
            )}
            <a
              href={exportResult.url}
              download
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8,
                fontSize: 13, fontWeight: 600, textDecoration: "none",
                background: colors.bg.hover, color: colors.text.secondary,
                border: `1px solid ${colors.border.default}`,
              }}
            >
              <Download size={14} /> JSON
            </a>
          </div>
        )}

        {error && (
          <p style={{ marginTop: 12, fontSize: 13, color: colors.accent.red.light }}>
            ⚠️ {error}
          </p>
        )}
      </Card>

      {/* ── قائمة النسخ ── */}
      <Card variant="default">
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16,
        }}>
          <h3 style={{ margin: 0, fontSize: 15, color: colors.text.primary }}>
            النسخ المتاحة
          </h3>
          <button
            onClick={load}
            disabled={loading}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: colors.text.muted, display: "flex", alignItems: "center", gap: 6,
              fontFamily: "inherit", fontSize: 13,
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} /> تحديث
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 30, color: colors.text.muted }}>
            <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
            <p>جاري التحميل...</p>
          </div>
        ) : backups.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: colors.text.muted }}>
            <FileJson size={28} />
            <p>لا توجد نسخ احتياطية بعد</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {backups.map((b) => (
              <div key={b.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px",
                background: colors.bg.hover,
                borderRadius: radius.md,
                flexWrap: "wrap", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <FileJson size={18} color={colors.accent.blue.main} />
                  <div>
                    <div style={{ fontSize: 14, color: colors.text.primary, fontWeight: 500 }}>
                      {fmtDate(b.date)}
                    </div>
                    <div style={{ fontSize: 12, color: colors.text.muted }}>
                      {b.totalDocs} مستند • {b.trigger === "manual" ? "تصدير يدوي" : "نسخ تلقائي يومي"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {b.xlsxUrl && (
                    <a
                      href={b.xlsxUrl}
                      download
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: radius.md,
                        fontSize: 13, fontWeight: 600, textDecoration: "none",
                        background: colors.accent.green.main, color: "#fff",
                      }}
                    >
                      <FileSpreadsheet size={14} /> Excel
                    </a>
                  )}
                  <a
                    href={b.url}
                    download
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 14px", borderRadius: radius.md,
                      fontSize: 13, fontWeight: 600, textDecoration: "none",
                      background: colors.bg.card,
                      color: colors.text.secondary,
                      border: `1px solid ${colors.border.default}`,
                    }}
                  >
                    <Download size={14} /> JSON
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}