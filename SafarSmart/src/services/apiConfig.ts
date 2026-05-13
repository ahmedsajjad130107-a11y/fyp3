import { Platform } from 'react-native';

/**
 * Single source of truth for the backend API base URL.
 * All service files (api.ts, fareApi.ts, budgetApi.ts, feedbackApi.ts)
 * should import from here so you only update the ngrok URL in ONE place.
 */

// ⚠️ UPDATE THIS when you restart ngrok:
const NGROK_URL = 'https://brownnose-eagle-marry.ngrok-free.dev';


const getApiBaseUrl = () => {
    if (__DEV__) {
        const envUrl = process.env.EXPO_PUBLIC_API_URL;
        if (envUrl) return envUrl;

        // Platform.OS === 'web' is the correct check in React Native.
        // (typeof window !== 'undefined') is ALWAYS true, even on mobile!
        if (Platform.OS === 'web') return 'http://localhost:8000';

        // Physical devices / emulators → use ngrok tunnel
        return NGROK_URL;
    }
    return 'https://your-production-api.com';
};

export const API_BASE_URL = getApiBaseUrl();

export const API_HEADERS = {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
};

console.log('[API] Base URL:', API_BASE_URL, '| Platform:', Platform.OS);
