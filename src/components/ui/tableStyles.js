// ═══════════════════════════════════════════════════════════════
//  TABLE STYLES — Dynamic with Theme Variables
//  تتغير أوتوماتيك لما ThemeContext يغير الـ CSS variables
// ═══════════════════════════════════════════════════════════════

export const td = {
  padding: "12px",
  borderBottom: "1px solid var(--theme-border-default, rgba(55, 65, 81, 0.5))",
  textAlign: "center",
  color: "var(--theme-text-secondary, #d1d5db)",
  transition: "all 0.2s ease",
};

export const tr = {
  transition: "all 0.2s ease",
};

export const hoverRow = {
  background: "var(--theme-bg-hover, rgba(255, 255, 255, 0.03))",
};