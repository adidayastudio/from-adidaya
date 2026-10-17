import { useTheme } from '@/context/ThemeContext';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export function useColorScheme() {
  try {
    const themeContext = useTheme();
    return themeContext?.resolvedTheme ?? useSystemColorScheme() ?? 'light';
  } catch (e) {
    return useSystemColorScheme() ?? 'light';
  }
}
