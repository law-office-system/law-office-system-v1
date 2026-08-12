import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';

export default function Page({ children }) {
  const { theme } = useTheme();
  const { page } = theme;

  return (
    <div style={page}>
      {children}
    </div>
  );
}