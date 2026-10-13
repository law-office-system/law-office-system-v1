import React, { useState } from 'react';
import { TEMPLATES } from './templates';

/**
 * 📄 نافذة النماذج الجاهزة
 * ──────────────────────────
 * بتستخدم نفس كلاسات المودال الموجودة في EditorStyles.css
 * (modal-overlay / modal-content / modal-btn) — عشان الشكل موحد بدون CSS جديد
 */
const TemplatesModal = ({ isOpen, currentText, onApply, onCancel }) => {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('pick'); // 'pick' | 'confirm'

  if (!isOpen) return null;

  const hasContent = (currentText || '').trim().length > 50;

  const handleSelect = (tpl) => {
    setSelected(tpl);
    setStep('confirm');
  };

  const handleApply = () => {
    if (selected) onApply(selected);
    setStep('pick');
    setSelected(null);
  };

  const handleBack = () => {
    setStep('pick');
    setSelected(null);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: '92%' }}>
        {step === 'pick' ? (
          <>
            <h3 className="modal-title">📄 نماذج جاهزة</h3>
            <p className="modal-desc">اختر نموذجاً لتحميل هيكله في المحرر، ثم املأ الأماكن النصية بين الأقواس [ ]</p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 10,
              margin: '14px 0',
              maxHeight: '50vh',
              overflowY: 'auto',
            }}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => handleSelect(tpl)}
                  style={{
                    padding: '14px 10px',
                    borderRadius: 10,
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    background: 'rgba(37, 99, 235, 0.06)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.15)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.06)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <span style={{ fontSize: 26 }}>{tpl.icon}</span>
                  <strong style={{ fontSize: 14, color: '#1e293b' }}>{tpl.name}</strong>
                  <span style={{ fontSize: 11, color: '#64748b' }}>{tpl.description}</span>
                </button>
              ))}
            </div>

            <div className="modal-actions">
              <button onClick={onCancel} className="modal-btn secondary">إلغاء</button>
            </div>
          </>
        ) : (
          <>
            <h3 className="modal-title">{selected.icon} {selected.name}</h3>
            <p className="modal-desc" style={{ lineHeight: 1.8 }}>
              سيتم تحميل هيكل النموذج في المحرر
              {hasContent
                ? ' و<b>سيتم استبدال المحتوى الحالي</b>. ننصح بالحفظ أولاً.'
                : '.'}
            </p>
            <div style={{
              background: 'rgba(148, 163, 184, 0.1)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12,
              color: '#64748b',
              maxHeight: 140,
              overflowY: 'auto',
              margin: '10px 0',
              textAlign: 'right',
              direction: 'rtl',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}>
              {selected.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300)}...
            </div>
            <div className="modal-actions">
              <button onClick={handleBack} className="modal-btn secondary">رجوع</button>
              <button onClick={handleApply} className="modal-btn primary">تحميل النموذج</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TemplatesModal;