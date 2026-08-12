import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Card({ 
  children, 
  style = {}, 
  variant = 'default',
  hoverable = false,
  onClick, 
  ...props 
}) {
  const { theme } = useTheme();
  const { card, colors } = theme;

  const variants = {
    default: card,
    compact: { ...card, padding: '12px' },
    ghost: { 
      background: 'transparent', 
      border: `1px solid ${colors.border.default}`,
      borderRadius: theme.radius.lg,
      padding: card.padding,
    },
    elevated: {
      ...card,
      boxShadow: theme.shadows.md,
    },
  };

  const baseStyle = variants[variant] || variants.default;

  return (
    <div
      style={{
        ...baseStyle,
        transition: theme.transitions.default,
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