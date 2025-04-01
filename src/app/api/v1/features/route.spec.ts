import { NextRequest } from "next/server";
import { jest } from "@jest/globals";

// Store the original environment
const originalEnv = process.env;

// Create mock for DatabaseService before importing the route
const mockAddFeature = jest.fn();
jest.mock("@/app/services/DatabaseService", () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => ({
      addFeature: mockAddFeature
    }))
  };
});

// Now import the module under test
import { POST } from "./route";

describe("Features API POST endpoint", () => {
  // The API key we'll use in tests
  const TEST_API_KEY = "test-api-key";

  beforeAll(() => {
    // Set up environment variables before all tests
    process.env.SRS_API_KEYS = TEST_API_KEY;
    process.env.MONGODB_DATABASE_NAME = "test-db";
    process.env.MONGODB_COLLECTION_NAME = "test-collection";
  });

  afterAll(() => {
    // Restore original environment after all tests`
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper to create mock request
  const createMockRequest = (includeApiKey = true): NextRequest => {
    const headers = new Headers({
      'Content-Type': 'application/json'
    });
    
    if (includeApiKey) {
      headers.set('SRS-APIKey', TEST_API_KEY);
    }
    
    return {
      headers,
      text: jest.fn().mockResolvedValue('{}'),
      json: jest.fn().mockResolvedValue({})
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

    // Mock request body
    const mockReq = createMockRequest(true);
    mockReq.json = jest.fn().mockResolvedValue(featureData);
    mockReq.text = jest.fn().mockResolvedValue(JSON.stringify(featureData));

    // Setup database mock to return success for this test
    mockAddFeature.mockResolvedValueOnce({
      acknowledged: true,
      insertedId: 'mock-id-123'
    });

    // Execute request
    const response = await POST(mockReq);
    const result = await response.json();

    // Log for debugging
    console.log('Response status:', response.status);
    console.log('Response body:', result);

    // Verify response
    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Feature added successfully");
    expect(result.id).toBe('mock-id-123');

    // Verify database function was called with the right data
    expect(mockAddFeature).toHaveBeenCalledWith(featureData);
  });

  it("should handle API authentication errors", async () => {
    // Create request without API key
    const mockReq = createMockRequest(false);
    
    // Execute request
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Missing API key");
    
    // Verify database function was not called
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

    // Mock request body
    const mockReq = createMockRequest(true);
    mockReq.json = jest.fn().mockResolvedValue(featureData);
    mockReq.text = jest.fn().mockResolvedValue(JSON.stringify(featureData));
    
    // Setup database mock to return an error for this test
    mockAddFeature.mockRejectedValueOnce(new Error("Database connection error"));

    // Execute request
    const response = await POST(mockReq);
    const result = await response.json();

    // Verify response
    expect(response.status).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection error");
    
    // Verify database function was called
    expect(mockAddFeature).toHaveBeenCalledWith(featureData);
  });
});