import { NextRequest } from "next/server";
import { jest } from "@jest/globals";
import { POST } from "@/app/api/v1/features/route";

// Mock dependencies
jest.mock("@/lib/apiAuth", () => ({
  validateApiKey: jest.fn().mockReturnValue(true),
  parseRequestBody: jest.fn(),
  createApiResponse: jest.fn((success, data, error, details) => ({ 
    success, 
    ...(data || {}), 
    ...(error ? { error } : {}),
    ...(details ? { details } : {})
  })),
  ApiAuthError: class ApiAuthError extends Error {
    constructor(message: string, public statusCode = 401) {
      super(message);
      this.name = "ApiAuthError";
    }
  },
  ApiRequestError: class ApiRequestError extends Error {
    constructor(message: string, public statusCode = 400, public details?: any) {
      super(message);
      this.name = "ApiRequestError";
    }
  },
  API_CONSTANTS: {
    STATUS_OK: 200,
    STATUS_BAD_REQUEST: 400,
    STATUS_UNAUTHORIZED: 401,
    STATUS_SERVER_ERROR: 500
  }
}));

jest.mock("@/lib/geoUtils", () => ({
  isValidCoordinates: jest.fn().mockReturnValue(true),
  isValidPPE: jest.fn().mockReturnValue(true),
  generateAggregateId: jest.fn().mockReturnValue(12345)
}));

// Mock DatabaseService
const mockAddFeature = jest.fn();
jest.mock("@/app/services/DatabaseService", () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => {
      return {
        addFeature: mockAddFeature
      };
    })
  };
});

// Import mocked dependencies for use in tests
const { validateApiKey, parseRequestBody, ApiAuthError, ApiRequestError } = jest.requireMock("@/lib/apiAuth") as {
  validateApiKey: jest.Mock,
  parseRequestBody: jest.Mock,
  ApiAuthError: typeof Error,
  ApiRequestError: typeof Error
};
const { isValidCoordinates, isValidPPE } = jest.requireMock("@/lib/geoUtils") as {
  isValidCoordinates: jest.Mock,
  isValidPPE: jest.Mock
};

describe("Features API POST endpoint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock request
  const createMockRequest = (body: any): NextRequest => {
    return {
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers(),
      text: jest.fn().mockResolvedValue(JSON.stringify(body))
    } as unknown as NextRequest;
  };

  it("should successfully add a valid feature", async () => {
    // Setup valid feature data
    const featureData = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219]
      }
    };

    // Mock parseRequestBody to return valid data
    parseRequestBody.mockResolvedValue(featureData);

    // Mock database response
    mockAddFeature.mockResolvedValue({ 
      acknowledged: true, 
      insertedId: 'mock-id-123'
    });

    // Execute request
    const mockReq = createMockRequest(featureData);
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Feature added successfully");
    expect(result.id).toBe('mock-id-123');

    // Verify our mocks were called
    expect(validateApiKey).toHaveBeenCalledWith(mockReq);
    expect(parseRequestBody).toHaveBeenCalledWith(mockReq);
    expect(isValidCoordinates).toHaveBeenCalledWith(-73.992, 40.7219);
    expect(isValidPPE).toHaveBeenCalledWith(5);
    expect(mockAddFeature).toHaveBeenCalledWith(featureData);
  });

  it("should reject invalid feature data", async () => {
    // Setup invalid feature data (missing required fields)
    const invalidFeatureData = {
      // Missing required 'ppe' field
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219]
      }
    };

    // Mock parseRequestBody to return invalid data
    parseRequestBody.mockResolvedValue(invalidFeatureData);

    // Execute request
    const mockReq = createMockRequest(invalidFeatureData);
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response indicates failure
    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid request data");
    
    // DatabaseService should not be called with invalid data
    expect(mockAddFeature).not.toHaveBeenCalled();
  });

  it("should handle API authentication errors", async () => {
    // Mock validateApiKey to throw auth error
    validateApiKey.mockImplementationOnce(() => {
      throw new ApiAuthError("Invalid API key", 401);
    });

    // Execute request
    const mockReq = createMockRequest({});
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid API key");
    
    // Verify subsequent functions were not called
    expect(parseRequestBody).not.toHaveBeenCalled();
    expect(mockAddFeature).not.toHaveBeenCalled();
  });

  it("should handle invalid coordinates", async () => {
    // Setup feature data with invalid coordinates
    const featureData = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [200, 100] // Invalid values
      }
    };

    // Mock parseRequestBody to return the feature data
    parseRequestBody.mockResolvedValue(featureData);
    
    // Mock coordinate validation to fail
    isValidCoordinates.mockReturnValueOnce(false);

    // Execute request
    const mockReq = createMockRequest(featureData);
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(400);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid coordinates or PPE value");
    
    // DatabaseService should not be called with invalid coordinates
    expect(mockAddFeature).not.toHaveBeenCalled();
  });

  it("should handle database errors", async () => {
    // Setup valid feature data
    const featureData = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219]
      }
    };

    // Mock parseRequestBody to return valid data
    parseRequestBody.mockResolvedValue(featureData);
    
    // Mock database error
    mockAddFeature.mockRejectedValueOnce(new Error("Database connection error"));

    // Execute request
    const mockReq = createMockRequest(featureData);
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection error");
  });
});