/**
 * PlatformIcon: A cross-platform icon component.
 * Uses SF Symbols (SymbolView) on iOS, and Ionicons on Android.
 * 
 * Usage: Drop-in replacement for SymbolView.
 * <PlatformIcon name="checkmark.circle.fill" size={24} tintColor="#34C759" />
 */
import { Ionicons, Feather } from '@expo/vector-icons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Line, Circle, Rect, Polyline } from 'react-native-svg';

let SymbolView: any = null;
if (Platform.OS === 'ios' && process.env.EXPO_OS === 'ios') {
    try {
        SymbolView = require('expo-symbols').SymbolView;
    } catch (e) {
        SymbolView = null;
    }
}

// SF Symbol name → Feather (for thin 1.2px linear stroke arrows in context menu)
const SF_TO_FEATHER: Record<string, string> = {
    'arrow.up': 'arrow-up',
    'arrow.down': 'arrow-down',
    'person.3': 'users',
    'person.3.fill': 'users',
    'number': 'hash',
    'list.number': 'list',
};

// SF Symbol name → Ionicons name mapping
const SF_TO_IONICONS: Record<string, string> = {
    'activity': 'pulse-outline',
    'arrow.up.doc': 'cloud-upload-outline',
    'house.fill': 'home',
    'house': 'home-outline',
    'airplane': 'airplane-outline',
    'ellipsis.circle': 'ellipsis-horizontal-circle-outline',
    'magnifyingglass': 'search',
    'xmark': 'close',
    'xmark.circle': 'close-circle-outline',
    'xmark.circle.fill': 'close-circle',
    'xmark.shield': 'shield-outline',
    'xmark.shield.fill': 'shield',
    'chevron.right': 'chevron-forward',
    'chevron.forward': 'chevron-forward',
    'chevron.left': 'chevron-back',
    'chevron.backward': 'chevron-back',
    'chevron.down': 'chevron-down',
    'chevron.up': 'chevron-up',
    'chevron.up.chevron.down': 'swap-vertical',
    'globe': 'globe-outline',
    'globe.asia.australia.fill': 'globe-outline',
    'pencil.and.outline': 'create-outline',
    'pencil.and.ruler': 'create-outline',
    'laptopcomputer.and.ipad': 'laptop-outline',
    'laptopcomputer': 'laptop-outline',
    'shield.lefthalf.filled': 'shield-half-outline',
    'shield.lefthalf.fill': 'shield-half-outline',
    'doc.text.magnifyingglass': 'document-text-outline',
    'hourglass.badge.plus': 'hourglass-outline',
    'circle': 'ellipse-outline',
    'arrow.left': 'arrow-back',
    'arrow.left.arrow.right': 'swap-horizontal',
    'arrow.right': 'arrow-forward',
    'arrow.right.circle.fill': 'arrow-forward-circle',
    'arrow.up.arrow.down': 'swap-vertical-outline',
    'arrow.up.and.down': 'swap-vertical',
    'arrow.up.arrow.down.circle': 'swap-vertical-outline',
    'arrow.up.arrow.down.circle.fill': 'swap-vertical',
    'arrow.up.and.down.and.arrow.left.and.right': 'move',
    'arrow.up': 'arrow-up-outline',
    'arrow.down': 'arrow-down-outline',
    'arrow.down.to.line': 'download-outline',
    'arrow.up.forward': 'open-outline',
    'arrow.up.right.square': 'open-outline',
    'arrow.up.right.square.fill': 'open',
    'arrow.down.forward': 'download-outline',
    'arrow.down.doc.fill': 'cloud-download',
    'arrow.down.doc': 'cloud-download-outline',
    'arrow.uturn.backward': 'arrow-undo',
    'arrow.uturn.backward.circle.fill': 'arrow-undo-circle',
    'arrow.uturn.left': 'arrow-undo',
    'arrow.uturn.left.circle.fill': 'arrow-undo-circle',
    'arrowshape.turn.up.left': 'arrow-undo-outline',
    'arrowshape.turn.up.left.fill': 'arrow-undo',
    'arrowshape.turn.up.right': 'arrow-redo-outline',
    'arrowshape.turn.up.right.fill': 'arrow-redo',
    'arrow.clockwise': 'refresh',
    'arrow.up.right': 'open-outline',
    'plus': 'add',
    'plus.circle.fill': 'add-circle',
    'minus': 'remove',
    'minus.circle': 'remove-circle-outline',
    'minus.circle.fill': 'remove-circle',
    'ellipsis': 'ellipsis-horizontal',
    'ellipsis.circle': 'ellipsis-horizontal-circle-outline',
    'ellipsis.circle.fill': 'ellipsis-horizontal-circle',
    'line.3.horizontal': 'menu',
    'line.3.horizontal.decrease': 'filter-outline',
    'line.3.horizontal.decrease.circle': 'filter-circle-outline',
    'line.3.horizontal.decrease.circle.fill': 'filter-circle',
    'square.and.arrow.up': 'share-outline',
    'square.and.arrow.up.fill': 'share-social',
    'bookmark': 'bookmark-outline',
    'bookmark.fill': 'bookmark',
    'bookmark.slash': 'bookmark-outline',
    'bookmark.slash.fill': 'bookmark',
    'pin': 'pin-outline',
    'pin.fill': 'pin',
    'pin.slash': 'pin-outline',
    'pin.slash.fill': 'pin',
    'face.smiling': 'happy-outline',
    'face.smiling.fill': 'happy',
    'safari': 'compass-outline',
    'person.crop.circle.badge.minus': 'person-remove-outline',
    'link': 'link-outline',
    'link.circle': 'link-outline',
    'link.circle.fill': 'link',

    // Status & Actions
    'checkmark': 'checkmark',
    'checkmark.circle.fill': 'checkmark-circle',
    'checkmark.circle': 'checkmark-circle-outline',
    'checkmark.square.fill': 'checkbox',
    'checkmark.shield.fill': 'shield-checkmark',
    'checkmark.shield': 'shield-checkmark-outline',
    'checkmark.seal.fill': 'checkmark-done-circle',
    'checkmark.seal': 'checkmark-done-circle-outline',
    'exclamationmark.triangle.fill': 'warning',
    'exclamationmark.circle.fill': 'alert-circle',
    'exclamationmark.circle': 'alert-circle-outline',
    'exclamationmark.triangle': 'warning-outline',
    'info.circle': 'information-circle-outline',
    'info.circle.fill': 'information-circle',
    'info': 'information-circle-outline',
    'questionmark.circle.fill': 'help-circle',
    'questionmark.circle': 'help-circle-outline',
    'checklist': 'checkbox-outline',

    // Time & Calendar
    'clock.fill': 'time',
    'clock': 'time-outline',
    'clock.arrow.2.circlepath': 'sync-outline',
    'clock.arrow.circlepath': 'time-outline',
    'calendar': 'calendar-outline',
    'calendar.fill': 'calendar',
    'calendar.badge.clock': 'calendar',
    'timer': 'timer-outline',
    'play': 'play-outline',
    'play.fill': 'play',
    'play.circle': 'play-circle-outline',
    'play.circle.fill': 'play-circle',
    'stop': 'stop-outline',
    'stop.fill': 'stop',
    'stop.circle': 'stop-circle-outline',
    'stop.circle.fill': 'stop-circle',
    'pause': 'pause-outline',
    'pause.fill': 'pause',
    'pause.circle': 'pause-circle-outline',
    'pause.circle.fill': 'pause-circle',
    'arrow.right.to.line': 'log-out-outline',
    'arrow.right.to.line.fill': 'log-out',
    'arrow.left.to.line': 'log-in-outline',
    'arrow.left.to.line.fill': 'log-in',
    'arrow.right.square': 'log-out-outline',
    'arrow.right.square.fill': 'log-out',

    // Finance & Commerce
    'cart.fill': 'cart',
    'cart': 'cart-outline',
    'creditcard.fill': 'card',
    'creditcard': 'card-outline',
    'dollarsign.circle.fill': 'cash',
    'dollarsign.square.fill': 'cash-outline',
    'wallet.bifold.fill': 'wallet',
    'wallet.pass.fill': 'wallet',
    'banknote.fill': 'cash',
    'tray.2.fill': 'file-tray-stacked',
    'tray.fill': 'file-tray',
    'tray': 'file-tray-outline',
    'tag.fill': 'pricetag',
    'banknote': 'cash-outline',
    'percent': 'calculator-outline',
    'percent.circle': 'calculator-outline',
    'percent.circle.fill': 'calculator',
    'book.closed.fill': 'book',
    'book.closed': 'book-outline',
    'building.columns.fill': 'business',
    'building.columns': 'business-outline',
    'number.square.fill': 'receipt',
    'number.square': 'receipt-outline',
    'number': 'keypad-outline',
    'number.circle': 'keypad-outline',
    'number.circle.fill': 'keypad',
    'list.number': 'list-outline',
    'arrow.triangle.branch': 'git-branch-outline',
    'git-branch-outline': 'git-branch-outline',
    'grid-outline': 'grid-outline',
    'chart.bar.doc.horizontal': 'bar-chart-outline',
    'square.grid.2x2.fill': 'grid',
    'square.grid.2x2': 'grid-outline',
    'person.crop.circle.badge.checkmark': 'person-circle-outline',
    'figure.run': 'fitness-outline',
    'figure.run.circle': 'fitness-outline',
    'figure.run.circle.fill': 'fitness',
    'figure.walk': 'walk-outline',
    'fork.knife': 'restaurant-outline',
    'fork.knife.circle': 'restaurant-outline',
    'fork.knife.circle.fill': 'restaurant',
    'building.2': 'business-outline',
    'building.2.fill': 'business',
    'building': 'business-outline',
    'building.fill': 'business',
    'slider.horizontal.3': 'options-outline',

    // Documents & Files
    'paperclip': 'attach-outline',
    'printer': 'print-outline',
    'printer.fill': 'print',
    'doc.text.fill': 'document-text',
    'doc.text': 'document-text-outline',
    'doc.plaintext.fill': 'document',
    'doc.plaintext': 'document-text-outline',
    'doc.fill': 'document',
    'doc': 'document-outline',
    'doc.on.doc.fill': 'copy',
    'doc.on.doc': 'copy-outline',
    'tablecells': 'grid-outline',
    'tablecells.fill': 'grid',
    'square.stack.3d.up': 'layers-outline',
    'square.stack.3d.up.fill': 'layers',
    'arrow.counterclockwise': 'refresh-outline',
    'arrow.counterclockwise.circle': 'refresh-circle-outline',
    'arrow.counterclockwise.circle.fill': 'refresh-circle',
    'arrow.triangle.2.circlepath': 'sync-outline',
    'arrow.up.circle.fill': 'arrow-up-circle',
    'textformat.abc': 'text-outline',
    'textformat': 'text-outline',
    'arrow.down.circle': 'arrow-down-circle-outline',
    'arrow.up.circle': 'arrow-up-circle-outline',
    'folder.fill': 'folder',
    'folder': 'folder-outline',
    'archivebox': 'archive-outline',
    'archivebox.fill': 'archive',
    'archivebox.circle': 'archive-outline',
    'archivebox.circle.fill': 'archive',
    'trash': 'trash-outline',
    'trash.fill': 'trash',
    'trash.circle': 'trash-outline',
    'trash.circle.fill': 'trash',
    'text.alignleft': 'reorder-three',
    'video': 'videocam-outline',
    'video.fill': 'videocam',
    'person.crop.circle.badge.minus': 'person-remove-outline',
    'person.badge.minus': 'person-remove-outline',
    'person.badge.minus.fill': 'person-remove',
    'person.badge.shield.checkmark': 'shield-checkmark-outline',
    'person.badge.shield.checkmark.fill': 'shield-checkmark',
    'shield.checkmark': 'shield-checkmark-outline',
    'shield.checkmark.fill': 'shield-checkmark',

    // People & Contacts
    'person.fill': 'person',
    'person': 'person-outline',
    'person.fill.checkmark': 'person-add',
    'person.fill.xmark': 'person-remove',
    'person.2': 'people-outline',
    'person.2.fill': 'people',
    'person.3': 'construct-outline',
    'person.3.fill': 'construct',
    'cpu': 'hardware-chip-outline',
    'cpu.fill': 'hardware-chip',
    'person.circle': 'person-circle-outline',
    'person.crop.circle': 'person-circle-outline',
    'person.crop.circle.fill': 'person-circle',
    'person.badge.plus': 'add',
    'person.fill.badge.plus': 'add',
    'person.badge.key': 'key-outline',
    'person.badge.key.fill': 'key-outline',
    'person.crop.circle.badge.checkmark': 'checkmark-circle-outline',
    'person.crop.circle.badge.xmark': 'close-circle-outline',
    'person.crop.circle.badge.exclamationmark': 'person-circle-outline',
    'person.crop.square': 'person-outline',
    'person.crop.square.fill': 'person',
    'person.crop.square.filled.and.at.rectangle': 'id-card-outline',
    'person.crop.square.filled.and.at.rectangle.fill': 'id-card',
    'person.text.rectangle': 'id-card-outline',
    'person.text.rectangle.fill': 'id-card',
    'doc.text.magnifyingglass': 'document-text-outline',

    // Communication & Notifications
    'bell.fill': 'notifications',
    'bell': 'notifications-outline',
    'bell.slash': 'notifications-off-outline',
    'bell.slash.fill': 'notifications-off',
    'speaker': 'volume-medium-outline',
    'speaker.fill': 'volume-medium',
    'speaker.wave.2': 'volume-high-outline',
    'speaker.wave.2.fill': 'volume-high',
    'speaker.slash': 'volume-mute-outline',
    'speaker.slash.fill': 'volume-mute',
    'envelope.fill': 'mail',
    'envelope': 'mail-outline',
    'paperplane.fill': 'send',
    'paperplane': 'send-outline',
    'bubble.left': 'chatbubble-outline',
    'bubble.left.fill': 'chatbubble',
    'bubble.right': 'chatbubble-outline',
    'bubble.right.fill': 'chatbubble',
    'bubble.left.and.bubble.right': 'chatbubbles-outline',
    'bubble.left.and.bubble.right.fill': 'chatbubbles',
    'phone.fill': 'call',
    'phone': 'call-outline',
    'megaphone': 'megaphone-outline',
    'megaphone.fill': 'megaphone',
    'whatsapp': 'logo-whatsapp',
    'at': 'at',

    // Media & Images
    'camera': 'camera-outline',
    'camera.fill': 'camera',
    'photo': 'image-outline',
    'photo.fill': 'image',
    'photo.on.rectangle': 'images-outline',
    'photo.on.rectangle.fill': 'images',
    'photo.on.rectangle.angled': 'images-outline',
    'photo.stack': 'images-outline',
    'photo.badge.plus': 'image-outline',
    'play.fill': 'play',
    'play': 'play-outline',
    'play.circle.fill': 'play-circle',
    'play.circle': 'play-circle-outline',
    'pause.fill': 'pause',
    'forward.fill': 'play-forward',

    // Tools & Settings
    'slider.horizontal.3': 'options-outline',
    'number.square.fill': 'keypad',
    'gear': 'settings-outline',
    'gearshape.fill': 'settings',
    'gearshape': 'settings-outline',
    'gearshape.2.fill': 'construct',
    'gearshape.2': 'construct-outline',
    'map.fill': 'map',
    'map': 'map-outline',
    'gift.fill': 'gift',
    'gift': 'gift-outline',
    'flame.fill': 'flame',
    'flame': 'flame-outline',
    'sparkles': 'sparkles-outline',
    'sparkles.fill': 'sparkles',
    'shield.fill': 'shield',
    'shield': 'shield-outline',
    'bell.badge.fill': 'notifications',
    'bell.badge': 'notifications-outline',
    'antenna.radiowaves.left.and.right': 'radio-outline',
    'pencil': 'pencil',
    'pencil.circle.fill': 'create',
    'square.and.pencil': 'create-outline',
    'wrench.fill': 'build',
    'wrench': 'build-outline',
    'hammer.fill': 'hammer',
    'hammer': 'hammer-outline',
    'qrcode': 'qr-code',
    'scope': 'radio-button-on',
    'target': 'locate',
    'viewfinder': 'scan',
    'paintpalette': 'color-palette-outline',
    'paintpalette.fill': 'color-palette',
    'circle.dashed': 'radio-button-on-outline',
    'location': 'location-outline',
    'sun.min': 'sunny-outline',
    'sun.min.fill': 'sunny',
    'sun.max': 'sunny-outline',
    'sun.max.fill': 'sunny',
    'sun.horizon': 'partly-sunny-outline',
    'sun.horizon.fill': 'partly-sunny',
    'sunrise': 'partly-sunny-outline',
    'sunrise.fill': 'partly-sunny',
    'sunset': 'partly-sunny-outline',
    'sunset.fill': 'partly-sunny',
    'sun.haze': 'cloudy-outline',
    'sun.haze.fill': 'cloudy',
    'moon': 'moon-outline',
    'moon.fill': 'moon',
    'moon.stars': 'moon-outline',
    'moon.stars.fill': 'moon',
    'cloud.fill': 'cloud',
    'leaf.fill': 'leaf',
    'bolt': 'flash-outline',
    'bolt.fill': 'flash',
    'bolt.circle': 'flash-outline',
    'bolt.horizontal': 'flash-outline',
    'bolt.horizontal.fill': 'flash',

    // Charts & Data
    'chart.pie.fill': 'pie-chart',
    'chart.bar.fill': 'bar-chart',
    'chart.bar': 'bar-chart-outline',
    'chart.line.uptrend.xyaxis': 'trending-up',
    'list.bullet': 'list',
    'list.bullet.rectangle.fill': 'list',
    'list.bullet.rectangle': 'list',

    // Shapes & Symbols
    'star.fill': 'star',
    'star': 'star-outline',
    'star.slash': 'star-outline',
    'star.slash.fill': 'star-outline',
    'pin.slash': 'pin-outline',
    'pin.slash.fill': 'pin-outline',
    'heart.fill': 'heart',
    'heart': 'heart-outline',
    'flag.fill': 'flag',
    'flag': 'flag-outline',
    'diamond.fill': 'diamond',
    'diamond': 'diamond-outline',
    'rhombus.fill': 'diamond',
    'rhombus': 'diamond-outline',
    'pin.fill': 'pin',
    'pin': 'pin-outline',
    'mappin.and.ellipse': 'location',
    'location.fill': 'location',
    'globe': 'globe-outline',
    'circle': 'ellipse-outline',
    'circle.fill': 'ellipse',
    'circle.grid.2x2.fill': 'grid',

    // People & Roles
    'briefcase.fill': 'briefcase',
    'briefcase': 'briefcase-outline',
    'suitcase.fill': 'briefcase',
    'suitcase': 'briefcase-outline',
    'building.2.fill': 'business',
    'building.2': 'business-outline',
    'book.closed': 'book',
    'book.fill': 'book',
    'book': 'book-outline',
    'books.vertical.fill': 'library',
    'safari.fill': 'compass',
    'medal.fill': 'medal',
    'rosette': 'ribbon',

    // Transport & Shipping
    'shippingbox.fill': 'cube',
    'shippingbox': 'cube-outline',
    'cube.box.fill': 'cube',
    'cube.box': 'cube-outline',
    'cube.fill': 'cube',
    'cube': 'cube-outline',
    'car.fill': 'car-sport',
    'car': 'car-sport-outline',

    // Resource Mappings & Tools
    'wrench.and.screwdriver.fill': 'construct',
    'wrench.and.screwdriver': 'construct-outline',
    'building.2.crop.circle.fill': 'business',
    'building.2.crop.circle': 'business-outline',
    'person.2.badge.gearshape.fill': 'people',
    'person.2.badge.gearshape': 'people-outline',
    'arrow.triangle.merge': 'git-merge-outline',

    // Location
    'location.viewfinder': 'location-outline',

    // Face & Emoji
    'face.smiling.fill': 'happy',
    'face.smiling': 'happy',
    'face.dashed': 'happy-outline',
    'hand.thumbsdown': 'thumbs-down',
    'party.popper': 'gift',

    // Audio & Signal
    'waveform.path': 'pulse',
    'waveform.path.ecg': 'pulse',
    'wave.3.forward': 'wifi',

    // Security
    'lock.shield.fill': 'shield-checkmark',
    'lock.fill': 'lock-closed',
    'lock': 'lock-closed-outline',
    'lock.square.fill': 'lock-closed-outline',
    'key.fill': 'key',
    'key': 'key-outline',
    'shield.fill': 'shield',
    'eye.fill': 'eye',
    'eye': 'eye-outline',
    'eye.slash.fill': 'eye-off',
    'eye.slash': 'eye-off-outline',

    // Misc
    'laser.burst': 'sparkles-outline',
    'wand.and.stars': 'color-wand',
    'rectangle.stack.fill': 'layers',
    'square.grid.2x2.fill': 'grid',
    'filemenu.and.selection': 'menu',
    'wind': 'cloudy',
    'number': 'keypad',
    'rectangle.portrait.and.arrow.right': 'log-out',
};

export interface PlatformIconProps {
    name: string;
    size?: number;
    tintColor?: string;
    color?: string;
    style?: StyleProp<ViewStyle>;
    weight?: 'ultraLight' | 'thin' | 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy' | 'black' | 'unspecified';
    fallback?: React.ReactNode;
    resizeMode?: any;
}

export function PlatformIcon({ name, size = 24, tintColor = '#8E8E93', color, style, weight, fallback, resizeMode = 'scaleAspectFit' }: PlatformIconProps) {
    const effectiveColor = color || tintColor;
    if (Platform.OS === 'ios' && SymbolView) {
        const iosName = name === 'whatsapp' ? 'phone' : name;
        return (
            <SymbolView
                name={iosName as any}
                size={size}
                tintColor={effectiveColor}
                weight={weight}
                resizeMode={resizeMode}
                style={[{ width: size, height: size }, style]}
            />
        );
    }

    // Precision SVG icons matching refined 1.8pt stroke weight for perfect toolbar consistency
    if (name === 'magnifyingglass' || name === 'search' || name === 'search-outline') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Circle cx="11" cy="11" r="7.5" />
                <Line x1="21" y1="21" x2="16.5" y2="16.5" />
            </Svg>
        );
    }
    if (name === 'line.3.horizontal.decrease' || name === 'filter' || name === 'filter-outline') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Line x1="3.5" y1="6" x2="20.5" y2="6" />
                <Line x1="6.5" y1="12" x2="17.5" y2="12" />
                <Line x1="10" y1="18" x2="14" y2="18" />
            </Svg>
        );
    }
    if (name === 'plus' || name === 'add' || name === 'add-outline') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Line x1="12" y1="5" x2="12" y2="19" />
                <Line x1="5" y1="12" x2="19" y2="12" />
            </Svg>
        );
    }
    if (name === 'hardhat' || name === 'helmet') {
        return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={style as any}><Path d="M4 17v-3a8 8 0 0 1 5-7.42M15 6.58A8 8 0 0 1 20 14v3M9 10V5h6v5M3 17h18v3H3z" /></Svg>;
    }
    if (name === 'hardhat.fill' || name === 'helmet.fill') {
        return (
            <FontAwesome6
                name="helmet-safety"
                size={size}
                color={effectiveColor}
                style={style as any}
            />
        );
    }

    if (name === 'ellipsis' || name === 'ellipsis-horizontal' || name === 'ellipsis.circle') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={effectiveColor} style={style as any}>
                <Circle cx="12" cy="12" r="1.8" />
                <Circle cx="19" cy="12" r="1.8" />
                <Circle cx="5" cy="12" r="1.8" />
            </Svg>
        );
    }

    if (name === 'paperplane' || name === 'send' || name === 'paper-plane') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M22 2L11 13" />
                <Path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </Svg>
        );
    }
    if (name === 'paperplane.fill' || name === 'send.fill' || name === 'paper-plane.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={effectiveColor} stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M22 2L11 13" />
                <Path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </Svg>
        );
    }
    if (name === 'bookmark') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
        );
    }
    if (name === 'bookmark.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={effectiveColor} stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </Svg>
        );
    }
    if (name === 'bookmark.slash' || name === 'bookmark.slash.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                <Line x1="3" y1="3" x2="21" y2="21" strokeWidth={1.5} />
            </Svg>
        );
    }
    if (name === 'star.slash' || name === 'star.slash.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                <Line x1="3" y1="3" x2="21" y2="21" stroke={effectiveColor} strokeWidth={1.75} strokeLinecap="round" />
            </Svg>
        );
    }
    if (name === 'pin') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M12 17v5M9 3h6M10 3v5l-3 4v2h10v-2l-3-4V3" />
            </Svg>
        );
    }
    if (name === 'pin.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill={effectiveColor} stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M12 17v5M9 3h6M10 3v5l-3 4v2h10v-2l-3-4V3" />
            </Svg>
        );
    }
    if (name === 'pin.slash' || name === 'pin.slash.fill') {
        return (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={effectiveColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={style as any}>
                <Path d="M12 17v5M9 3h6M10 3v5l-3 4v2h10v-2l-3-4V3" />
                <Line x1="3" y1="3" x2="21" y2="21" strokeWidth={1.5} />
            </Svg>
        );
    }

    const featherName = SF_TO_FEATHER[name];
    if (featherName) {
        return (
            <Feather
                name={featherName as any}
                size={size}
                color={effectiveColor}
                style={style as any}
            />
        );
    }

    const ionName = SF_TO_IONICONS[name];
    if (ionName) {
        return (
            <Ionicons
                name={ionName as any}
                size={size}
                color={effectiveColor}
                style={style as any}
            />
        );
    }

    // Handle dynamic SF Symbols like "15.calendar", "22.calendar" etc.
    if (name.match(/^\d+\.calendar$/)) {
        return (
            <Ionicons
                name="calendar-outline"
                size={size}
                color={tintColor}
                style={style as any}
            />
        );
    }

    // Fallback
    return (
        <Ionicons
            name="help-circle-outline"
            size={size}
            color={tintColor}
            style={style as any}
        />
    );
}
