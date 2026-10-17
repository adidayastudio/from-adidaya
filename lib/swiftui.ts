import React from 'react';
import { Platform, View, Text as RNText, TouchableOpacity, TextInput as RNTextInput, Switch as RNSwitch, ActivityIndicator } from 'react-native';

let SwiftUI: any = null;
let SwiftUIModifiers: any = null;

if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
    try {
        SwiftUI = require('@expo/ui/swift-ui');
        SwiftUIModifiers = require('@expo/ui/swift-ui/modifiers');
    } catch (e) {
        // Not supported or failed to load
    }
}

// Fallback components for Android / non-iOS platforms
const FallbackView = ({ children, style, ...props }: any) => React.createElement(View, { style, ...props }, children);
const FallbackText = ({ children, style, ...props }: any) => React.createElement(RNText, { style, ...props }, children);
const FallbackButton = ({ children, onPress, ...props }: any) => React.createElement(TouchableOpacity, { onPress, ...props }, children);
const FallbackSpacer = () => React.createElement(View, { style: { flex: 1 } });
const FallbackPassThrough = ({ children }: any) => children || null;

export const Host = SwiftUI?.Host || FallbackView;
export const Button = SwiftUI?.Button || FallbackButton;
export const SwiftUIButton = SwiftUI?.Button || FallbackButton;
export const Text = SwiftUI?.Text || FallbackText;
export const SwiftUIText = SwiftUI?.Text || FallbackText;
export const HStack = SwiftUI?.HStack || FallbackView;
export const SwiftUIHStack = SwiftUI?.HStack || FallbackView;
export const VStack = SwiftUI?.VStack || FallbackView;
export const SwiftUIVStack = SwiftUI?.VStack || FallbackView;
export const ZStack = SwiftUI?.ZStack || FallbackView;
export const SwiftUIZStack = SwiftUI?.ZStack || FallbackView;
export const Spacer = SwiftUI?.Spacer || FallbackSpacer;
export const SwiftUISpacer = SwiftUI?.Spacer || FallbackSpacer;
export const Image = SwiftUI?.Image || FallbackView;
export const SwiftUIImage = SwiftUI?.Image || FallbackView;
export const Slider = SwiftUI?.Slider || FallbackView;
export const SwiftUISlider = SwiftUI?.Slider || FallbackView;
export const GlassEffectContainer = SwiftUI?.GlassEffectContainer || FallbackView;
export const SwiftUIGlassEffectContainer = SwiftUI?.GlassEffectContainer || FallbackView;
export const TextField = SwiftUI?.TextField || FallbackView;
export const SwiftUITextField = SwiftUI?.TextField || FallbackView;
export const CircularProgress = SwiftUI?.CircularProgress || ActivityIndicator;
export const SwiftUICircularProgress = SwiftUI?.CircularProgress || ActivityIndicator;
export const BottomSheet = SwiftUI?.BottomSheet || FallbackPassThrough;
export const Section = SwiftUI?.Section || FallbackView;
export const Form = SwiftUI?.Form || FallbackView;
export const Picker = SwiftUI?.Picker || FallbackView;
export const Switch = SwiftUI?.Switch || RNSwitch;
export const DateTimePicker = SwiftUI?.DateTimePicker || FallbackView;

export const frame = SwiftUIModifiers?.frame || (() => ({}));
export const cornerRadius = SwiftUIModifiers?.cornerRadius || (() => ({}));
export const glassEffect = SwiftUIModifiers?.glassEffect || (() => ({}));
export const padding = SwiftUIModifiers?.padding || (() => ({}));
export const swiftUIPadding = SwiftUIModifiers?.padding || (() => ({}));
export const background = SwiftUIModifiers?.background || (() => ({}));
export const ignoreSafeArea = SwiftUIModifiers?.ignoreSafeArea || (() => ({}));
export const tint = SwiftUIModifiers?.tint || (() => ({}));
export const buttonStyle = SwiftUIModifiers?.buttonStyle || (() => ({}));
export const disabled = SwiftUIModifiers?.disabled || (() => ({}));
export const foregroundColor = SwiftUIModifiers?.foregroundColor || (() => ({}));
export const foregroundStyle = SwiftUIModifiers?.foregroundStyle || (() => ({}));

export default SwiftUI;
