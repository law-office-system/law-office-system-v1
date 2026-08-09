import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { card, sectionTitle, transitions, colors, radius, spacing } from '../../styles/design-system';

export default function Section({ 
  title, 
  icon: Icon, 
  iconColor = colors.accent.blue.light,
  defaultOpen = false, 
  children,
  style = {},
  actions = null,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ 
      ...card, 
      overflow: 'hidden',
      marginBottom: spacing.lg,
      backgroundColor: colors.bg.card,
      ...style 
    }}>
      <button 
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: spacing.responsive,
          background: `linear-gradient(90deg, ${colors.bg.card} 0%, #334155 100%)`,
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          fontFamily: 'inherit',
        }}
      >
        <h2 style={{
          ...sectionTitle,
          color: '#fff',
          textShadow: 'none',
        }}>
          {Icon && <Icon size={22} color={iconColor} strokeWidth={2.5} />}
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {actions}
          <ChevronDown 
            size={20} 
            color={colors.text.muted}
            style={{
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: transitions.default,
            }}
          />
        </div>
      </button>

      <div style={{
        maxHeight: open ? '20000px' : '0px',
        opacity: open ? 1 : 0,
        overflow: 'hidden',
        transition: transitions.slow,
      }}>
        <div style={{ padding: `0 ${spacing.responsive} ${spacing.responsive}` }}>
          {children}
        </div>
      </div>
    </div>
  );
}