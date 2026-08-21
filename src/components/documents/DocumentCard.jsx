import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { deleteDocument, getFileMeta, formatFileSize, getCategoryMeta } from '../../services/documents';
import { FileText, File, Image, Table, Download, Trash2, Eye, MoreVertical, PenLine, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DocumentCard({ doc, onDelete, onPreview }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEditorDoc = doc.source === 'editor';
  const meta = isEditorDoc
    ? { icon: 'FileText', color: '#d4af37', label: 'محرر' }
    : getFileMeta(doc.fileType, doc.fileName);
  const catMeta = getCategoryMeta(doc.category);

  const getIcon = () => {
    const props = { size: 28, color: meta.color };
    if (isEditorDoc) return <PenLine {...props} />;
    switch (meta.icon) {
      case 'Image': return <Image {...props} />;
      case 'Table': return <Table {...props} />;
      case 'FileText': return <FileText {...props} />;
      default: return <File {...props} />;
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
      position: 'relative',
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
          </div>

          {/* Name */}
          <h4 style={{
            margin: '0 0 6px 0', color: colors.text.primary,
            fontSize: 15, fontWeight: 700,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {doc.name || doc.fileName || 'وثيقة بدون عنوان'}
          </h4>

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

        {/* Actions Menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer', padding: 6 }}>
            <MoreVertical size={18} />
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 4px)', left: 0,
              width: 160, background: colors.bg.card,
              border: `1px solid ${colors.border.default}`, borderRadius: 12,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', zIndex: 100, overflow: 'hidden',
            }}>
              {isEditorDoc ? (
                <button onClick={() => { handleOpenEditor(); setMenuOpen(false); }}
                  style={menuItemStyle(colors)}>
                  <PenLine size={14} /> فتح في المحرر
                </button>
              ) : (
                <>
                  <button onClick={() => { handleDownload(); setMenuOpen(false); }}
                    style={menuItemStyle(colors)}>
                    <Download size={14} /> تحميل
                  </button>
                  <button onClick={() => { onPreview?.(doc); setMenuOpen(false); }}
                    style={menuItemStyle(colors)}>
                    <Eye size={14} /> معاينة
                  </button>
                </>
              )}
              <div style={{ height: 1, background: colors.border.default, margin: '4px 8px' }} />
              <button onClick={() => { handleDelete(); setMenuOpen(false); }}
                style={{ ...menuItemStyle(colors), color: colors.accent.red.main }}>
                {deleting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={14} />}
                حذف
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function menuItemStyle(colors) {
  return {
    width: '100%', padding: '10px 14px', background: 'none', border: 'none',
    color: colors.text.secondary, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
    fontFamily: 'inherit', textAlign: 'right', direction: 'rtl',
  };
}