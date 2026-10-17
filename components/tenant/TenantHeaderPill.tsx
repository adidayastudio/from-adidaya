import React from 'react';
import { headerSurfaceStyles } from '@/components/ui/HeaderToolbar';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { TenantBrandLogo } from '@/components/ui/TenantBrandLogo';

// Preserve Forma's compact header mark while removing the organization switcher.
export function TenantHeaderPill({ compact = false }: { compact?: boolean }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    return (
        <View accessibilityLabel="Adidaya Studio" style={[headerSurfaceStyles[isDark ? "dark" : "light"], { width: compact ? 32 : 40, height: compact ? 32 : 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }]}>
            <TenantBrandLogo tenant={{ name: 'Adidaya Studio', company_code: 'ADY' }} size={20} isDark={isDark} />
        </View>
    );
}
