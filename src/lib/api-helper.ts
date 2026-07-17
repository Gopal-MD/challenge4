/**
 * API Response contract wrapper.
 * Enforces the strict JSON schema: { success: boolean, data: T | null, error: string | null }
 */
export interface APIContract<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
}

/**
 * Returns a standardized successful JSON Response.
 * 
 * @template T
 * @param {T} data - The payload data to return.
 * @param {number} [status=200] - HTTP status code.
 * @returns {Response} Standardized Response object.
 */
export function createSuccessResponse<T>(data: T, status: number = 200): Response {
  const payload: APIContract<T> = {
    success: true,
    data,
    error: null,
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Returns a standardized error JSON Response.
 * 
 * @param {string} errorMessage - Description of the error.
 * @param {number} [status=500] - HTTP status code.
 * @returns {Response} Standardized Response object.
 */
export function createErrorResponse(errorMessage: string, status: number = 500): Response {
  const payload: APIContract<null> = {
    success: false,
    data: null,
    error: errorMessage,
  };
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
