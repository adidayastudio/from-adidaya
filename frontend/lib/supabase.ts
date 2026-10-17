import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';

const safeStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return null;
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web' && typeof window === 'undefined') return;
    await AsyncStorage.removeItem(key);
  },
};

// Keep the public type expected by Forma modules; the runtime value is locked.
export const APP_MODE = 'adidaya' as 'adidaya' | 'forma';
export const ADIDAYA_SUPABASE_URL = process.env.EXPO_PUBLIC_ADIDAYA_SUPABASE_URL || '';
export const ADIDAYA_SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_ADIDAYA_SUPABASE_ANON_KEY || '';
if (!ADIDAYA_SUPABASE_URL || !ADIDAYA_SUPABASE_ANON_KEY) {
  throw new Error('Adidaya database configuration is missing. Configure the preview environment before starting.');
}

export const supabaseAdidaya: SupabaseClient = createClient(ADIDAYA_SUPABASE_URL, ADIDAYA_SUPABASE_ANON_KEY, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    storageKey: 'adidaya-preview-auth-token',
  },
});
export const supabase = supabaseAdidaya;
// Compatibility exports for copied modules. These aliases cannot reach Forma.
export const supabaseForma = supabaseAdidaya;
export const FORMA_SUPABASE_URL = ADIDAYA_SUPABASE_URL;
export const FORMA_SUPABASE_ANON_KEY = ADIDAYA_SUPABASE_ANON_KEY;
export function getActiveBackend(): 'adidaya' | 'forma' { return 'adidaya'; }
export function setActiveClient(mode: 'adidaya' | 'forma') {
  if (mode !== 'adidaya') throw new Error('This application only supports the Adidaya backend.');
}

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', state => {
    if (state === 'active') supabaseAdidaya.auth.startAutoRefresh();
    else supabaseAdidaya.auth.stopAutoRefresh();
  });
}
