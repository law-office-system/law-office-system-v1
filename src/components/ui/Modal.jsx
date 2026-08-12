import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle = '',
  icon: Icon = null,
  maxWidth = '640px',
  headerActions = null,
  children,
  showCloseButton = true,
}) {
  const { theme } = useTheme();
  const { modal, colors, spacing } = theme;
  const iconColor = colors.accent.blue.main;

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, [isOpen]);

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
      style={modal.overlay}
      onClick={handleOverlayClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        style={modal.container(maxWidth)}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            {Icon && (
              <div style={modal.headerIcon(iconColor)}>
                <Icon color={iconColor} size={22} strokeWidth={2.5} />
              </div>
            )}
            <div>
              <h2 style={modal.headerTitle}>{title}</h2>
              {subtitle && <p style={modal.headerSubtitle}>{subtitle}</p>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
            {headerActions}
            {showCloseButton && (
              <button
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                style={modal.closeBtn}
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

        <div style={modal.body}>
          {children}
        </div>
      </div>
    </div>
  );
}