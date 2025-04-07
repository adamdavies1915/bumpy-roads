/**
 * Common types for API requests and responses
 */

// GeoJSON Point type
export type GeoPoint = {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  
  // Base feature data structure
  export interface FeatureData {
    // Required fields
    ppe: number;
    loc: GeoPoint;
    
    // Optional metadata fields
    timestamp?: number;
    deviceId?: string;
    userId?: string;
    additionalData?: Record<string, unknown>;
    
    // Internal fields (added by the system)
    aggregateId?: string;
  }
  
  // API Response structure
  export interface ApiResponse {
    success: boolean;
    version: number;
    
    // Success fields (present when success is true)
    message?: string;
    
    // Data fields (present when success is true)
    id?: string;
    [key: string]: unknown;
    
    // Error fields (present when success is false)
    error?: string;
    details?: unknown;
  }
  
  // Feature creation request
  export type CreateFeatureRequest = FeatureData
  
  // Feature creation response
  export interface CreateFeatureResponse extends ApiResponse {
    id: string;
    message: string;
  }
  
  // Error response structure
  export interface ErrorResponse extends ApiResponse {
    error: string;
    details?: unknown;
  }
  
  // Bounding box type
  export type BoundingBox = [number, number, number, number]; // [west, south, east, north]
  
  // Feature retrieval query parameters
  export interface GetFeaturesParams {
    zoom: number;
    bbox: BoundingBox;
  }
  
  // Feature retrieval response item
  export interface FeatureResponseItem {
    ppe: number;
    loc: GeoPoint;
    aggregateId: string;
    timestamp?: number;
  }
  
  // HTTP status codes
  export enum HttpStatus {
    OK = 200,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    SERVER_ERROR = 500
  }
  
  // API Constants
  export const API_CONSTANTS = {
    // Header keys
    API_KEY_HEADER: "SRS-APIKey",
    DEVICE_TOKEN_HEADER: "Device-Token",
    CONTENT_TYPE_JSON: "application/json",
    
    // API versioning
    DEFAULT_API_VERSION: 1.0,
    
    // Status codes
    STATUS: HttpStatus
  };
  
  // Authentication error
  export class ApiAuthError extends Error {
    statusCode: HttpStatus;
    
    constructor(message: string, statusCode: HttpStatus = HttpStatus.UNAUTHORIZED) {
      super(message);
      this.name = "ApiAuthError";
      this.statusCode = statusCode;
    }
  }
  
  // Request validation error
  export class ApiRequestError extends Error {
    statusCode: HttpStatus;
    details?: unknown;
    
    constructor(
      message: string, 
      statusCode: HttpStatus = HttpStatus.BAD_REQUEST, 
      details?: unknown
    ) {
      super(message);
      this.name = "ApiRequestError";
      this.statusCode = statusCode;
      this.details = details;
    }
  }