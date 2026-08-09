import React from 'react';
import { input, colors, transitions } from '../../styles/design-system';

export default function Input({
  type = 'text',
  name,
  value,
  onChange,
  placeholder,
  label,
  error,
  style = {},
  ...props
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      {label && (
        <label style={{ fontSize: 14, fontWeight: 600, color: colors.text.secondary }}>
          {label}
          {props.required && <span style={{ color: colors.accent.red.main }}> *</span>}
        </label>
      )}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          ...input,
          borderColor: error ? colors.border.error : colors.border.default,
          ...style,
        }}
        {...props}
      />
      {error && (
        <span style={{ color: colors.accent.red.light, fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}