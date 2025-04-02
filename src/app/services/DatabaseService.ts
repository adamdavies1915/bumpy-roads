import clientPromise from "@/lib/db/mongodb";
import { generateAggregateId } from "@/lib/geoUtils";
import { Collection, InsertOneResult } from "mongodb";


type FeatureData = {
  ppe: number;
  loc: {
    type: "Point";
    coordinates: [number, number];
  };
  timestamp?: number;
  deviceId?: string;
  userId?: string;
  additionalData?: Record<string, unknown>;
  aggregateId?: number;
};

export class DatabaseService {
  private dbName: string;
  private collectionName: string;
  
  constructor() {
    this.dbName = process.env.MONGODB_DATABASE_NAME!;
    this.collectionName = process.env.MONGODB_COLLECTION_NAME!;
  }
  
  /**
   * Gets a reference to the MongoDB collection
   */
  private async getCollection(): Promise<Collection<Document>> {
    const client = await clientPromise;
    return client.db(this.dbName).collection(this.collectionName);
  }
  
  /**
   * Adds a feature to the database
   * 
   * @param featureData The validated feature data to insert
   * @returns Result of the insert operation
   */
  public async addFeature(featureData: FeatureData): Promise<InsertOneResult<Document>> {
    // Add timestamp if not provided
    if (!featureData.timestamp) {
      featureData.timestamp = Date.now();
    }
    
    // Generate aggregateId based on coordinates for resolution filtering
    const [lon, lat] = featureData.loc.coordinates;
    featureData.aggregateId = generateAggregateId(lon, lat);
    
    // Get collection reference
    const collection = await this.getCollection();
    
    // Insert feature and return result
    return await collection.insertOne(featureData);
  }
  
  /**
   * Gets features within a geographic bounding box
   * 
   * @param opts Options containing zoom level and bounding box
   * @returns Array of features within the box
   */
  public async getFeaturesWithinBox(opts: {
    zoom: number;
    bbox: [number, number, number, number];
  }): Promise<Array<{ ppe: number; loc: { coordinates: [number, number] } }>> {
    const collection = await this.getCollection();
    
    const { bbox, zoom } = opts;
    
    // Apply resolution filtering based on zoom level
    const resolutionFilterValue = this.getResolutionFilter(zoom);
    const resolutionFilter: Document = {};
    
    if (resolutionFilterValue > 1) {
      resolutionFilter["$expr"] = {
        $eq: [{ $mod: ["$aggregateId", resolutionFilterValue] }, 0],
      };
    }
    
    // Perform geo query
    return await collection
      .find({
        ...resolutionFilter,
        loc: {
          $geoWithin: {
            $geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [bbox[0], bbox[1]], // Bottom-left corner
                  [bbox[2], bbox[1]], // Bottom-right corner
                  [bbox[2], bbox[3]], // Top-right corner
                  [bbox[0], bbox[3]], // Top-left corner
                  [bbox[0], bbox[1]], // Closing the polygon (same as first point)
                ],
              ],
            },
          },
        },
      })
      .project({ ppe: 1, loc: 1 })
      .toArray()
      .then((docs) => docs.map((doc) => ({ ppe: doc.ppe, loc: doc.loc })));
  }
  
  /**
   * Calculates resolution filter value based on zoom level
   * Used to reduce the number of points returned at lower zoom levels
   * 
   * @param currentZoom Zoom level to filter for
   * @returns Resolution filter value
   */
  private getResolutionFilter(currentZoom: number): number {
    const MAX_ZOOM = 16;
    const MIN_ZOOM = 1;
    
    // Clamp currentZoom between minZoom and maxZoom
    currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom));
    
    return Math.pow(2, MAX_ZOOM - currentZoom);
  }
}