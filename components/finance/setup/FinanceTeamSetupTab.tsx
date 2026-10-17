import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { GlassView } from '@/components/ui/GlassView';
import { PlatformIcon } from '@/components/ui/PlatformIcon';

export type FinanceSetupModule =
    | 'general_settings'
    | 'document_rules'
    | 'transaction_categories'
    | 'expense_types'
    | 'tax_rules'
    | 'accounts'
    | 'payment_terms'
    | 'payment_cycles'
    | 'bank_accounts'
    | 'approval_matrix'
    | 'field_requirements'
    | 'notification_rules'
    | 'audit_logs';

export type FinanceSetupGroup = 'general' | 'transactions' | 'payments' | 'controls' | 'system';

interface FinanceTeamSetupTabProps {
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    selectedModuleId?: FinanceSetupModule;
    onSelectModule?: (id: FinanceSetupModule) => void;
}

export interface FinanceMenuItem {
    id: FinanceSetupModule;
    group: FinanceSetupGroup;
    title: string;
    shortLabel: string;
    subtitle: string;
    icon: string;
    color: string;
    gradientColors: [string, string];
}

export const FINANCE_SETUP_MENU_ITEMS: FinanceMenuItem[] = [
    // 1. General (Slate)
    {
        id: 'general_settings',
        group: 'general',
        title: 'General Settings',
        shortLabel: 'General',
        subtitle: 'Currency, decimal precision, and time zone.',
        icon: 'slider.horizontal.3',
        color: '#64748B',
        gradientColors: ['#64748B', '#475569'],
    },
    {
        id: 'document_rules',
        group: 'general',
        title: 'Document Rules',
        shortLabel: 'Doc Rules',
        subtitle: 'Configure document workflows, names, codes, and numbering rules.',
        icon: 'number.square.fill',
        color: '#64748B',
        gradientColors: ['#64748B', '#334155'],
    },

    // 2. Transactions (Blue)
    {
        id: 'transaction_categories',
        group: 'transactions',
        title: 'Transaction Categories',
        shortLabel: 'Categories',
        subtitle: 'Categories, subcategories, and resource mapping.',
        icon: 'square.grid.2x2.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'expense_types',
        group: 'transactions',
        title: 'Expense Types',
        shortLabel: 'Expense Types',
        subtitle: 'Expense classifications used across Finance.',
        icon: 'tag.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'tax_rules',
        group: 'transactions',
        title: 'Tax Rules',
        shortLabel: 'Tax Rules',
        subtitle: 'Manage reusable tax definitions used by Finance transactions and Expense Types.',
        icon: 'percent',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },
    {
        id: 'accounts',
        group: 'transactions',
        title: 'Accounts',
        shortLabel: 'Accounts',
        subtitle: 'Manage financial accounts used for transaction and Expense Type mapping.',
        icon: 'book.closed.fill',
        color: '#2563EB',
        gradientColors: ['#2563EB', '#1D4ED8'],
    },

    // 3. Payments (Green)
    {
        id: 'payment_terms',
        group: 'payments',
        title: 'Payment Terms',
        shortLabel: 'Terms',
        subtitle: 'COD, credit terms, and due dates.',
        icon: 'calendar',
        color: '#159957',
        gradientColors: ['#159957', '#0F703F'],
    },
    {
        id: 'payment_cycles',
        group: 'payments',
        title: 'Payment Cycles',
        shortLabel: 'Cycles',
        subtitle: 'Payment cut-offs and recurring schedules.',
        icon: 'arrow.triangle.2.circlepath',
        color: '#159957',
        gradientColors: ['#159957', '#0F703F'],
    },
    {
        id: 'bank_accounts',
        group: 'payments',
        title: 'Bank Accounts & Beneficiaries',
        shortLabel: 'Bank Accounts',
        subtitle: 'Saved accounts for vendors, employees, and payments.',
        icon: 'building.columns',
        color: '#159957',
        gradientColors: ['#159957', '#0F703F'],
    },

    // 4. Controls (Amber)
    {
        id: 'approval_matrix',
        group: 'controls',
        title: 'Approval Matrix',
        shortLabel: 'Approvals',
        subtitle: 'Approval levels, approvers, and transaction limits.',
        icon: 'person.crop.circle.badge.checkmark',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'field_requirements',
        group: 'controls',
        title: 'Field Requirements',
        shortLabel: 'Field Rules',
        subtitle: 'Required fields and attachments by document.',
        icon: 'checklist',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },
    {
        id: 'notification_rules',
        group: 'controls',
        title: 'Notification Rules',
        shortLabel: 'Notifications',
        subtitle: 'Choose which Finance activities trigger notifications.',
        icon: 'bell.badge.fill',
        color: '#FF9500',
        gradientColors: ['#FF9500', '#D17A00'],
    },

    // 5. System (Purple)
    {
        id: 'audit_logs',
        group: 'system',
        title: 'Audit Logs',
        shortLabel: 'Audit Logs',
        subtitle: 'Track configuration changes, approvals, and key Finance activities.',
        icon: 'clock.arrow.circlepath',
        color: '#AF52DE',
        gradientColors: ['#AF52DE', '#7A2BB1'],
    },
];

const GROUP_TITLES: Record<FinanceSetupGroup, string> = {
    general: 'General',
    transactions: 'Transactions',
    payments: 'Payments',
    controls: 'Controls',
    system: 'System',
};

export function FinanceTeamSetupTab({
    isDark,
    textColor,
    subtextColor,
    selectedModuleId,
    onSelectModule,
}: FinanceTeamSetupTabProps) {
    const router = useRouter();

    const groups: FinanceSetupGroup[] = ['general', 'transactions', 'payments', 'controls', 'system'];

    const handlePressItem = (id: FinanceSetupModule) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onSelectModule) {
            onSelectModule(id);
        } else {
            router.push(`/finance-setup/${id}` as any);
        }
    };

    return (
        <View style={s.container}>
            {groups.map((grp) => {
                const items = FINANCE_SETUP_MENU_ITEMS.filter((item) => item.group === grp);
                if (items.length === 0) return null;

                return (
                    <View key={grp} style={s.menuListContainer}>
                        <Text style={[s.menuListHeader, { color: subtextColor }]}>
                            {GROUP_TITLES[grp]}
                        </Text>
                        <View
                            style={[
                                s.menuList,
                                {
                                    backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                                    borderWidth: 1,
                                    borderColor: isDark
                                        ? 'rgba(255,255,255,0.08)'
                                        : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            {items.map((item, index) => {
                                const isSelected = selectedModuleId === item.id;
                                const isLast = index === items.length - 1;

                                return (
                                    <View key={item.id}>
                                        <TouchableOpacity
                                            style={[
                                                s.menuRow,
                                                isSelected && {
                                                    backgroundColor: isDark
                                                        ? 'rgba(21, 153, 87, 0.16)'
                                                        : 'rgba(21, 153, 87, 0.08)',
                                                },
                                            ]}
                                            onPress={() => handlePressItem(item.id)}
                                            activeOpacity={0.7}
                                        >
                                            <LinearGradient
                                                colors={isDark ? ['#1C1C1E', '#000000'] : item.gradientColors}
                                                style={s.menuIconBox}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                            >
                                                <PlatformIcon
                                                    name={item.icon as any}
                                                    size={16}
                                                    tintColor={isDark ? item.color : '#FFF'}
                                                />
                                            </LinearGradient>
                                            <View style={s.menuRowContent}>
                                                <Text style={[s.menuRowTitle, { color: textColor }]}>
                                                    {item.title}
                                                </Text>
                                                <Text
                                                    style={[s.menuRowSubtitle, { color: subtextColor }]}
                                                    numberOfLines={1}
                                                >
                                                    {item.subtitle}
                                                </Text>
                                            </View>
                                            <PlatformIcon
                                                name="chevron.right"
                                                size={14}
                                                tintColor={
                                                    isSelected
                                                        ? '#159957'
                                                        : isDark
                                                        ? 'rgba(255,255,255,0.25)'
                                                        : 'rgba(0,0,0,0.25)'
                                                }
                                            />
                                        </TouchableOpacity>

                                        {!isLast && (
                                            <View
                                                style={[
                                                    s.indentedDivider,
                                                    {
                                                        backgroundColor: isDark
                                                            ? 'rgba(255,255,255,0.06)'
                                                            : 'rgba(0,0,0,0.06)',
                                                    },
                                                ]}
                                            />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        gap: 20,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 24,
    },
    menuListContainer: {
        gap: 8,
    },
    menuListHeader: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 12,
        letterSpacing: -0.1,
    },
    menuList: {
        borderRadius: 24,
        overflow: 'hidden',
    },
    menuRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingHorizontal: 16,
        gap: 12,
    },
    indentedDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 60,
        marginRight: 0,
    },
    menuIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuRowContent: {
        flex: 1,
        gap: 1,
    },
    menuRowTitle: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    menuRowSubtitle: {
        fontSize: 13,
        fontWeight: '400',
    },
});
