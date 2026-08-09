import React from 'react';
import { iconBox } from '../../styles/design-system';

export default function IconBox({ icon: Icon, color, size = 18 }) {
  return (
    <div style={iconBox(color)}>
      <Icon size={size} color={color} strokeWidth={2} />
    </div>
  );
}