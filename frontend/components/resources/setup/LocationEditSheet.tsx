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
    ResourceLocationItem,
    LocationSource,
    LocationType,
    LOCATION_TYPE_OPTIONS,
    DEPARTMENT_OPTIONS,
    MOCK_PROJECTS,
    getLocationSourceBadgeMeta,
    getLocationTypeIcon,
} from '@/lib/api/resourcesLocations';
import { VendorMasterRecord } from '@/lib/api/resourcesVendors';
import { WorkLocationItem, DEFAULT_WORK_LOCATIONS, getClockSetting } from '@/lib/api/clockSetup';

interface LocationEditSheetProps {
    visible: boolean;
    onClose: () => void;
    locationItem?: ResourceLocationItem | null;
    allLocations: ResourceLocationItem[];
    vendors: VendorMasterRecord[];
    onSaveLocation: (item: ResourceLocationItem) => void;
    onDeleteLocation?: (id: string) => void;
}

const SOURCES: LocationSource[] = ['Internal', 'Clock', 'Project', 'Vendor'];

export function LocationEditSheet({
    visible,
    onClose,
    locationItem,
    allLocations,
    vendors,
    onSaveLocation,
    onDeleteLocation,
}: LocationEditSheetProps) {
    const insets = useSafeAreaInsets();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#000000';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const isEditMode = !!locationItem;

    const [name, setName] = useState('');
    const [source, setSource] = useState<LocationSource>('Internal');
    const [type, setType] = useState<LocationType>('Warehouse');
    const [parentId, setParentId] = useState<string | undefined>(undefined);
    const [address, setAddress] = useState('');
    const [department, setDepartment] = useState('');
    const [linkedProjectId, setLinkedProjectId] = useState<string | undefined>(undefined);
    const [linkedVendorId, setLinkedVendorId] = useState<string | undefined>(undefined);
    const [linkedClockLocationId, setLinkedClockLocationId] = useState<string | undefined>(undefined);
    const [isActive, setIsActive] = useState(true);
    const [notes, setNotes] = useState('');

    // Roles
    const [isReceivingLocation, setIsReceivingLocation] = useState(true);
    const [isStorageLocation, setIsStorageLocation] = useState(true);
    const [isTransferDestination, setIsTransferDestination] = useState(true);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [clockLocations, setClockLocations] = useState<WorkLocationItem[]>(DEFAULT_WORK_LOCATIONS);

    useEffect(() => {
        if (visible) {
            // Load clock work locations for reference
            getClockSetting<WorkLocationItem[]>('WORK_LOCATIONS', DEFAULT_WORK_LOCATIONS).then((res) => {
                if (res && res.length > 0) setClockLocations(res);
            });
        }
    }, [visible]);

    useEffect(() => {
        if (visible) {
            setErrorMsg(null);
            if (locationItem) {
                setName(locationItem.name || '');
                setSource(locationItem.source || 'Internal');
                setType(locationItem.type || 'Warehouse');
                setParentId(locationItem.parentId);
                setAddress(locationItem.address || '');
                setDepartment(locationItem.department || '');
                setLinkedProjectId(locationItem.linkedProjectId);
                setLinkedVendorId(locationItem.linkedVendorId);
                setLinkedClockLocationId(locationItem.linkedClockLocationId);
                setIsActive(locationItem.active !== false);
                setNotes(locationItem.notes || '');
                setIsReceivingLocation(locationItem.isReceivingLocation !== false);
                setIsStorageLocation(locationItem.isStorageLocation !== false);
                setIsTransferDestination(locationItem.isTransferDestination !== false);
            } else {
                setName('');
                setSource('Internal');
                setType('Warehouse');
                setParentId(undefined);
                setAddress('');
                setDepartment('Warehouse & Logistics');
                setLinkedProjectId(undefined);
                setLinkedVendorId(undefined);
                setLinkedClockLocationId(undefined);
                setIsActive(true);
                setNotes('');
                setIsReceivingLocation(true);
                setIsStorageLocation(true);
                setIsTransferDestination(true);
            }
        }
    }, [visible, locationItem]);

    // Parent candidate options (exclude self and any current children)
    const parentCandidates = allLocations.filter(
        (l) => l.id !== locationItem?.id && l.source === source
    );

    const handleSelectClockLocation = (clockLoc: WorkLocationItem) => {
        setLinkedClockLocationId(clockLoc.id);
        setName(clockLoc.name);
        setAddress(clockLoc.address || '');
    };

    const handleSelectVendor = (v: VendorMasterRecord) => {
        setLinkedVendorId(v.id);
        if (!name) setName(`${v.name} Facility`);
        if (v.address) setAddress(v.address);
    };

    const handleSelectProject = (p: typeof MOCK_PROJECTS[0]) => {
        setLinkedProjectId(p.id);
        if (!name) setName(`${p.name} Site`);
        if (p.location) setAddress(p.location);
    };

    const handleSave = () => {
        if (!name.trim()) {
            setErrorMsg('Location name is required.');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        const parentObj = allLocations.find((l) => l.id === parentId);
        const projectObj = MOCK_PROJECTS.find((p) => p.id === linkedProjectId);
        const vendorObj = vendors.find((v) => v.id === linkedVendorId);

        const updatedItem: ResourceLocationItem = {
            id: locationItem ? locationItem.id : `loc-${Date.now()}`,
            name: name.trim(),
            source,
            type,
            parentId: parentId || undefined,
            parentName: parentObj?.name || undefined,
            address: address.trim() || undefined,
            department: department.trim() || undefined,
            linkedProjectId: source === 'Project' || source === 'Clock' ? linkedProjectId : undefined,
            linkedProjectName: projectObj?.name || undefined,
            linkedVendorId: source === 'Vendor' ? linkedVendorId : undefined,
            linkedVendorName: vendorObj?.name || undefined,
            linkedClockLocationId: source === 'Clock' ? linkedClockLocationId : undefined,
            active: isActive,
            notes: notes.trim() || undefined,
            isReceivingLocation,
            isStorageLocation,
            isTransferDestination,
            order: locationItem ? locationItem.order : allLocations.length + 1,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSaveLocation(updatedItem);
        onClose();
    };

    const sourceMeta = getLocationSourceBadgeMeta(source);
    const typeIcon = getLocationTypeIcon(type);

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
                {/* Header */}
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
                        {isEditMode ? 'Edit Location' : 'New Location'}
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

                    {/* Clock Shared Notice */}
                    {source === 'Clock' && (
                        <View style={[s.infoNotice, { backgroundColor: isDark ? 'rgba(52,199,89,0.12)' : '#E8F8EE' }]}>
                            <PlatformIcon name="info.circle.fill" size={15} tintColor="#34C759" />
                            <Text style={[s.infoNoticeText, { color: isDark ? '#A3E6B4' : '#1E6F39' }]}>
                                Shared with Clock Work Locations. Geofence radius and attendance verification are managed in Clock Settings.
                            </Text>
                        </View>
                    )}

                    {/* Section 1: Source & Identification */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Location Identification</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Source Pills Selector */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Source</Text>
                            <View style={s.sourcePillsContainer}>
                                {SOURCES.map((src) => {
                                    const isSel = source === src;
                                    const meta = getLocationSourceBadgeMeta(src);
                                    return (
                                        <TouchableOpacity
                                            key={src}
                                            style={[
                                                s.sourcePillBtn,
                                                isSel
                                                    ? { backgroundColor: meta.color }
                                                    : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                            ]}
                                            onPress={() => {
                                                Haptics.selectionAsync();
                                                setSource(src);
                                            }}
                                            activeOpacity={0.7}
                                        >
                                            <Text
                                                style={[
                                                    s.sourcePillText,
                                                    { color: isSel ? '#FFFFFF' : textColor, fontWeight: isSel ? '600' : '500' },
                                                ]}
                                            >
                                                {src}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* If Source === Clock: Quick Select from Clock */}
                        {source === 'Clock' && (
                            <>
                                <ContextMenu
                                    actions={clockLocations.map((cl) => ({
                                        title: `${cl.name} (${cl.code || 'LOC'})`,
                                        state: linkedClockLocationId === cl.id ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        const cl = clockLocations[e.nativeEvent.index];
                                        if (cl) handleSelectClockLocation(cl);
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Clock Location</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: '#007AFF' }]} numberOfLines={1}>
                                                {clockLocations.find((c) => c.id === linkedClockLocationId)?.name || 'Select from Clock'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            </>
                        )}

                        {/* Location Name */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Name</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={name}
                                onChangeText={(val) => {
                                    setName(val);
                                    if (errorMsg) setErrorMsg(null);
                                }}
                                placeholder="e.g. Warehouse A, Heavy Tool Room"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Location Type Dropdown */}
                        <ContextMenu
                            actions={LOCATION_TYPE_OPTIONS.map((t) => ({
                                title: t,
                                state: type === t ? 'on' : 'off',
                            }))}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                setType(LOCATION_TYPE_OPTIONS[e.nativeEvent.index] || 'Warehouse');
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Location Type</Text>
                                <View style={s.selectValueBox}>
                                    <View
                                        style={[
                                            s.typeBadgePill,
                                            { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F2F2F7' },
                                        ]}
                                    >
                                        <PlatformIcon name={typeIcon as any} size={12} tintColor={subtextColor} />
                                        <Text style={[s.typeBadgeText, { color: textColor }]}>{type}</Text>
                                    </View>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Parent Location (Hierarchy: Site -> Warehouse -> Room -> Rack) */}
                        <ContextMenu
                            actions={[
                                { title: 'None (Top Level)', state: !parentId ? 'on' : 'off' },
                                ...parentCandidates.map((p) => ({
                                    title: `${p.name} (${p.type})`,
                                    state: parentId === p.id ? 'on' : 'off',
                                })),
                            ]}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                if (e.nativeEvent.index === 0) {
                                    setParentId(undefined);
                                } else {
                                    const selected = parentCandidates[e.nativeEvent.index - 1];
                                    if (selected) setParentId(selected.id);
                                }
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.inputLabel, { color: textColor }]}>Parent Location</Text>
                                    <Text style={[s.fieldSubtitle, { color: subtextColor }]}>
                                        Hierarchy: Site → Warehouse → Room → Rack
                                    </Text>
                                </View>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: parentId ? '#007AFF' : subtextColor }]} numberOfLines={1}>
                                        {parentId
                                            ? allLocations.find((l) => l.id === parentId)?.name || 'Selected'
                                            : 'None'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>
                    </View>

                    {/* Section 2: Resource Roles */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Resource Specific Roles</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Receiving Location */}
                        <View style={s.switchRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[s.switchLabel, { color: textColor }]}>Receiving Location</Text>
                                <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                    Can accept inbound deliveries and supplier PO receipts
                                </Text>
                            </View>
                            <Switch
                                value={isReceivingLocation}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsReceivingLocation(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#34C759' }}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Storage Location */}
                        <View style={s.switchRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[s.switchLabel, { color: textColor }]}>Storage Location</Text>
                                <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                    Holds active stock balance and physical inventory count
                                </Text>
                            </View>
                            <Switch
                                value={isStorageLocation}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsStorageLocation(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#007AFF' }}
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Transfer Destination */}
                        <View style={s.switchRow}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={[s.switchLabel, { color: textColor }]}>Transfer Destination</Text>
                                <Text style={[s.switchSubtitle, { color: subtextColor }]}>
                                    Can be targeted for material & equipment transfer orders
                                </Text>
                            </View>
                            <Switch
                                value={isTransferDestination}
                                onValueChange={(val) => {
                                    Haptics.selectionAsync();
                                    setIsTransferDestination(val);
                                }}
                                trackColor={{ false: '#3A3A3C', true: '#5856D6' }}
                            />
                        </View>
                    </View>

                    {/* Section 3: Linkages & Context */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Linkages & Context</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        {/* Linked Vendor (if Vendor Source) */}
                        {source === 'Vendor' && (
                            <>
                                <ContextMenu
                                    actions={vendors.map((v) => ({
                                        title: v.name,
                                        state: linkedVendorId === v.id ? 'on' : 'off',
                                    }))}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        const v = vendors[e.nativeEvent.index];
                                        if (v) handleSelectVendor(v);
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Linked Vendor</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: '#007AFF' }]} numberOfLines={1}>
                                                {vendors.find((v) => v.id === linkedVendorId)?.name || 'Select Vendor'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            </>
                        )}

                        {/* Linked Project (if Project Source or available) */}
                        {(source === 'Project' || source === 'Clock') && (
                            <>
                                <ContextMenu
                                    actions={[
                                        { title: 'None', state: !linkedProjectId ? 'on' : 'off' },
                                        ...MOCK_PROJECTS.map((p) => ({
                                            title: `${p.name} (${p.code})`,
                                            state: linkedProjectId === p.id ? 'on' : 'off',
                                        })),
                                    ]}
                                    dropdownMenuMode={true}
                                    onPress={(e) => {
                                        if (e.nativeEvent.index === 0) {
                                            setLinkedProjectId(undefined);
                                        } else {
                                            const p = MOCK_PROJECTS[e.nativeEvent.index - 1];
                                            if (p) handleSelectProject(p);
                                        }
                                    }}
                                >
                                    <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                        <Text style={[s.inputLabel, { color: textColor }]}>Linked Project</Text>
                                        <View style={s.selectValueBox}>
                                            <Text style={[s.selectValueText, { color: linkedProjectId ? '#007AFF' : subtextColor }]} numberOfLines={1}>
                                                {MOCK_PROJECTS.find((p) => p.id === linkedProjectId)?.name || 'None'}
                                            </Text>
                                            <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                        </View>
                                    </TouchableOpacity>
                                </ContextMenu>
                                <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />
                            </>
                        )}

                        {/* Linked Department */}
                        <ContextMenu
                            actions={[
                                { title: 'None', state: !department ? 'on' : 'off' },
                                ...DEPARTMENT_OPTIONS.map((d) => ({
                                    title: d,
                                    state: department === d ? 'on' : 'off',
                                })),
                            ]}
                            dropdownMenuMode={true}
                            onPress={(e) => {
                                Haptics.selectionAsync();
                                if (e.nativeEvent.index === 0) {
                                    setDepartment('');
                                } else {
                                    setDepartment(DEPARTMENT_OPTIONS[e.nativeEvent.index - 1] || '');
                                }
                            }}
                        >
                            <TouchableOpacity style={s.selectRow} activeOpacity={0.7}>
                                <Text style={[s.inputLabel, { color: textColor }]}>Department</Text>
                                <View style={s.selectValueBox}>
                                    <Text style={[s.selectValueText, { color: department ? '#007AFF' : subtextColor }]} numberOfLines={1}>
                                        {department || 'None'}
                                    </Text>
                                    <PlatformIcon name="chevron.up.chevron.down" size={13} tintColor={subtextColor} />
                                </View>
                            </TouchableOpacity>
                        </ContextMenu>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Address */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Address</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={address}
                                onChangeText={setAddress}
                                placeholder="Street, Building, or Zone info"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>

                        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]} />

                        {/* Notes */}
                        <View style={s.inputRow}>
                            <Text style={[s.inputLabel, { color: textColor }]}>Notes</Text>
                            <TextInput
                                style={[s.textInput, { color: textColor }]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Access rules or internal instructions"
                                placeholderTextColor={subtextColor}
                                clearButtonMode="while-editing"
                            />
                        </View>
                    </View>

                    {/* Section 4: Status */}
                    <Text style={[s.sectionHeader, { color: subtextColor }]}>Status</Text>
                    <View
                        style={[
                            s.formCard,
                            { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
                        ]}
                    >
                        <View style={s.switchRow}>
                            <Text style={[s.switchLabel, { color: textColor }]}>Active in Resources</Text>
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

                    {/* Delete Option */}
                    {isEditMode && (
                        <View style={{ marginTop: 28, paddingHorizontal: 4 }}>
                            <TouchableOpacity
                                style={[
                                    s.deleteBtn,
                                    { backgroundColor: isDark ? 'rgba(255,69,58,0.12)' : '#FFEBEA' },
                                ]}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    if (locationItem && onDeleteLocation) {
                                        onDeleteLocation(locationItem.id);
                                    }
                                    onClose();
                                }}
                            >
                                <PlatformIcon name="trash" size={16} tintColor="#FF3B30" />
                                <Text style={s.deleteBtnText}>Delete Location</Text>
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
        backgroundColor: '#FFE5E5',
        paddingHorizontal: 14,
        paddingVertical: 10,
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
    infoNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
        gap: 8,
    },
    infoNoticeText: {
        fontSize: 12.5,
        lineHeight: 17,
        flex: 1,
        fontWeight: '500',
    },
    sectionHeader: {
        fontSize: 13,
        fontWeight: '500',
        paddingHorizontal: 4,
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
        paddingVertical: 12,
        justifyContent: 'space-between',
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '500',
        minWidth: 100,
    },
    fieldSubtitle: {
        fontSize: 11.5,
        marginTop: 1,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        textAlign: 'right',
        padding: 0,
    },
    sourcePillsContainer: {
        flexDirection: 'row',
        gap: 6,
    },
    sourcePillBtn: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    sourcePillText: {
        fontSize: 12,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    selectValueBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: '55%',
    },
    selectValueText: {
        fontSize: 14.5,
        fontWeight: '500',
    },
    typeBadgePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    typeBadgeText: {
        fontSize: 13,
        fontWeight: '500',
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    switchLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    switchSubtitle: {
        fontSize: 12,
        marginTop: 1,
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
