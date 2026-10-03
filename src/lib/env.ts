/**
 * `npm start` points the app at the dev Supabase project (`.env.development.local`), which sets
 * `EXPO_PUBLIC_APP_ENV=development`. Its local data is kept under separate keys, so switching
 * between dev and production on one phone never mixes one account's data into the other.
 */
export const isDevBackend = process.env.EXPO_PUBLIC_APP_ENV === 'development';

/** A localStorage key, namespaced for the dev backend. Production keys are unchanged. */
export const storageKey = (key: string) => (isDevBackend ? `${key}.dev` : key);
