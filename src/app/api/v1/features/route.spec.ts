import { jest } from "@jest/globals";
import { NextRequest, NextResponse } from "next/server";
import { HttpStatus, CreateFeatureRequest } from "@/types/api";

// Import the error classes to use in mock
import { ApiAuthError, ApiRequestError } from "@/lib/apiUtils";

// Mock NextResponse.json
const mockNextResponseJson = jest.fn();

// Create a properly typed mock version of next/server
jest.mock("next/server", () => {
  // Type the actual module import
  const originalModule = jest.requireActual("next/server") as typeof import("next/server");
  
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: (body: unknown, options?: ResponseInit): NextResponse => {
        mockNextResponseJson(body, options);
        const response = new originalModule.NextResponse(
          JSON.stringify(body), 
          options
        );
        return response;
      }
    }
  };
});

// Make sure to mock the modules BEFORE importing the handler
jest.mock("@/lib/apiUtils", () => ({
  validateApiKey: jest.fn().mockReturnValue(true),
  parseRequestBody: jest.fn().mockImplementation(async (req: unknown) => {
    return (req as { bodyData: unknown }).bodyData;
  }),
  createSuccessResponse: jest.fn().mockImplementation((data: Record<string, unknown>) => {
    return NextResponse.json({
      success: true,
      version: 1.0,
      ...data
    }, { status: 200 });
  }),
  createErrorResponse: jest.fn().mockImplementation((message: string, status = HttpStatus.SERVER_ERROR, details?: unknown) => {
    return NextResponse.json({
      success: false,
      error: message,
      version: 1.0,
      ...(details ? { details } : {})
    }, { status });
  }),
  // Export the error classes for instanceof checks
  ApiAuthError,
  ApiRequestError
}));

// Mock the geoUtils functions
jest.mock("@/lib/geoUtils", () => ({
  isValidCoordinates: jest.fn().mockReturnValue(true),
  isValidPPE: jest.fn().mockReturnValue(true),
  generateAggregateId: jest.fn().mockReturnValue(500000)
}));

// Define MongoDB mock interfaces
interface InsertOneResult {
  acknowledged: boolean;
  insertedId: string;
}

// Create MongoDB mocks - avoiding circular references
const mockInsertOne = jest.fn<(doc: unknown) => Promise<InsertOneResult>>();
const mockCollection = jest.fn(() => ({
  insertOne: mockInsertOne
}));
const mockDb = jest.fn(() => ({
  collection: mockCollection
}));
const mockClient = {
  db: mockDb
};
const mockClientPromise = Promise.resolve(mockClient);

jest.mock("@/lib/db/mongodb", () => ({
  __esModule: true,
  default: mockClientPromise
}));

// Import the handler after mocking
import { POST } from "./route";

// Import the mocked modules for access in tests
import * as apiUtils from "@/lib/apiUtils";
import * as geoUtils from "@/lib/geoUtils";

// Helper function to create a mock request
function createMockRequest(bodyData: CreateFeatureRequest): NextRequest {
  return {
    headers: {
      get: jest.fn<(key: string) => string | null>().mockImplementation((key: string) => {
        if (key === "SRS-APIKey") return "valid-api-key";
        return null;
      })
    },
    bodyData, // This will be accessed by our mocked parseRequestBody
    text: jest.fn<() => Promise<string>>().mockResolvedValue(JSON.stringify(bodyData)),
    json: jest.fn<() => Promise<CreateFeatureRequest>>().mockResolvedValue(bodyData)
  } as unknown as NextRequest;
}

describe("POST /api/features", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Ensure our mocks are properly reset and configured
    (apiUtils.validateApiKey as jest.Mock).mockReturnValue(true);
    (geoUtils.isValidCoordinates as jest.Mock).mockReturnValue(true);
    (geoUtils.isValidPPE as jest.Mock).mockReturnValue(true);
    
    // Default mock implementation for MongoDB
    mockInsertOne.mockResolvedValue({ 
      acknowledged: true, 
      insertedId: "mock-id-123"
    });
  });

  it("should successfully add a valid feature", async () => {
    // Create valid feature data
    const validFeature: CreateFeatureRequest = {
      ppe: 2.5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219] as [number, number]
      },
      deviceId: "test-device-123"
    };

    await POST(createMockRequest(validFeature));
    
    // Check that NextResponse.json was called correctly
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Feature added successfully",
        id: "mock-id-123",
        version: 1.0
      }),
      expect.any(Object)
    );
    
    // Verify database was called correctly
    expect(mockDb).toHaveBeenCalledWith(process.env.MONGODB_DATABASE_NAME);
    expect(mockCollection).toHaveBeenCalledWith(process.env.MONGODB_COLLECTION_NAME);
    
    // Check that the right data was passed to insertOne
    expect(mockInsertOne).toHaveBeenCalledWith(expect.objectContaining({
      ...validFeature,
      timestamp: expect.any(Number),
      aggregateId: "500000" // String version of our mocked value
    }));
  });

  it("should reject invalid data with PPE out of range", async () => {
    // Set up mock to return false
    (geoUtils.isValidPPE as jest.Mock).mockReturnValueOnce(false);
    
    const invalidFeature: CreateFeatureRequest = {
      ppe: 15, // Invalid value
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219] as [number, number]
      }
    };

    await POST(createMockRequest(invalidFeature));
    
    // Check response
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Invalid coordinates or PPE value",
        version: 1.0
      }),
      expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
    );
    
    // Database should not be called
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  it("should reject invalid coordinates", async () => {
    // Set up mock to return false
    (geoUtils.isValidCoordinates as jest.Mock).mockReturnValueOnce(false);
    
    const invalidFeature: CreateFeatureRequest = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [-200, 40.7219] as [number, number] // Longitude out of range
      }
    };

    await POST(createMockRequest(invalidFeature));
    
    // Check response
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Invalid coordinates or PPE value",
        version: 1.0
      }),
      expect.objectContaining({ status: HttpStatus.BAD_REQUEST })
    );
    
    // Database should not be called
    expect(mockInsertOne).not.toHaveBeenCalled();
  });

  it("should handle database errors gracefully", async () => {
    // Setup mock to throw an error
    mockInsertOne.mockRejectedValueOnce(
      new Error("Database connection error")
    );

    const validFeature: CreateFeatureRequest = {
      ppe: 2.5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219] as [number, number]
      }
    };

    await POST(createMockRequest(validFeature));
    
    // Check error response
    expect(mockNextResponseJson).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "Database connection error",
        version: 1.0
      }),
      expect.objectContaining({ status: HttpStatus.SERVER_ERROR })
    );
  });
});