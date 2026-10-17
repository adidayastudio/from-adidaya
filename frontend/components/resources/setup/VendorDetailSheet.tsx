import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import { VendorMasterRecord } from '@/lib/api/resourcesVendors';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface VendorDetailSheetProps {
    visible: boolean;
    onClose: () => void;
    vendor: VendorMasterRecord | null;
    onEditVendor: (vendor: VendorMasterRecord) => void;
}

export function VendorDetailSheet({
    visible,
    onClose,
    vendor,
    onEditVendor,
}: VendorDetailSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    if (!vendor) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}>
                {/* Header */}
                <View
                    style={[
                        s.header,
                        {
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingTop: Platform.OS === 'ios' ? 16 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity onPress={onClose} hitSlop={12}>
                        <Text style={[s.headerBtn, { color: subtextColor }]}>Done</Text>
                    </TouchableOpacity>
                    <Text style={[s.headerTitle, { color: textColor }]}>Vendor Detail</Text>
                    <TouchableOpacity
                        onPress={() => {
                            Haptics.selectionAsync();
                            onEditVendor(vendor);
                        }}
                        hitSlop={12}
                    >
                        <Text style={[s.headerBtn, { color: '#007AFF', fontWeight: '600' }]}>Edit</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 40 },
                    ]}
                >
                    {/* Section 1: General Information */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>General Information</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Vendor Name</Text>
                            <View style={s.nameWithStar}>
                                <Text style={[s.formValue, { color: textColor, fontWeight: '600' }]} numberOfLines={1}>
                                    {vendor.name}
                                </Text>
                                {vendor.isPreferred && (
                                    <PlatformIcon name="star.fill" size={12} tintColor="#FF9500" />
                                )}
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Vendor Code</Text>
                            <Text style={[s.formCode, { color: textColor }]}>{vendor.code}</Text>
                        </View>

                        {vendor.legalName && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: subtextColor }]}>Legal Entity</Text>
                                    <Text style={[s.formValue, { color: textColor }]} numberOfLines={1}>
                                        {vendor.legalName}
                                    </Text>
                                </View>
                            </>
                        )}

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Vendor Type</Text>
                            <Text style={[s.formValue, { color: textColor }]}>{vendor.vendorType}</Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Active Status</Text>
                            <View style={s.statusRow}>
                                <View style={[s.statusDot, { backgroundColor: vendor.active ? '#34C759' : '#8E8E93' }]} />
                                <Text style={[s.formValue, { color: textColor }]}>
                                    {vendor.active ? 'Active' : 'Archived'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Section 2: Contact */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Contact</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Contact Person</Text>
                            <Text style={[s.formValue, { color: textColor }]}>
                                {vendor.contactPerson || '—'}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Phone</Text>
                            <Text style={[s.formValue, { color: vendor.phone ? '#007AFF' : textColor }]}>
                                {vendor.phone || '—'}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Email</Text>
                            <Text style={[s.formValue, { color: vendor.email ? '#007AFF' : textColor }]} numberOfLines={1}>
                                {vendor.email || '—'}
                            </Text>
                        </View>

                        {vendor.website && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: subtextColor }]}>Website</Text>
                                    <Text style={[s.formValue, { color: '#007AFF' }]} numberOfLines={1}>
                                        {vendor.website}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Section 3: Location */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Location & Receiving</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>City / Region</Text>
                            <Text style={[s.formValue, { color: textColor }]}>
                                {vendor.city || '—'}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Address</Text>
                            <Text style={[s.formValue, { color: textColor }]} numberOfLines={2}>
                                {vendor.address || '—'}
                            </Text>
                        </View>

                        {vendor.resourceLocationLink && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: subtextColor }]}>Receiving Link</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <PlatformIcon name="mappin.circle.fill" size={13} tintColor="#007AFF" />
                                        <Text style={[s.formValue, { color: '#007AFF' }]}>
                                            {vendor.resourceLocationLink}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Section 4: Supply Information */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Supply Scope</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Resource Types</Text>
                            <View style={s.pillsRow}>
                                {vendor.resourceTypes?.map((t) => {
                                    const meta = getResourceBadgeMeta(t);
                                    return (
                                        <View
                                            key={t}
                                            style={[
                                                s.badgePill,
                                                { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                            ]}
                                        >
                                            <PlatformIcon
                                                name={meta.icon as any}
                                                size={11}
                                                tintColor={meta.iconColor}
                                            />
                                            <Text style={[s.badgeText, { color: textColor }]}>
                                                {meta.label}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Categories</Text>
                            <Text style={[s.formValue, { color: textColor }]} numberOfLines={1}>
                                {vendor.categoriesSupplied?.join(', ') || '—'}
                            </Text>
                        </View>

                        {vendor.brandsSupplied && vendor.brandsSupplied.length > 0 && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: subtextColor }]}>Brands / Items</Text>
                                    <Text style={[s.formValue, { color: textColor }]} numberOfLines={1}>
                                        {vendor.brandsSupplied.join(', ')}
                                    </Text>
                                </View>
                            </>
                        )}

                        {vendor.notes && (
                            <>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                                <View style={s.formRow}>
                                    <Text style={[s.formLabel, { color: subtextColor }]}>Notes</Text>
                                    <Text style={[s.formValue, { color: textColor }]} numberOfLines={2}>
                                        {vendor.notes}
                                    </Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Section 5: Resources History (Read-only Summary) */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Resources History</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Items Supplied</Text>
                            <Text style={[s.formValue, { color: textColor, fontWeight: '600' }]}>
                                {vendor.historySummary?.itemsSuppliedCount || 0} catalog items
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Total Receivings</Text>
                            <Text style={[s.formValue, { color: textColor, fontWeight: '600' }]}>
                                {vendor.historySummary?.totalReceivings || 0} shipments
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Last Receiving</Text>
                            <Text style={[s.formValue, { color: textColor }]}>
                                {vendor.historySummary?.lastReceivingDate || 'No receivings yet'}
                            </Text>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.formRow}>
                            <Text style={[s.formLabel, { color: subtextColor }]}>Active Relationships</Text>
                            <Text style={[s.formValue, { color: textColor }]}>
                                {vendor.historySummary?.activeResourceRelationships || 0} projects
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.3,
    },
    headerBtn: {
        fontSize: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
        marginBottom: 6,
        marginTop: 14,
    },
    formCard: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 1,
    },
    formRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    formLabel: {
        fontSize: 14.5,
        fontWeight: '400',
    },
    formValue: {
        fontSize: 14.5,
        fontWeight: '500',
        maxWidth: '65%',
        textAlign: 'right',
    },
    nameWithStar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '65%',
    },
    formCode: {
        fontSize: 14,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        fontWeight: '600',
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'flex-end',
    },
    badgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3.5,
        borderRadius: 7,
    },
    badgeText: {
        fontSize: 11.5,
        fontWeight: '500',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
});
