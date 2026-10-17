import React, { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Image,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
    Slider,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    buttonStyle,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useTheme } from '@/context/ThemeContext';
import { WorkLocationItem } from '@/lib/api/clockSetup';

export interface WorkLocationModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (item: WorkLocationItem) => void;
    onDelete?: (item: WorkLocationItem) => void;
    locationItem: WorkLocationItem | null;
    existingLocations: WorkLocationItem[];
    orgLocationCode?: string;
}

const LOCATION_TYPES = [
    { key: 'headquarters', label: 'Headquarters' },
    { key: 'branch', label: 'Branch Office' },
    { key: 'project_site', label: 'Project Site' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'client_office', label: 'Client Office' },
    { key: 'remote_hub', label: 'Remote Hub' },
];

const RADIUS_OPTIONS = [25, 30, 35, 40, 45, 50, 60, 75, 100, 125, 150];

export function WorkLocationModal({
    visible,
    onClose,
    onSave,
    locationItem,
    existingLocations,
    orgLocationCode = 'HQ1',
}: WorkLocationModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const isEditMode = Boolean(locationItem);
    const isDefaultLocation = Boolean(locationItem?.isDefault);

    // Form fields
    const [name, setName] = useState('');
    const nameRef = useRef('');

    const [typeIndex, setTypeIndex] = useState(1); // default 'branch'

    const [code, setCode] = useState('');
    const codeRef = useRef('');

    const [address, setAddress] = useState('');
    const addressRef = useRef('');

    const [gmapsUrl, setGmapsUrl] = useState('');
    const gmapsUrlRef = useRef('');

    const [latitudeInput, setLatitudeInput] = useState('');
    const latitudeRef = useRef('');

    const [longitudeInput, setLongitudeInput] = useState('');
    const longitudeRef = useRef('');

    const [radiusMeters, setRadiusMeters] = useState(100);
    const [isActive, setIsActive] = useState(true);
    const [isLocating, setIsLocating] = useState(false);

    const wasVisibleRef = useRef(false);

    useEffect(() => {
        if (visible && !wasVisibleRef.current) {
            if (locationItem) {
                const n = locationItem.name || '';
                setName(n);
                nameRef.current = n;

                const c = (locationItem.code || '').toUpperCase();
                setCode(c);
                codeRef.current = c;

                const tIdx = LOCATION_TYPES.findIndex((t) => t.key === locationItem.type);
                setTypeIndex(tIdx >= 0 ? tIdx : 1);

                const addr = locationItem.address || '';
                setAddress(addr);
                addressRef.current = addr;

                const gurl = locationItem.gmapsUrl || '';
                setGmapsUrl(gurl);
                gmapsUrlRef.current = gurl;

                const latStr = locationItem.latitude != null ? String(locationItem.latitude) : '';
                setLatitudeInput(latStr);
                latitudeRef.current = latStr;

                const lngStr = locationItem.longitude != null ? String(locationItem.longitude) : '';
                setLongitudeInput(lngStr);
                longitudeRef.current = lngStr;

                setRadiusMeters(locationItem.radiusMeters || 100);
                setIsActive(locationItem.isActive ?? true);
            } else {
                setName('');
                nameRef.current = '';

                setCode('');
                codeRef.current = '';

                setTypeIndex(1); // branch

                setAddress('');
                addressRef.current = '';

                setGmapsUrl('');
                gmapsUrlRef.current = '';

                setLatitudeInput('');
                latitudeRef.current = '';

                setLongitudeInput('');
                longitudeRef.current = '';

                setRadiusMeters(100);
                setIsActive(true);
            }
        }
        wasVisibleRef.current = visible;
    }, [visible, locationItem]);

    const handleGmapsChange = (url: string) => {
        setGmapsUrl(url);
        gmapsUrlRef.current = url;
        const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            setLatitudeInput(match[1]);
            latitudeRef.current = match[1];
            setLongitudeInput(match[2]);
            longitudeRef.current = match[2];
            Haptics.selectionAsync();
        } else {
            const queryMatch = url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (queryMatch) {
                setLatitudeInput(queryMatch[1]);
                latitudeRef.current = queryMatch[1];
                setLongitudeInput(queryMatch[2]);
                longitudeRef.current = queryMatch[2];
                Haptics.selectionAsync();
            }
        }
    };

    const handleGetCurrentLocation = async () => {
        try {
            setIsLocating(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to detect GPS coordinates.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const latStr = loc.coords.latitude.toFixed(6);
            const lngStr = loc.coords.longitude.toFixed(6);
            setLatitudeInput(latStr);
            latitudeRef.current = latStr;
            setLongitudeInput(lngStr);
            longitudeRef.current = lngStr;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to get current GPS coordinates.');
        } finally {
            setIsLocating(false);
        }
    };

    const validateAndSave = () => {
        if (isDefaultLocation) {
            onClose();
            return;
        }

        const finalName = (nameRef.current || name).trim();
        const finalAddress = (addressRef.current || address).trim();
        const rawCode = (codeRef.current || code).replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
        const lat = parseFloat(latitudeRef.current || latitudeInput);
        const lng = parseFloat(longitudeRef.current || longitudeInput);
        const radiusVal = radiusMeters;
        const selectedType = LOCATION_TYPES[typeIndex]?.key || 'branch';

        if (!finalName) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Missing Field', 'Please enter a Location Name.');
            return;
        }

        if (rawCode.length !== 3) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Code', 'Location Code must be exactly 3 characters (e.g. SBY, PSA).');
            return;
        }

        const isDuplicate = existingLocations.some((loc) => {
            if (locationItem && loc.id === locationItem.id) return false;
            return (loc.code || '').toUpperCase() === rawCode;
        });

        if (isDuplicate) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Duplicate Code', `Code "${rawCode}" is already used by another location.`);
            return;
        }

        if (orgLocationCode && rawCode === orgLocationCode.toUpperCase()) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Reserved Code', `Code "${rawCode}" is reserved for Organization Main Location.`);
            return;
        }

        if (!finalAddress) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Missing Field', 'Please enter an Address.');
            return;
        }

        if (isNaN(lat) || lat < -90 || lat > 90) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Latitude', 'Please enter a valid Latitude between -90 and 90.');
            return;
        }

        if (isNaN(lng) || lng < -180 || lng > 180) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert('Invalid Longitude', 'Please enter a valid Longitude between -180 and 180.');
            return;
        }

        const payload: WorkLocationItem = {
            id: locationItem?.id || `loc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: finalName,
            type: selectedType,
            code: rawCode,
            address: finalAddress,
            latitude: lat,
            longitude: lng,
            radiusMeters: radiusVal,
            isActive: isActive,
            isDefault: false,
            gmapsUrl: (gmapsUrlRef.current || gmapsUrl).trim() || undefined,
        };

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSave(payload);
        onClose();
    };

    const currentTypeLabel = LOCATION_TYPES[typeIndex]?.label || 'Branch Office';

    return (
        <Host style={{ position: 'absolute', width: 0, height: 0 }} colorScheme={isDark ? 'dark' : 'light'}>
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.92]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background('clear'),
                    ]}
                >
                    {/* Header Bar */}
                    <HStack
                        alignment="center"
                        modifiers={[padding({ top: 20, leading: 20, trailing: 20, bottom: 8 })]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {isDefaultLocation ? 'Main Location' : isEditMode ? 'Edit Work Location' : 'New Work Location'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native Form Content */}
                    <Form modifiers={[background('clear')]}>
                        {isDefaultLocation ? (
                            /* VIEW ONLY MODE FOR DEFAULT / MAIN LOCATION */
                            <>
                                <Section title="Default Organization Location">
                                    <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={14} weight="semibold" color="#007AFF">
                                            Primary Organization Headquarters
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            This is your primary workplace automatically synchronized from Organization Settings. View-only mode.
                                        </SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section title="Location Information">
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Location Name</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} weight="semibold" color={textColor}>{name || 'Headquarters'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>3-Letter Code</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} weight="bold" color="#007AFF">{code || orgLocationCode || 'HQ1'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Location Type</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} color={textColor}>{currentTypeLabel}</SwiftUIText>
                                    </HStack>
                                    <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 2 })]}>
                                        <SwiftUIText size={13} color={subtextColor}>Office Address</SwiftUIText>
                                        <SwiftUIText size={14.5} color={textColor}>{address || '—'}</SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section title="Geofence & Coordinates">
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Attendance Radius</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} weight="semibold" color="#007AFF">{`${radiusMeters}m`}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Latitude</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} color={textColor}>{latitudeInput || '—'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Longitude</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} color={textColor}>{longitudeInput || '—'}</SwiftUIText>
                                    </HStack>
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Geofence Status</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} weight="semibold" color="#34C759">Active</SwiftUIText>
                                    </HStack>
                                </Section>
                            </>
                        ) : (
                            /* EDIT / CREATE MODE FOR CUSTOM LOCATIONS */
                            <>
                                <Section title="Basic Information">
                                    <TextField
                                        key={`loc-name-${locationItem?.id || 'new'}`}
                                        placeholder="Location Name (e.g. Surabaya Branch)"
                                        defaultValue={nameRef.current || name}
                                        onChangeText={(val) => {
                                            setName(val);
                                            nameRef.current = val;
                                        }}
                                    />
                                    <TextField
                                        key={`loc-code-${locationItem?.id || 'new'}`}
                                        placeholder="3-Letter Code (e.g. SBY, PSA)"
                                        defaultValue={codeRef.current || code}
                                        onChangeText={(val) => {
                                            const clean = val.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();
                                            setCode(clean);
                                            codeRef.current = clean;
                                        }}
                                    />
                                    <Picker
                                        label="Location Type"
                                        options={LOCATION_TYPES.map((t) => t.label)}
                                        selectedIndex={typeIndex}
                                        onOptionSelected={(e) => {
                                            Haptics.selectionAsync();
                                            setTypeIndex(e.nativeEvent.index);
                                        }}
                                        variant="menu"
                                        color={nativeControlTextColor}
                                    />
                                    <TextField
                                        key={`loc-addr-${locationItem?.id || 'new'}`}
                                        placeholder="Physical Address"
                                        defaultValue={addressRef.current || address}
                                        onChangeText={(val) => {
                                            setAddress(val);
                                            addressRef.current = val;
                                        }}
                                    />
                                </Section>

                                <Section title="Google Maps URL (Auto-Parse)">
                                    <TextField
                                        key={`loc-gmaps-${locationItem?.id || 'new'}`}
                                        placeholder="Paste Google Maps URL..."
                                        defaultValue={gmapsUrlRef.current || gmapsUrl}
                                        onChangeText={handleGmapsChange}
                                    />
                                </Section>

                                <Section title="GPS Pinpoint Coordinates">
                                    <Button
                                        onPress={handleGetCurrentLocation}
                                        modifiers={[buttonStyle('plain'), padding({ vertical: 4 })]}
                                    >
                                        <HStack spacing={8} alignment="center">
                                            <Image systemName="location.fill" size={15} color="#007AFF" />
                                            <SwiftUIText color="#007AFF" size={15} weight="semibold">
                                                {isLocating ? 'Detecting Location...' : 'Use Current Location'}
                                            </SwiftUIText>
                                        </HStack>
                                    </Button>

                                    <TextField
                                        key={`loc-lat-${locationItem?.id || 'new'}-${latitudeInput}`}
                                        placeholder="Latitude (e.g. -6.2088)"
                                        defaultValue={latitudeRef.current || latitudeInput}
                                        onChangeText={(val) => {
                                            setLatitudeInput(val);
                                            latitudeRef.current = val;
                                        }}
                                    />
                                    <TextField
                                        key={`loc-lng-${locationItem?.id || 'new'}-${longitudeInput}`}
                                        placeholder="Longitude (e.g. 106.8456)"
                                        defaultValue={longitudeRef.current || longitudeInput}
                                        onChangeText={(val) => {
                                            setLongitudeInput(val);
                                            longitudeRef.current = val;
                                        }}
                                    />
                                </Section>

                                <Section title="Attendance Geofence Radius">
                                    <HStack>
                                        <SwiftUIText size={15} color={subtextColor}>Radius Buffer</SwiftUIText>
                                        <Spacer />
                                        <SwiftUIText size={15} weight="bold" color="#007AFF">{`${radiusMeters} meters`}</SwiftUIText>
                                    </HStack>
                                    <Slider
                                        value={radiusMeters}
                                        onValueChange={(val: number) => {
                                            const snapped = Math.round(val / 5) * 5;
                                            setRadiusMeters(snapped);
                                        }}
                                        min={25}
                                        max={150}
                                        steps={25}
                                    />
                                </Section>

                                <Section title="Status">
                                    <Switch
                                        label="Active for Attendance Geofence"
                                        value={isActive}
                                        onValueChange={(val) => {
                                            setIsActive(val);
                                            Haptics.selectionAsync();
                                        }}
                                    />
                                </Section>
                            </>
                        )}
                    </Form>

                    {/* Native Glass Footer Action Buttons */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background('clear'),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        {isDefaultLocation ? (
                            <Button
                                variant="glass"
                                color="gray"
                                onPress={onClose}
                            >
                                <HStack
                                    modifiers={[
                                        frame({ maxWidth: Infinity }),
                                        frame({ height: 42 }),
                                    ]}
                                >
                                    <Spacer />
                                    <SwiftUIText weight="semibold" size={17}>
                                        Close
                                    </SwiftUIText>
                                    <Spacer />
                                </HStack>
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="glass"
                                    color="gray"
                                    onPress={onClose}
                                >
                                    <HStack
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 42 }),
                                        ]}
                                    >
                                        <Spacer />
                                        <SwiftUIText weight="semibold" size={17}>
                                            Cancel
                                        </SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                                <Button
                                    variant="glassProminent"
                                    color="#007AFF"
                                    onPress={validateAndSave}
                                >
                                    <HStack
                                        modifiers={[
                                            frame({ maxWidth: Infinity }),
                                            frame({ height: 42 }),
                                        ]}
                                    >
                                        <Spacer />
                                        <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                            {isEditMode ? 'Save Changes' : 'Add Location'}
                                        </SwiftUIText>
                                        <Spacer />
                                    </HStack>
                                </Button>
                            </>
                        )}
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
