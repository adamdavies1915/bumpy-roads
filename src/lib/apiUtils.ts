import { NextRequest, NextResponse } from "next/server";
import { 
  ApiResponse, 
  HttpStatus, 
  API_CONSTANTS,
  ApiAuthError,
  ApiRequestError
} from "@/types/api";

/**
 * Validates API key from request headers
 * 
 * @param request The incoming request
 * @returns True if valid API key present
 * @throws ApiAuthError if API key is invalid or missing
 */
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get(API_CONSTANTS.API_KEY_HEADER);
  
  if (!apiKey) {
    throw new ApiAuthError("Missing API key");
  }
  
  // Get valid API keys from environment variables
  const validApiKeys = (process.env.SRS_API_KEYS || "").split(",").map(key => key.trim());
  
  if (!validApiKeys.includes(apiKey)) {
    throw new ApiAuthError("Invalid API key");
  }
  
  return true;
}

/**
 * Validates device token from request headers
 * Optional validation that can be used for device-specific authentication
 * 
 * @param request The incoming request
 * @returns Device ID if valid
 * @throws ApiAuthError if token is invalid
 */
export async function validateDeviceToken(request: NextRequest): Promise<string> {
  const deviceToken = request.headers.get(API_CONSTANTS.DEVICE_TOKEN_HEADER);
  
  if (!deviceToken) {
    throw new ApiAuthError("Missing device token");
  }
  
  // Here you would verify the device token against your database
  // This is just a placeholder implementation
  
  try {
    // Placeholder for device token validation
    return "device-id-placeholder";
  } catch {
    throw new ApiAuthError("Invalid device token");
  }
}

/**
 * Parses and decodes request body, handling compression if needed
 * 
 * @param request The incoming request
 * @returns Parsed JSON body
 * @throws ApiRequestError if body is malformed
 */
export async function parseRequestBody<T = Record<string, unknown>>(request: NextRequest): Promise<T> {
  try {
    const contentEncoding = request.headers.get('content-encoding');
    let body: T;
    
    if (contentEncoding === 'gzip') {
      // In a real implementation, you'd use a library to decompress
      // For now, we'll throw an informative error
      throw new ApiRequestError(
        "Gzip encoding not implemented in this version",
        HttpStatus.BAD_REQUEST
      );
    } else {
      // Get raw body as text
      const rawBody = await request.text();
      
      try {
        body = JSON.parse(rawBody) as T;
      } catch {
        throw new ApiRequestError("Malformed JSON in request body");
      }
    }
    
    return body;
  } catch (error) {
    if (error instanceof ApiRequestError) {
      throw error;
    }
    
    throw new ApiRequestError(
      error instanceof Error ? error.message : "Error parsing request body"
    );
  }
}

/**
 * Creates a standardized API response
 * 
 * @param success Whether the request was successful
 * @param data Response data (for successful requests)
 * @param error Error message (for failed requests)
 * @param details Additional details (for errors)
 * @returns Formatted API response object
 */
export function createApiResponse<T extends Record<string, unknown> = Record<string, unknown>>(
  success: boolean, 
  data?: T, 
  error?: string, 
  details?: unknown
): ApiResponse {
  const response = {
    success,
    version: API_CONSTANTS.DEFAULT_API_VERSION
  } as ApiResponse;
  
  if (success && data) {
    Object.assign(response, data);
  }
  
  if (!success) {
    response.error = error || "Unknown error";
    
    if (details) {
      response.details = details;
    }
  }
  
  return response;
}

/**
 * Creates a success response with proper status code
 * 
 * @param data Response data
 * @param status HTTP status code (defaults to 200 OK)
 * @returns NextResponse with formatted success response
 */
export function createSuccessResponse<T extends Record<string, unknown>>(
  data: T, 
  status: HttpStatus = HttpStatus.OK
): NextResponse {
  return NextResponse.json(
    createApiResponse(true, data),
    { status }
  );
}

/**
 * Creates an error response with proper status code
 * 
 * @param message Error message
 * @param status HTTP status code (defaults to 500 SERVER_ERROR)
 * @param details Additional error details
 * @returns NextResponse with formatted error response
 */
export function createErrorResponse(
  message: string,
  status: HttpStatus = HttpStatus.SERVER_ERROR,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    createApiResponse(false, undefined, message, details),
    { status }
  );
}