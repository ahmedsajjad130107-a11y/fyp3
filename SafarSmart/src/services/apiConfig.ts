import { Platform } from 'react-native';

/**
 * Single source of truth for the backend API base URL.
 * All service files (api.ts, fareApi.ts, budgetApi.ts, feedbackApi.ts)
 * should import from here so you only update the ngrok URL in ONE place.
 */

// Default remote API (dev devices + release builds when EXPO_PUBLIC_API_URL is unset).
// ⚠️ UPDATE when your deploy URL changes (Railway, ngrok, etc.)
const NGROK_URL = 'https://fyp3-production-d928.up.railway.app';


const getApiBaseUrl = () => {
    // EAS / .env: set EXPO_PUBLIC_API_URL at build time for production-specific URLs
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (envUrl) return envUrl;

    if (__DEV__) {
        // Platform.OS === 'web' is the correct check in React Native.
        // (typeof window !== 'undefined') is ALWAYS true, even on mobile!
        if (Platform.OS === 'web') return 'http://localhost:8000';

        // Physical devices / emulators in dev → remote backend
        return NGROK_URL;
    }

    // Release APK / App Store: __DEV__ is false — use remote default, not a placeholder
    return NGROK_URL;
};

export const API_BASE_URL = getApiBaseUrl();

export const API_HEADERS = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
};

console.log('[API] Base URL:', API_BASE_URL, '| Platform:', Platform.OS);
