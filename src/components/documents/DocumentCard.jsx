import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { deleteDocument, updateDocument, getFileMeta, formatFileSize, getCategoryMeta } from '../../services/documents';
import { FileText, File, Image, Table, Download, Trash2, Eye, PenLine, Loader2, Check, X, Briefcase, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocumentCard({ doc, onDelete, onPreview, onUpdate }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  // حالات إعادة التسمية
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(doc.name || doc.fileName || '');
  const [saving, setSaving] = useState(false);

  const isEditorDoc = doc.source === 'editor';
  const meta = isEditorDoc
    ? { icon: 'FileText', color: '#d4af37', label: 'محرر' }
    : getFileMeta(doc.fileType, doc.fileName);
  const catMeta = getCategoryMeta(doc.category);

  const getIcon = () => {
    const props = { size: 26, color: meta.color };
    if (isEditorDoc) return <PenLine {...props} />;
    switch (meta.icon) {
      case 'Image': return <Image {...props} />;
      case 'Table': return <Table {...props} />;
      case 'FileText': return <FileText {...props} />;
      default: return <File {...props} />;
    }
  };

  const handleSaveRename = async () => {
    if (!newName.trim() || newName === doc.name) {
      setIsEditing(false);
      setNewName(doc.name || doc.fileName || '');
      return;
    }

    try {
      setSaving(true);
      await updateDocument(doc.id, { name: newName.trim() });
      doc.name = newName.trim();
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      alert('فشل إعادة التسمية: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستند؟')) return;
    setDeleting(true);
    try {
      await deleteDocument(doc.id);
      onDelete?.(doc.id);
    } catch (err) {
      alert('فشل الحذف: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = () => {
    if (doc.downloadURL) window.open(doc.downloadURL, '_blank');
  };

  const handleOpenEditor = () => {
    navigate(`/documents/editor/${doc.id}`);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div style={{
      background: colors.bg.card,
      border: `1px solid ${colors.border.default}`,
      borderRadius: 16,
      padding: 16,
      transition: 'all 0.2s ease',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = isEditorDoc
        ? (colors.accent.gold?.main || '#d4af37') + '40'
        : colors.accent.blue.main + '40';
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = isEditorDoc
        ? `0 8px 24px ${colors.accent.gold?.main || '#d4af37'}10`
        : `0 8px 24px ${colors.accent.blue.main}10`;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = colors.border.default;
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* File Icon */}
        <div style={{
          width: 52, height: 52,
          background: meta.color + '15',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {getIcon()}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            <span style={{
              padding: '3px 10px', background: catMeta.color + '15',
              color: catMeta.color, borderRadius: 20,
              fontSize: 11, fontWeight: 700,
            }}>
              {catMeta.label}
            </span>
            <span style={{
              padding: '3px 8px', background: meta.color + '15',
              color: meta.color, borderRadius: 8,
              fontSize: 11, fontWeight: 700,
            }}>
              {meta.label}
            </span>
            {isEditorDoc && (
              <span style={{
                padding: '3px 8px', background: 'rgba(212,175,55,0.15)',
                color: '#d4af37', borderRadius: 8,
                fontSize: 11, fontWeight: 700,
              }}>
                ✏️ محرر
              </span>
            )}
            
            {/* عرض رقم القضية أو اسم القضية إن وجد في بيانات المستند */}
            {(doc.caseNumber || doc.caseTitle) && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', background: 'rgba(59, 130, 246, 0.1)',
                color: colors.accent.blue.main, borderRadius: 8,
                fontSize: 11, fontWeight: 700,
              }}>
                <Briefcase size={12} /> قضية: {doc.caseNumber || doc.caseTitle}
              </span>
            )}

            {/* عرض اسم العميل إن وجد في بيانات المستند */}
            {doc.clientName && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', background: 'rgba(16, 185, 129, 0.1)',
                color: colors.accent.green.main, borderRadius: 8,
                fontSize: 11, fontWeight: 700,
              }}>
                <User size={12} /> موكل: {doc.clientName}
              </span>
            )}
          </div>

          {/* Name / Rename Input */}
          {isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={saving}
                autoFocus
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  background: colors.bg.input || '#fff',
                  border: `1px solid ${colors.accent.blue.main}`,
                  borderRadius: 8,
                  color: colors.text.primary,
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleSaveRename}
                disabled={saving}
                style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
                title="حفظ"
              >
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
              </button>
              <button
                onClick={() => { setIsEditing(false); setNewName(doc.name || doc.fileName || ''); }}
                disabled={saving}
                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer' }}
                title="إلغاء"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <h4 style={{
              margin: '0 0 6px 0', color: colors.text.primary,
              fontSize: 15, fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {doc.name || doc.fileName || 'وثيقة بدون عنوان'}
            </h4>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginBottom: 8 }}>
            <span style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: colors.text.muted,
              padding: '3px 8px', background: colors.bg.hover, borderRadius: 8,
            }}>
              {formatDate(doc.updatedAt || doc.uploadedAt)}
            </span>
            {!isEditorDoc && doc.fileSize > 0 && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: 4,
                fontSize: 12, color: colors.text.muted,
                padding: '3px 8px', background: colors.bg.hover, borderRadius: 8,
              }}>
                {formatFileSize(doc.fileSize)}
              </span>
            )}
          </div>

          {doc.description && (
            <p style={{ margin: '0 0 8px 0', color: colors.text.muted, fontSize: 13, lineHeight: 1.5 }}>
              {doc.description}
            </p>
          )}

          {doc.tags?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {doc.tags.map(tag => (
                <span key={tag} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, color: colors.accent.purple.light,
                  padding: '3px 8px', background: colors.accent.purple.bg, borderRadius: 20,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* شريط الأزرار السريعة */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
        paddingTop: 10,
        borderTop: `1px solid ${colors.border.default}`,
      }}>
        {isEditorDoc ? (
          <button onClick={handleOpenEditor} style={actionBtnStyle(colors)}>
            <PenLine size={12} /> فتح بالمحرر
          </button>
        ) : (
          <>
            <button onClick={handleDownload} style={actionBtnStyle(colors)} title="تحميل">
              <Download size={12} /> تحميل
            </button>
            <button onClick={() => onPreview?.(doc)} style={actionBtnStyle(colors)} title="معاينة">
              <Eye size={12} /> معاينة
            </button>
          </>
        )}

        <button onClick={() => setIsEditing(true)} style={actionBtnStyle(colors)} title="إعادة تسمية">
          <PenLine size={12} /> الاسم
        </button>

        <button 
          onClick={handleDelete} 
          style={{ 
            ...actionBtnStyle(colors), 
            color: colors.accent.red.main, 
            background: colors.accent.red.bg || 'rgba(239, 68, 68, 0.1)',
            borderColor: colors.accent.red.main + '40'
          }} 
          title="حذف"
        >
          {deleting ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
          حذف
        </button>
      </div>
    </div>
  );
}

function actionBtnStyle(colors) {
  return {
    padding: '4px 8px',
    background: colors.bg.hover || 'rgba(0,0,0,0.05)',
    border: `1px solid ${colors.border.default}`,
    borderRadius: 6,
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 3,
    fontFamily: 'inherit',
    transition: 'background 0.2s',
    whiteSpace: 'nowrap',
  };
}