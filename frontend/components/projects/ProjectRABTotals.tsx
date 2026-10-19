import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ContextMenu from '@/components/ui/PlatformContextMenu';
import { currencyWords } from '@/lib/currencyWords';
import { calculateRABTotals, RABTotalsSettings } from '@/lib/projectRABTotals';

function IOSSwitch({ value, onValueChange, disabled, isDark, accessibilityLabel }: { value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; isDark?: boolean; accessibilityLabel?: string }) {
    return (
        <TouchableOpacity
            accessibilityRole="switch"
            accessibilityLabel={accessibilityLabel || 'VAT 11%'}
            accessibilityState={{ checked: value }}
            disabled={disabled}
            activeOpacity={0.85}
            onPress={() => onValueChange(!value)}
            style={{
                width: 44,
                height: 26,
                borderRadius: 13,
                backgroundColor: value ? '#34C759' : (isDark ? '#39393D' : '#E5E5EA'),
                justifyContent: 'center',
                paddingHorizontal: 2,
                opacity: disabled ? 0.45 : 1,
            }}
        >
            <View
                style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: '#FFFFFF',
                    alignSelf: value ? 'flex-end' : 'flex-start',
                    shadowColor: '#000000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2.5,
                    elevation: 2,
                }}
            />
        </TouchableOpacity>
    );
}

export function ProjectRABTotals({ subtotal, settings, onChange, isDark, readOnly }: { subtotal: number; settings: RABTotalsSettings; onChange: (settings: RABTotalsSettings) => void; isDark: boolean; readOnly: boolean }) {
    const totals = calculateRABTotals(subtotal, settings), words = currencyWords(totals.total);
    const text = isDark ? '#F5F5F7' : '#1C1C1E', muted = isDark ? '#9898A2' : '#73737D', surface = isDark ? '#1C1D23' : '#FFFFFF';
    const money = (value: number) => `Rp ${value.toLocaleString('id-ID', { maximumFractionDigits: 2 })}`;
    const pill = { height: 32, paddingHorizontal: 12, borderRadius: 999, backgroundColor: surface, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 };
    const steps = [0, 1000, 10000, 100000, 1000000], modes = ['nearest', 'up', 'down'] as const;
    return <View style={{ padding: 18, backgroundColor: isDark ? '#16171C' : '#F2F2F7', borderRadius: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: muted, fontSize: 13, fontWeight: '500' }}>Subtotal</Text>
            <Text style={{ color: text, fontSize: 13, fontWeight: '600' }}>{money(totals.subtotal)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: muted, fontSize: 13, fontWeight: '500' }}>VAT 11%</Text>
                <IOSSwitch
                    accessibilityLabel="VAT 11%"
                    disabled={readOnly}
                    value={settings.vat}
                    onValueChange={vat => onChange({ ...settings, vat })}
                    isDark={isDark}
                />
            </View>
            <Text style={{ color: text, fontSize: 13, fontWeight: '600', minWidth: 100, textAlign: 'right' }}>{money(totals.vat)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={{ color: muted, fontSize: 13, fontWeight: '500' }}>Rounding</Text>
                <ContextMenu title="Rounding" dropdownMenuMode disabled={readOnly} actions={steps.map(value => ({ title: value ? `Rp ${value.toLocaleString('id-ID')}` : 'No rounding', selected: value === settings.rounding }))} onPress={event => onChange({ ...settings, rounding: steps[event.nativeEvent.index] })}>
                    <View style={pill}>
                        <Text style={{ color: text, fontSize: 12 }}>{settings.rounding ? money(settings.rounding) : 'No rounding'}</Text>
                        <Ionicons name="chevron-down" size={11} color={muted} />
                    </View>
                </ContextMenu>
                {!!settings.rounding && <ContextMenu title="Rounding direction" dropdownMenuMode disabled={readOnly} actions={['Nearest', 'Round up', 'Round down'].map((title, index) => ({ title, selected: settings.roundingMode === modes[index] }))} onPress={event => onChange({ ...settings, roundingMode: modes[event.nativeEvent.index] })}>
                    <View style={pill}>
                        <Text style={{ color: text, fontSize: 12 }}>{['Nearest', 'Round up', 'Round down'][modes.indexOf(settings.roundingMode)]}</Text>
                        <Ionicons name="chevron-down" size={11} color={muted} />
                    </View>
                </ContextMenu>}
            </View>
            <Text style={{ color: text, fontSize: 13, fontWeight: '600', minWidth: 100, textAlign: 'right' }}>{money(totals.rounding)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderColor: isDark ? '#292930' : '#E5E5EA', paddingTop: 12, marginTop: 4 }}>
            <Text style={{ flex: 1, color: text, fontSize: 15, fontWeight: '700' }}>Total</Text>
            <Text style={{ color: '#007AFF', fontSize: 18, fontWeight: '700' }}>{money(totals.total)}</Text>
        </View>
        <View style={{ gap: 2 }}>
            <Text style={{ color: muted, fontSize: 11 }}>EN · {words.en}</Text>
            <Text style={{ color: muted, fontSize: 11 }}>ID · {words.id}</Text>
        </View>
    </View>;
}
