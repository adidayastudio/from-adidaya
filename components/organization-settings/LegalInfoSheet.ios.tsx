import React, { useState, useEffect } from 'react';
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
    Picker,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

export type LegalTab = 'about' | 'terms' | 'privacy';

export interface LegalInfoSheetProps {
    visible: boolean;
    onClose: () => void;
    initialTab?: LegalTab;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

const TABS: LegalTab[] = ['about', 'terms', 'privacy'];
const TAB_LABELS = ['About', 'Terms', 'Privacy'];

export const LegalInfoSheetIOS: React.FC<LegalInfoSheetProps> = ({
    visible,
    onClose,
    initialTab = 'about',
}) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#8E8E93' : '#64748B';

    const initialIdx = Math.max(0, TABS.indexOf(initialTab));
    const [activeTabIdx, setActiveTabIdx] = useState(initialIdx);

    useEffect(() => {
        if (visible) {
            const idx = Math.max(0, TABS.indexOf(initialTab));
            setActiveTabIdx(idx);
        }
    }, [visible, initialTab]);

    const handleTabChange = (index: number) => {
        Haptics.selectionAsync();
        setActiveTabIdx(index);
    };

    const getTitle = () => {
        if (activeTabIdx === 0) return 'About Forma';
        if (activeTabIdx === 1) return 'Terms of Service';
        return 'Privacy Policy';
    };

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={visible}
                presentationDetents={[0.85, 0.95]}
                presentationDragIndicator="hidden"
                onIsOpenedChange={(opened) => {
                    if (!opened) onClose();
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Native Header Bar (No Grabber, Elevated Title & X Button) */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 16, leading: 20, trailing: 20, bottom: 8 }),
                        ]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {getTitle()}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Native SwiftUI Segmented Picker */}
                    <HStack modifiers={[padding({ horizontal: 20, bottom: 10 })]}>
                        <Picker
                            label="Legal Section"
                            options={TAB_LABELS}
                            selectedIndex={activeTabIdx}
                            onOptionSelected={(e) => handleTabChange(e.nativeEvent.index)}
                            variant="segmented"
                            modifiers={[
                                frame({ maxWidth: Infinity }),
                            ]}
                        />
                    </HStack>

                    {/* Native Form Content */}
                    <Form modifiers={[background(sheetBg)]}>
                        {activeTabIdx === 0 && (
                            <>
                                <Section title="Forma Operational System">
                                    <VStack spacing={6} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={15} weight="bold" color={textColor}>
                                            Version 0.1.0 · Build 2026.10
                                        </SwiftUIText>
                                        <SwiftUIText size={13.5} color={subtextColor}>
                                            Forma is a modern enterprise operational OS engineered for high-performance teams. It provides seamless multi-tenant organization workspaces, high-precision geofence attendance, synchronized team roles, real-time project collaboration, and enterprise-grade security.
                                        </SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section title="Core Pillars & Architecture">
                                    <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={14} weight="semibold" color={textColor}>
                                            Zero-Trust Multi-Tenancy
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Isolated tenant partitions, cryptographic join codes, and strictly enforced Row-Level Security (RLS) across every data query.
                                        </SwiftUIText>
                                    </VStack>

                                    <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={14} weight="semibold" color={textColor}>
                                            Geofenced Precision Presence
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Configurable attendance radii, anti-spoofing coordinate verification, and real-time attendance telemetry.
                                        </SwiftUIText>
                                    </VStack>

                                    <VStack spacing={4} alignment="leading" modifiers={[padding({ vertical: 4 })]}>
                                        <SwiftUIText size={14} weight="semibold" color={textColor}>
                                            Sub-Second Synchronization
                                        </SwiftUIText>
                                        <SwiftUIText size={12.5} color={subtextColor}>
                                            Instant offline caching, biometric authentication support, and distributed edge cloud replication.
                                        </SwiftUIText>
                                    </VStack>
                                </Section>

                                <Section>
                                    <SwiftUIText size={11.5} color={subtextColor}>
                                        © 2026 Forma Technologies Inc. All rights reserved. Developed for high-security enterprise operations.
                                    </SwiftUIText>
                                </Section>
                            </>
                        )}

                        {activeTabIdx === 1 && (
                            <>
                                <Section title="1. Acceptance of Terms">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        By accessing or using the Forma application, services, or associated enterprise tenant workspaces, you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you possess the authority to bind such entity.
                                    </SwiftUIText>
                                </Section>

                                <Section title="2. Tenant Workspaces & Roles">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Access to specific features within an organization is determined by assigned Role-Based Access Control (RBAC) levels (System, Super Admin, Admin, Member, Viewer). Tenant administrators maintain sole responsibility for user provisioning, permission configuration, and workspace management.
                                    </SwiftUIText>
                                </Section>

                                <Section title="3. Acceptable Use Policy">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        You agree not to misuse Forma services, attempt unauthorized access to other tenant databases, bypass geofence telemetry verification, reverse-engineer proprietary algorithms, or introduce malicious payloads into the system.
                                    </SwiftUIText>
                                </Section>

                                <Section title="4. Service Availability & SLA">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Forma targets 99.95% cloud service availability. Regular security updates and maintenance windows will be communicated in advance whenever feasible.
                                    </SwiftUIText>
                                </Section>

                                <Section title="5. Termination & Data Portability">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Super Admins retain full rights to deactivate or export tenant data at any time through the Security console. Upon deactivation, workspace access is revoked while records remain preserved in accordance with enterprise retention guidelines.
                                    </SwiftUIText>
                                </Section>
                            </>
                        )}

                        {activeTabIdx === 2 && (
                            <>
                                <Section title="1. Data Collection & Privacy">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Forma prioritizes data sovereignty and privacy by design. We collect only data strictly necessary for enterprise workforce management, identity verification, and collaborative operations. We do not sell or monetize personal or operational data to third parties.
                                    </SwiftUIText>
                                </Section>

                                <Section title="2. Geolocation & Telemetry">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Location services are utilized solely to verify physical presence within configured organization geofence radii at the exact moment of attendance check-in. Continuous background tracking is never executed without explicit user consent.
                                    </SwiftUIText>
                                </Section>

                                <Section title="3. Encryption & Security">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        All data in transit is protected using TLS 1.3 cryptographic protocols with modern cipher suites. Sensitive credentials, authentication tokens, and tenant databases are encrypted at rest with AES-256 standards.
                                    </SwiftUIText>
                                </Section>

                                <Section title="4. Global Compliance Standards">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        Forma is architected in accordance with global data protection standards, including GDPR, CCPA, and SOC 2 Type II controls. Users and organizations hold the right to request access, rectification, or complete deletion of their stored operational records.
                                    </SwiftUIText>
                                </Section>

                                <Section title="5. Data Protection Officer">
                                    <SwiftUIText size={13.5} color={subtextColor}>
                                        For inquiries regarding security audits, data processing agreements (DPA), or privacy requests, contact compliance@forma.io.
                                    </SwiftUIText>
                                </Section>
                            </>
                        )}
                    </Form>
                </VStack>
            </BottomSheet>
        </Host>
    );
};

export const LegalInfoSheet = LegalInfoSheetIOS;
