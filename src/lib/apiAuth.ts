/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";

/**
 * Constants for API authentication and versioning
 */
export const API_CONSTANTS = {
  // Header keys
  API_KEY_HEADER: "SRS-APIKey",
  DEVICE_TOKEN_HEADER: "Device-Token",
  CONTENT_TYPE_JSON: "application/json",
  
  // API versioning
  DEFAULT_API_VERSION: 1.0,
  
  // Status codes
  STATUS_OK: 200,
  STATUS_BAD_REQUEST: 400,
  STATUS_UNAUTHORIZED: 401,
  STATUS_FORBIDDEN: 403,
  STATUS_NOT_FOUND: 404,
  STATUS_SERVER_ERROR: 500
};

/**
 * API Authentication error
 */
export class ApiAuthError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number = API_CONSTANTS.STATUS_UNAUTHORIZED) {
    super(message);
    this.name = "ApiAuthError";
    this.statusCode = statusCode;
  }
}

/**
 * Request validation error
 */
export class ApiRequestError extends Error {
  statusCode: number;
  details?: any;
  
  constructor(message: string, statusCode: number = API_CONSTANTS.STATUS_BAD_REQUEST, details?: any) {
    super(message);
    this.name = "ApiRequestError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

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
  // In a real implementation, you would check against your device database
  
  try {
    // Placeholder for device token validation
    // const device = await DeviceModel.findByToken(deviceToken);
    // if (!device) throw new Error("Invalid device token");
    // return device.id;
    
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
export async function parseRequestBody(request: NextRequest): Promise<any> {
  try {
    const contentEncoding = request.headers.get('content-encoding');
    let body;
    
    if (contentEncoding === 'gzip') {
      // In a real implementation, you'd use a library to decompress
      // For now, we'll throw an informative error
      throw new ApiRequestError(
        "Gzip encoding not implemented in this version",
        API_CONSTANTS.STATUS_BAD_REQUEST
      );
    } else {
      // Get raw body as text
      const rawBody = await request.text();
      
      try {
        body = JSON.parse(rawBody);
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
export function createApiResponse(
  success: boolean, 
  data?: any, 
  error?: string, 
  details?: any
): any {
  const response: any = {
    success,
    version: API_CONSTANTS.DEFAULT_API_VERSION
  };
  
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