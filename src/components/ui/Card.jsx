import React from 'react';
import { card as cardStyle, colors, radius, shadows, transitions } from '../../styles/design-system';

export default function Card({ 
  children, 
  style = {}, 
  variant = 'default',
  hoverable = false,
  onClick, 
  ...props 
}) {
  const variants = {
    default: cardStyle,
    compact: { ...cardStyle, padding: '12px' },
    ghost: { 
      background: 'transparent', 
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.lg,
      padding: cardStyle.padding,
    },
    elevated: {
      ...cardStyle,
      boxShadow: shadows.md,
    },
  };

  const baseStyle = variants[variant] || variants.default;

  return (
    <div
      style={{
        ...baseStyle,
        transition: transitions.default,
        cursor: onClick ? 'pointer' : 'default',
        ...(hoverable && {
          ':hover': { transform: 'translateY(-2px)' },
        }),
        ...style,
      }}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}