import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { Highlight } from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import Shape from './ShapeExtension';
import { FontSize, PageBreak, LineHeight, ParagraphSpacing, Indent } from './customExtensions';
import Toolbar from './Toolbar';
import { db } from '../../firebaseDb';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '../../firebaseStorage';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './EditorStyles.css';

const FONT_OPTIONS = [
  { label: 'الافتراضي', value: 'Segoe UI' },
  { label: 'أميري', value: 'Amiri, serif' },
  { label: 'القاهرة', value: 'Cairo, sans-serif' },
  { label: 'تجوال', value: 'Tajawal, sans-serif' },
  { label: 'المراعي', value: 'Almarai, sans-serif' },
];

const toArabicNumbers = (str) => {
  const map = { '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤', '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩' };
  return str.replace(/[0-9]/g, (w) => map[w]);
};

// ═══════════════════════════════════════════════════════════════
// ═══ INTERACTIVE RULER — Per-Paragraph + Page Margins ═══
// ═══════════════════════════════════════════════════════════════
const RULER_WIDTH_CM = 21;
const RULER_PX = 794;
const CM_TO_PX = RULER_PX / RULER_WIDTH_CM;

const InteractiveRuler = ({
  marginRight,
  marginLeft,
  onMarginChange,
  paragraphMode,
}) => {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(null);

  const rightPos = RULER_WIDTH_CM - marginRight;
  const leftPos = marginLeft;

  const handleMouseDown = (side, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(side);
  };

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      if (!rulerRef.current) return;
      const rect = rulerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let cm = (x / rect.width) * RULER_WIDTH_CM;
      cm = Math.max(0, Math.min(RULER_WIDTH_CM, cm));
      cm = Math.round(cm * 10) / 10;

      if (dragging === 'right') {
        const newMarginRight = Math.max(0, Math.min(RULER_WIDTH_CM - leftPos - 2, RULER_WIDTH_CM - cm));
        onMarginChange({ marginRight: newMarginRight, marginLeft });
      } else {
        const newMarginLeft = Math.max(0, Math.min(RULER_WIDTH_CM - marginRight - 2, cm));
        onMarginChange({ marginRight, marginLeft: newMarginLeft });
      }
    };

    const onUp = () => setDragging(null);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [dragging, marginRight, marginLeft, onMarginChange]);

  const marks = Array.from({ length: 21 }, (_, i) => i);

  return (
    <div
      ref={rulerRef}
      className="editor-ruler-interactive"
      dir="ltr"
      style={{
        position: 'relative',
        userSelect: 'none',
        cursor: dragging ? 'ew-resize' : 'default'
      }}
    >
      <div className="ruler-track" />

      {/* Writing area highlight */}
      <div
        className="ruler-writing-area"
        style={{
          position: 'absolute',
          top: 0,
          left: `${(leftPos / RULER_WIDTH_CM) * 100}%`,
          width: `${((rightPos - leftPos) / RULER_WIDTH_CM) * 100}%`,
          height: '100%',
          background: paragraphMode
            ? 'rgba(220, 38, 38, 0.12)'
            : 'rgba(37, 99, 235, 0.08)',
          borderTop: `2px solid ${paragraphMode ? 'rgba(220,38,38,0.4)' : 'rgba(37,99,235,0.3)'}`,
          borderBottom: `2px solid ${paragraphMode ? 'rgba(220,38,38,0.4)' : 'rgba(37,99,235,0.3)'}`,
          pointerEvents: 'none',
        }}
      />

      {marks.map((m) => (
        <span key={m} className="ruler-mark">
          {m}
          <i className="ruler-tick" />
        </span>
      ))}

      {/* Right margin handle */}
      <div
        className={`ruler-handle ruler-handle-right ${dragging === 'right' ? 'dragging' : ''}`}
        style={{ left: `${(rightPos / RULER_WIDTH_CM) * 100}%` }}
        onMouseDown={(e) => handleMouseDown('right', e)}
        title={`الهامش الأيمن: ${marginRight.toFixed(1)} سم`}
      >
        <div className="ruler-triangle ruler-triangle-right"
          style={{ borderColor: paragraphMode ? 'transparent transparent #dc2626 transparent' : undefined }}
        />
        <div className="ruler-handle-label">{marginRight.toFixed(1)}</div>
      </div>

      {/* Left margin handle */}
      <div
        className={`ruler-handle ruler-handle-left ${dragging === 'left' ? 'dragging' : ''}`}
        style={{ left: `${(leftPos / RULER_WIDTH_CM) * 100}%` }}
        onMouseDown={(e) => handleMouseDown('left', e)}
        title={`الهامش الأيسر: ${marginLeft.toFixed(1)} سم`}
      >
        <div className="ruler-triangle ruler-triangle-left"
          style={{ borderColor: paragraphMode ? 'transparent transparent #dc2626 transparent' : undefined }}
        />
        <div className="ruler-handle-label">{marginLeft.toFixed(1)}</div>
      </div>

      {/* Mode indicator */}
      {paragraphMode && (
        <div className="ruler-mode-indicator">
          هوامش الفقرة المحددة
        </div>
      )}
    </div>
  );
};

// ═══ Modal ═══
const NameModal = ({ isOpen, initialName, onConfirm, onCancel }) => {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3 className="modal-title">حفظ الوثيقة</h3>
        <p className="modal-desc">اختر اسماً للوثيقة قبل الحفظ:</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسم الوثيقة..."
          autoFocus
          className="modal-input"
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && onConfirm(name)}
        />
        <div className="modal-actions">
          <button onClick={onCancel} className="modal-btn secondary">إلغاء</button>
          <button
            onClick={() => name.trim() && onConfirm(name)}
            className="modal-btn primary"
            disabled={!name.trim()}
          >
            حفظ
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══ Debounce ═══
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

const LegalEditor = ({ tenantId, documentId, userId, userName = 'محامٍ', onSave }) => {
  const [title, setTitle] = useState('وثيقة جديدة');
  const [saveStatus, setSaveStatus] = useState('جاهز');
  const [lastSaved, setLastSaved] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFont, setSelectedFont] = useState('Segoe UI');
  const [selectedFontSize, setSelectedFontSize] = useState('16');
  const [showNameModal, setShowNameModal] = useState(false);

  // ═══ Page margins (global) ═══
  const [pageMarginRight, setPageMarginRight] = useState(2.5);
  const [pageMarginLeft, setPageMarginLeft] = useState(2.5);

  // ═══ Paragraph mode state ═══
  const [paragraphMode, setParagraphMode] = useState(false);
  const [selectedParagraphMargins, setSelectedParagraphMargins] = useState({ marginRight: 0, marginLeft: 0 });

  // ═══ Store paragraph position for margin updates ═══
  const paragraphPosRef = useRef(null);

  const fileInputRef = useRef(null);
  const editorContentRef = useRef(null);

  const marginRightPx = pageMarginRight * CM_TO_PX;
  const marginLeftPx = pageMarginLeft * CM_TO_PX;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: false,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'right'
      }),
      Placeholder.configure({ placeholder: 'ابدأ كتابة الوثيقة القانونية هنا...' }),
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: { style: 'text-align: right; direction: rtl;' },
      }),
      TableCell.configure({
        HTMLAttributes: { style: 'text-align: right; direction: rtl;' },
      }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: true, allowBase64: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize,
      PageBreak,
      LineHeight,
      ParagraphSpacing,
      Indent,
      Shape,
    ],
    content: '<p>بسم الله الرحمن الرحيم</p>',
    autofocus: 'end',
    editorProps: {
      attributes: {
        class: 'legal-editor-content',
        dir: 'rtl',
        lang: 'ar',
      },
      handleTextInput: (view, from, to, text) => {
        if (/[a-zA-Z@#\/]/.test(text)) return false;
        const $pos = view.state.doc.resolve(from);
        const marks = $pos.marks();
        if (marks.some(m => m.type.name === 'link')) return false;
        if (/^https?:\/\//.test(text) || /^www\./.test(text)) return false;

        const arabicText = toArabicNumbers(text);
        if (arabicText !== text) {
          view.dispatch(view.state.tr.insertText(arabicText, from, to));
          return true;
        }
        return false;
      },
      handleKeyDown: (view, event) => {
        const { state } = view;
        const { $from } = state.selection;

        let inShape = false;
        for (let d = $from.depth; d >= 0; d--) {
          if ($from.node(d)?.type?.name === 'shape') {
            inShape = true;
            break;
          }
        }

        if (inShape && event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          view.dispatch(state.tr.insertText('\n', state.selection.from));
          return true;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          const { schema, tr } = view.state;
          const pageBreakNode = schema.nodes.pageBreak?.create();
          if (pageBreakNode) {
            view.dispatch(tr.replaceSelectionWith(pageBreakNode));
          }
          return true;
        }

        if (event.key === 'Tab') {
          let inTable = false;
          for (let d = $from.depth; d >= 0; d--) {
            const nodeType = $from.node(d)?.type?.name;
            if (nodeType === 'tableCell' || nodeType === 'tableHeader') {
              inTable = true;
              break;
            }
          }

          if (inTable) return false;

          if (!inShape) {
            event.preventDefault();
            const isIncrease = !event.shiftKey;
            const { from, to } = state.selection;
            const tr = state.tr;
            let modified = false;
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (['paragraph', 'heading', 'listItem'].includes(node.type.name)) {
                const current = node.attrs.indent || 0;
                const newIndent = isIncrease ? current + 1 : Math.max(0, current - 1);
                if (isIncrease || current > 0) {
                  tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: newIndent });
                  modified = true;
                }
              }
            });
            if (modified) view.dispatch(tr);
            return true;
          }
        }

        return false;
      },
    },
    onSelectionUpdate: ({ editor }) => {
      // ═══ Detect paragraph/heading under cursor ═══
      const { $from } = editor.state.selection;

      let targetNode = null;
      let targetPos = null;
      for (let d = $from.depth; d >= 0; d--) {
        const node = $from.node(d);
        if (node && (node.type.name === 'paragraph' || node.type.name === 'heading')) {
          targetNode = node;
          targetPos = $from.before(d);
          break;
        }
      }

      if (targetNode) {
        const attrs = targetNode.attrs;
        setParagraphMode(true);
        setSelectedParagraphMargins({
          marginRight: attrs.marginRight || 0,
          marginLeft: attrs.marginLeft || 0,
        });
        paragraphPosRef.current = targetPos;
      } else {
        setParagraphMode(false);
        paragraphPosRef.current = null;
      }
    },
  });

  // ═══ Update editor font ═══
  useEffect(() => {
    if (editor) {
      const el = editor.view.dom;
      el.style.fontFamily = selectedFont;
    }
  }, [selectedFont, editor]);

  useEffect(() => {
    if (editor && selectedFontSize) {
      const el = editor.view.dom;
      el.style.fontSize = selectedFontSize + 'pt';
    }
  }, [selectedFontSize, editor]);

  const handleImageUpload = async (file) => {
    if (!file || !tenantId) return;
    try {
      const storagePath = `offices/${tenantId}/editor-images/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      if (editor) editor.chain().focus().setImage({ src: downloadURL }).run();
    } catch (error) {
      console.error('❌ فشل رفع الصورة:', error);
      alert('فشل رفع الصورة');
    }
  };

  const onFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) handleImageUpload(file);
    e.target.value = '';
  };

  // ─── تحميل الوثيقة ───
  useEffect(() => {
    const loadDocument = async () => {
      if (!tenantId || !documentId) { setIsLoading(false); return; }
      try {
        const docRef = doc(db, 'documents', documentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTitle(data.name || data.title || 'وثيقة جديدة');
          if (editor && data.contentJSON) {
            editor.commands.setContent(data.contentJSON);
          }
          if (data.fontFamily) setSelectedFont(data.fontFamily);
          if (data.fontSize) setSelectedFontSize(data.fontSize);
          if (data.marginRight !== undefined) setPageMarginRight(data.marginRight);
          if (data.marginLeft !== undefined) setPageMarginLeft(data.marginLeft);
          setLastSaved(data.updatedAt?.toDate() || new Date());
        }
      } catch (error) {
        console.error('❌ خطأ في التحميل:', error);
      } finally {
        setIsLoading(false);
      }
    };
    if (editor) loadDocument();
  }, [editor, tenantId, documentId]);

  // ─── الحفظ ───
  const doSave = useCallback(async (docTitle) => {
    if (!editor || !tenantId || !documentId) return;
    setSaveStatus('جاري الحفظ...');
    try {
      const contentJSON = editor.getJSON();
      const contentHTML = editor.getHTML();
      const docRef = doc(db, 'documents', documentId);
      await setDoc(docRef, {
        name: docTitle,
        title: docTitle,
        contentJSON,
        contentHTML,
        authorId: userId,
        uploadedBy: userId,
        officeId: tenantId,
        source: 'editor',
        type: 'legal_document',
        status: 'active',
        fileName: null,
        fileSize: 0,
        fileType: 'text/html',
        storagePath: null,
        downloadURL: null,
        category: 'general',
        tags: [],
        visibility: 'office',
        description: '',
        fontFamily: selectedFont,
        fontSize: selectedFontSize,
        marginRight: pageMarginRight,
        marginLeft: pageMarginLeft,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });
      setSaveStatus('تم الحفظ ✅');
      setLastSaved(new Date());
      if (onSave) onSave({ title: docTitle, contentJSON, contentHTML, marginRight: pageMarginRight, marginLeft: pageMarginLeft });
      setTimeout(() => setSaveStatus('جاهز'), 2000);
    } catch (error) {
      console.error('❌ خطأ في الحفظ:', error);
      setSaveStatus('فشل الحفظ ❌');
    }
  }, [editor, tenantId, documentId, userId, selectedFont, selectedFontSize, pageMarginRight, pageMarginLeft, onSave]);

  const requestSave = useCallback(() => {
    if (title === 'وثيقة جديدة' || !title.trim()) {
      setShowNameModal(true);
    } else {
      doSave(title);
    }
  }, [title, doSave]);

  const handleNameConfirm = (newName) => {
    if (newName.trim()) {
      setTitle(newName);
      setShowNameModal(false);
      doSave(newName);
    }
  };

  // ─── حفظ تلقائي ───
  const debouncedContent = useDebounce(editor?.getJSON(), 5000);

  useEffect(() => {
    if (!editor || !debouncedContent || title === 'وثيقة جديدة') return;
    const timer = setTimeout(() => {
      if (editor.isFocused) {
        doSave(title);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [debouncedContent, editor, doSave, title]);

  // ─── Ctrl+S ───
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        requestSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [requestSave]);

  // ═══ Margin change handler — Page OR Paragraph ═══
  const handleMarginChange = useCallback(({ marginRight: mr, marginLeft: ml }) => {
    if (!editor) return;

    if (paragraphMode && paragraphPosRef.current !== null) {
      // Apply to the current paragraph using setNodeMarkup
      const { state } = editor;
      const pos = paragraphPosRef.current;
      const node = state.doc.nodeAt(pos);

      if (node && ['paragraph', 'heading'].includes(node.type.name)) {
        const tr = state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          marginRight: mr,
          marginLeft: ml,
        });
        editor.view.dispatch(tr);
        setSelectedParagraphMargins({ marginRight: mr, marginLeft: ml });
      }
    } else {
      // Apply to page
      setPageMarginRight(mr);
      setPageMarginLeft(ml);
    }
  }, [editor, paragraphMode]);

  // ─── Reset paragraph margins ───
  const resetParagraphMargins = useCallback(() => {
    if (!editor || paragraphPosRef.current === null) return;

    const { state } = editor;
    const pos = paragraphPosRef.current;
    const node = state.doc.nodeAt(pos);

    if (node && ['paragraph', 'heading'].includes(node.type.name)) {
      const tr = state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        marginRight: null,
        marginLeft: null,
      });
      editor.view.dispatch(tr);
    }

    setParagraphMode(false);
    setSelectedParagraphMargins({ marginRight: 0, marginLeft: 0 });
    paragraphPosRef.current = null;
  }, [editor]);

  if (isLoading) {
    return (
      <div className="legal-editor-wrapper">
        <div className="loading-state">⏳ جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="legal-editor-wrapper" dir="rtl">
      <style>{`
        .legal-editor-content.ProseMirror {
          min-height: 297mm !important;
          padding-right: ${marginRightPx}px !important;
          padding-left: ${marginLeftPx}px !important;
        }
        .legal-editor-content.ProseMirror::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 4px,
            rgba(37, 99, 235, 0.25) 4px,
            rgba(37, 99, 235, 0.25) 8px
          );
          pointer-events: none;
          z-index: 1;
          right: ${marginRightPx - 1}px;
        }
        .legal-editor-content.ProseMirror::after {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 4px,
            rgba(37, 99, 235, 0.25) 4px,
            rgba(37, 99, 235, 0.25) 8px
          );
          pointer-events: none;
          z-index: 1;
          left: ${marginLeftPx - 1}px;
        }
      `}</style>
      <input type="file" ref={fileInputRef} accept="image/*" style={{ display: 'none' }} onChange={onFileSelect} />

      <NameModal
        isOpen={showNameModal}
        initialName={title === 'وثيقة جديدة' ? '' : title}
        onConfirm={handleNameConfirm}
        onCancel={() => setShowNameModal(false)}
      />

      <div className="editor-header">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="document-title-input"
          placeholder="عنوان الوثيقة..."
          dir="rtl"
        />
        <div className="editor-meta">
          <span className="save-status">{saveStatus}</span>
          {lastSaved && (
            <span className="last-saved">
              آخر حفظ: {lastSaved.toLocaleTimeString('ar-EG')}
            </span>
          )}
          <button
            onClick={requestSave}
            className="save-btn"
            disabled={saveStatus === 'جاري الحفظ...'}
          >
            💾 حفظ الآن
          </button>
        </div>
      </div>

      <Toolbar
        editor={editor}
        selectedFont={selectedFont}
        setSelectedFont={setSelectedFont}
        selectedFontSize={selectedFontSize}
        setSelectedFontSize={setSelectedFontSize}
        onImageUpload={() => fileInputRef.current?.click()}
      />

      <InteractiveRuler
        marginRight={paragraphMode ? selectedParagraphMargins.marginRight : pageMarginRight}
        marginLeft={paragraphMode ? selectedParagraphMargins.marginLeft : pageMarginLeft}
        onMarginChange={handleMarginChange}
        paragraphMode={paragraphMode}
      />

      <div className="editor-container" ref={editorContentRef}>
        <EditorContent editor={editor} />
      </div>

      <div className="editor-footer">
        <span>👤 {userName}</span>
        <span>📝 الكلمات: {editor?.getText().trim().split(" ").filter(w => w.length > 0).length || 0}</span>
        <span>🔤 الأحرف: {editor?.getText().length || 0}</span>
        <span>📄 الصفحات: ~{Math.ceil((editor?.getText().length || 0) / 1800)}</span>
        <span style={{ color: paragraphMode ? '#dc2626' : '#2563eb', fontWeight: 600 }}>
          {paragraphMode
            ? `📐 هوامش الفقرة: يمين ${selectedParagraphMargins.marginRight.toFixed(1)} سم | يسار ${selectedParagraphMargins.marginLeft.toFixed(1)} سم`
            : `📐 هوامش الصفحة: يمين ${pageMarginRight.toFixed(1)} سم | يسار ${pageMarginLeft.toFixed(1)} سم`
          }
        </span>
        {paragraphMode && (
          <button
            onClick={resetParagraphMargins}
            className="reset-paragraph-margins-btn"
          >
            إعادة تعيين هوامش الفقرة
          </button>
        )}
      </div>
    </div>
  );
};

export default LegalEditor;