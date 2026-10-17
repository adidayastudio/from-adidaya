import React, { useState, useEffect } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
    Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlassView } from '../ui/GlassView';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/theme';
import { DailyLog, CREW_ROLE_LABELS, CrewRole } from './mockData';

interface CrewHoursModalProps {
    visible: boolean;
    onClose: () => void;
    onSave: (regularHours: number, ot1: number, ot2: number, ot3: number) => void;
    log: DailyLog | null;
    crewName: string;
    crewRole: string;
}

const HoursStepperRow = ({
    label,
    sublabel,
    value,
    onMinus,
    onPlus,
    isDark,
    textColor,
    subtextColor,
    borderCol,
    itemBg,
}: {
    label: string;
    sublabel: string;
    value: number;
    onMinus: () => void;
    onPlus: () => void;
    isDark: boolean;
    textColor: string;
    subtextColor: string;
    borderCol: string;
    itemBg: string;
}) => {
    const [isMinusPressed, setIsMinusPressed] = useState(false);
    const [isPlusPressed, setIsPlusPressed] = useState(false);

    const minusScale = useState(() => new Animated.Value(1.0))[0];
    const plusScale = useState(() => new Animated.Value(1.0))[0];

    const handleMinus = () => {
        onMinus();
        setIsMinusPressed(true);
        Animated.sequence([
            Animated.spring(minusScale, {
                toValue: 1.25,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.spring(minusScale, {
                toValue: 1.0,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
        setTimeout(() => setIsMinusPressed(false), 150);
    };

    const handlePlus = () => {
        onPlus();
        setIsPlusPressed(true);
        Animated.sequence([
            Animated.spring(plusScale, {
                toValue: 1.25,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.spring(plusScale, {
                toValue: 1.0,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            })
        ]).start();
        setTimeout(() => setIsPlusPressed(false), 150);
    };

    const minusBg = isMinusPressed 
        ? '#007AFF' 
        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
    const minusColor = isMinusPressed ? '#FFFFFF' : textColor;

    const plusBg = isPlusPressed 
        ? '#007AFF' 
        : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)');
    const plusColor = isPlusPressed ? '#FFFFFF' : textColor;

    return (
        <View style={[s.stepperRow, { borderColor: borderCol, backgroundColor: itemBg }]}>
            <View>
                <Text style={[s.stepperLabel, { color: textColor }]}>{label}</Text>
                <Text style={[s.stepperSublabel, { color: subtextColor }]}>{sublabel}</Text>
            </View>
            <View style={s.stepperControl}>
                <TouchableOpacity
                    onPress={handleMinus}
                    activeOpacity={0.8}
                >
                    <Animated.View style={[
                        s.btnMinus,
                        { 
                            backgroundColor: minusBg,
                            transform: [{ scale: minusScale }]
                        }
                    ]}>
                        <Ionicons name="remove-outline" size={18} color={minusColor} />
                    </Animated.View>
                </TouchableOpacity>
                <Text style={[s.stepperValue, { color: textColor }]}>{value}h</Text>
                <TouchableOpacity
                    onPress={handlePlus}
                    activeOpacity={0.8}
                >
                    <Animated.View style={[
                        s.btnPlus,
                        { 
                            backgroundColor: plusBg,
                            transform: [{ scale: plusScale }]
                        }
                    ]}>
                        <Ionicons name="add-outline" size={18} color={plusColor} />
                    </Animated.View>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export function CrewHoursModal({
    visible,
    onClose,
    onSave,
    log,
    crewName,
    crewRole,
}: CrewHoursModalProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';
    const textColor = Colors[resolvedTheme].text;
    const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';

    const [regularHours, setRegularHours] = useState(8);
    const [ot1, setOt1] = useState(0);
    const [ot2, setOt2] = useState(0);
    const [ot3, setOt3] = useState(0);

    useEffect(() => {
        if (log) {
            setRegularHours(Math.min(8, log.regularHours));
            setOt1(Math.min(2, log.ot1Hours));
            setOt2(Math.min(4, log.ot2Hours));
            setOt3(Math.min(10, log.ot3Hours));
        }
    }, [log, visible]);

    const handleSave = () => {
        onSave(regularHours, ot1, ot2, ot3);
        onClose();
    };

    const adjust = (val: number, setVal: React.Dispatch<React.SetStateAction<number>>, direction: 'up' | 'down', max: number) => {
        if (direction === 'up') {
            setVal(Math.min(max, val + 1));
        } else {
            setVal(Math.max(0, val - 1));
        }
    };

    const borderCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const itemBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)';

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true}>
            <View style={s.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFillObject}
                    activeOpacity={1}
                    onPress={onClose}
                />
                <View
                    style={[
                        s.sheet,
                        { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }
                    ]}
                >
                    {/* Header */}
                    <View style={s.header}>
                        <View style={{ flex: 1, marginRight: 12 }}>
                            <Text style={[s.headerTitle, { color: textColor }]}>Adjust Working Hours</Text>
                            <Text style={[s.headerSubtitle, { color: subtextColor }]} numberOfLines={1}>
                                {crewName} • {CREW_ROLE_LABELS[crewRole as CrewRole] || crewRole}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[s.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={20} color={textColor} />
                        </TouchableOpacity>
                    </View>

                    {/* Steppers */}
                    <View style={s.content}>
                        <HoursStepperRow
                            label="Regular Hours"
                            sublabel="08.00 - 16.00"
                            value={regularHours}
                            onMinus={() => adjust(regularHours, setRegularHours, 'down', 8)}
                            onPlus={() => adjust(regularHours, setRegularHours, 'up', 8)}
                            isDark={isDark}
                            textColor={textColor}
                            subtextColor={subtextColor}
                            borderCol={borderCol}
                            itemBg={itemBg}
                        />

                        <HoursStepperRow
                            label="Overtime 1.0"
                            sublabel="16.00 - 18.00"
                            value={ot1}
                            onMinus={() => adjust(ot1, setOt1, 'down', 2)}
                            onPlus={() => adjust(ot1, setOt1, 'up', 2)}
                            isDark={isDark}
                            textColor={textColor}
                            subtextColor={subtextColor}
                            borderCol={borderCol}
                            itemBg={itemBg}
                        />

                        <HoursStepperRow
                            label="Overtime 2.0"
                            sublabel="18.00 - 22.00"
                            value={ot2}
                            onMinus={() => adjust(ot2, setOt2, 'down', 4)}
                            onPlus={() => adjust(ot2, setOt2, 'up', 4)}
                            isDark={isDark}
                            textColor={textColor}
                            subtextColor={subtextColor}
                            borderCol={borderCol}
                            itemBg={itemBg}
                        />

                        <HoursStepperRow
                            label="Overtime 3.0"
                            sublabel="22.00 - 08.00"
                            value={ot3}
                            onMinus={() => adjust(ot3, setOt3, 'down', 10)}
                            onPlus={() => adjust(ot3, setOt3, 'up', 10)}
                            isDark={isDark}
                            textColor={textColor}
                            subtextColor={subtextColor}
                            borderCol={borderCol}
                            itemBg={itemBg}
                        />
                    </View>

                    {/* Footer */}
                    <View style={[s.footer, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                        <TouchableOpacity
                            style={[s.btnCancel, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                            onPress={onClose}
                        >
                            <Text style={[s.btnCancelText, { color: textColor }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[s.btnSave, { backgroundColor: Colors[resolvedTheme].tint }]}
                            onPress={handleSave}
                        >
                            <Text style={s.btnSaveText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        paddingHorizontal: 24,
        gap: 10,
        marginBottom: 16,
    },
    stepperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 24,
        borderWidth: 0,
    },
    stepperLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    stepperSublabel: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    stepperControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    btnMinus: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnPlus: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepperValue: {
        fontSize: 15,
        fontWeight: '700',
        minWidth: 34,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        flexDirection: 'row',
        gap: 12,
    },
    btnSave: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnSaveText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
    },
    btnCancel: {
        flex: 0.4,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    btnCancelText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
