import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Image,
    Alert,
    Platform,
} from 'react-native';
import { SvgUri } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Host, Slider as SwiftUISlider } from '@/lib/swiftui';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { PillButton } from '@/components/ui/PillButton';
import { LinearRangeSlider } from '@/components/ui/LinearRangeSlider';

const PRESET_COLORS = [
    '#007AFF', // Forma Blue
    '#10B981', // Emerald Green
    '#F59E0B', // Amber
    '#EF4444', // Crimson Red
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#EC4899', // Pink
    '#1E293B', // Slate Dark
];

interface OrganizationGeneralSectionProps {
    name: string;
    setName: (val: string) => void;
    companyCode: string;
    setCompanyCode: (val: string) => void;
    joinCode: string;
    logoUrl: string | null;
    handlePickLogo: () => void;
    initials: string;
    primaryColor: string;
    setPrimaryColor: (val: string) => void;
    customHex: string;
    setCustomHex: (val: string) => void;
    address: string;
    setAddress: (val: string) => void;
    gmapsUrl: string;
    handleGmapsChange: (val: string) => void;
    latitudeInput: string;
    setLatitudeInput: (val: string) => void;
    longitudeInput: string;
    setLongitudeInput: (val: string) => void;
    selectedRadius: number;
    setSelectedRadius: (val: number) => void;
    isLocating: boolean;
    handleGetCurrentLocation: () => void;
    contactPhone: string;
    setContactPhone: (val: string) => void;
    contactEmail: string;
    setContactEmail: (val: string) => void;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    readOnly?: boolean;
    onCopySuccess?: (msg: string) => void;
}

export const OrganizationGeneralSection: React.FC<OrganizationGeneralSectionProps> = ({
    name,
    setName,
    companyCode,
    setCompanyCode,
    joinCode,
    logoUrl,
    handlePickLogo,
    initials,
    primaryColor,
    setPrimaryColor,
    customHex,
    setCustomHex,
    address,
    setAddress,
    gmapsUrl,
    handleGmapsChange,
    latitudeInput,
    setLatitudeInput,
    longitudeInput,
    setLongitudeInput,
    selectedRadius,
    setSelectedRadius,
    isLocating,
    handleGetCurrentLocation,
    contactPhone,
    setContactPhone,
    contactEmail,
    setContactEmail,
    isDark,
    textColor,
    subtextColor,
    readOnly = false,
    onCopySuccess,
}) => {
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const fieldBgColor = isDark 
        ? 'rgba(255, 255, 255, 0.05)' 
        : '#F2F2F7';
    const separatorColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const renderHeader = (title: string) => (
        <Text style={[styles.sectionHeader, { color: subtextColor }]}>{title}</Text>
    );

    return (
        <Animated.View entering={FadeIn.duration(200)} style={styles.container}>
            {/* View-Only Informative Notice */}
            {readOnly && (
                <View
                    style={[
                        styles.readOnlyNotice,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.05)'
                                : '#F1F5F9',
                        },
                    ]}
                >
                    <Ionicons
                        name="information-circle-outline"
                        size={18}
                        color={isDark ? '#94A3B8' : '#64748B'}
                    />
                    <Text
                        style={[
                            styles.readOnlyNoticeText,
                            { color: isDark ? '#94A3B8' : '#64748B' },
                        ]}
                    >
                        View-only access. General settings can only be modified by organization administrators.
                    </Text>
                </View>
            )}
            
            {/* 1. STANDALONE LOGO & BRAND CARD */}
            <View style={styles.section}>
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    <View style={styles.logoRow}>
                        <TouchableOpacity
                            style={[styles.logoAvatar, { backgroundColor: logoUrl ? 'transparent' : primaryColor }]}
                            onPress={readOnly ? undefined : handlePickLogo}
                            disabled={readOnly}
                            activeOpacity={0.8}
                        >
                            {logoUrl ? (
                                logoUrl.toLowerCase().endsWith('.svg') || logoUrl.includes('.svg') ? (
                                    <SvgUri uri={logoUrl} width={60} height={60} style={styles.logoImg} />
                                ) : (
                                    <Image source={{ uri: logoUrl }} style={styles.logoImg} />
                                )
                            ) : (
                                <Text style={styles.logoAvatarText}>
                                    {companyCode ? companyCode.slice(0, 3) : initials.slice(0, 3)}
                                </Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={[styles.logoTitle, { color: textColor }]} numberOfLines={1}>
                                {name || 'Organization Name'}
                            </Text>
                            <Text style={[styles.logoSubtext, { color: subtextColor }]}>
                                {companyCode ? `Code: ${companyCode}` : readOnly ? 'Organization Logo' : 'Tap logo to change image'}
                            </Text>
                        </View>

                        {!readOnly && (
                            <TouchableOpacity
                                style={[
                                    styles.borderlessPill,
                                    { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)' }
                                ]}
                                onPress={handlePickLogo}
                                activeOpacity={0.7}
                            >
                                <PlatformIcon
                                    name="camera"
                                    size={13}
                                    tintColor="#007AFF"
                                    style={{ marginRight: 5 }}
                                />
                                <Text style={styles.borderlessPillText}>
                                    {logoUrl ? 'Change' : 'Upload'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>

            {/* 2. ORGANIZATION PROFILE DETAILS CARD */}
            <View style={styles.section}>
                {renderHeader('Organization Profile')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Company Name */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="building.2" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Company Name</Text>
                        </View>
                        <TextInput
                            style={[styles.rowInput, { color: textColor }]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={name}
                            onChangeText={setName}
                            editable={!readOnly}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Company Code (3 Letters) */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="number" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Code (Fixed)</Text>
                        </View>
                        <TextInput
                            style={[styles.rowInput, { color: textColor, fontWeight: '700', letterSpacing: 1.5 }]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={companyCode}
                            onChangeText={(t) => setCompanyCode(t.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3))}
                            maxLength={3}
                            autoCapitalize="characters"
                            editable={false}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Join Code (Standard Font) */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="key" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Join Code</Text>
                        </View>
                        <View style={styles.joinCodeRight}>
                            <Text style={[styles.joinCodeText, { color: textColor }]}>
                                {joinCode || '—'}
                            </Text>
                            {joinCode ? (
                                <TouchableOpacity
                                    onPress={async () => {
                                        await Clipboard.setStringAsync(joinCode);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        onCopySuccess?.('Join code copied');
                                    }}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                    style={styles.iconCopyButton}
                                    activeOpacity={0.6}
                                >
                                    <PlatformIcon
                                        name="doc.on.doc"
                                        size={18}
                                        tintColor="#007AFF"
                                    />
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                </View>
            </View>

            {/* 3. BRAND THEME & COLOR */}
            <View style={styles.section}>
                {renderHeader('Brand Theme')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Preset Color Swatches */}
                    <View style={styles.colorPaletteRow}>
                        <View style={styles.colorGrid}>
                            {PRESET_COLORS.map((c) => {
                                const isSelected = primaryColor.toUpperCase() === c.toUpperCase();
                                return (
                                    <TouchableOpacity
                                        key={c}
                                        style={[
                                            styles.colorCircle,
                                            { backgroundColor: c },
                                            isSelected && styles.colorCircleSelected,
                                        ]}
                                        onPress={readOnly ? undefined : () => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setPrimaryColor(c);
                                            setCustomHex(c.replace('#', ''));
                                        }}
                                        disabled={readOnly}
                                        activeOpacity={0.8}
                                    >
                                        {isSelected && (
                                            <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Custom Hex Row */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="paintpalette" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Custom Color</Text>
                        </View>
                        <View style={styles.hexInputWrapper}>
                            <View style={[styles.hexPreviewDot, { backgroundColor: primaryColor }]} />
                            <Text style={[styles.hashPrefix, { color: subtextColor }]}>#</Text>
                            <TextInput
                                style={[styles.hexInput, { color: textColor }]}
                                placeholder="—"
                                placeholderTextColor={subtextColor}
                                value={customHex}
                                onChangeText={(val) => {
                                    const clean = val.replace('#', '').replace(/[^0-9a-f]/gi, '').slice(0, 6);
                                    setCustomHex(clean);
                                    if (clean.length === 6) {
                                        setPrimaryColor(`#${clean}`);
                                    }
                                }}
                                maxLength={6}
                                autoCapitalize="characters"
                                editable={!readOnly}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* 4. CONTACT INFORMATION */}
            <View style={styles.section}>
                {renderHeader('Contact & Support')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    {/* Support Email */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="envelope" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Email</Text>
                        </View>
                        <TextInput
                            style={[styles.rowInput, { color: textColor }]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={contactEmail}
                            onChangeText={setContactEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!readOnly}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Phone Number */}
                    <View style={styles.formRow}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="phone" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Phone</Text>
                        </View>
                        <TextInput
                            style={[styles.rowInput, { color: textColor }]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={contactPhone}
                            onChangeText={setContactPhone}
                            keyboardType="phone-pad"
                            editable={!readOnly}
                        />
                    </View>
                </View>
            </View>

            {/* 5. HEADQUARTERS & GEOFENCE */}
            <View style={styles.section}>
                {renderHeader('Headquarters & Geofence')}
                <View style={[styles.card, { backgroundColor: cardBgColor }]}>
                    
                    {/* Office Address (Full width multiline) */}
                    <View style={styles.fieldSectionBlock}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="mappin.and.ellipse" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Office Address</Text>
                        </View>
                        <TextInput
                            style={[
                                styles.addressTextArea,
                                {
                                    color: textColor,
                                    backgroundColor: fieldBgColor,
                                }
                            ]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={address}
                            onChangeText={setAddress}
                            multiline
                            numberOfLines={4}
                            editable={!readOnly}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Google Maps Link (Full width field below label) */}
                    <View style={styles.fieldSectionBlock}>
                        <View style={styles.rowLeft}>
                            <PlatformIcon name="link" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                            <Text style={[styles.rowLabel, { color: textColor }]}>Google Maps Link</Text>
                        </View>
                        <TextInput
                            style={[
                                styles.fullWidthInput,
                                {
                                    color: textColor,
                                    backgroundColor: fieldBgColor,
                                }
                            ]}
                            placeholder="—"
                            placeholderTextColor={subtextColor}
                            value={gmapsUrl}
                            onChangeText={handleGmapsChange}
                            autoCapitalize="none"
                            editable={!readOnly}
                        />
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* GPS Coordinates (Clean side-by-side with outside titles) */}
                    <View style={styles.fieldSectionBlock}>
                        <View style={styles.coordsHeaderRow}>
                            <View style={styles.rowLeft}>
                                <PlatformIcon name="location" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                                <Text style={[styles.rowLabel, { color: textColor }]}>GPS Coordinates</Text>
                            </View>
                            {!readOnly && (
                                <TouchableOpacity
                                    style={[
                                        styles.borderlessPill,
                                        { backgroundColor: isDark ? 'rgba(0, 122, 255, 0.16)' : 'rgba(0, 122, 255, 0.08)' }
                                    ]}
                                    onPress={handleGetCurrentLocation}
                                    disabled={isLocating}
                                    activeOpacity={0.7}
                                >
                                    <PlatformIcon
                                        name="location.viewfinder"
                                        size={13}
                                        tintColor="#007AFF"
                                        style={{ marginRight: 5 }}
                                    />
                                    <Text style={styles.borderlessPillText}>
                                        {isLocating ? 'Locating...' : 'Use Current GPS'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.coordsPairRow}>
                            <View style={styles.coordCol}>
                                <Text style={[styles.coordTitleOutside, { color: subtextColor }]}>Latitude</Text>
                                <View style={[styles.coordBox, { backgroundColor: fieldBgColor }]}>
                                    <TextInput
                                        style={[styles.coordTextInput, { color: textColor }]}
                                        placeholder="—"
                                        placeholderTextColor={subtextColor}
                                        value={latitudeInput}
                                        onChangeText={setLatitudeInput}
                                        keyboardType="numeric"
                                        editable={!readOnly}
                                    />
                                </View>
                            </View>
                            <View style={styles.coordCol}>
                                <Text style={[styles.coordTitleOutside, { color: subtextColor }]}>Longitude</Text>
                                <View style={[styles.coordBox, { backgroundColor: fieldBgColor }]}>
                                    <TextInput
                                        style={[styles.coordTextInput, { color: textColor }]}
                                        placeholder="—"
                                        placeholderTextColor={subtextColor}
                                        value={longitudeInput}
                                        onChangeText={setLongitudeInput}
                                        keyboardType="numeric"
                                        editable={!readOnly}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.separator, { backgroundColor: separatorColor }]} />

                    {/* Geofence Attendance Radius (Snap per 5m) */}
                    <View style={styles.radiusBlock}>
                        <View style={styles.radiusTopRow}>
                            <View style={styles.rowLeft}>
                                <PlatformIcon name="circle.dashed" size={16} tintColor={subtextColor} style={styles.rowIcon} />
                                <Text style={[styles.rowLabel, { color: textColor }]}>Attendance Radius</Text>
                            </View>
                            <View style={[styles.radiusPill, { backgroundColor: isDark ? 'rgba(0,122,255,0.2)' : 'rgba(0,122,255,0.1)' }]}>
                                <Text style={styles.radiusPillText}>{selectedRadius}m</Text>
                            </View>
                        </View>

                        <View pointerEvents={readOnly ? 'none' : 'auto'} style={{ opacity: readOnly ? 0.7 : 1 }}>
                            {Platform.OS === 'ios' ? (
                                <View style={styles.sliderHost}>
                                    <Host style={{ width: '100%', height: 36 }}>
                                        <SwiftUISlider
                                            value={selectedRadius}
                                            onValueChange={(val: number) => {
                                                const snapped = Math.round(val / 5) * 5;
                                                setSelectedRadius(snapped);
                                            }}
                                            min={25}
                                            max={150}
                                            steps={25}
                                        />
                                    </Host>
                                </View>
                            ) : (
                                <View style={{ marginVertical: 8 }}>
                                    <LinearRangeSlider
                                        value={selectedRadius}
                                        onChange={(v) => {
                                            const snapped = Math.round(v / 5) * 5;
                                            setSelectedRadius(snapped);
                                        }}
                                        min={25}
                                        max={150}
                                        step={5}
                                        activeColor="#007AFF"
                                        isDark={isDark}
                                    />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>

        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        gap: 20,
    },
    section: {
        gap: 8,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: -0.1,
        paddingHorizontal: 6,
    },
    card: {
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: 4,
        overflow: 'hidden',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 14,
    },
    logoAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    logoImg: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    logoAvatarText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    avatarCameraBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoTitle: {
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    logoSubtext: {
        fontSize: 13,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        minHeight: 50,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 32,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowIcon: {
        marginRight: 12,
    },
    rowLabel: {
        fontSize: 16,
        fontWeight: '400',
    },
    rowInput: {
        fontSize: 16,
        textAlign: 'right',
        flex: 1,
        marginLeft: 16,
        paddingVertical: 0,
    },
    joinCodeRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    joinCodeText: {
        fontSize: 16,
        fontWeight: '400',
    },
    colorPaletteRow: {
        paddingVertical: 14,
    },
    colorGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    colorCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    colorCircleSelected: {
        transform: [{ scale: 1.1 }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 2,
    },
    hexInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    hexPreviewDot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        marginRight: 4,
    },
    hashPrefix: {
        fontSize: 16,
        fontWeight: '500',
    },
    hexInput: {
        fontSize: 16,
        fontWeight: '400',
        letterSpacing: 0.5,
        minWidth: 70,
        textAlign: 'right',
        paddingVertical: 0,
    },
    fieldSectionBlock: {
        paddingVertical: 14,
        gap: 10,
    },
    addressTextArea: {
        fontSize: 16,
        fontWeight: '400',
        padding: 12,
        borderRadius: 16,
        textAlignVertical: 'top',
        minHeight: 96,
        lineHeight: 22,
    },
    fullWidthInput: {
        fontSize: 16,
        fontWeight: '400',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
    },
    coordsHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    coordsPairRow: {
        flexDirection: 'row',
        gap: 12,
    },
    coordCol: {
        flex: 1,
        gap: 6,
    },
    coordTitleOutside: {
        fontSize: 14,
        fontWeight: '400',
        marginLeft: 2,
    },
    coordBox: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    coordTextInput: {
        fontSize: 16,
        fontWeight: '400',
        paddingVertical: 0,
    },
    radiusBlock: {
        paddingVertical: 14,
        gap: 10,
    },
    radiusTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    radiusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    radiusPillText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '700',
    },
    sliderHost: {
        height: 36,
        width: '100%',
        justifyContent: 'center',
    },
    readOnlyNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 16,
        gap: 10,
    },
    readOnlyNoticeText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
    },
    borderlessPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
    },
    borderlessPillText: {
        color: '#007AFF',
        fontSize: 13,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    iconCopyButton: {
        padding: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
