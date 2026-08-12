// ═══════════════════════════════════════════════════════════════
//  THEMES — Multi-Theme System for Law Office Management
//  يدعم 6 ثيمات + 8 ألوان تمييز قابلة للتخصيص
// ═══════════════════════════════════════════════════════════════

// ── Shared tokens (same across all themes) ──
export const sharedTokens = {
  spacing: {
    xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '20px',
    '2xl': '24px', '3xl': '32px',
    responsive: 'clamp(12px, 4vw, 24px)',
  },
  radius: {
    sm: '8px', md: '12px', lg: '16px', xl: '20px', full: '9999px',
  },
  shadows: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.3)',
    md: '0 4px 16px rgba(0, 0, 0, 0.4)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.5)',
    glow: (color) => `0 0 12px ${color}40`,
    modal: '0 24px 48px rgba(0, 0, 0, 0.4)',
  },
  typography: {
    family: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
    sizes: {
      xs:   'clamp(10px, 3vw, 11px)',
      sm:   'clamp(11px, 3vw, 13px)',
      base: 'clamp(12px, 3.5vw, 14px)',
      md:   'clamp(13px, 4vw, 15px)',
      lg:   'clamp(14px, 4vw, 16px)',
      xl:   'clamp(15px, 4.5vw, 18px)',
      '2xl': 'clamp(18px, 5vw, 22px)',
      '3xl': 'clamp(20px, 5.5vw, 26px)',
    },
    weight: { normal: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 },
  },
  transitions: {
    fast:    'all 0.15s ease',
    default: 'all 0.2s ease',
    slow:    'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

// ── Accent colors (shared, user picks one) ──
export const accentColors = {
  blue:   { main: '#3b82f6', light: '#60a5fa', dark: '#1e40af', bg: 'rgba(30, 64, 175, 0.15)' },
  amber:  { main: '#d97706', light: '#f59e0b', dark: '#b45309', bg: 'rgba(217, 119, 6, 0.15)' },
  green:  { main: '#10b981', light: '#34d399', dark: '#059669', bg: 'rgba(16, 185, 129, 0.15)' },
  red:    { main: '#ef4444', light: '#f87171', dark: '#dc2626', bg: 'rgba(239, 68, 68, 0.15)' },
  purple: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', bg: 'rgba(139, 92, 246, 0.15)' },
  cyan:   { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2', bg: 'rgba(6, 182, 212, 0.15)' },
  rose:   { main: '#f43f5e', light: '#fb7185', dark: '#e11d48', bg: 'rgba(244, 63, 94, 0.15)' },
  gold:   { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', bg: 'rgba(245, 158, 11, 0.15)' },
};

// ── Status colors (shared) ──
export const statusColors = {
  scheduled:     { bg: 'rgba(30, 64, 175, 0.15)',   text: '#60a5fa', border: 'rgba(96, 165, 250, 0.3)' },
  completed:     { bg: 'rgba(16, 185, 129, 0.15)',  text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' },
  postponed:     { bg: 'rgba(245, 158, 11, 0.15)',  text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
  cancelled:     { bg: 'rgba(239, 68, 68, 0.15)',   text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  pending:       { bg: 'rgba(107, 114, 128, 0.15)', text: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' },
  'in-progress': { bg: 'rgba(139, 92, 246, 0.15)',  text: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
};

// ── Theme color palettes ──
const palettes = {
  dark: {
    bg: {
      page: '#0f172a', card: '#1e293b', input: 'rgba(15, 23, 42, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(30, 64, 175, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.75)',
    },
    border: {
      default: 'rgba(55, 65, 81, 0.5)', focus: 'rgba(96, 165, 250, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#f3f4f6', secondary: '#d1d5db', muted: '#9ca3af', disabled: '#6b7280',
    },
  },
  midnight: {
    bg: {
      page: '#0a0a1a', card: '#141428', input: 'rgba(10, 10, 26, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(139, 92, 246, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    border: {
      default: 'rgba(60, 60, 100, 0.5)', focus: 'rgba(167, 139, 250, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#e0e0ff', secondary: '#c4c4e0', muted: '#8888aa', disabled: '#666688',
    },
  },
  emerald: {
    bg: {
      page: '#022c22', card: '#064e3b', input: 'rgba(2, 44, 34, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(16, 185, 129, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    border: {
      default: 'rgba(6, 78, 59, 0.6)', focus: 'rgba(52, 211, 153, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#d1fae5', secondary: '#a7f3d0', muted: '#6ee7b7', disabled: '#34d399',
    },
  },
  rose: {
    bg: {
      page: '#1a0a0a', card: '#2a1212', input: 'rgba(26, 10, 10, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(244, 63, 94, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    border: {
      default: 'rgba(80, 40, 40, 0.5)', focus: 'rgba(253, 164, 175, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#ffe4e6', secondary: '#fecdd3', muted: '#fda4af', disabled: '#fb7185',
    },
  },
  ocean: {
    bg: {
      page: '#0c1e3e', card: '#1e3a5f', input: 'rgba(12, 30, 62, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(56, 189, 248, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    border: {
      default: 'rgba(30, 58, 95, 0.5)', focus: 'rgba(125, 211, 252, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#e0f2fe', secondary: '#bae6fd', muted: '#7dd3fc', disabled: '#38bdf8',
    },
  },
  gold: {
    bg: {
      page: '#1c1917', card: '#292524', input: 'rgba(28, 25, 23, 0.6)',
      hover: 'rgba(255, 255, 255, 0.03)', active: 'rgba(245, 158, 11, 0.15)',
      overlay: 'rgba(0, 0, 0, 0.8)',
    },
    border: {
      default: 'rgba(68, 64, 60, 0.5)', focus: 'rgba(252, 211, 77, 0.5)',
      error: 'rgba(239, 68, 68, 0.4)', success: 'rgba(16, 185, 129, 0.3)',
    },
    text: {
      primary: '#fef3c7', secondary: '#fde68a', muted: '#fcd34d', disabled: '#fbbf24',
    },
  },
};

const themeMeta = {
  dark:     { name: 'الوضع الداكن', description: 'الثيم الافتراضي — أزرق وعنبر' },
  midnight: { name: 'منتصف الليل',   description: 'بنفسجي غامق — أنيق وهادئ' },
  emerald:  { name: 'الزمرد',        description: 'أخضر غامق — طاقة وتركيز' },
  rose:     { name: 'الوردي',        description: 'أحمر دافئ — جريء ومميز' },
  ocean:    { name: 'المحيط',        description: 'أزرق سماوي — هدوء وثقة' },
  gold:     { name: 'الذهبي',        description: 'عنبر كلاسيكي — رسمي وفاخر' },
};

export const THEMES = Object.fromEntries(
  Object.entries(palettes).map(([id, palette]) => [
    id,
    {
      id,
      name: themeMeta[id].name,
      description: themeMeta[id].description,
      colors: {
        ...palette,
        accent: accentColors,
        status: statusColors,
      },
      ...sharedTokens,
    },
  ])
);

export const ACCENT_OPTIONS = [
  { id: 'blue',   name: 'أزرق',   color: '#3b82f6' },
  { id: 'amber',  name: 'عنبر',   color: '#d97706' },
  { id: 'green',  name: 'أخضر',   color: '#10b981' },
  { id: 'red',    name: 'أحمر',   color: '#ef4444' },
  { id: 'purple', name: 'بنفسجي', color: '#8b5cf6' },
  { id: 'cyan',   name: 'سماوي',  color: '#06b6d4' },
  { id: 'rose',   name: 'وردي',   color: '#f43f5e' },
  { id: 'gold',   name: 'ذهبي',   color: '#f59e0b' },
];

export const DEFAULT_THEME  = 'dark';
export const DEFAULT_ACCENT = 'blue';

/**
 * Returns a complete theme-aware design system object.
 * Mirrors the exports of design-system.js but uses the selected theme colors.
 */
export function getTheme(themeId = DEFAULT_THEME, accentId = DEFAULT_ACCENT) {
  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];
  const accent = theme.colors.accent[accentId] || theme.colors.accent[DEFAULT_ACCENT];
  const { colors, spacing, radius, shadows, typography, transitions } = theme;

  const card = {
    background: colors.bg.card,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.lg,
    padding: spacing.responsive,
  };

  const cardCompact = { ...card, padding: spacing.md };

  const buttonBase = {
    padding: `${spacing.md} ${spacing.xl}`,
    border: 'none',
    borderRadius: radius.md,
    cursor: 'pointer',
    fontWeight: typography.weight.semibold,
    fontSize: typography.sizes.base,
    fontFamily: typography.family,
    transition: transitions.default,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    whiteSpace: 'nowrap',
  };

  const button = {
    base: buttonBase,
    primary:   { ...buttonBase, background: accent.main, color: '#fff', boxShadow: shadows.glow(accent.main) },
    secondary: { ...buttonBase, background: 'transparent', border: `1px solid ${colors.border.default}`, color: colors.text.muted },
    success:   { ...buttonBase, background: colors.accent.green.main, color: '#fff', boxShadow: shadows.glow(colors.accent.green.main) },
    danger:    { ...buttonBase, background: colors.accent.red.main, color: '#fff', boxShadow: shadows.glow(colors.accent.red.main) },
    ghost:     { ...buttonBase, background: 'transparent', color: colors.text.secondary },
  };

  const input = {
    width: '100%',
    padding: `${spacing.md} ${spacing.lg}`,
    background: colors.bg.input,
    border: `1px solid ${colors.border.default}`,
    borderRadius: radius.md,
    color: colors.text.primary,
    fontSize: typography.sizes.base,
    fontFamily: typography.family,
    outline: 'none',
    boxSizing: 'border-box',
    transition: transitions.fast,
  };

  const badge = {
    display: 'inline-flex', alignItems: 'center', gap: spacing.xs,
    padding: `${spacing.xs} ${spacing.md}`,
    borderRadius: radius.full,
    fontSize: typography.sizes.xs,
    fontWeight: typography.weight.bold,
  };

  const infoBox = {
    background: 'rgba(15, 23, 42, 0.5)',
    border: `1px solid rgba(55, 65, 81, 0.3)`,
    borderRadius: radius.md,
    padding: spacing.md,
    display: 'flex', alignItems: 'center', gap: spacing.md,
  };

  const iconBox = (color) => ({
    width: 36, height: 36, borderRadius: radius.md,
    background: `${color}15`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  });

  const sectionTitle = {
    display: 'flex', alignItems: 'center', gap: spacing.md,
    margin: 0,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weight.extrabold,
    color: colors.text.primary,
    textShadow: '0 0 12px rgba(255,255,255,0.4)',
    letterSpacing: '0.3px',
  };

  const page = {
    padding: 'clamp(8px, 3vw, 24px)',
    background: colors.bg.page,
    minHeight: '100vh',
    direction: 'rtl',
    fontFamily: typography.family,
  };

  const timeline = {
    line: {
      position: 'absolute', right: 19, top: 0, bottom: 0,
      width: 2,
      background: `linear-gradient(to bottom, ${accent.dark}80, ${colors.border.default})`,
      borderRadius: 1, zIndex: 0,
    },
    dot: (hasJudgment) => ({
      position: 'absolute', right: 12, top: 24,
      width: 16, height: 16, borderRadius: '50%',
      background: colors.bg.card,
      border: `2px solid ${hasJudgment ? colors.accent.green.main : accent.dark}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1,
      boxShadow: hasJudgment
        ? `0 0 0 4px ${colors.accent.green.bg}`
        : `0 0 0 4px ${accent.bg}`,
    }),
  };

  const toast = {
    position: 'fixed', top: 20, left: '50%',
    transform: 'translateX(-50%)',
    padding: `${spacing.md} ${spacing.xl}`,
    borderRadius: radius.lg,
    zIndex: 999999,
    fontWeight: typography.weight.semibold,
    boxShadow: shadows.md,
    animation: 'slideDown 0.3s ease',
  };

  const table = {
    wrapper: {
      width: '100%', background: colors.bg.card,
      borderRadius: radius.lg, overflow: 'hidden',
      border: `1px solid ${colors.border.default}`,
      boxShadow: shadows.sm,
    },
    table: {
      width: '100%', borderCollapse: 'collapse',
      fontSize: typography.sizes.base,
      color: colors.text.secondary,
    },
    th: {
      background: 'rgba(15, 23, 42, 0.8)',
      padding: `${spacing.lg} ${spacing.xl}`,
      textAlign: 'center', fontWeight: typography.weight.bold,
      borderBottom: `1px solid ${colors.border.default}`,
      color: colors.text.primary,
      fontSize: typography.sizes.sm,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    td: {
      padding: `${spacing.lg} ${spacing.xl}`,
      borderBottom: `1px solid ${colors.border.default}`,
      textAlign: 'center',
      transition: transitions.fast,
    },
    tr: { transition: transitions.fast },
    hoverRow: { background: colors.bg.hover },
    empty: {
      textAlign: 'center',
      padding: `${spacing['3xl']} ${spacing.xl}`,
      color: colors.text.muted,
    },
  };

  const modal = {
    overlay: {
      position: 'fixed', inset: 0,
      background: colors.bg.overlay,
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: spacing.lg,
    },
    container: (maxWidth = '640px') => ({
      background: colors.bg.card,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.xl,
      width: '100%', maxWidth,
      maxHeight: '92vh', overflow: 'auto',
      boxShadow: shadows.modal,
      position: 'relative',
      display: 'flex', flexDirection: 'column',
    }),
    header: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${spacing['2xl']} ${spacing['2xl']} ${spacing.lg}`,
      borderBottom: `1px solid ${colors.border.default}`,
      position: 'sticky', top: 0,
      background: colors.bg.card,
      zIndex: 10,
      borderRadius: `${radius.xl} ${radius.xl} 0 0`,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: spacing.md },
    headerIcon: (c = accent.main) => ({
      width: 44, height: 44,
      background: `linear-gradient(135deg, ${c}20, ${c}40)`,
      borderRadius: radius.md,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: shadows.glow(c),
    }),
    headerTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
      margin: 0,
    },
    headerSubtitle: {
      fontSize: typography.sizes.sm,
      color: colors.text.muted,
      margin: `${spacing.xs} 0 0 0`,
    },
    closeBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      padding: spacing.sm, borderRadius: radius.md,
      transition: transitions.fast,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors.text.muted,
    },
    body: {
      padding: `${spacing.xl} ${spacing['2xl']} ${spacing['2xl']}`,
      display: 'flex', flexDirection: 'column', gap: spacing.xl,
    },
    footer: {
      display: 'flex', gap: spacing.md,
      marginTop: spacing.md,
      paddingTop: spacing.xl,
      borderTop: `1px solid ${colors.border.default}`,
    },
  };

  const topbar = {
    container: {
      height: 65,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: `0 ${spacing.lg}`,
      background: colors.bg.card,
      borderBottom: `1px solid ${colors.border.default}`,
      boxShadow: shadows.sm,
      direction: 'rtl',
    },
    left: { display: 'flex', alignItems: 'center', gap: spacing.md },
    right: { display: 'flex', alignItems: 'center', gap: spacing.md },
    menuBtn: {
      background: 'none', border: 'none', cursor: 'pointer',
      color: colors.text.muted, padding: spacing.xs,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: radius.md, transition: transitions.fast,
    },
    brandTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weight.semibold,
      color: colors.text.primary,
      margin: 0,
    },
    iconBtn: {
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${colors.border.default}`,
      width: 36, height: 36, borderRadius: radius.full,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: colors.text.muted,
      transition: transitions.fast,
    },
    userName: {
      display: 'flex', alignItems: 'center',
      background: 'rgba(255, 255, 255, 0.03)',
      border: `1px solid ${colors.border.default}`,
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: radius.full,
      fontSize: typography.sizes.sm,
      fontWeight: typography.weight.medium,
      color: colors.text.secondary,
      gap: spacing.xs,
    },
    divider: { width: 1, height: 20, background: colors.border.default },
    logoutBtn: {
      background: `${colors.accent.red.main}15`,
      color: colors.accent.red.light,
      border: `1px solid ${colors.accent.red.main}30`,
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: radius.md,
      cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: spacing.xs,
      fontWeight: typography.weight.medium,
      fontSize: typography.sizes.sm,
      transition: transitions.fast,
    },
    roleBadge: (role) => ({
      padding: `${spacing.xs} ${spacing.md}`,
      borderRadius: radius.full,
      fontSize: typography.sizes.xs,
      color: '#fff',
      background: role === 'admin' ? colors.accent.red.main
        : role === 'lawyer' ? colors.accent.blue.main
        : colors.accent.green.main,
      fontWeight: typography.weight.bold,
    }),
  };

  const formSection = {
    card: {
      background: 'rgba(15, 23, 42, 0.4)',
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      transition: transitions.default,
    },
    cardAccent: (c) => ({
      background: 'rgba(15, 23, 42, 0.4)',
      border: `1px solid ${c}30`,
      borderRadius: radius.lg,
      overflow: 'hidden',
      transition: transitions.default,
    }),
    header: {
      width: '100%', padding: `${spacing.md} ${spacing.lg}`,
      background: 'none', border: 'none', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontFamily: 'inherit', textAlign: 'right', direction: 'rtl',
      color: colors.text.primary,
    },
    headerLeft: { display: 'flex', alignItems: 'center', gap: spacing.md },
    headerIcon: (c) => ({
      width: 32, height: 32,
      background: `${c}15`,
      borderRadius: radius.md,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }),
    headerTitle: {
      fontSize: typography.sizes.md,
      fontWeight: typography.weight.bold,
      color: colors.text.primary,
    },
    body: {
      padding: `0 ${spacing.lg} ${spacing.lg}`,
      display: 'flex', flexDirection: 'column', gap: spacing.md,
    },
    fieldGroup: { display: 'flex', flexDirection: 'column', gap: spacing.xs },
    label: {
      fontSize: typography.sizes.base,
      fontWeight: typography.weight.semibold,
      color: colors.text.secondary,
      display: 'flex', alignItems: 'center', gap: spacing.xs,
    },
    required: { color: colors.accent.red.main, fontSize: '16px' },
    inputWrapper: { position: 'relative' },
    inputIcon: {
      position: 'absolute', right: spacing.lg, top: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
    },
    input: {
      width: '100%',
      padding: `${spacing.md} ${spacing.lg}`,
      background: colors.bg.input,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.md,
      color: colors.text.primary,
      fontSize: typography.sizes.base,
      fontFamily: typography.family,
      outline: 'none',
      boxSizing: 'border-box',
      transition: transitions.fast,
    },
    textarea: {
      width: '100%',
      padding: `${spacing.md} ${spacing.lg}`,
      background: colors.bg.input,
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.md,
      color: colors.text.primary,
      fontSize: typography.sizes.base,
      fontFamily: typography.family,
      outline: 'none',
      transition: transitions.fast,
      resize: 'vertical',
      minHeight: '80px',
      boxSizing: 'border-box',
    },
    twoCols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.lg },
    error: {
      display: 'flex', alignItems: 'center', gap: spacing.xs,
      color: colors.accent.red.light,
      fontSize: typography.sizes.sm,
      marginTop: spacing.xs,
    },
    buttons: {
      display: 'flex', gap: spacing.md,
      marginTop: spacing.md,
      paddingTop: spacing.xl,
      borderTop: `1px solid ${colors.border.default}`,
    },
    cancelBtn: {
      flex: 1,
      padding: `${spacing.md} ${spacing.xl}`,
      background: 'transparent',
      border: `1px solid ${colors.border.default}`,
      borderRadius: radius.md,
      color: colors.text.muted,
      fontSize: typography.sizes.base,
      fontWeight: typography.weight.semibold,
      cursor: 'pointer',
      transition: transitions.default,
      fontFamily: typography.family,
    },
    submitBtn: (c = accent.main) => ({
      flex: 1,
      padding: `${spacing.md} ${spacing.xl}`,
      background: c,
      border: 'none',
      borderRadius: radius.md,
      color: 'white',
      fontSize: typography.sizes.base,
      fontWeight: typography.weight.semibold,
      cursor: 'pointer',
      transition: transitions.default,
      fontFamily: typography.family,
      boxShadow: shadows.glow(c),
    }),
    spinner: {
      width: 18, height: 18,
      border: '2px solid rgba(255, 255, 255, 0.3)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      display: 'inline-block',
    },
  };

  const createButton = (color, variant = 'solid') => ({
    ...button.base,
    ...(variant === 'solid' ? {
      background: color, color: '#fff', boxShadow: shadows.glow(color),
    } : variant === 'outline' ? {
      background: 'transparent', border: `1px solid ${color}`, color: color,
    } : {
      background: 'transparent', color: color,
    }),
  });

  const createBadge = (statusKey) => {
    const s = colors.status[statusKey] || colors.status.pending;
    return { ...badge, background: s.bg, color: s.text, border: `1px solid ${s.border}` };
  };

  const gradient = (from, to, dir = '135deg') =>
    `linear-gradient(${dir}, ${from} 0%, ${to} 100%)`;

  const responsivePadding = (size = 'md') => {
    const map = { sm: 'clamp(8px, 2.5vw, 12px)', md: 'clamp(12px, 3vw, 16px)', lg: 'clamp(16px, 4vw, 24px)', xl: 'clamp(20px, 5vw, 32px)' };
    return map[size] || map.md;
  };

  return {
    colors, spacing, radius, shadows, typography, transitions,
    card, cardCompact, button, input, badge, infoBox, iconBox,
    sectionTitle, page, timeline, toast, table, modal, topbar, formSection,
    createButton, createBadge, gradient, responsivePadding,
    currentAccent: accent,
  };
}