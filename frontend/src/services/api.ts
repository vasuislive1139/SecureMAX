export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
export const RPC_URL = import.meta.env.VITE_RPC_URL || "http://127.0.0.1:8545";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function safeFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = endpoint.startsWith("http") ? endpoint : `${BACKEND_URL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const sanitizedError =
        data?.message || data?.error || `Request failed with status ${response.status}`;
      return { success: false, error: sanitizedError };
    }

    return { success: true, data };
  } catch (err: any) {
    return {
      success: false,
      error: "Unable to connect to service. Please check your network connection.",
    };
  }
}
