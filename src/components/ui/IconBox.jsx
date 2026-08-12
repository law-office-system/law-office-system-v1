import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function IconBox({ icon: Icon, color, size = 18 }) {
  const { theme } = useTheme();
  const { iconBox } = theme;

  return (
    <div style={iconBox(color)}>
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  );
}