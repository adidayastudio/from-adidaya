import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  isActivityKitSupported,
  startNativeLiveActivity,
  endNativeLiveActivity,
} from '@/modules/adidaya-dynamic-island';

export interface DynamicIslandFeedbackOptions {
  title?: string;
  message?: string;
  status?: string;
  iconName?: string;
  durationMs?: number;
}

/**
 * Unified Dynamic Island trigger helper.
 * Triggers native OS-level ActivityKit Dynamic Island when supported on iOS,
 * with automatic timed dismissal.
 */
export async function triggerDynamicIslandFeedback(
  options: DynamicIslandFeedbackOptions = {}
): Promise<string | null> {
  const {
    title = 'Adidaya',
    message = 'Settings saved successfully',
    status = 'Saved',
    iconName = 'checkmark',
    durationMs = 2500,
  } = options;

  // Haptic feedback
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}

  if (Platform.OS !== 'ios' || !isActivityKitSupported()) {
    return null;
  }

  try {
    const activityId = await startNativeLiveActivity(title, message, status, iconName);
    if (activityId) {
      setTimeout(() => {
        endNativeLiveActivity(activityId);
      }, durationMs);
    }
    return activityId;
  } catch (e) {
    console.warn('[DynamicIslandHelper] Error triggering live activity:', e);
    return null;
  }
}
