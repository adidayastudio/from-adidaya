import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { FormaLogo } from '@/components/ui/FormaLogo';
import { Tenant } from '@/context/TenantContext';

export function isAdidayaTenant(tenant?: Partial<Tenant> | null): boolean {
    if (!tenant) return false;
    const name = (tenant.name || tenant.branding_name || '').toLowerCase();
    const slug = (tenant.slug || '').toLowerCase();
    const code = (tenant.company_code || '').toLowerCase();
    const branding = (tenant.branding_name || '').toLowerCase();
    return name.includes('adidaya') || slug.includes('adidaya') || code === 'ady' || code === 'adidaya' || branding.includes('adidaya');
}

export function getTenantDisplayName(isAuthenticated: boolean, tenant?: Partial<Tenant> | null): string {
    if (!isAuthenticated || !tenant) return 'Adidaya Studio';
    if (isAdidayaTenant(tenant)) return tenant.branding_name || tenant.name || 'Adidaya Studio';
    const rawName = (tenant.branding_name || tenant.name || 'Workspace').trim();
    return 'Adidaya Studio';
}

interface TenantBrandLogoProps {
    tenant?: Partial<Tenant> | null;
    size?: number;
    isDark?: boolean;
    style?: ViewStyle;
    showText?: boolean;
}

export function TenantBrandLogo({
    tenant,
    size = 48,
    isDark = false,
    style,
    showText = false,
}: TenantBrandLogoProps) {
    const logoUrl = tenant?.branding_logo_url || tenant?.logo_url;
    if (logoUrl) {
        const isSvg = logoUrl.toLowerCase().endsWith('.svg') || logoUrl.includes('.svg');
        return (
            <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
                {isSvg ? (
                    <SvgUri uri={logoUrl} width={size} height={size} />
                ) : (
                    <Image
                        source={{ uri: logoUrl }}
                        style={{ width: size, height: size, borderRadius: Math.round(size * 0.2) }}
                        resizeMode="cover"
                    />
                )}
            </View>
        );
    }

    if (!tenant || isAdidayaTenant(tenant)) {
        const adidayaSource = isDark
            ? require('@/assets/images/logo-adidaya-white.png')
            : require('@/assets/images/logo-adidaya-red.png');

        return (
            <View style={[{ alignItems: 'center', justifyContent: 'center' }, style]}>
                <Image
                    source={adidayaSource}
                    style={{ width: size, height: size }}
                    resizeMode="contain"
                />
            </View>
        );
    }

    return (
        <FormaLogo
            size={size}
            isDark={isDark}
            showText={showText}
            style={style}
        />
    );
}
