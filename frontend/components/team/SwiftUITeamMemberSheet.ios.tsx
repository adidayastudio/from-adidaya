import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
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
    SecureField,
    Picker,
} from '@expo/ui/swift-ui';
import {
    padding,
    frame,
    background,
    ignoreSafeArea,
    tint,
} from '@expo/ui/swift-ui/modifiers';
import { useTheme } from '@/context/ThemeContext';
import * as Haptics from 'expo-haptics';

const ROLE_OPTIONS = ['Member', 'Super Admin', 'Admin', 'Viewer', 'System'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived'] as const;

export interface SwiftUITeamMemberSheetProps {
    isOpened?: boolean;
    visible?: boolean;
    onClose: () => void;
    onSubmit: (data: {
        fullName: string;
        email: string;
        role: string;
        password?: string;
        status?: string;
        name?: string;
    }) => Promise<void>;
    isSubmitting: boolean;
    editMember?: any | null;
    editingMember?: any | null;
    isDark?: boolean;
    textColor?: string;
    subtextColor?: string;
}

export const SwiftUITeamMemberSheet: React.FC<SwiftUITeamMemberSheetProps> = (props) => {
    const isOpened = Boolean(props.isOpened ?? props.visible);
    const editMember = props.editMember ?? props.editingMember ?? null;
    const { onClose, onSubmit, isSubmitting } = props;
    const { resolvedTheme } = useTheme();
    const isDark = props.isDark ?? (resolvedTheme === 'dark');
    const isEditMode = !!editMember?.id;

    const sheetBg = 'clear';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
    const nativeControlTextColor = isDark ? '#FFFFFF' : '#000000';
    const menuControlModifiers = [tint(isDark ? '#007AFF' : '#1C1C1E')];
    const textFieldModifiers = [tint('#007AFF')];

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<typeof ROLE_OPTIONS[number]>('Member');
    const [status, setStatus] = useState<typeof STATUS_OPTIONS[number]>('Active');
    const [password, setPassword] = useState('Forma123456!');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (editMember) {
            setFullName(editMember.profile?.full_name || editMember.profile?.username || '');
            setEmail(editMember.profile?.email || editMember.email || '');
            const currentRole = (editMember.role || '').toLowerCase();
            const matched = ROLE_OPTIONS.find(
                (r) => r.toLowerCase() === currentRole || (r === 'System' && currentRole === 'sistem')
            );
            setRole(matched || 'Member');
            const currentStatus = (editMember.status || 'active').toLowerCase();
            const matchedStatus = STATUS_OPTIONS.find(
                (s) => s.toLowerCase() === currentStatus
            );
            setStatus(matchedStatus || 'Active');
        } else {
            setFullName('');
            setEmail('');
            setRole('Member');
            setPassword('Forma123456!');
        }
    }, [editMember, isOpened]);

    const roleIndex = Math.max(0, ROLE_OPTIONS.indexOf(role));
    const statusIndex = Math.max(0, STATUS_OPTIONS.indexOf(status));

    const handleSave = () => {
        if (!fullName.trim()) {
            Alert.alert('Required Field', 'Please enter member full name.');
            return;
        }
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('Invalid Email', 'Please enter a valid login email address.');
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSubmit({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            role,
            password: password.trim() || 'Forma123456!',
            status: isEditMode ? status.toLowerCase() : 'active',
        });
    };

    return (
        <Host
            style={{ position: 'absolute', width: 0, height: 0 }}
            colorScheme={isDark ? 'dark' : 'light'}
        >
            <BottomSheet
                isOpened={isOpened}
                presentationDetents={[0.85]}
                onIsOpenedChange={(opened) => {
                    if (!opened && !isSubmitting) {
                        onClose();
                    }
                }}
            >
                <VStack
                    spacing={0}
                    modifiers={[
                        ignoreSafeArea({ edges: 'bottom' }),
                        background(sheetBg),
                    ]}
                >
                    {/* Header (Identical to SwiftUICreateRequestSheet) */}
                    <HStack
                        alignment="center"
                        modifiers={[
                            padding({ top: 20, leading: 20, trailing: 20, bottom: 10 }),
                        ]}
                    >
                        <SwiftUIText size={22} weight="bold" color={textColor}>
                            {isEditMode ? 'Edit Team Member' : 'Add Team Member'}
                        </SwiftUIText>
                        <Spacer />
                        <Button
                            systemImage="xmark"
                            role="cancel"
                            color="gray"
                            onPress={onClose}
                        />
                    </HStack>

                    {/* Scrollable Form (Identical to SwiftUICreateRequestSheet) */}
                    <Form modifiers={[background(sheetBg)]}>
                        <Section title="Member Information">
                            <TextField
                                key={`name-${editMember?.id || 'new'}-${isOpened}`}
                                placeholder="Full Name"
                                defaultValue={fullName}
                                onChangeText={setFullName}
                                modifiers={textFieldModifiers}
                            />
                            <TextField
                                key={`email-${editMember?.id || 'new'}-${isOpened}`}
                                placeholder="Email Address"
                                defaultValue={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autocorrection={false}
                                modifiers={textFieldModifiers}
                            />
                        </Section>

                        <Section title="Access Role">
                            <Picker
                                label="Role"
                                options={ROLE_OPTIONS as any}
                                selectedIndex={roleIndex}
                                onOptionSelected={(e) => {
                                    const selected = ROLE_OPTIONS[e.nativeEvent.index] || 'Member';
                                    setRole(selected);
                                }}
                                variant="menu"
                                color={nativeControlTextColor}
                                modifiers={menuControlModifiers}
                            />
                        </Section>

                        {isEditMode && (
                            <Section title="Member Status">
                                <Picker
                                    label="Status"
                                    options={STATUS_OPTIONS as any}
                                    selectedIndex={statusIndex}
                                    onOptionSelected={(e) => {
                                        const selected = STATUS_OPTIONS[e.nativeEvent.index] || 'Active';
                                        setStatus(selected);
                                    }}
                                    variant="menu"
                                    color={nativeControlTextColor}
                                    modifiers={menuControlModifiers}
                                />
                            </Section>
                        )}

                        {!isEditMode && (
                            <Section title="Default Password">
                                <HStack alignment="center">
                                    {showPassword ? (
                                        <TextField
                                            key={`pwd-visible-${editMember?.id || 'new'}-${isOpened}`}
                                            placeholder="Default Password"
                                            defaultValue={password}
                                            onChangeText={setPassword}
                                            autocorrection={false}
                                            modifiers={textFieldModifiers}
                                        />
                                    ) : (
                                        <SecureField
                                            key={`pwd-secure-${editMember?.id || 'new'}-${isOpened}`}
                                            placeholder="Default Password"
                                            defaultValue={password}
                                            onChangeText={setPassword}
                                            modifiers={textFieldModifiers}
                                        />
                                    )}
                                    <Button
                                        systemImage={showPassword ? 'eye.slash' : 'eye'}
                                        role="cancel"
                                        color="gray"
                                        onPress={() => setShowPassword(!showPassword)}
                                    />
                                </HStack>
                            </Section>
                        )}

                        {!isEditMode && (
                            <Section>
                                <SwiftUIText size={13} color={subtextColor}>
                                    This password is set by the admin as a default for the new member. The member can reset it after their first login.
                                </SwiftUIText>
                            </Section>
                        )}
                    </Form>

                    {/* Sticky Glass Footer Buttons (1:1 from SwiftUICreateRequestSheet) */}
                    <HStack
                        spacing={12}
                        modifiers={[
                            background(sheetBg),
                            padding({ top: 12, leading: 20, trailing: 20, bottom: 20 }),
                            frame({ maxWidth: Infinity }),
                        ]}
                    >
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
                            onPress={handleSave}
                            disabled={isSubmitting}
                        >
                            <HStack
                                modifiers={[
                                    frame({ maxWidth: Infinity }),
                                    frame({ height: 42 }),
                                ]}
                            >
                                <Spacer />
                                <SwiftUIText weight="semibold" size={17} color="#FFFFFF">
                                    {isSubmitting
                                        ? 'Saving...'
                                        : isEditMode
                                        ? 'Save Changes'
                                        : 'Create Member'}
                                </SwiftUIText>
                                <Spacer />
                            </HStack>
                        </Button>
                    </HStack>
                </VStack>
            </BottomSheet>
        </Host>
    );
};
