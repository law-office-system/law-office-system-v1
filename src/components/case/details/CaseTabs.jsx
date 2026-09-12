import { Calendar, Gavel, Briefcase, FileArchive, Upload } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext.jsx";
import SessionsTimeline from "../SessionsTimeline";
import JudgmentsSection from "../JudgmentsSection";
import AdminTasksSection from "../AdminTasksSection";
import DocumentUploader from "../../documents/DocumentUploader";
import DocumentCard from "../../documents/DocumentCard";

/**
 * تبويبات القضية: نظرة عامة | سير الدعوى | الأحكام | الأعمال | المستندات
 * - العدّادات تظهر هنا فقط (أُزيلت من بطاقة الدرجة لتلغي التكرار).
 * - "إضافة مستند" تفتح نفس التبويب بدل الانتقال لقسم منفصل.
 */
export default function CaseTabs({
  activeTab, setActiveTab, tabs,
  isAdmin, id,
  levelSessions, sortedLevelSessions,
  levelJudgments, levelTasks, caseDocs,
  docsLoading, showDocUploader, setShowDocUploader,
  onUploadComplete, onDocDelete, setSelectedDoc,
  onAddSession, onEditSession, onDeleteSession, onAddDecision,
  onAddJudgmentFromSession, onAddTaskFromSession,
  onAddTask, onSaveJudgment, overviewContent,
  getLinkedJudgment, getLinkedTasks,
}) {
  const { theme } = useTheme();
  const { colors, radius, transitions, card } = theme;

  return (
    <div style={{ ...card, marginBottom: 20 }}>
      {/* ── شريط التبويبات ── */}
      <div style={{
        display: "flex", gap: 4, borderBottom: `1px solid ${colors.border.default}`,
        marginBottom: 20, flexWrap: "wrap", overflowX: "auto", paddingBottom: 4,
      }}>
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "clamp(8px, 2.5vw, 11px) clamp(12px, 3vw, 18px)",
                border: "none",
                borderBottom: isActive ? `3px solid ${colors.accent.blue.dark}` : "3px solid transparent",
                background: "transparent", color: isActive ? colors.accent.blue.light : colors.text.muted,
                fontWeight: isActive ? 700 : 500, fontSize: "clamp(12px, 3.5vw, 14px)",
                cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                fontFamily: "inherit", transition: transitions.default,
                whiteSpace: "nowrap", flexShrink: 0,
              }}
            >
              <TabIcon size={16} /> {tab.label}
              {tab.count > 0 && (
                <span style={{
                  background: isActive ? colors.accent.blue.dark : colors.bg.hover,
                  color: isActive ? "#fff" : colors.text.muted,
                  padding: "2px 8px", borderRadius: radius.full, fontSize: 11, fontWeight: 700,
                }}>{tab.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── نظرة عامة ── */}
      {activeTab === 'overview' && overviewContent}

      {/* ── سير الدعوى ── */}
      {activeTab === "sessions" && (
        levelSessions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: colors.text.muted }}>
            <Calendar size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontSize: 16, margin: 0 }}>لا توجد جلسات مسجلة في هذه الدرجة</p>
            {isAdmin && (
              <button onClick={onAddSession} style={{
                marginTop: 16, padding: "10px 20px", background: colors.accent.blue.dark, color: "#fff",
                border: "none", borderRadius: radius.md, cursor: "pointer", fontFamily: "inherit",
                fontWeight: 600, fontSize: 14,
              }}>
                + إضافة أول جلسة
              </button>
            )}
          </div>
        ) : (
          <SessionsTimeline
            caseId={id}
            sessions={sortedLevelSessions}
            canEdit={isAdmin}
            canDelete={isAdmin}
            onEdit={onEditSession}
            onDelete={onDeleteSession}
            onAddClick={isAdmin ? onAddSession : null}
            onAddDecision={isAdmin ? onAddDecision : null}
            onAddJudgment={isAdmin ? onAddJudgmentFromSession : null}
            onAddTask={isAdmin ? onAddTaskFromSession : null}
            getLinkedJudgment={(sessionId) => getLinkedJudgment(sessionId)}
            getLinkedTasks={(sessionId) => getLinkedTasks(sessionId)}
          />
        )
      )}

      {/* ── الأحكام ── */}
      {activeTab === "judgments" && (
        <JudgmentsSection
          caseId={id}
          judgments={levelJudgments}
          sessions={sortedLevelSessions}
          onAddJudgment={isAdmin ? onSaveJudgment : null}
        />
      )}

      {/* ── الأعمال الإدارية ── */}
      {activeTab === "admin" && (
        <AdminTasksSection
          caseId={id}
          sessions={sortedLevelSessions}
          tasks={levelTasks}
          onAddTask={isAdmin ? onAddTask : null}
        />
      )}

      {/* ── المستندات ── */}
      {activeTab === "documents" && (
        <div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20, flexWrap: "wrap", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 44, height: 44,
                background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
                borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 8px 24px ${colors.accent.blue.main}30`,
              }}>
                <FileArchive size={22} color="white" />
              </div>
              <div>
                <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 18, fontWeight: 700 }}>
                  مستندات القضية
                </h3>
                <p style={{ margin: '4px 0 0 0', color: colors.text.muted, fontSize: 13 }}>
                  {caseDocs.length} مستند{caseDocs.length !== 1 ? 'ات' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowDocUploader(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: '10px 20px', background: colors.accent.blue.dark,
                color: 'white', border: 'none', borderRadius: 14,
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', boxShadow: `0 4px 16px ${colors.accent.blue.main}30`,
              }}
            >
              <Upload size={16} />
              رفع مستند
            </button>
          </div>

          {showDocUploader && (
            <div style={{ marginBottom: 24 }}>
              <DocumentUploader
                caseId={id}
                onUpload={onUploadComplete}
                onClose={() => setShowDocUploader(false)}
              />
            </div>
          )}

          {docsLoading ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 200, color: colors.text.muted,
            }}>
              <div style={{
                width: 32, height: 32,
                border: `3px solid ${colors.accent.blue.bg}`,
                borderTopColor: colors.accent.blue.dark,
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }} />
            </div>
          ) : caseDocs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "50px 20px", color: colors.text.muted }}>
              <FileArchive size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
              <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>لا توجد مستندات</p>
              <p style={{ fontSize: 14, margin: 0 }}>ابدأ برفع أول مستند لهذه القضية</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 16,
            }}>
              {caseDocs.map(doc => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={onDocDelete}
                  onPreview={setSelectedDoc}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
