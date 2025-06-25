// API Service utility for handling backend requests

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
const API_TIMEOUT = parseInt(import.meta.env.VITE_API_TIMEOUT || '10000');

/**
 * Enhanced fetch with base URL and timeout handling
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('/')
    ? `${API_BASE_URL}${endpoint}`
    : endpoint;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${API_TIMEOUT}ms`);
    }

    // Check if it's a network error (server not available)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('API server not available');
    }

    throw error;
  }
}

/**
 * Check if the API server is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiFetch('/api/health');
    return response.ok;
  } catch (error) {
    console.warn('API health check failed:', error);
    return false;
  }
}

/**
 * API client with common methods
 */
export const apiClient = {
  get: (endpoint: string, options: Omit<RequestInit, 'method'> = {}) =>
    apiFetch(endpoint, { ...options, method: 'GET' }),

  post: (
    endpoint: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) =>
    apiFetch(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...(data && { body: JSON.stringify(data) }),
    }),

  put: (
    endpoint: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...(data && { body: JSON.stringify(data) }),
    }),

  patch: (
    endpoint: string,
    data?: any,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) =>
    apiFetch(endpoint, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...(data && { body: JSON.stringify(data) }),
    }),

  delete: (endpoint: string, options: Omit<RequestInit, 'method'> = {}) =>
    apiFetch(endpoint, { ...options, method: 'DELETE' }),

  upload: (
    endpoint: string,
    formData: FormData,
    options: Omit<RequestInit, 'method' | 'body'> = {}
  ) =>
    apiFetch(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
    }),
};

/**
 * Helper to get the full API URL for a given endpoint
 */
export function getApiUrl(endpoint: string): string {
  return endpoint.startsWith('/') ? `${API_BASE_URL}${endpoint}` : endpoint;
}

/**
 * API response handler with enhanced error handling
 */
export async function handleApiResponse<T = any>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get('content-type');

  if (contentType && contentType.includes('application/json')) {
    let data;

    // Parse JSON response
    try {
      data = await response.json();
    } catch (parseError) {
      // Only catch actual JSON parsing errors
      console.error('Failed to parse JSON response:', parseError);
      throw new Error('Invalid JSON response from server');
    }

    // Handle error responses (4xx, 5xx)
    if (!response.ok) {
      // Extract error message from various possible response formats
      let errorMessage = 'Unknown error occurred';

      if (data.message) {
        errorMessage = data.message;
      } else if (data.error) {
        errorMessage = data.error;
      } else if (
        data.errors &&
        Array.isArray(data.errors) &&
        data.errors.length > 0
      ) {
        errorMessage = data.errors[0].message || data.errors[0];
      } else if (typeof data === 'string') {
        errorMessage = data;
      } else {
        errorMessage = `HTTP error! status: ${response.status}`;
      }

      // Create error with additional context
      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;
      (error as any).responseData = data;

      throw error;
    }

    return data;
  } else {
    // Handle non-JSON responses
    if (!response.ok) {
      let textResponse = '';

      try {
        textResponse = await response.text();
      } catch (textError) {
        console.error('Failed to read response text:', textError);
      }

      // Provide user-friendly error messages for common HTTP status codes
      let errorMessage = '';
      if (response.status === 404) {
        errorMessage =
          'Service not found. Please ensure the backend server is running.';
      } else if (response.status === 413) {
        errorMessage =
          'File is too large. Please reduce file size and try again.';
      } else if (response.status === 415) {
        errorMessage = 'File type not supported. Only CSV files are allowed.';
      } else if (response.status >= 500) {
        errorMessage = 'Server is experiencing issues. Please try again later.';
      } else {
        errorMessage =
          textResponse ||
          `Request failed: ${response.status} ${response.statusText}`;
      }

      const error = new Error(errorMessage);
      (error as any).status = response.status;
      (error as any).statusText = response.statusText;

      throw error;
    }

    return response as T;
  }
}

/**
 * Debug information
 */
export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: API_TIMEOUT,
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
};

// Log API configuration in development
if (import.meta.env.DEV) {
  console.log('🔧 API Configuration:', apiConfig);
}
