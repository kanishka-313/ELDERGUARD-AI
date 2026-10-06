import { createClient } from '@supabase/supabase-js';

// Default Supabase environment configuration
const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_URL : '';
const envKey = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SUPABASE_ANON_KEY : '';

// Retrieve custom or runtime-configured Supabase credentials
export function getSupabaseConfig() {
  let customUrl = '';
  let customKey = '';
  if (typeof window !== 'undefined') {
    try {
      customUrl = localStorage.getItem('eldercare_supabase_url') || '';
      customKey = localStorage.getItem('eldercare_supabase_anon_key') || '';
    } catch (e) {}
  }
  const url = (customUrl || envUrl || '').trim();
  const key = (customKey || envKey || '').trim();
  return { url, key, isConfigured: Boolean(url && key && url.startsWith('http')) };
}

let supabaseInstance = null;
let lastUrl = '';
let lastKey = '';

export function getSupabase() {
  const { url, key, isConfigured } = getSupabaseConfig();
  if (!isConfigured) {
    return null;
  }
  if (!supabaseInstance || lastUrl !== url || lastKey !== key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
      lastUrl = url;
      lastKey = key;
      console.log('[Supabase] Initialized client connecting to:', url);
    } catch (err) {
      console.error('[Supabase] Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().isConfigured;
}

export function setSupabaseCredentials(url, anonKey) {
  if (typeof window !== 'undefined') {
    try {
      if (url) localStorage.setItem('eldercare_supabase_url', url.trim());
      if (anonKey) localStorage.setItem('eldercare_supabase_anon_key', anonKey.trim());
      supabaseInstance = null; // force re-init
    } catch (e) {}
  }
}

export const supabase = getSupabase();
export default getSupabase;
