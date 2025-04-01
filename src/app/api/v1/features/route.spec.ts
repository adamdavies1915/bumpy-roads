// test/route.test.ts
import { jest } from "@jest/globals";
import { NextRequest } from "next/server";

// Mock for DatabaseService before importing route
const mockAddFeature = jest.fn();

jest.mock("@/app/services/DatabaseService", () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => ({
      addFeature: mockAddFeature,
    })),
  };
});

let POST: typeof import("./route").POST;

beforeAll(async () => {
  const routeModule = await import("./route");
  POST = routeModule.POST;
});

// Store original environment
const originalEnv = process.env;

describe("Features API POST endpoint", () => {
  const TEST_API_KEY = "test-api-key";

  beforeAll(() => {
    process.env.SRS_API_KEYS = TEST_API_KEY;
    process.env.MONGODB_DATABASE_NAME = "test-db";
    process.env.MONGODB_COLLECTION_NAME = "test-collection";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockRequest = (includeApiKey = true): NextRequest => {
    const headers = new Headers({
      "Content-Type": "application/json",
    });

    if (includeApiKey) {
      headers.set("SRS-APIKey", TEST_API_KEY);
    }

    return {
      headers,
      text: jest.fn().mockResolvedValue("{}"),
      json: jest.fn().mockResolvedValue({}),
    } as unknown as NextRequest;
  };

  it("should successfully add a valid feature", async () => {
    const featureData = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219],
      },
    };

    const mockReq = createMockRequest(true);
    mockReq.json = jest.fn().mockResolvedValue(featureData);
    mockReq.text = jest.fn().mockResolvedValue(JSON.stringify(featureData));

    mockAddFeature.mockResolvedValueOnce({
      acknowledged: true,
      insertedId: "mock-id-123",
    });

    const response = await POST(mockReq);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.message).toBe("Feature added successfully");
    expect(result.id).toBe("mock-id-123");
    expect(mockAddFeature).toHaveBeenCalledWith(featureData);
  });

  it("should handle API authentication errors", async () => {
    const mockReq = createMockRequest(false);

    const response = await POST(mockReq);
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Missing API key");
    expect(mockAddFeature).not.toHaveBeenCalled();
  });

  it("should handle database errors", async () => {
    const featureData = {
      ppe: 5,
      loc: {
        type: "Point",
        coordinates: [-73.992, 40.7219],
      },
    };

    const mockReq = createMockRequest(true);
    mockReq.json = jest.fn().mockResolvedValue(featureData);
    mockReq.text = jest.fn().mockResolvedValue(JSON.stringify(featureData));

    mockAddFeature.mockRejectedValueOnce(
      new Error("Database connection error")
    );

    const response = await POST(mockReq);
    const result = await response.json();

    expect(response.status).toBe(500);
    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection error");
    expect(mockAddFeature).toHaveBeenCalledWith(featureData);
  });
});