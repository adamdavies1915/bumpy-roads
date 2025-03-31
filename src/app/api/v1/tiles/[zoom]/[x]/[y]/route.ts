import { SphericalMercator } from "@mapbox/sphericalmercator";
import { drawFeatures } from "@/lib/drawFeatures";
import { DatabaseService } from "@/app/services/DatabaseService";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ zoom: string; x: string; y: string }> },
) {
  const { zoom, x, y } = await params;
  const merc = new SphericalMercator({});

  // w s e n
  const bbox = merc.bbox(Number(x), Number(y.split(".png")[0]), Number(zoom));

  // Use DatabaseService to get features
  const dbService = new DatabaseService();
  const features = await dbService.getFeaturesWithinBox({ 
    zoom: Number(zoom), 
    bbox 
  });

  const pngBuffer = await drawFeatures(Number(zoom), bbox, features);

  const headers = new Headers();
  headers.set("Content-Type", "image/png");
  return new Response(pngBuffer, { headers });
}