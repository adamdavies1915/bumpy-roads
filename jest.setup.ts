import { jest } from "@jest/globals";
import "dotenv/config";

// Set default environment variables for testing if not already set
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = "mongodb://localhost:27017";
}
if (!process.env.MONGODB_DATABASE_NAME) {
  process.env.MONGODB_DATABASE_NAME = "test_street_quality_map";
}
if (!process.env.MONGODB_COLLECTION_NAME) {
  process.env.MONGODB_COLLECTION_NAME = "test_features";
}

// Mock Canvas and other browser APIs that might not be available in the test environment
global.URL.createObjectURL = jest.fn((obj: Blob | MediaSource) => "mocked-url");
global.URL.revokeObjectURL = jest.fn();

// Add other global mocks as needed for your tests
