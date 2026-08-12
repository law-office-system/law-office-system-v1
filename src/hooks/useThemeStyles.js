import { useTheme } from '../context/ThemeContext';
import { getTheme } from '../styles/themes';

/**
 * useThemeStyles — Hook يعطي كل الـ styles حسب الثيم الحالي
 * 
 * Usage in any component:
 *   const { colors, button, card, input, ... } = useThemeStyles();
 *   <button style={button.primary}>Click</button>
 */
export default function useThemeStyles() {
  const { themeId, accentId } = useTheme();
  return getTheme(themeId, accentId);
}