import React, { useState } from 'react';
import { exportToPDF, exportToDOCX } from './ExportUtils';

const ToolbarButton = ({ onClick, isActive, children, title, disabled }) => (
  <button 
    onClick={onClick} 
    title={title} 
    className={`toolbar-btn ${isActive ? 'active' : ''}`}
    disabled={disabled}
  >
    {children}
  </button>
);

const ToolbarDropdown = ({ value, onChange, options, title, width = 80 }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    title={title}
    className="toolbar-dropdown"
    style={{ width }}
  >
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

const SHAPE_TYPES = [
  { type: 'line', label: '━', title: 'خط مستقيم' },
  { type: 'circle', label: '○', title: 'دائرة' },
  { type: 'square', label: '□', title: 'مربع' },
  { type: 'rectangle', label: '▭', title: 'مستطيل' },
  { type: 'triangle', label: '△', title: 'مثلث' },
];

const FONT_SIZE_OPTIONS = [
  { label: '8', value: '8' }, { label: '9', value: '9' },
  { label: '10', value: '10' }, { label: '11', value: '11' },
  { label: '12', value: '12' }, { label: '14', value: '14' },
  { label: '16', value: '16' }, { label: '18', value: '18' },
  { label: '20', value: '20' }, { label: '22', value: '22' },
  { label: '24', value: '24' }, { label: '26', value: '26' },
  { label: '28', value: '28' }, { label: '32', value: '32' },
  { label: '36', value: '36' }, { label: '40', value: '40' },
  { label: '44', value: '44' }, { label: '48', value: '48' },
  { label: '54', value: '54' }, { label: '60', value: '60' },
  { label: '72', value: '72' },
];

const LINE_HEIGHT_OPTIONS = [
  { label: '1.0', value: '1.0' }, { label: '1.15', value: '1.15' },
  { label: '1.5', value: '1.5' }, { label: '2.0', value: '2.0' },
  { label: '2.5', value: '2.5' },
];

const SPACING_OPTIONS = [
  { label: '0', value: '0' }, { label: '6', value: '6' },
  { label: '12', value: '12' }, { label: '18', value: '18' },
  { label: '24', value: '24' }, { label: '36', value: '36' },
  { label: '48', value: '48' },
];

const Toolbar = ({ editor, selectedFont, setSelectedFont, selectedFontSize, setSelectedFontSize, onImageUpload, editorContentRef }) => {
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showShapes, setShowShapes] = useState(false);
  const [showSpacingPanel, setShowSpacingPanel] = useState(false);

  if (!editor) return null;

  const addLink = () => {
    if (linkUrl) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
      setLinkUrl('');
      setShowLinkInput(false);
    }
  };

  const insertDate = () => {
    const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    editor.chain().focus().insertContent(today).run();
  };

  const insertSignature = () => {
    editor.chain().focus().insertContent('<p style="margin-top:40px;">_________________________</p><p style="text-align:center;">التوقيع</p>').run();
  };

  const insertShape = (shapeType) => {
    editor.chain().focus().insertShape(shapeType).run();
    setShowShapes(false);
  };

  const insertPageBreak = () => {
    editor.chain().focus().insertPageBreak().run();
  };

  const handleFontSizeChange = (size) => {
    setSelectedFontSize(size);
    if (size && size !== 'auto') {
      editor.chain().focus().setFontSize(size).run();
    } else {
      editor.chain().focus().unsetFontSize().run();
    }
  };

  const handleLineHeightChange = (value) => {
    editor.chain().focus().setLineHeight(value).run();
  };

  const handleSpacingTopChange = (value) => {
    editor.chain().focus().setParagraphSpacing({ top: parseInt(value) }).run();
  };

  const handleSpacingBottomChange = (value) => {
    editor.chain().focus().setParagraphSpacing({ bottom: parseInt(value) }).run();
  };

  const increaseIndent = () => {
    editor.chain().focus().increaseIndent().run();
  };

  const decreaseIndent = () => {
    editor.chain().focus().decreaseIndent().run();
  };

  // Check if cursor is inside a table
  const isInTable = editor.isActive('table');

  const currentFontSize = editor.getAttributes('textStyle').fontSize || selectedFontSize || '16';

  // Get current line height from editor
  const currentLineHeight = editor.getAttributes('paragraph')?.lineHeight || 
                           editor.getAttributes('heading')?.lineHeight || '2.0';

  // ═══ FIXED: Use editorContentRef for PDF export ═══
  const handleExportPDF = () => {
    const element = editorContentRef?.current?.querySelector('.legal-editor-content') || 
                    document.querySelector('.legal-editor-content');
    if (element) {
      exportToPDF(element, title || 'وثيقة قانونية');
    }
  };

  // ═══ FIXED: Safe DOCX export ═══
  const handleExportDOCX = () => {
    try {
      const json = editor.getJSON();
      exportToDOCX(json, title || 'وثيقة قانونية');
    } catch (err) {
      console.error('Export error:', err);
      alert('فشل التصدير: ' + err.message);
    }
  };

  // Get document title from parent (passed via props or read from DOM)
  const title = editorContentRef?.current?.closest('.legal-editor-wrapper')?.querySelector('.document-title-input')?.value || 'وثيقة قانونية';

  return (
    <div className="editor-toolbar" dir="rtl">

      {/* ═══ المجموعة 1: التراجع والإعادة ═══ */}
      <div className="toolbar-group">
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="تراجع (Ctrl+Z)">↩️</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="إعادة (Ctrl+Y)">↪️</ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 2: الخط وحجمه ═══ */}
      <div className="toolbar-group">
        <select
          value={selectedFont}
          onChange={(e) => setSelectedFont(e.target.value)}
          title="نوع الخط"
          className="toolbar-dropdown"
          style={{ width: 110 }}
        >
          <option value="Segoe UI">الافتراضي</option>
          <option value="Amiri, serif">أميري</option>
          <option value="Cairo, sans-serif">القاهرة</option>
          <option value="Tajawal, sans-serif">تجوال</option>
          <option value="Almarai, sans-serif">المراعي</option>
        </select>

        <ToolbarDropdown
          value={currentFontSize}
          onChange={handleFontSizeChange}
          options={FONT_SIZE_OPTIONS}
          title="حجم الخط (pt)"
          width={60}
        />

        <span className="toolbar-label">pt</span>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 3: تنسيق النص ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBold().run()} 
          isActive={editor.isActive('bold')} 
          title="عريض (Ctrl+B)"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          isActive={editor.isActive('italic')} 
          title="مائل (Ctrl+I)"
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleUnderline().run()} 
          isActive={editor.isActive('underline')} 
          title="تسطير (Ctrl+U)"
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleStrike().run()} 
          isActive={editor.isActive('strike')} 
          title="شطب"
        >
          <s>S</s>
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 4: الألوان ═══ */}
      <div className="toolbar-group toolbar-colors">
        <div className="color-wrapper" title="لون الخط">
          <span className="color-label">A</span>
          <input 
            type="color" 
            value={editor.getAttributes('textStyle').color || '#000000'}
            onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            className="toolbar-color-input"
          />
        </div>
        <div className="color-wrapper" title="تظليل">
          <span className="color-label" style={{ background: '#fef08a', padding: '0 4px', borderRadius: 2 }}>H</span>
          <input 
            type="color" 
            value="#ffff00"
            onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            className="toolbar-color-input"
          />
        </div>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 5: المحاذاة ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('right').run()} 
          isActive={editor.isActive({ textAlign: 'right' })} 
          title="محاذاة لليمين"
        >
          ⬅️
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('center').run()} 
          isActive={editor.isActive({ textAlign: 'center' })} 
          title="توسيط"
        >
          ⬆️
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('left').run()} 
          isActive={editor.isActive({ textAlign: 'left' })} 
          title="محاذاة لليسار"
        >
          ➡️
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setTextAlign('justify').run()} 
          isActive={editor.isActive({ textAlign: 'justify' })} 
          title="ضبط"
        >
          ⬌
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 6: المسافة البادئة ═══ */}
      <div className="toolbar-group">
        <ToolbarButton onClick={increaseIndent} title="زيادة المسافة البادئة (Tab)">
          →|
        </ToolbarButton>
        <ToolbarButton onClick={decreaseIndent} title="تقليل المسافة البادئة (Shift+Tab)">
          |←
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 7: العناوين ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          isActive={editor.isActive('heading', { level: 1 })} 
          title="عنوان رئيسي"
        >
          <span style={{ fontSize: 16, fontWeight: 'bold' }}>H1</span>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          isActive={editor.isActive('heading', { level: 2 })} 
          title="عنوان فرعي"
        >
          <span style={{ fontSize: 14, fontWeight: 'bold' }}>H2</span>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
          isActive={editor.isActive('heading', { level: 3 })} 
          title="عنوان ثالث"
        >
          <span style={{ fontSize: 12, fontWeight: 'bold' }}>H3</span>
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().setParagraph().run()} 
          isActive={editor.isActive('paragraph')} 
          title="فقرة عادية"
        >
          ¶
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 8: القوائم ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          isActive={editor.isActive('bulletList')} 
          title="قائمة نقطية"
        >
          • قائمة
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().toggleOrderedList().run()} 
          isActive={editor.isActive('orderedList')} 
          title="قائمة مرقمة"
        >
          ١. قائمة
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 9: تباعد الأسطر ═══ */}
      <div className="toolbar-group">
        <span className="toolbar-label-sm">تباعد:</span>
        <ToolbarDropdown
          value={currentLineHeight}
          onChange={handleLineHeightChange}
          options={LINE_HEIGHT_OPTIONS}
          title="تباعد الأسطر"
          width={55}
        />
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 10: مسافات الفقرة ═══ */}
      <div className="toolbar-group">
        <button 
          onClick={() => setShowSpacingPanel(!showSpacingPanel)}
          className={`toolbar-btn ${showSpacingPanel ? 'active' : ''}`}
          title="مسافات الفقرة"
        >
          ⇅ مسافات
        </button>
      </div>

      {showSpacingPanel && (
        <div className="spacing-panel">
          <div className="spacing-row">
            <span className="spacing-label">قبل:</span>
            <ToolbarDropdown
              value="0"
              onChange={handleSpacingTopChange}
              options={SPACING_OPTIONS}
              title="مسافة قبل الفقرة (px)"
              width={55}
            />
            <span className="spacing-unit">px</span>
          </div>
          <div className="spacing-row">
            <span className="spacing-label">بعد:</span>
            <ToolbarDropdown
              value="16"
              onChange={handleSpacingBottomChange}
              options={SPACING_OPTIONS}
              title="مسافة بعد الفقرة (px)"
              width={55}
            />
            <span className="spacing-unit">px</span>
          </div>
        </div>
      )}

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 11: جداول ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} 
          title="إدراج جدول"
        >
          📊 جدول
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().addColumnAfter().run()} 
          title="إضافة عمود"
          disabled={!isInTable}
        >
          ➕ عمود
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().deleteColumn().run()} 
          title="حذف عمود"
          disabled={!isInTable}
        >
          ➖ عمود
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().addRowAfter().run()} 
          title="إضافة صف"
          disabled={!isInTable}
        >
          ➕ صف
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().deleteRow().run()} 
          title="حذف صف"
          disabled={!isInTable}
        >
          ➖ صف
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => editor.chain().focus().deleteTable().run()} 
          title="حذف الجدول كاملاً"
          disabled={!isInTable}
        >
          🗑️ جدول
        </ToolbarButton>
      </div>

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 12: إدراج ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={() => setShowLinkInput(!showLinkInput)} 
          isActive={editor.isActive('link')} 
          title="رابط تشعبي"
        >
          🔗 رابط
        </ToolbarButton>
        <ToolbarButton 
          onClick={onImageUpload} 
          title="صورة من الجهاز"
        >
          🖼️ صورة
        </ToolbarButton>
        <ToolbarButton 
          onClick={() => setShowShapes(!showShapes)} 
          title="أشكال هندسية"
        >
          🔷 أشكال
        </ToolbarButton>
        <ToolbarButton 
          onClick={insertPageBreak} 
          title="فاصل صفحة (Ctrl+Enter)"
        >
          ⤶ فاصل
        </ToolbarButton>
        <ToolbarButton 
          onClick={insertDate} 
          title="تاريخ اليوم"
        >
          📅 تاريخ
        </ToolbarButton>
        <ToolbarButton 
          onClick={insertSignature} 
          title="مكان التوقيع"
        >
          ✍️ توقيع
        </ToolbarButton>
      </div>

      {/* رابط */}
      {showLinkInput && (
        <div className="toolbar-popup">
          <input 
            type="text" 
            value={linkUrl} 
            onChange={(e) => setLinkUrl(e.target.value)} 
            placeholder="https://..." 
            className="toolbar-popup-input"
            autoFocus
          />
          <button onClick={addLink} className="toolbar-popup-btn">إضافة</button>
          <button onClick={() => setShowLinkInput(false)} className="toolbar-popup-btn secondary">إلغاء</button>
        </div>
      )}

      {/* أشكال */}
      {showShapes && (
        <div className="toolbar-popup">
          {SHAPE_TYPES.map(shape => (
            <button 
              key={shape.type} 
              onClick={() => insertShape(shape.type)} 
              title={shape.title}
              className="shape-btn"
            >
              {shape.label}
            </button>
          ))}
        </div>
      )}

      <div className="toolbar-divider" />

      {/* ═══ المجموعة 13: التصدير ═══ */}
      <div className="toolbar-group">
        <ToolbarButton 
          onClick={handleExportPDF} 
          title="تصدير PDF"
        >
          📄 PDF
        </ToolbarButton>
        <ToolbarButton 
          onClick={handleExportDOCX} 
          title="تصدير Word"
        >
          📝 Word
        </ToolbarButton>
      </div>
    </div>
  );
};

export default Toolbar;