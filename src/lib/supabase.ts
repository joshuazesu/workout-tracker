import '@/lib/storage';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error(
    'Supabase is not configured: copy .env.example to .env.local, fill in your project URL and publishable key, then restart `expo start`.'
  );
}

export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // There's no URL to read a session from on a phone; sign-in uses an emailed code.
    detectSessionInUrl: false,
  },
});

// Only refresh the session while the app is open.
AppState.addEventListener('change', (status) => {
  if (status === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
