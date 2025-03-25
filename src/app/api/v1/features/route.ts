import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import clientPromise from "@/lib/db/mongodb";

import { generateAggregateId, isValidCoordinates, isValidPPE } from "@/lib/geoUtils";
import { validateApiKey, parseRequestBody, createApiResponse, API_CONSTANTS, ApiAuthError, ApiRequestError } from "@/lib/apiAuth";

// Database configuration
const dbName = process.env.MONGODB_DATABASE_NAME!;
const collectionName = process.env.MONGODB_COLLECTION_NAME!;

// Schema validation for incoming data
const featureSchema = z.object({
  ppe: z.number()
    .min(0)
    .max(10)
    .describe("PPE (Points Per Error) value - a quality indicator between 0-10"),
  
  loc: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180).max(180).describe("Longitude"),
      z.number().min(-90).max(90).describe("Latitude")
    ])
  }),
  
  // Optional metadata fields
  timestamp: z.number().optional(),
  deviceId: z.string().optional(),
  userId: z.string().optional(),
  additionalData: z.record(z.unknown()).optional(),
  
  // Aggregate ID for resolution filtering
  aggregateId: z.string().optional()
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate API key
    validateApiKey(request);
    
    // Step 2: Parse request body
    const body = await parseRequestBody(request);
    
    // Step 3: Validate data against schema
    const result = featureSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        createApiResponse(false, null, "Invalid request data", result.error.format()),
        { status: API_CONSTANTS.STATUS_BAD_REQUEST }
      );
    }
    
    // Step 4: Extract validated data
    const featureData = result.data;
    
    // Step 5: Add timestamp if not provided
    if (!featureData.timestamp) {
      featureData.timestamp = Date.now();
    }
    
    // Step 6: Generate aggregateId based on coordinates for resolution filtering
    const [lon, lat] = featureData.loc.coordinates;
    featureData.aggregateId = generateAggregateId(lon, lat).toString();
    
    // Double-check coordinate and PPE validity
    if (!isValidCoordinates(lon, lat) || !isValidPPE(featureData.ppe)) {
      return NextResponse.json(
        createApiResponse(false, null, "Invalid coordinates or PPE value"),
        { status: API_CONSTANTS.STATUS_BAD_REQUEST }
      );
    }
    
    // Step 7: Connect to database
    const client = await clientPromise;
    const collection = client.db(dbName).collection(collectionName);
    
    // Step 8: Insert the new feature
    const insertResult = await collection.insertOne(featureData);
    
    if (!insertResult.acknowledged) {
      return NextResponse.json(
        createApiResponse(false, null, "Failed to insert data"),
        { status: API_CONSTANTS.STATUS_SERVER_ERROR }
      );
    }
    
    // Step 9: Return success response with the inserted ID
    return NextResponse.json(
      createApiResponse(true, {
        message: "Feature added successfully",
        id: insertResult.insertedId
      }),
      { status: API_CONSTANTS.STATUS_OK }
    );
    
  } catch (error) {
    console.error("Error adding feature:", error);
    
    // Handle specific error types
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        createApiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    if (error instanceof ApiRequestError) {
      return NextResponse.json(
        createApiResponse(false, null, error.message, error.details),
        { status: error.statusCode }
      );
    }
    
    // Handle generic errors
    return NextResponse.json(
      createApiResponse(false, null, 
        error instanceof Error ? error.message : "Unknown server error"
      ),
      { status: API_CONSTANTS.STATUS_SERVER_ERROR }
    );
  }
}