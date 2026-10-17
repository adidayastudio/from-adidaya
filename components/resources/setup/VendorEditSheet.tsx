import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import * as Haptics from 'expo-haptics';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import {
    VendorMasterRecord,
    VendorTypeOption,
} from '@/lib/api/resourcesVendors';
import { ResourceTypeOption } from '@/lib/api/financeSetup';
import { getResourceBadgeMeta } from './ResourcesClassificationSection';

interface VendorEditSheetProps {
    visible: boolean;
    onClose: () => void;
    vendor?: VendorMasterRecord | null;
    existingVendors: VendorMasterRecord[];
    onSave: (vendor: VendorMasterRecord) => void;
    onDelete?: (vendorId: string) => void;
}

const VENDOR_TYPES: VendorTypeOption[] = [
    'Distributor',
    'Manufacturer',
    'Contractor',
    'Service Provider',
    'Retailer',
    'Individual',
];

const ALL_RESOURCE_TYPES: ResourceTypeOption[] = ['Material', 'Tools', 'Assets', 'Services'];

export function VendorEditSheet({
    visible,
    onClose,
    vendor,
    existingVendors,
    onSave,
    onDelete,
}: VendorEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!vendor;

    // General Information
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [legalName, setLegalName] = useState('');
    const [vendorType, setVendorType] = useState<VendorTypeOption>('Distributor');
    const [isActive, setIsActive] = useState(true);
    const [isPreferred, setIsPreferred] = useState(false);

    // Contact
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [website, setWebsite] = useState('');

    // Location
    const [address, setAddress] = useState('');
    const [city, setCity] = useState('');
    const [resourceLocationLink, setResourceLocationLink] = useState('');

    // Supply
    const [selectedResourceTypes, setSelectedResourceTypes] = useState<ResourceTypeOption[]>(['Material']);
    const [categoriesSupplied, setCategoriesSupplied] = useState('');
    const [brandsSupplied, setBrandsSupplied] = useState('');
    const [notes, setNotes] = useState('');

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (vendor) {
                setName(vendor.name || '');
                setCode(vendor.code || '');
                setLegalName(vendor.legalName || '');
                setVendorType(vendor.vendorType || 'Distributor');
                setIsActive(vendor.active !== false);
                setIsPreferred(!!vendor.isPreferred);
                setContactPerson(vendor.contactPerson || '');
                setPhone(vendor.phone || '');
                setEmail(vendor.email || '');
                setWebsite(vendor.website || '');
                setAddress(vendor.address || '');
                setCity(vendor.city || '');
                setResourceLocationLink(vendor.resourceLocationLink || '');
                setSelectedResourceTypes(vendor.resourceTypes || ['Material']);
                setCategoriesSupplied(vendor.categoriesSupplied?.join(', ') || '');
                setBrandsSupplied(vendor.brandsSupplied?.join(', ') || '');
                setNotes(vendor.notes || '');
            } else {
                setName('');
                const nextSeq = String(existingVendors.length + 1).padStart(3, '0');
                setCode(`VND-${nextSeq}`);
                setLegalName('');
                setVendorType('Distributor');
                setIsActive(true);
                setIsPreferred(false);
                setContactPerson('');
                setPhone('');
                setEmail('');
                setWebsite('');
                setAddress('');
                setCity('');
                setResourceLocationLink('');
                setSelectedResourceTypes(['Material']);
                setCategoriesSupplied('');
                setBrandsSupplied('');
                setNotes('');
            }
        }
    }, [visible, vendor, existingVendors]);

    const toggleResourceType = (type: ResourceTypeOption) => {
        Haptics.selectionAsync();
        if (selectedResourceTypes.includes(type)) {
            if (selectedResourceTypes.length === 1) return; // keep at least 1
            setSelectedResourceTypes(selectedResourceTypes.filter((t) => t !== type));
        } else {
            setSelectedResourceTypes([...selectedResourceTypes, type]);
        }
    };

    const handleSave = () => {
        if (!name.trim()) {
            setErrorMsg('Vendor name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const categoriesArray = categoriesSupplied
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean);

        const brandsArray = brandsSupplied
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean);

        const record: VendorMasterRecord = {
            id: vendor ? vendor.id : `vnd-${Date.now()}`,
            name: name.trim(),
            code: code.trim() || 'VND-000',
            legalName: legalName.trim() || undefined,
            vendorType,
            active: isActive,
            isPreferred,
            contactPerson: contactPerson.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            website: website.trim() || undefined,
            address: address.trim() || undefined,
            city: city.trim() || undefined,
            resourceLocationLink: resourceLocationLink.trim() || undefined,
            resourceTypes: selectedResourceTypes,
            categoriesSupplied: categoriesArray.length > 0 ? categoriesArray : ['General'],
            brandsSupplied: brandsArray.length > 0 ? brandsArray : undefined,
            notes: notes.trim() || undefined,
            historySummary: vendor
                ? vendor.historySummary
                : {
                      itemsSuppliedCount: 0,
                      totalReceivings: 0,
                      activeResourceRelationships: 0,
                  },
            updatedAt: new Date().toISOString(),
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(record);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#F2F2F7' }}
            >
                {/* Header with rounded xmark & checkmark buttons */}
                <View
                    style={[
                        s.header,
                        {
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            paddingTop: Platform.OS === 'ios' ? 14 : insets.top + 8,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[s.circleIconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F2F2F7' }]}
                        onPress={onClose}
                        hitSlop={8}
                    >
                        <PlatformIcon name="xmark" size={14} tintColor={textColor} />
                    </TouchableOpacity>

                    <Text style={[s.headerTitle, { color: textColor }]}>
                        {isEditMode ? 'Edit Vendor' : 'New Vendor'}
                    </Text>

                    <TouchableOpacity
                        style={[s.circleIconBtn, { backgroundColor: '#007AFF' }]}
                        onPress={handleSave}
                        hitSlop={8}
                    >
                        <PlatformIcon name="checkmark" size={14} tintColor="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={[
                        s.scrollContent,
                        { paddingBottom: insets.bottom + 32 },
                    ]}
                    keyboardShouldPersistTaps="handled"
                >
                    {errorMsg && (
                        <View style={s.errorBanner}>
                            <PlatformIcon name="exclamationmark.triangle.fill" size={16} tintColor="#FF3B30" />
                            <Text style={s.errorBannerText}>{errorMsg}</Text>
                        </View>
                    )}

                    {/* Section 1: General Information */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>General Information</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Vendor Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                placeholder="e.g. PT Sumber Perkasa Teknik"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Vendor Code</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={code}
                                onChangeText={setCode}
                                placeholder="e.g. VND-001"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="characters"
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Legal Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={legalName}
                                onChangeText={setLegalName}
                                placeholder="Optional PT/CV entity name"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Vendor Type Dropdown */}
                        <ContextMenu
                            actions={VENDOR_TYPES.map((t) => ({
                                title: t,
                                state: vendorType === t ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                setVendorType(VENDOR_TYPES[e.nativeEvent.index] || 'Distributor');
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Vendor Type</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: textColor }]}>
                                        {vendorType}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.switchRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Preferred Vendor</Text>
                            <Switch
                                value={isPreferred}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsPreferred(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#FF9500' }}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.switchRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Active Status</Text>
                            <Switch
                                value={isActive}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsActive(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>
                    </View>

                    {/* Section 2: Contact Information */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Contact</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Contact Person</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={contactPerson}
                                onChangeText={setContactPerson}
                                placeholder="e.g. Hendra Gunawan"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Phone Number</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={phone}
                                onChangeText={setPhone}
                                placeholder="e.g. +62 811-9283-112"
                                placeholderTextColor={subtextColor}
                                keyboardType="phone-pad"
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Email</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={email}
                                onChangeText={setEmail}
                                placeholder="e.g. sales@vendor.co.id"
                                placeholderTextColor={subtextColor}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Website</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={website}
                                onChangeText={setWebsite}
                                placeholder="e.g. https://vendor.co.id"
                                placeholderTextColor={subtextColor}
                                autoCapitalize="none"
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Section 3: Location */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Location & Receiving</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>City / Region</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={city}
                                onChangeText={setCity}
                                placeholder="e.g. Jakarta Barat, Surabaya"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Address</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Street address & warehouse location"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Resource Location</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={resourceLocationLink}
                                onChangeText={setResourceLocationLink}
                                placeholder="Link for receiving/pickup"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Section 4: Supply Information */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Supply Information</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Multi-select resource types */}
                        <View style={s.typeSelectorBox}>
                            <Text style={[s.inputLabel, { color: textColor, marginBottom: 8 }]}>Supplied Resource Types</Text>
                            <View style={s.pillsRow}>
                                {ALL_RESOURCE_TYPES.map((type) => {
                                    const isSelected = selectedResourceTypes.includes(type);
                                    const meta = getResourceBadgeMeta(type);

                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                s.multiPill,
                                                isSelected
                                                    ? [s.multiPillSelected, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#EBF5FF' }]
                                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F2F2F7' },
                                            ]}
                                            onPress={() => toggleResourceType(type)}
                                            activeOpacity={0.7}
                                        >
                                            <PlatformIcon
                                                name={meta.icon as any}
                                                size={12}
                                                tintColor={isSelected ? '#007AFF' : meta.iconColor}
                                            />
                                            <Text
                                                style={[
                                                    s.multiPillText,
                                                    {
                                                        color: isSelected ? (isDark ? '#FFFFFF' : '#007AFF') : textColor,
                                                        fontWeight: isSelected ? '600' : '500',
                                                    },
                                                ]}
                                            >
                                                {meta.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Categories</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={categoriesSupplied}
                                onChangeText={setCategoriesSupplied}
                                placeholder="Comma-separated categories"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Brands / Items</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={brandsSupplied}
                                onChangeText={setBrandsSupplied}
                                placeholder="e.g. Makita, Bosch, Gresik"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Notes</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Special terms, lead times, or notes"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {isEditMode && onDelete && (
                        <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                            <TouchableOpacity
                                style={[
                                    s.deleteBtn,
                                    { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (vendor) onDelete(vendor.id);
                                    onClose();
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Vendor Master</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
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
    circleIconBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    errorBannerText: {
        color: '#FF3B30',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
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
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 13,
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        width: 125,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        padding: 0,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 13,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    selectValueText: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    typeSelectorBox: {
        padding: 16,
    },
    pillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    multiPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 6,
    },
    multiPillSelected: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: '#007AFF',
    },
    multiPillText: {
        fontSize: 13,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 16,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
    },
    deleteBtnText: {
        color: '#FF3B30',
        fontSize: 15,
        fontWeight: '600',
    },
});
