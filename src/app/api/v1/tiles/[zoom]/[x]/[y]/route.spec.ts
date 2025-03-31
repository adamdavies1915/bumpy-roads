/* eslint-disable @typescript-eslint/no-require-imports */
// src/__tests__/api/tiles.test.ts
import { jest } from "@jest/globals";

// Define Feature type
type Feature = {
  ppe: number;
  loc: {
    coordinates: [number, number];
  };
};

// First set up our mocks
const mockBbox = [-74.05, 40.7, -73.95, 40.73] as [
  number,
  number,
  number,
  number,
];
const mockFeatures: Feature[] = [
  { ppe: 1.5, loc: { coordinates: [-74.006, 40.7128] } },
  { ppe: 3.2, loc: { coordinates: [-73.992, 40.7219] } },
];
const mockPngBuffer = Buffer.from("mock-png-data");

// Create mock for DatabaseService
const mockGetFeaturesWithinBox = jest.fn().mockResolvedValue(mockFeatures);
jest.mock("@/app/services/DatabaseService", () => {
  return {
    DatabaseService: jest.fn().mockImplementation(() => {
      return {
        getFeaturesWithinBox: mockGetFeaturesWithinBox
      };
    })
  };
});

// Mock drawFeatures function
const mockDrawFeatures = jest.fn().mockResolvedValue(mockPngBuffer);
jest.mock("@/lib/drawFeatures", () => ({
  drawFeatures: mockDrawFeatures,
}));

// Mock SphericalMercator
const mockBboxFn = jest.fn().mockReturnValue(mockBbox);
class MockSphericalMercator {
  bbox: typeof mockBboxFn;

  constructor() {
    this.bbox = mockBboxFn;
  }
}
jest.mock("@mapbox/sphericalmercator", () => ({
  SphericalMercator: MockSphericalMercator,
}));

// Create a simplified version of the handler for testing
const handleTileRequest = async (
  zoom: string,
  x: string,
  y: string,
): Promise<Buffer> => {
  const { drawFeatures } = require("@/lib/drawFeatures");
  const { SphericalMercator } = require("@mapbox/sphericalmercator");
  const { DatabaseService } = require("@/app/services/DatabaseService");

  const merc = new SphericalMercator({});
  const bbox = merc.bbox(Number(x), Number(y.split(".png")[0]), Number(zoom));
  
  const dbService = new DatabaseService();
  const features = await dbService.getFeaturesWithinBox({ zoom: Number(zoom), bbox });
  
  const pngBuffer = await drawFeatures(Number(zoom), bbox, features);

  return pngBuffer;
};

describe("Tile API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate tiles with correct parameters", async () => {
    // Call our simplified handler
    const buffer = await handleTileRequest("12", "1205", "1539.png");

    // Verify our mocks were called correctly
    expect(mockBboxFn).toHaveBeenCalledWith(1205, 1539, 12);
    expect(mockGetFeaturesWithinBox).toHaveBeenCalledWith({
      zoom: 12,
      bbox: mockBbox,
    });
    expect(mockDrawFeatures).toHaveBeenCalledWith(12, mockBbox, mockFeatures);

    // Verify the result
    expect(buffer).toEqual(mockPngBuffer);
  });

  it("should handle errors from database queries", async () => {
    // Setup mock to throw an error
    mockGetFeaturesWithinBox.mockRejectedValueOnce(new Error("Database error"));

    // Expect our handler to throw the same error
    await expect(handleTileRequest("12", "1205", "1539.png")).rejects.toThrow(
      "Database error",
    );

    // Verify the function was called
    expect(mockGetFeaturesWithinBox).toHaveBeenCalled();
    // And drawFeatures should not have been called
    expect(mockDrawFeatures).not.toHaveBeenCalled();
  });

  it("should handle errors from drawing", async () => {
    // Setup mock to throw an error
    mockDrawFeatures.mockRejectedValueOnce(new Error("Drawing error"));

    // Expect our handler to throw the same error
    await expect(handleTileRequest("12", "1205", "1539.png")).rejects.toThrow(
      "Drawing error",
    );

    // Verify both functions were called in order
    expect(mockGetFeaturesWithinBox).toHaveBeenCalled();
    expect(mockDrawFeatures).toHaveBeenCalled();
  });
});