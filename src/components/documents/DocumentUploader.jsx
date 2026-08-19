import React, { useState, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useAuth } from '../../context/AuthContext';
import { uploadDocument, formatFileSize, DOC_CATEGORIES, DOC_VISIBILITY } from '../../services/documents';
import { Upload, X, FileText, Tag, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DocumentUploader({ caseId, clientId, onUpload, onClose }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { userData } = useAuth();

  const [files, setFiles] = useState([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [visibility, setVisibility] = useState(DOC_VISIBILITY.OFFICE);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  }, []);

  const handleFileSelect = (e) => {
    addFiles(Array.from(e.target.files));
  };

  const addFiles = (newFiles) => {
    const allowed = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'txt'];
    const valid = newFiles.filter(f => {
      const ext = f.name.split('.').pop().toLowerCase();
      return allowed.includes(ext);
    });

    setFiles(prev => [...prev, ...valid.map(f => ({
      file: f,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
    }))]);
  };

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleUpload = async () => {
    if (!files.length || !userData?.officeId) return;

    setUploading(true);
    setErrors([]);

    for (const fileObj of files) {
      if (fileObj.status === 'completed') continue;

      try {
        await uploadDocument({
          file: fileObj.file,
          officeId: userData.officeId,
          uploadedBy: userData.uid,
          uploadedByName: userData.name || userData.email || '',
          caseId: caseId || null,
          clientId: clientId || null,
          category,
          tags,
          description,
          name: name || fileObj.file.name,
          visibility,
        });

        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'completed' } : f
        ));
      } catch (err) {
        setErrors(prev => [...prev, { file: fileObj.file.name, error: err.message }]);
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error' } : f
        ));
      }
    }

    setUploading(false);
    onUpload?.();
  };

  const getFileColor = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const map = {
      pdf: colors.accent.red.main,
      doc: colors.accent.blue.main, docx: colors.accent.blue.main,
      xls: colors.accent.green.main, xlsx: colors.accent.green.main,
      jpg: colors.accent.purple.main, jpeg: colors.accent.purple.main, png: colors.accent.purple.main,
    };
    return map[ext] || colors.text.muted;
  };

  return (
    <div style={{
      background: colors.bg.card,
      border: `1px solid ${colors.border.default}`,
      borderRadius: 20,
      padding: 24,
      maxWidth: 600,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            background: `linear-gradient(135deg, ${colors.accent.blue.dark}, ${colors.accent.blue.main})`,
            borderRadius: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Upload size={22} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: colors.text.primary, fontSize: 18, fontWeight: 700 }}>
              رفع مستندات
            </h3>
            <p style={{ margin: '4px 0 0 0', color: colors.text.muted, fontSize: 13 }}>
              PDF, Word, Excel, صور (حد أقصى 10 ميجابايت)
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: colors.text.muted,
            cursor: 'pointer', padding: 8, borderRadius: 10,
          }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = colors.accent.blue.main; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = colors.border.default; }}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input').click()}
        style={{
          border: `2px dashed ${colors.border.default}`,
          borderRadius: 16,
          padding: '40px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          marginBottom: 20,
        }}
      >
        <Upload size={40} color={colors.text.muted} style={{ marginBottom: 12 }} />
        <p style={{ margin: 0, color: colors.text.secondary, fontSize: 15 }}>
          اسحب الملفات هنا أو انقر للاختيار
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {files.map(fileObj => (
            <div key={fileObj.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 14px', background: colors.bg.input,
              borderRadius: 12, marginBottom: 8,
              border: `1px solid ${fileObj.status === 'error' ? colors.accent.red.main + '30' : colors.border.default}`,
            }}>
              <FileText size={18} color={getFileColor(fileObj.file.name)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, color: colors.text.primary, fontSize: 13,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {fileObj.file.name}
                </p>
                <p style={{ margin: '2px 0 0 0', color: colors.text.muted, fontSize: 11 }}>
                  {formatFileSize(fileObj.file.size)}
                </p>
              </div>
              {fileObj.status === 'completed' && <CheckCircle2 size={18} color={colors.accent.green.main} />}
              {fileObj.status === 'error' && <AlertCircle size={18} color={colors.accent.red.main} />}
              <button onClick={() => removeFile(fileObj.id)} disabled={uploading}
                style={{ background: 'none', border: 'none', color: colors.text.muted, cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Name */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.text.secondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          اسم المستند (اختياري)
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم عرض للمستند..."
          style={{
            width: '100%', padding: '10px 14px', background: colors.bg.input,
            border: `1px solid ${colors.border.default}`, borderRadius: 12,
            color: colors.text.primary, fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Category */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.text.secondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          التصنيف
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              style={{
                padding: '6px 14px',
                background: category === cat.id ? colors.accent.blue.bg : colors.bg.input,
                border: `1px solid ${category === cat.id ? colors.accent.blue.main + '40' : colors.border.default}`,
                borderRadius: 20,
                color: category === cat.id ? colors.accent.blue.light : colors.text.muted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Visibility */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.text.secondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          صلاحية الرؤية
        </label>
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          style={{
            width: '100%', padding: '10px 14px', background: colors.bg.input,
            border: `1px solid ${colors.border.default}`, borderRadius: 12,
            color: colors.text.primary, fontSize: 14, fontFamily: 'inherit', outline: 'none',
          }}
        >
          <option value={DOC_VISIBILITY.OFFICE}>فريق المكتب</option>
          <option value={DOC_VISIBILITY.PUBLIC}>عام</option>
          <option value={DOC_VISIBILITY.CASE_TEAM}>فريق القضية</option>
          <option value={DOC_VISIBILITY.PRIVATE}>خاص (أنا فقط)</option>
        </select>
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', color: colors.text.secondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          وصف (اختياري)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="أضف وصفاً للمستند..."
          rows={3}
          style={{
            width: '100%', padding: '10px 14px', background: colors.bg.input,
            border: `1px solid ${colors.border.default}`, borderRadius: 12,
            color: colors.text.primary, fontSize: 14, fontFamily: 'inherit',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: colors.text.secondary, fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          <Tag size={14} /> وسوم (اختياري)
        </label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span key={tag} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 10px', background: colors.accent.blue.bg,
              color: colors.accent.blue.light, borderRadius: 20,
              fontSize: 12, fontWeight: 600,
            }}>
              {tag}
              <button onClick={() => setTags(tags.filter(t => t !== tag))}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="أضف وسم..."
            style={{
              flex: 1, padding: '8px 14px', background: colors.bg.input,
              border: `1px solid ${colors.border.default}`, borderRadius: 12,
              color: colors.text.primary, fontSize: 13, fontFamily: 'inherit', outline: 'none',
            }}
          />
          <button onClick={addTag}
            style={{
              padding: '8px 16px', background: colors.accent.blue.main, color: 'white',
              border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
            إضافة
          </button>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          padding: 12, background: colors.accent.red.bg,
          border: `1px solid ${colors.accent.red.main}30`, borderRadius: 12, marginBottom: 16,
        }}>
          {errors.map((err, i) => (
            <p key={i} style={{ margin: 0, color: colors.accent.red.main, fontSize: 13 }}>
              <AlertCircle size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
              {err.file}: {err.error}
            </p>
          ))}
        </div>
      )}

      {/* Upload Button */}
      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        style={{
          width: '100%', padding: '14px',
          background: uploading ? colors.bg.hover : colors.accent.blue.dark,
          color: 'white', border: 'none', borderRadius: 14,
          fontSize: 15, fontWeight: 700,
          cursor: uploading || files.length === 0 ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          opacity: uploading || files.length === 0 ? 0.6 : 1,
        }}
      >
        {uploading ? (
          <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> جاري الرفع...</>
        ) : (
          <><Upload size={18} /> رفع {files.length > 0 ? `${files.length} ملف` : 'الملفات'}</>
        )}
      </button>
    </div>
  );
}