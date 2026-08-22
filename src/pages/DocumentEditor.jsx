import React, { Suspense, lazy } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// 🚀 DYNAMIC IMPORT: المحرر بس بيتحمل لما تدخل الصفحة
// ده بيوفر 1.35MB (export-vendor) + 460KB (tiptap-vendor) من التحميل الأولي
const LegalEditor = lazy(() => import('../components/LegalEditor'));

/* ================= LOADING FALLBACK FOR EDITOR ================= */
function EditorLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-amber-400">
      <div className="w-12 h-12 border-3 border-amber-400/20 border-t-amber-400 rounded-full animate-spin mb-4" />
      <div className="text-lg font-medium">جاري تحميل المحرر...</div>
      <div className="text-sm text-slate-500 mt-2">Document Editor</div>
    </div>
  );
}

const DocumentEditor = () => {
  const { docId } = useParams();
  const { currentUser, userData } = useAuth();

  // Multi-Tenant: tenantId = officeId
  const tenantId = userData?.officeId || 'default_office';
  const documentId = docId || `doc_${Date.now()}`;

  return (
    <Suspense fallback={<EditorLoading />}>
      <LegalEditor
        tenantId={tenantId}
        documentId={documentId}
        userId={currentUser?.uid}
        userName={userData?.fullName || userData?.name || 'محامٍ'}
      />
    </Suspense>
  );
};

export default DocumentEditor;