import { Gavel, Scale, FileText, X } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext.jsx";
import { Modal } from "../../ui";
import SessionForm from "../SessionForm";
import DecisionForm from "../DecisionForm";
import JudgmentForm from "../JudgmentForm";
import AdminTaskForm from "../AdminTaskForm";

/**
 * كل النوافذ المنبثقة لصفحة تفاصيل القضية في مكان واحد.
 * الصفحة الرئيسية تبقى مسؤولة فقط عن حالة الفتح/الإغلاق ودوال الحفظ.
 */
export default function CaseModals({
  id, caseData, sortedLevelSessions, colors,
  // درجات التقاضي (تُمرَّر من CaseDetails — بما فيها الدرجة الافتراضية للقضايا القديمة)
  levels, selectedLevelId,
  // جلسة
  showSessionForm, editingSession, onCloseSessionForm, onSaveSession,
  // قرار
  showDecisionForm, linkedSessionForDecision, onCloseDecisionForm, onSaveDecision,
  // حكم
  showJudgmentForm, linkedSessionForJudgment, onCloseJudgmentForm, onSaveJudgment,
  // مهمة
  showTaskForm, taskFormSession, onCloseTaskForm, onSaveTask,
  // معاينة مستند
  selectedDoc, onCloseDocPreview,
}) {
  return (
    <>
      {showSessionForm && (
        <SessionForm
          session={editingSession}
          caseId={id}
          caseData={caseData}
          levels={levels}              // ✅ FIX: تمرير الدرجات الجاهزة بدل إعادة الجلب من Firestore
          selectedLevelId={selectedLevelId} // ✅ FIX: الدرجة المختارة حاليًا في شريط الدرجات
          onClose={onCloseSessionForm}
          onSave={onSaveSession}
        />
      )}

      {showDecisionForm && (
        <Modal
          isOpen={true}
          onClose={onCloseDecisionForm}
          title="إضافة قرار للجلسة"
          subtitle={linkedSessionForDecision ? `الجلسة: ${linkedSessionForDecision.title || linkedSessionForDecision.date}` : ''}
          icon={Scale}
          iconColor={colors.accent.amber.light}
          maxWidth="600px"
        >
          <DecisionForm
            session={linkedSessionForDecision}
            onClose={onCloseDecisionForm}
            onSave={onSaveDecision}
          />
        </Modal>
      )}

      {showJudgmentForm && (
        <Modal
          isOpen={true}
          onClose={onCloseJudgmentForm}
          title={linkedSessionForJudgment ? 'إضافة حكم مرتبط بالجلسة' : 'إضافة حكم جديد'}
          subtitle={linkedSessionForJudgment ? `الجلسة: ${linkedSessionForJudgment.title || linkedSessionForJudgment.date}` : ''}
          icon={Gavel}
          iconColor={colors.accent.amber.light}
          maxWidth="600px"
        >
          <JudgmentForm
            caseId={id}
            sessions={sortedLevelSessions}
            preSelectedSession={linkedSessionForJudgment}
            onClose={onCloseJudgmentForm}
            onSave={onSaveJudgment}
          />
        </Modal>
      )}

      {showTaskForm && (
        <AdminTaskForm
          caseId={id}
          sessions={sortedLevelSessions}
          task={null}
          preSelectedSession={taskFormSession}
          onClose={onCloseTaskForm}
          onSave={onSaveTask}
        />
      )}

      {/* معاينة مستند */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={onCloseDocPreview}>
          <div
            style={{
              background: colors.bg.card, borderRadius: 20,
              maxWidth: '90vw', maxHeight: '90vh', width: '100%',
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px', borderBottom: `1px solid ${colors.border.default}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 16 }}>
                {selectedDoc.name || selectedDoc.fileName}
              </h3>
              <button onClick={onCloseDocPreview}
                style={{ background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {selectedDoc.fileType?.startsWith('image/') ? (
                <img src={selectedDoc.downloadURL} alt={selectedDoc.fileName}
                  style={{ maxWidth: '100%', borderRadius: 12 }} />
              ) : selectedDoc.fileType === 'application/pdf' ? (
                <iframe src={selectedDoc.downloadURL}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 12 }}
                  title={selectedDoc.fileName} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <FileText size={64} color={colors.text.muted} />
                  <p style={{ color: colors.text.muted, marginTop: 16 }}>
                    لا يمكن معاينة هذا النوع من الملفات
                  </p>
                  <a href={selectedDoc.downloadURL} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      marginTop: 16, padding: '10px 20px',
                      background: colors.accent.blue.dark, color: 'white',
                      borderRadius: 12, textDecoration: 'none', fontWeight: 600,
                    }}>
                    تحميل الملف
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}