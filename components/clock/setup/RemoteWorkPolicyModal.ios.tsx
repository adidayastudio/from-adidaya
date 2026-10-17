import React, { useState, useEffect, useRef } from 'react';
import {
    Host,
    BottomSheet,
    HStack,
    VStack,
    Spacer,
    Text as SwiftUIText,
    Button,
    Form,
    Section,
    TextField,
    Picker,
    Switch,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import {
    RemoteWorkPolicyItem,
    AllowedLocationScope,
} from '@/lib/api/clockSetup';

export interface RemoteWorkPolicyModalProps {
    visible: boolean;
    onClose: () => void;
    policy: RemoteWorkPolicyItem | null;
    onSave: (updated: RemoteWorkPolicyItem) => void;
}

const LOCATION_SCOPE_OPTIONS: Array<{ key: AllowedLocationScope; label: string; short: string }> = [
    { key: 'registered_geofence', label: 'Company Geofence (HQ / Branches / Sites)', short: 'Company Geofence' },
    { key: 'registered_home', label: 'Registered Employee Home Address', short: 'Registered Home' },
    { key: 'anywhere_gps', label: 'Any Location (Accurate GPS Logged)', short: 'Any Location (GPS)' },
    { key: 'trip_destination', label: 'Approved Trip Destination Coordinates', short: 'Trip Destination' },
];

const DURATION_LIMIT_OPTIONS = [
    'Unlimited (Standard Workday)',
    '1 Day / Week',
    '2 Days / Week',
    '3 Days / Week',
    '4 Days / Week',
    '5 Days / Month',
    '10 Days / Month',
    'Trip Schedule Validity',
    'Flexible / On Request',
];

export function RemoteWorkPolicyModal({
    visible,
    onClose,
    policy,
    onSave,
}: RemoteWorkPolicyModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#6E6E73';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';

    const [isEnabled, setIsEnabled] = useState(true);
    const [requireApproval, setRequireApproval] = useState(false);
    const [requireLocationVerification, setRequireLocationVerification] = useState(true);
    const [requireSelfie, setRequireSelfie] = useState(false);
    const [requireGpsLogging, setRequireGpsLogging] = useState(true);
    const [scopeIndex, setScopeIndex] = useState(0);
    const [durationIndex, setDurationIndex] = useState(0);
    const [customBadge, setCustomBadge] = useState('');
    const customBadgeRef = useRef('');

    // Business trip specifics
    const [requireTripRequest, setRequireTripRequest] = useState(true);
    const [useTripDestinationLocation, setUseTripDestinationLocation] = useState(true);
    const [allowOutsideGeofence, setAllowOutsideGeofence] = useState(true);

    useEffect(() => {
        if (visible && policy) {
            setIsEnabled(policy.isEnabled);
            setRequireApproval(policy.requireApproval);
            setRequireLocationVerification(policy.requireLocationVerification);
            setRequireSelfie(policy.requireSelfie);
            setRequireGpsLogging(policy.requireGpsLogging);
            setCustomBadge(policy.policyBadge || '');
            customBadgeRef.current = policy.policyBadge || '';

            const sIdx = LOCATION_SCOPE_OPTIONS.findIndex((o) => o.key === policy.allowedLocationScope);
            setScopeIndex(sIdx >= 0 ? sIdx : 0);

            const dIdx = DURATION_LIMIT_OPTIONS.findIndex((d) => d === policy.durationLimit);
            setDurationIndex(dIdx >= 0 ? dIdx : 0);

            if (policy.id === 'business_trip') {
                setRequireTripRequest(policy.requireTripRequest ?? true);
                setUseTripDestinationLocation(policy.useTripDestinationLocation ?? true);
                setAllowOutsideGeofence(policy.allowOutsideGeofence ?? true);
            }
        }
    }, [visible, policy]);

    if (!policy) return null;

    const handleSave = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const selectedScope = LOCATION_SCOPE_OPTIONS[scopeIndex]?.key || 'registered_geofence';
        const selectedScopeLabel = LOCATION_SCOPE_OPTIONS[scopeIndex]?.short || 'Company Geofence';
        const selectedDuration = DURATION_LIMIT_OPTIONS[durationIndex] || 'Unlimited';

        const rawBadge = (customBadgeRef.current || customBadge).trim();
        let badge = rawBadge;
        if (!badge) {
            if (!isEnabled) badge = 'Disabled';
            else if (policy.id === 'wfo') badge = 'Geofence Required';
            else if (policy.id === 'wfh') badge = 'Approval Required';
            else if (policy.id === 'wfa') badge = 'Selfie + GPS Required';
            else if (policy.id === 'business_trip') badge = 'Trip Request Required';
            else badge = 'Active Policy';
        }

        const updated: RemoteWorkPolicyItem = {
            ...policy,
            isEnabled,
            requireApproval,
            requireLocationVerification,
            requireSelfie,
            requireGpsLogging,
            allowedLocationScope: selectedScope,
            allowedLocationLabel: selectedScopeLabel,
            durationLimit: selectedDuration,
            policyBadge: badge,
            requireTripRequest: policy.id === 'business_trip' ? requireTripRequest : undefined,
            useTripDestinationLocation: policy.id === 'business_trip' ? useTripDestinationLocation : undefined,
            allowOutsideGeofence: policy.id === 'business_trip' ? allowOutsideGeofence : undefined,
        };

        onSave(updated);
        onClose();
    };

    const isBusinessTrip = policy.id === 'business_trip';

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
                        <SwiftUIText size={20} weight="bold" color={textColor}>
                            {policy.name}
                        </SwiftUIText>

                        <Spacer />

                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onClose();
                            }}
                        />
                    </HStack>

                    {/* Native Settings Form */}
                    <Form modifiers={[background('clear')]}>
                        {/* 1. Policy Status */}
                        <Section title="Policy Status">
                            <HStack>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                        {`Enable ${policy.name}`}
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        {isEnabled ? 'Policy is currently active' : 'Policy is turned off'}
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={isEnabled}
                                    onValueChange={(val) => {
                                        Haptics.selectionAsync();
                                        setIsEnabled(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* 2. Verification & Security */}
                        <Section title="Verification & Security">
                            <HStack>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                        Approval Required
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        Requires manager approval before clocking in
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={requireApproval}
                                    onValueChange={(val) => {
                                        Haptics.selectionAsync();
                                        setRequireApproval(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>

                            <HStack>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                        Location Verification
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        Validate device location against allowed coordinates
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={requireLocationVerification}
                                    onValueChange={(val) => {
                                        Haptics.selectionAsync();
                                        setRequireLocationVerification(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>

                            <HStack>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                        Selfie Photo Required
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        Capture live camera photo on clock-in and clock-out
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={requireSelfie}
                                    onValueChange={(val) => {
                                        Haptics.selectionAsync();
                                        setRequireSelfie(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>

                            <HStack>
                                <VStack spacing={2} alignment="leading">
                                    <SwiftUIText size={15} weight="semibold" color={textColor}>
                                        GPS Coordinate Logging
                                    </SwiftUIText>
                                    <SwiftUIText size={12.5} color={subtextColor}>
                                        Save high-accuracy GPS coordinates with each log
                                    </SwiftUIText>
                                </VStack>
                                <Spacer />
                                <Switch
                                    value={requireGpsLogging}
                                    onValueChange={(val) => {
                                        Haptics.selectionAsync();
                                        setRequireGpsLogging(val);
                                    }}
                                    color="#34C759"
                                />
                            </HStack>
                        </Section>

                        {/* 3. Business Trip Specific Rules */}
                        {isBusinessTrip && (
                            <Section title="Business Trip Controls">
                                <HStack>
                                    <VStack spacing={2} alignment="leading">
                                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                                            Require Trip Request
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Require an approved business trip request
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Switch
                                        value={requireTripRequest}
                                        onValueChange={(val) => {
                                            Haptics.selectionAsync();
                                            setRequireTripRequest(val);
                                        }}
                                        color="#30B0C7"
                                    />
                                </HStack>

                                <HStack>
                                    <VStack spacing={2} alignment="leading">
                                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                                            Use Trip Destination
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Use trip destination as valid attendance location
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Switch
                                        value={useTripDestinationLocation}
                                        onValueChange={(val) => {
                                            Haptics.selectionAsync();
                                            setUseTripDestinationLocation(val);
                                        }}
                                        color="#30B0C7"
                                    />
                                </HStack>

                                <HStack>
                                    <VStack spacing={2} alignment="leading">
                                        <SwiftUIText size={15} weight="semibold" color={textColor}>
                                            Allow Outside Geofence
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Allow attendance outside normal office geofences
                                        </SwiftUIText>
                                    </VStack>
                                    <Spacer />
                                    <Switch
                                        value={allowOutsideGeofence}
                                        onValueChange={(val) => {
                                            Haptics.selectionAsync();
                                            setAllowOutsideGeofence(val);
                                        }}
                                        color="#30B0C7"
                                    />
                                </HStack>
                            </Section>
                        )}

                        {/* 4. Allowed Clock-in Location Scope */}
                        <Section title="Allowed Clock-in Location">
                            <Picker
                                label="Location Scope"
                                options={LOCATION_SCOPE_OPTIONS.map((o) => o.label)}
                                selectedIndex={scopeIndex}
                                onOptionSelected={(e) => {
                                    Haptics.selectionAsync();
                                    setScopeIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />
                        </Section>

                        {/* 5. Duration / Validity Limit */}
                        <Section title="Duration / Allocation Limit">
                            <Picker
                                label="Validity Limit"
                                options={DURATION_LIMIT_OPTIONS}
                                selectedIndex={durationIndex}
                                onOptionSelected={(e) => {
                                    Haptics.selectionAsync();
                                    setDurationIndex(e.nativeEvent.index);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                            />
                        </Section>

                        {/* 6. Policy Badge Tag */}
                        <Section title="Policy Badge Tag">
                            <TextField
                                key={`badge-${policy.id}`}
                                placeholder="e.g. Geofence Required, Approval Required"
                                defaultValue={customBadgeRef.current || customBadge}
                                onChangeText={(val) => {
                                    setCustomBadge(val);
                                    customBadgeRef.current = val;
                                }}
                            />
                        </Section>
                    </Form>

                    {/* Bottom Save Button */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background('clear'),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 28 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
                        <Button
                            variant="glassProminent"
                            color="#007AFF"
                            onPress={handleSave}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 44 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    Save Policy
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
}
