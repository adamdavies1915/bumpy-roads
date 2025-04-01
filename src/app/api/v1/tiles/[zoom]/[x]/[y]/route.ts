import { NextRequest, NextResponse } from 'next/server';
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { drawFeatures } from "@/lib/drawFeatures";
import { DatabaseService } from '@/app/services/DatabaseService';
import { authService } from '@/app/services/AuthService';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ zoom: string; x: string; y: string }> },
) {
  try {
    // Step 1: Validate API key
    authService.validateApiKey(request);
    
    // Step 2: Extract and validate params
    const { zoom, x, y } = await params;
    const zoomNum = Number(zoom);
    const xNum = Number(x);
    const yNum = Number(y.split(".png")[0]);
    
    // Step 3: Calculate the bounding box
    const merc = new SphericalMercator({});
    const bbox = merc.bbox(xNum, yNum, zoomNum);

    // Step 4: Use DatabaseService to get features
    const dbService = new DatabaseService();
    const features = await dbService.getFeaturesWithinBox({ 
      zoom: zoomNum, 
      bbox 
    });

    // Step 5: Generate PNG image
    const pngBuffer = await drawFeatures(zoomNum, bbox, features);

    // Step 6: Return PNG response
    const headers = new Headers();
    headers.set("Content-Type", "image/png");
    return new Response(pngBuffer, { headers });
    
  } catch (error) {
    // Only log errors in production, not in test environment
    if (process.env.NODE_ENV !== 'test') {
      console.error("Error generating tile:", error);
    }
    
    // Handle authentication errors
    if (error instanceof ApiAuthError) {
      return NextResponse.json(
        authService.createApiResponse(false, null, error.message),
        { status: error.statusCode }
      );
    }
    
    // Handle generic errors
    return NextResponse.json(
      authService.createApiResponse(false, null, 
        error instanceof Error ? error.message : "Unknown server error"
      ),
      { status: API_CONSTANTS.STATUS_SERVER_ERROR }
    );
  }
}