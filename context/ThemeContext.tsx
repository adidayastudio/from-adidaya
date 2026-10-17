import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: () => { },
    toggleTheme: () => { },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const systemColorScheme = useSystemColorScheme();
    const [theme, setThemeState] = useState<Theme>('system');

    useEffect(() => {
        // Load saved theme
        AsyncStorage.getItem('user-theme').then((saved) => {
            if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
                setThemeState(saved as Theme);
            }
        });
    }, []);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
        AsyncStorage.setItem('user-theme', newTheme);
    };

    const toggleTheme = () => {
        setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
    };

    const resolvedTheme = theme === 'system'
        ? (systemColorScheme ?? 'light')
        : theme;

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
