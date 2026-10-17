import { Platform } from 'react-native';

interface NativeDynamicIslandModule {
  isActivityKitSupported(): boolean;
  startActivity(title: string, status: string, message: string, iconName: string): Promise<string>;
  updateActivity(activityId: string, status: string, message: string, iconName: string): Promise<boolean>;
  endActivity(activityId: string): Promise<boolean>;
  endAllActivities(): Promise<boolean>;
}

let nativeModule: NativeDynamicIslandModule | null = null;
if (Platform.OS === 'ios') {
  try {
    const ExpoModules = require('expo-modules-core');
    if (ExpoModules && typeof ExpoModules.requireNativeModule === 'function') {
      nativeModule = ExpoModules.requireNativeModule('AdidayaDynamicIsland') as NativeDynamicIslandModule;
    }
  } catch {
    nativeModule = null;
  }
}

export function isActivityKitSupported(): boolean {
  if (!nativeModule) return false;
  try {
    return nativeModule.isActivityKitSupported();
  } catch {
    return false;
  }
}

export async function startNativeLiveActivity(
  title: string,
  message: string,
  status: string = 'Saved',
  iconName: string = 'checkmark'
): Promise<string | null> {
  if (!nativeModule) return null;
  try {
    return await nativeModule.startActivity(title, status, message, iconName);
  } catch (e) {
    console.warn('[DynamicIsland] Failed to start native activity:', e);
    return null;
  }
}

export async function updateNativeLiveActivity(
  activityId: string,
  message: string,
  status: string = 'Updated',
  iconName: string = 'checkmark'
): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.updateActivity(activityId, status, message, iconName);
  } catch (e) {
    console.warn('[DynamicIsland] Failed to update native activity:', e);
    return false;
  }
}

export async function endNativeLiveActivity(activityId: string): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.endActivity(activityId);
  } catch (e) {
    console.warn('[DynamicIsland] Failed to end native activity:', e);
    return false;
  }
}

export async function endAllNativeLiveActivities(): Promise<boolean> {
  if (!nativeModule) return false;
  try {
    return await nativeModule.endAllActivities();
  } catch (e) {
    console.warn('[DynamicIsland] Failed to end all native activities:', e);
    return false;
  }
}
