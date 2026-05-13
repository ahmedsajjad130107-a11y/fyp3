import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from './apiConfig';

/** User-facing text when the device cannot reach the backend (down, wrong URL, firewall, etc.). */
function apiUnreachableMessage(): string {
  return `Cannot reach the server at ${API_BASE_URL}. Start the backend from the project’s backend folder (for example: python run_server.py), or set EXPO_PUBLIC_API_URL to your API URL and restart Expo.`;
}

function throwFromAxios(error: AxiosError, fallback: string): never {
  const detail = error.response?.data as { detail?: unknown } | undefined;
  if (detail?.detail != null) {
    const d = detail.detail;
    if (typeof d === 'string') throw new Error(d);
    if (Array.isArray(d)) {
      const parts = d.map((item: { msg?: string }) => item?.msg).filter(Boolean);
      if (parts.length) throw new Error(parts.join(' '));
    }
  }
  if (error.response) throw new Error(error.message || fallback);
  if (error.request) throw new Error(apiUnreachableMessage());
  throw new Error(error.message || fallback);
}

export interface ItineraryRequest {
  destination_city: string;
  departure_city?: string;
  region?: string;
  interests?: string[];
  budget_level: 'low' | 'medium' | 'high';
  num_days: number;
  transport_mode?: string;
  travel_date?: string;
  num_of_people?: number;
  language?: 'en' | 'ur';
  selected_hotel_name?: string;
  selected_transport_type?: string;
}

export interface ItineraryResponse {
  query_used: string;
  num_spots_considered: number;
  days: Array<{
    day: number;
    places: string[];
    description: string;
    date?: string;
    images?: string[];
  }>;
  total_estimated_cost: number;
  currency: string;
  pretty_itinerary_text?: string;
  budget_breakdown?: Record<string, number>;
  recommended_hotels?: string[];
  weather_considerations?: string;
  travel_window?: string;
  transport_costs?: any;
  weather_data?: any;
  all_images?: string[];
}

/**
 * Generate a new itinerary by calling the Python backend
 */
export async function generateItinerary(
  request: ItineraryRequest
): Promise<ItineraryResponse> {
  try {
    const response = await axios.post<ItineraryResponse>(
      `${API_BASE_URL}/itinerary/generate`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          // ngrok free tier requires this header to bypass browser warning
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 120000, // 2 minutes timeout
      }
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      // Network error (connection failed)
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || !error.response) {
        // More detailed error info
        const errorDetails = error.message || 'Unknown network error';
        const helpfulMessage = `Cannot connect to backend server at ${API_BASE_URL}.\n\n` +
          `Error: ${errorDetails}\n\n` +
          `Troubleshooting:\n` +
          `1. Make sure the backend is running: uvicorn main:app --host 0.0.0.0 --port 8000\n` +
          `2. Make sure ngrok is running and pointing to localhost:8000\n` +
          `3. Verify ngrok URL is correct: ${API_BASE_URL}\n` +
          `4. Test the URL in your browser: ${API_BASE_URL}/\n` +
          `5. Check backend logs for errors\n` +
          `6. Restart both backend and ngrok if needed`;
        throw new Error(helpfulMessage);
      }

      // HTTP error (server responded with error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to generate itinerary';
      throw new Error(errorMessage);
    }
    throw error;
  }
}

// Chatbot API interfaces
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatbotRequest {
  message: string;
  itinerary_context?: any; // Summarized itinerary object
  history?: ChatTurn[];
}

export interface ChatbotResponse {
  reply: string;
  used_llm: boolean;
}

// Auth API interfaces
export interface AuthRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  message: string;
  user: {
    email: string;
    full_name?: string;
  };
  token: string;
}

/**
 * Register a new user
 */
export async function registerUser(request: AuthRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/user/register`;
  console.log('[API] registerUser → POST', url);
  try {
    const response = await axios.post<AuthResponse>(
      url,
      {
        email: request.email,
        password: request.password,
        full_name: request.full_name,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 15000,
      }
    );
    console.log('[API] registerUser ← 200 OK');
    return response.data;
  } catch (error: any) {
    console.error('[API] registerUser FAILED:', error.code, error.message, error.response?.status);
    if (axios.isAxiosError(error)) throwFromAxios(error, 'Registration failed');
    throw error;
  }
}

/**
 * Login an existing user
 */
export async function loginUser(request: AuthRequest): Promise<AuthResponse> {
  const url = `${API_BASE_URL}/user/login`;
  console.log('[API] loginUser → POST', url);
  try {
    const response = await axios.post<AuthResponse>(
      url,
      {
        email: request.email,
        password: request.password,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 15000,
      }
    );
    console.log('[API] loginUser ← 200 OK');
    return response.data;
  } catch (error: any) {
    console.error('[API] loginUser FAILED:', error.code, error.message, error.response?.status);
    if (axios.isAxiosError(error)) throwFromAxios(error, 'Login failed');
    throw error;
  }
}

/**
 * Send a message to the chatbot with itinerary context
 */
export async function sendChatMessage(
  request: ChatbotRequest
): Promise<ChatbotResponse> {
  try {
    const response = await axios.post<ChatbotResponse>(
      `${API_BASE_URL}/chatbot/chat`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        timeout: 30000, // 30 seconds timeout
      }
    );
    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send message';
      throw new Error(errorMessage);
    }
    throw error;
  }
}

