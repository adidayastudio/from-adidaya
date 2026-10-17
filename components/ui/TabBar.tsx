import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable, Text } from '@react-navigation/elements';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassView } from './GlassView';

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const { colors } = useTheme();
    const { buildHref } = useLinkBuilder();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
            <GlassView intensity={90} tint="light" style={styles.glassBar}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name, route.params);
                        }
                    };

                    const onLongPress = () => {
                        navigation.emit({
                            type: 'tabLongPress',
                            target: route.key,
                        });
                    };

                    return (
                        <PlatformPressable
                            key={route.key}
                            href={buildHref(route.name, route.params)}
                            accessibilityState={isFocused ? { selected: true } : {}}
                            accessibilityLabel={options.tabBarAccessibilityLabel}
                            testID={options.tabBarButtonTestID}
                            onPress={onPress}
                            onLongPress={onLongPress}
                            style={styles.tabItem}
                        >
                            <View style={styles.iconContainer}>
                                {options.tabBarIcon?.({
                                    focused: isFocused,
                                    color: isFocused ? colors.primary : colors.text,
                                    size: 24
                                })}
                            </View>
                            {/* Optional: Show label only when focused or always? Apple Music usually shows labels. */}
                            <Text style={[styles.label, { color: isFocused ? colors.primary : colors.text, fontSize: 10 }]}>
                                {typeof label === 'string' ? label : ''}
                            </Text>
                        </PlatformPressable>
                    );
                })}
            </GlassView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'flex-end',
        pointerEvents: 'box-none',
    },
    glassBar: {
        flexDirection: 'row',
        width: '92%',
        height: 70, // Fixed height for the bar
        borderRadius: 35, // Fully rounded ends
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    iconContainer: {
        marginBottom: 4,
    },
    label: {
        textAlign: 'center',
        fontWeight: '500',
    }
});
