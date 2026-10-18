import { ViewStyle } from 'react-native';

// Shared surface for the message composer, search pills and toolbar buttons.
export const chatToolbarSurface = (isDark: boolean): ViewStyle => ({
    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
    shadowOpacity: 0,
    elevation: 0,
});
