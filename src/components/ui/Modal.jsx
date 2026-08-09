import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { modal as modalStyles, colors, spacing, radius } from '../../styles/design-system';

/**
 * Modal — مكون موحد للنوافذ المنبثقة
 * 
 * Usage:
 * <Modal
 *   isOpen={showForm}
 *   onClose={handleClose}
 *   title="عنوان النافذة"
 *   subtitle="وصف فرعي (اختياري)"
 *   icon={SomeIcon}
 *   iconColor="#60a5fa"
 *   maxWidth="640px"
 *   headerActions={null}
 * >
 *   {children}
 * </Modal>
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle = '',
  icon: Icon = null,
  iconColor = colors.accent.blue.main,
  maxWidth = '640px',
  headerActions = null,
  children,
  showCloseButton = true,
}) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={modalStyles.overlay}
      onClick={handleOverlayClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={modalStyles.container(maxWidth)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={modalStyles.header}>
          <div style={modalStyles.headerLeft}>
            {Icon && (
              <div style={modalStyles.headerIcon(iconColor)}>
                <Icon color={iconColor} size={22} strokeWidth={2.5} />
              </div>
            )}
            <div>
              <h2 style={modalStyles.headerTitle}>{title}</h2>
              {subtitle && <p style={modalStyles.headerSubtitle}>{subtitle}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {headerActions}
            {showCloseButton && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={modalStyles.closeBtn}
                type="button"
                title="إغلاق"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  e.currentTarget.style.color = colors.text.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = colors.text.muted;
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={modalStyles.body}>
          {children}
        </div>
      </div>
    </div>
  );
}