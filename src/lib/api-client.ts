/**
 * Safe API Response Parsing Utility
 * 
 * Handles common issues with response parsing:
 * - Empty responses
 * - Non-JSON responses
 * - Malformed JSON
 * - Network errors
 */

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export async function safeJsonParse<T>(
  response: Response,
  expectedStatus: number[] = [200]
): Promise<ApiResult<T>> {
  const status = response.status;

  // Check status first
  if (!expectedStatus.includes(status)) {
    let errorMessage = `Request failed with status ${status}`;
    try {
      const errorData = await safeReadJson(response);
      if (errorData?.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Ignore parse errors for error responses
    }
    return { success: false, error: errorMessage, status };
  }

  // Check content type
  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await response.text().catch(() => "");
    if (text.trim()) {
      return {
        success: false,
        error: `Expected JSON but received ${contentType || "unknown content type"}`,
        status,
      };
    }
    // Empty response with success status
    return { success: true, data: undefined as any, status };
  }

  // Try to parse JSON
  try {
    const data = await response.json();
    return { success: true, data, status };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON response: ${error instanceof Error ? error.message : "Unknown error"}`,
      status,
    };
  }
}

async function safeReadJson(response: Response): Promise<any> {
  try {
    const cloned = response.clone();
    return await cloned.json();
  } catch {
    return null;
  }
}

/**
 * Client-side fetch wrapper with safe JSON parsing
 */
export async function safeFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
    return safeJsonParse<T>(response);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Typed error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Throw on error variant for use with try/catch
 */
export async function safeFetchOrThrow<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const result = await safeFetch<T>(url, options);
  if (!result.success) {
    throw new ApiError(result.error || "Request failed", result.status || 500, result.data);
  }
  return result.data as T;
}