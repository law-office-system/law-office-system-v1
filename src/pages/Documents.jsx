import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useAuth } from '../context/AuthContext';
import { getDocuments, DOC_CATEGORIES } from '../services/documents';
import DocumentUploader from '../components/documents/DocumentUploader';
import DocumentCard from '../components/documents/DocumentCard';
import { FileArchive, Search, Upload, Grid3X3, List, Loader2, X, FileText, AlertTriangle, PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Documents() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { userData } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUploader, setShowUploader] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [indexError, setIndexError] = useState(false);
  const [indexUrl, setIndexUrl] = useState('');

  const searchTimeout = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [search]);

  const loadDocuments = useCallback(async () => {
    if (!userData?.officeId) return;
    setLoading(true);
    setIndexError(false);
    setIndexUrl('');

    try {
      const filters = {};
      if (debouncedSearch) filters.search = debouncedSearch;
      if (filterCategory !== 'all') filters.category = filterCategory;
      if (filterSource !== 'all') filters.source = filterSource;

      const docs = await getDocuments(userData.officeId, filters);
      setDocuments(docs);
    } catch (err) {
      console.error('Failed to load documents:', err);

      if (err.message?.includes('requires an index') || err.code === 'failed-precondition') {
        setIndexError(true);
        const urlMatch = err.message?.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
        if (urlMatch) setIndexUrl(urlMatch[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [userData?.officeId, debouncedSearch, filterCategory, filterSource]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadComplete = () => {
    setShowUploader(false);
    loadDocuments();
  };

  const handleDelete = (docId) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const stats = {
    total: documents.length,
    uploads: documents.filter(d => d.source === 'upload' || !d.source).length,
    editor: documents.filter(d => d.source === 'editor').length,
    byCategory: DOC_CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = documents.filter(d => d.category === cat.id).length;
      return acc;
    }, {}),
  };

  return (
    <div style={{
      padding: 'clamp(16px, 4vw, 24px)',
      maxWidth: 1200,
      margin: '0 auto',
      minHeight: '100vh',
      background: colors.bg.page,
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52,
            background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
            borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 24px ${colors.accent.blue.main}30`,
          }}>
            <FileArchive size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, color: colors.text.primary, fontSize: 24, fontWeight: 700 }}>
              المستندات
            </h1>
            <p style={{ margin: '4px 0 0 0', color: colors.text.muted, fontSize: 14 }}>
              إدارة ملفات المكتب والقضايا والوثائق القانونية
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/documents/editor/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', background: colors.accent.gold?.dark || '#d4af37',
              color: '#0a0e1a', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <PenLine size={18} />
            وثيقة جديدة
          </button>
          <button
            onClick={() => setShowUploader(!showUploader)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', background: colors.accent.blue.dark,
              color: 'white', border: 'none', borderRadius: 14,
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', boxShadow: `0 4px 16px ${colors.accent.blue.main}30`,
            }}
          >
            <Upload size={18} />
            رفع مستند
          </button>
        </div>
      </div>

      {/* Index Error Banner */}
      {indexError && (
        <div style={{
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: 14,
          padding: '14px 18px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <AlertTriangle size={20} color="#b45309" />
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, color: '#92400e', fontWeight: 700, fontSize: 14 }}>
              ⚠️ يجب إنشاء Index في Firestore
            </p>
            <p style={{ margin: '4px 0 0 0', color: '#a16207', fontSize: 13 }}>
              البيانات ظاهرة دلوقتي بس مش مرتبة. افتح الرابط واعمل الـ Index عشان يشتغل بكفاءة.
            </p>
          </div>
          {indexUrl && (
            <a
              href={indexUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: '#f59e0b',
                color: 'white',
                padding: '8px 16px',
                borderRadius: 10,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: 'nowrap',
              }}
            >
              إنشاء Index →
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: 10,
        marginBottom: 20,
      }}>
        <button
          onClick={() => setFilterSource('all')}
          style={{
            padding: '12px', background: filterSource === 'all' ? colors.accent.blue.bg : colors.bg.card,
            border: `1px solid ${filterSource === 'all' ? colors.accent.blue.main + '40' : colors.border.default}`,
            borderRadius: 14, textAlign: 'center', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: colors.accent.blue.main }}>
            {stats.total}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: colors.text.muted, fontWeight: 600 }}>الكل</p>
        </button>

        <button
          onClick={() => setFilterSource('upload')}
          style={{
            padding: '12px', background: filterSource === 'upload' ? colors.accent.blue.bg : colors.bg.card,
            border: `1px solid ${filterSource === 'upload' ? colors.accent.blue.main + '40' : colors.border.default}`,
            borderRadius: 14, textAlign: 'center', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: colors.accent.blue.light }}>
            {stats.uploads}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: colors.text.muted, fontWeight: 600 }}>مرفقة</p>
        </button>

        <button
          onClick={() => setFilterSource('editor')}
          style={{
            padding: '12px', background: filterSource === 'editor' ? colors.accent.gold?.bg || 'rgba(212,175,55,0.1)' : colors.bg.card,
            border: `1px solid ${filterSource === 'editor' ? (colors.accent.gold?.main || '#d4af37') + '40' : colors.border.default}`,
            borderRadius: 14, textAlign: 'center', cursor: 'pointer',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          <p style={{ margin: '0 0 4px 0', fontSize: 20, fontWeight: 700, color: colors.accent.gold?.main || '#d4af37' }}>
            {stats.editor}
          </p>
          <p style={{ margin: 0, fontSize: 11, color: colors.text.muted, fontWeight: 600 }}>محرر</p>
        </button>

        {DOC_CATEGORIES.slice(0, 4).map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(filterCategory === cat.id ? 'all' : cat.id)}
            style={{
              padding: '12px', background: filterCategory === cat.id ? colors.accent.blue.bg : colors.bg.card,
              border: `1px solid ${filterCategory === cat.id ? colors.accent.blue.main + '40' : colors.border.default}`,
              borderRadius: 14, textAlign: 'center', cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all 0.2s',
            }}
          >
            <p style={{ margin: '0 0 4px 0', fontSize: 18, fontWeight: 700, color: colors.accent.blue.light }}>
              {stats.byCategory[cat.id] || 0}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: colors.text.muted, fontWeight: 600 }}>{cat.label}</p>
          </button>
        ))}
      </div>

      {/* Search & Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250 }}>
          <Search size={16} color={colors.text.muted} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
          }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث في المستندات..."
            style={{
              width: '100%', padding: '10px 40px 10px 14px', background: colors.bg.input,
              border: `1px solid ${colors.border.default}`, borderRadius: 14,
              color: colors.text.primary, fontSize: 14, fontFamily: 'inherit',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setViewMode('grid')}
            style={{
              padding: 8, background: viewMode === 'grid' ? colors.accent.blue.bg : 'transparent',
              border: `1px solid ${viewMode === 'grid' ? colors.accent.blue.main + '40' : colors.border.default}`,
              borderRadius: 10, color: viewMode === 'grid' ? colors.accent.blue.light : colors.text.muted,
              cursor: 'pointer',
            }}>
            <Grid3X3 size={18} />
          </button>
          <button onClick={() => setViewMode('list')}
            style={{
              padding: 8, background: viewMode === 'list' ? colors.accent.blue.bg : 'transparent',
              border: `1px solid ${viewMode === 'list' ? colors.accent.blue.main + '40' : colors.border.default}`,
              borderRadius: 10, color: viewMode === 'list' ? colors.accent.blue.light : colors.text.muted,
              cursor: 'pointer',
            }}>
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Uploader */}
      {showUploader && (
        <div style={{ marginBottom: 24 }}>
          <DocumentUploader onUpload={handleUploadComplete} onClose={() => setShowUploader(false)} />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 300, color: colors.text.muted,
        }}>
          <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: colors.text.muted }}>
          <FileArchive size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
          <p style={{ fontSize: 16, fontWeight: 600, margin: '0 0 8px 0' }}>لا توجد مستندات</p>
          <p style={{ fontSize: 14, margin: 0 }}>
            {search || filterCategory !== 'all' || filterSource !== 'all' ? 'جرب تغيير معايير البحث' : 'ابدأ برفع أول مستند أو إنشاء وثيقة جديدة'}
          </p>
        </div>
      ) : (
        <div style={{
          display: viewMode === 'grid' ? 'grid' : 'flex',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          flexDirection: viewMode === 'list' ? 'column' : undefined,
          gap: 16,
        }}>
          {documents.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onDelete={handleDelete}
              onPreview={setSelectedDoc}
            />
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 20,
        }} onClick={() => setSelectedDoc(null)}>
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
              <button onClick={() => setSelectedDoc(null)}
                style={{ background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              {selectedDoc.source === 'editor' ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <PenLine size={64} color={colors.accent.gold?.main || '#d4af37'} />
                  <p style={{ color: colors.text.muted, marginTop: 16 }}>
                    وثيقة من المحرر — افتحها للتعديل
                  </p>
                  <button
                    onClick={() => {
                      setSelectedDoc(null);
                      navigate(`/documents/editor/${selectedDoc.id}`);
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      marginTop: 16, padding: '10px 20px',
                      background: colors.accent.gold?.dark || '#d4af37', color: '#0a0e1a',
                      borderRadius: 12, border: 'none',
                      fontWeight: 700, fontSize: 15, cursor: 'pointer',
                    }}
                  >
                    فتح في المحرر
                  </button>
                </div>
              ) : selectedDoc.fileType?.startsWith('image/') ? (
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
    </div>
  );
}