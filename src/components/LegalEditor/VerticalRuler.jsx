import React, { useRef, useCallback, useState } from 'react';

/**
 * 📏 المسطرة الرأسية — VerticalRuler
 * ───────────────────────────────────
 * - تظهر طول ورق A4 (0 → 29.7 سم) بنفس مقياس الأفقية (37.8px لكل سم)
 * - مقبض علوي للهامش العلوي + مقبض سفلي للهامش السفلي
 * - وضعان: هوامش الصفحة (أزرق) / هوامش الفقرة المحددة (أحمر)
 * - الوراثة: الفقرة من غير هوامش خاصة بتعرض هوامش الصفحة (أزرق)
 */
const CM_TO_PX = 37.8;
const PAGE_CM = 29.7;

const VerticalRuler = ({
  paragraphMode,
  hasCustomMargins = false,
  selectedParagraphMargins,
  pageMarginTop,
  pageMarginBottom,
  onMarginChange,
  onResetParagraphMargins,
  pageZoom = 1,
}) => {
  const rulerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [activeHandle, setActiveHandle] = useState(null);

  const marginTopCm = paragraphMode
    ? (selectedParagraphMargins?.marginTop ?? pageMarginTop)
    : pageMarginTop;
  const marginBottomCm = paragraphMode
    ? (selectedParagraphMargins?.marginBottom ?? pageMarginBottom)
    : pageMarginBottom;

  const topPx = marginTopCm * CM_TO_PX;
  const bottomPx = marginBottomCm * CM_TO_PX;

  const startDrag = useCallback((handle) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
    setActiveHandle(handle);

    const move = (ev) => {
      const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
      const rect = rulerRef.current.getBoundingClientRect();
      const yInRuler = (clientY - rect.top) / pageZoom;
      const cm = yInRuler / CM_TO_PX;

      if (handle === 'top') {
        const val = Math.max(0, Math.min(cm, PAGE_CM - 2));
        onMarginChange({ marginTop: Math.round(val * 10) / 10 });
      } else {
        const totalCm = rect.height / pageZoom / CM_TO_PX;
        const fromBottom = totalCm - cm;
        const val = Math.max(0, Math.min(fromBottom, PAGE_CM - 2));
        onMarginChange({ marginBottom: Math.round(val * 10) / 10 });
      }
    };

    const end = () => {
      setDragging(null);
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', end);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
  }, [pageZoom, onMarginChange]);

  const marks = [];
  for (let i = 0; i <= Math.floor(PAGE_CM); i++) {
    marks.push(i);
  }

  const triColor = paragraphMode && hasCustomMargins ? 'paragraph' : '';

  return (
    <div
      ref={rulerRef}
      className="editor-vruler"
      style={{ transform: `scale(${pageZoom})`, transformOrigin: 'top right' }}
    >
      {/* الخط المركزي */}
      <div className="vruler-track" />

      {/* علامات السنتيمتر */}
      {marks.map((i) => (
        <div key={i} className="vruler-mark" style={{ top: i * CM_TO_PX }}>
          {i % 5 === 0 && <span className="vruler-num">{i}</span>}
        </div>
      ))}

      {/* منطقة الكتابة (بين الهامشين) */}
      <div
        className="vruler-writing-area"
        style={{ top: topPx, bottom: bottomPx }}
      />

      {/* مقبض الهامش العلوي */}
      <div
        className={`vruler-handle ${dragging === 'top' ? 'dragging' : ''}`}
        style={{ top: topPx }}
        onMouseDown={startDrag('top')}
        onTouchStart={startDrag('top')}
      >
        <div className={`vruler-triangle-down ${triColor}`} />
        {(activeHandle === 'top' || dragging === 'top') && (
          <div className="vruler-handle-label">{marginTopCm.toFixed(1)} سم</div>
        )}
      </div>

      {/* مقبض الهامش السفلي */}
      <div
        className={`vruler-handle ${dragging === 'bottom' ? 'dragging' : ''}`}
        style={{ bottom: bottomPx }}
        onMouseDown={startDrag('bottom')}
        onTouchStart={startDrag('bottom')}
      >
        <div className={`vruler-triangle-up ${triColor}`} />
        {(activeHandle === 'bottom' || dragging === 'bottom') && (
          <div className="vruler-handle-label">{marginBottomCm.toFixed(1)} سم</div>
        )}
      </div>

      {/* مؤشر وضع الفقرة + زر إعادة الضبط */}
      {paragraphMode && hasCustomMargins && (
        <>
          <div className="ruler-mode-indicator">فقرة</div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={onResetParagraphMargins}
            className="reset-paragraph-margins-btn vruler-reset-btn"
            title="إعادة هوامش الفقرة للافتراضي"
          >
            إعادة
          </button>
        </>
      )}
    </div>
  );
};

export default VerticalRuler;