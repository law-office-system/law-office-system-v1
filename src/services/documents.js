import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { collection, addDoc, deleteDoc, doc, getDocs, query, where, orderBy, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '../firebaseStorage';
import { db } from '../firebaseDb';

const DOCS_COLLECTION = 'documents';

// ═══════════════════════════════════════════════════════════════
// Document Categories
// ═══════════════════════════════════════════════════════════════
export const DOC_CATEGORIES = [
  { id: 'general',        label: 'عام',           color: '#6b7280' },
  { id: 'petition',       label: 'صحيفة دعوى',     color: '#3b82f6' },
  { id: 'memo',           label: 'مذكرة',          color: '#8b5cf6' },
  { id: 'judgment',       label: 'حكم',            color: '#10b981' },
  { id: 'power_of_attorney', label: 'توكيل',       color: '#f59e0b' },
  { id: 'contract',       label: 'عقد',            color: '#06b6d4' },
  { id: 'evidence',       label: 'دليل/مستند',      color: '#ef4444' },
  { id: 'correspondence', label: 'مراسلة',         color: '#6366f1' },
  { id: 'announcement',   label: 'إعلان',          color: '#f97316' },
  { id: 'invoice',        label: 'فاتورة',         color: '#059669' },
];

// ═══════════════════════════════════════════════════════════════
// Visibility Levels
// ═══════════════════════════════════════════════════════════════
export const DOC_VISIBILITY = {
  PUBLIC:    'public',
  OFFICE:    'office',
  CASE_TEAM: 'case_team',
  PRIVATE:   'private',
};

// ═══════════════════════════════════════════════════════════════
// UPLOAD Document
// ═══════════════════════════════════════════════════════════════
export async function uploadDocument({ 
  file, 
  officeId, 
  uploadedBy,
  uploadedByName = '',
  caseId = null, 
  litigationLevelId = null,
  clientId = null, 
  category = 'general',
  tags = [], 
  description = '',
  name = '',
  visibility = DOC_VISIBILITY.OFFICE,
}) {
  if (!file || !officeId) throw new Error('الملف والمكتب مطلوبان');

  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) throw new Error('حجم الملف يتجاوز 10 ميجابايت');

  const allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
  const ext = file.name.split('.').pop().toLowerCase();
  if (!allowedExts.includes(ext)) throw new Error('نوع الملف غير مدعوم');

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const storagePath = `offices/${officeId}/documents/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      null,
      (error) => reject(new Error('فشل رفع الملف: ' + error.message)),
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          const docData = {
            officeId,
            caseId,
            litigationLevelId,
            clientId,
            name: name || file.name,
            description,
            category,
            tags,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type || getFileTypeFromExt(ext),
            storagePath,
            downloadURL,
            uploadedBy,
            uploadedByName,
            uploadedAt: serverTimestamp(),
            visibility,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };

          const docRef = await addDoc(collection(db, DOCS_COLLECTION), docData);
          resolve({ id: docRef.id, ...docData });
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

// ═══════════════════════════════════════════════════════════════
// GET Documents (with filters) — NO Composite Index needed
// ═══════════════════════════════════════════════════════════════
// ✅ FIXED: استخدمنا where على officeId فقط، وفلترة + ترتيب client-side
// عشان نتجنب Composite Index Errors في Firestore
export async function getDocuments(officeId, filters = {}) {
  const { 
    caseId, 
    litigationLevelId, 
    clientId, 
    category,
    tags, 
    search, 
    status = 'active',
  } = filters;

  if (!officeId) throw new Error('معرف المكتب مطلوب');

  // ✅ query بسيطة — officeId بس (لا orderBy، لا where إضافي)
  const q = query(
    collection(db, DOCS_COLLECTION),
    where('officeId', '==', officeId)
  );

  const snapshot = await getDocs(q);
  let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

  // ✅ فلترة كل حاجة على الـ client-side
  if (status) {
    docs = docs.filter(d => d.status === status);
  }
  if (caseId) {
    docs = docs.filter(d => d.caseId === caseId);
  }
  if (clientId) {
    docs = docs.filter(d => d.clientId === clientId);
  }
  if (litigationLevelId) {
    docs = docs.filter(d => d.litigationLevelId === litigationLevelId);
  }
  if (category) {
    docs = docs.filter(d => d.category === category);
  }
  if (tags?.length) {
    docs = docs.filter(d => tags.some(t => d.tags?.includes(t)));
  }
  if (search) {
    const s = search.toLowerCase();
    docs = docs.filter(d => 
      d.name?.toLowerCase().includes(s) || 
      d.fileName?.toLowerCase().includes(s) ||
      d.description?.toLowerCase().includes(s)
    );
  }

  // ✅ ترتيب على الـ client-side (حسب uploadedAt تنازلي)
  docs.sort((a, b) => {
    const aTime = a.uploadedAt?.seconds ? a.uploadedAt.seconds : (a.createdAt?.seconds || 0);
    const bTime = b.uploadedAt?.seconds ? b.uploadedAt.seconds : (b.createdAt?.seconds || 0);
    return bTime - aTime;
  });

  return docs;
}

// ═══════════════════════════════════════════════════════════════
// GET Single Document
// ═══════════════════════════════════════════════════════════════
export async function getDocument(docId) {
  if (!docId) throw new Error('معرف المستند مطلوب');
  const snap = await getDoc(doc(db, DOCS_COLLECTION, docId));
  if (!snap.exists()) throw new Error('المستند غير موجود');
  return { id: snap.id, ...snap.data() };
}

// ═══════════════════════════════════════════════════════════════
// UPDATE Document
// ═══════════════════════════════════════════════════════════════
export async function updateDocument(docId, updates) {
  if (!docId) throw new Error('معرف المستند مطلوب');
  const allowed = ['name', 'description', 'category', 'tags', 'visibility', 'caseId', 'litigationLevelId', 'clientId'];
  const filtered = {};

  allowed.forEach(key => {
    if (updates[key] !== undefined) filtered[key] = updates[key];
  });

  if (Object.keys(filtered).length === 0) return;

  filtered.updatedAt = serverTimestamp();
  await updateDoc(doc(db, DOCS_COLLECTION, docId), filtered);
}

// ═══════════════════════════════════════════════════════════════
// DELETE Document (permanent)
// ═══════════════════════════════════════════════════════════════
export async function deleteDocument(docId) {
  if (!docId) throw new Error('معرف المستند مطلوب');
  const docData = await getDocument(docId);

  if (docData.storagePath) {
    const storageRef = ref(storage, docData.storagePath);
    await deleteObject(storageRef).catch(() => {});
  }

  await deleteDoc(doc(db, DOCS_COLLECTION, docId));
}

// ═══════════════════════════════════════════════════════════════
// ARCHIVE Document (soft delete)
// ═══════════════════════════════════════════════════════════════
export async function archiveDocument(docId) {
  if (!docId) throw new Error('معرف المستند مطلوب');
  await updateDoc(doc(db, DOCS_COLLECTION, docId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
export function getFileMeta(fileType, fileName = '') {
  const type = fileType || getFileTypeFromExt(fileName.split('.').pop());

  const map = {
    'application/pdf': { icon: 'FileText', color: '#ef4444', label: 'PDF' },
    'application/msword': { icon: 'FileText', color: '#3b82f6', label: 'Word' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: 'FileText', color: '#3b82f6', label: 'Word' },
    'application/vnd.ms-excel': { icon: 'Table', color: '#10b981', label: 'Excel' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: 'Table', color: '#10b981', label: 'Excel' },
    'image/jpeg': { icon: 'Image', color: '#8b5cf6', label: 'صورة' },
    'image/png': { icon: 'Image', color: '#8b5cf6', label: 'صورة' },
    'text/plain': { icon: 'FileText', color: '#6b7280', label: 'نص' },
  };

  return map[type] || { icon: 'File', color: '#6b7280', label: 'ملف' };
}

export function getCategoryMeta(categoryId) {
  return DOC_CATEGORIES.find(c => c.id === categoryId) || DOC_CATEGORIES[0];
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileTypeFromExt(ext) {
  const map = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    txt: 'text/plain',
  };
  return map[ext] || 'application/octet-stream';
}