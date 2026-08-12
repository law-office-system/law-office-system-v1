import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  color = null,
  style = {},
  disabled = false,
  type = 'button',
  icon: Icon = null,
  ...props
}) {
  const { theme } = useTheme();
  const { button } = theme;

  const sizes = {
    sm: { padding: '8px 12px', fontSize: '12px' },
    md: { padding: '10px 16px', fontSize: '14px' },
    lg: { padding: '12px 20px', fontSize: '15px' },
  };

  const variants = {
    primary: button.primary,
    secondary: button.secondary,
    success: button.success,
    danger: button.danger,
    ghost: button.ghost,
  };

  const baseStyle = color
    ? { ...button.base, background: color, color: '#fff', boxShadow: theme.shadows.glow(color) }
    : variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyle,
        ...sizes[size],
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseOver={(e) => {
        if (!disabled && !color) {
          e.currentTarget.style.filter = 'brightness(1.1)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseOut={(e) => {
        if (!disabled) {
          e.currentTarget.style.filter = 'none';
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}