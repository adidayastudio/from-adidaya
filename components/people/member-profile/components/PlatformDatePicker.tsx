import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface PlatformDatePickerProps {
    value: Date;
    onChange: (date: Date) => void;
    maximumDate?: Date;
    minimumDate?: Date;
    isDark?: boolean;
    textColor?: string;
}

export const PlatformDatePicker: React.FC<PlatformDatePickerProps> = ({
    value,
    onChange,
    maximumDate,
    minimumDate,
    isDark = false,
    textColor = '#FFFFFF',
}) => {
    if (Platform.OS === 'web') {
        const formatted = (() => {
            if (!value || isNaN(value.getTime())) return '';
            const yyyy = value.getFullYear();
            const mm = String(value.getMonth() + 1).padStart(2, '0');
            const dd = String(value.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        })();

        const maxStr = maximumDate
            ? `${maximumDate.getFullYear()}-${String(maximumDate.getMonth() + 1).padStart(2, '0')}-${String(maximumDate.getDate()).padStart(2, '0')}`
            : undefined;
        const minStr = minimumDate
            ? `${minimumDate.getFullYear()}-${String(minimumDate.getMonth() + 1).padStart(2, '0')}-${String(minimumDate.getDate()).padStart(2, '0')}`
            : undefined;

        return (
            <View style={styles.webContainer}>
                <input
                    type="date"
                    value={formatted}
                    max={maxStr}
                    min={minStr}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                            const [y, m, d] = val.split('-').map(Number);
                            const newD = new Date(y, m - 1, d, 12, 0, 0);
                            onChange(newD);
                        }
                    }}
                    style={{
                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                        color: textColor,
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: 8,
                        padding: '5px 10px',
                        fontSize: 14,
                        fontWeight: 500,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif',
                        outline: 'none',
                        cursor: 'pointer',
                        colorScheme: isDark ? 'dark' : 'light',
                    }}
                />
            </View>
        );
    }

    return (
        <DateTimePicker
            value={value}
            mode="date"
            display="compact"
            themeVariant={isDark ? 'dark' : 'light'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(event, selectedDate) => {
                if (selectedDate) {
                    onChange(selectedDate);
                }
            }}
        />
    );
};

const styles = StyleSheet.create({
    webContainer: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});
