import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import * as FileSystem from 'expo-file-system/legacy';
import { GlassView } from '../ui/GlassView';
import { PlatformIcon } from '../ui/PlatformIcon';

// ------------------------------------------------------------------
// Types for lazy‑loaded native modules (WebView, Print, Sharing)
// ------------------------------------------------------------------
type WebViewComponent = React.ComponentType<any>;

interface PrintModule {
  printToFileAsync: (options: { html: string }) => Promise<{ uri: string }>;
}
interface SharingModule {
  shareAsync: (uri: string, options?: { mimeType?: string; dialogTitle?: string }) => Promise<void>;
}

let WebView: WebViewComponent | null = null;
let Print: PrintModule | null = null;
let Sharing: SharingModule | null = null;

// Lazy load WebView on both iOS and Android
try {
  const { WebView: WV } = require('react-native-webview');
  WebView = WV as WebViewComponent;
} catch (e) {
  // ignored – WebView unavailable on this platform
}

// Lazy load expo‑print and expo‑sharing (available on both platforms)
try {
  Print = require('expo-print') as PrintModule;
  Sharing = require('expo-sharing') as SharingModule;
} catch (e) {
  // ignore if modules are not linked
}

interface CrewDocumentPreviewProps {
  visible: boolean;
  onClose: () => void;
  html?: string | null;
  url?: string | null;
  title: string;
}

export const CrewDocumentPreview: React.FC<CrewDocumentPreviewProps> = ({
  visible,
  onClose,
  html,
  url,
  title,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
  const subtextColor = isDark ? '#A1A1A6' : '#8E8E93';
  const insets = useSafeAreaInsets();

  // Source for WebView – baseUrl needed for iOS
  const webViewSource: { html?: string; uri?: string; baseUrl?: string } | null =
    html ? { html, baseUrl: FileSystem.cacheDirectory ?? undefined } : url ? { uri: url } : null;

  const handleExportPDF = async () => {
    if (!html) return;
    if (Platform.OS === 'web') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
      return;
    }
    if (!Print || !Sharing) return;
    try {
      const { uri } = await Print.printToFileAsync({ html });
      const cleanTitle = title.replace(/\s+/g, '_').replace(/[\/?:*"<>|]/g, '_');
      const filename = `${cleanTitle}.pdf`;
      const customUri = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.copyAsync({ from: uri, to: customUri });
      await Sharing.shareAsync(customUri, {
        mimeType: 'application/pdf',
        dialogTitle: title,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={styles.previewOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />
        <GlassView
          intensity={80}
          style={[
            styles.previewSheet,
            { backgroundColor: isDark ? 'rgba(28,28,30,0.95)' : 'rgba(255,255,255,0.95)' }
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }] }>
            <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.actions}>
              {html && (
                <TouchableOpacity onPress={handleExportPDF} style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }] }>
                  <Ionicons name="share-outline" size={18} color={subtextColor} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }] }>
                <PlatformIcon name="xmark" size={14} tintColor={textColor} />
              </TouchableOpacity>
            </View>
          </View>
          {/* Content – iframe on Web, WebView on Native */}
          <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            {Platform.OS === 'web' && html ? (
              <iframe
                srcDoc={html}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            ) : WebView && webViewSource ? (
              <WebView source={webViewSource} style={{ flex: 1 }} originWhitelist={['*']} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: subtextColor }}>No content to display</Text>
              </View>
            )}
          </View>
        </GlassView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  previewSheet: {
    height: '90%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
