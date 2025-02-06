import { Document } from "mongodb";
import clientPromise from "./mongodb";

const dbName = process.env.MONGODB_DATABASE_NAME!;
const collectionName = process.env.MONGODB_COLLECTION_NAME!;

const MAX_ZOOM = 16;
const MIN_ZOOM = 1;

const getResolutionFilter = (currentZoom: number): number => {
  // Clamp currentZoom between minZoom and maxZoom
  currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, currentZoom));

  return Math.pow(2, MAX_ZOOM - currentZoom);
};

export const getFeaturesWithinBox = async (opts: {
  zoom: number;
  bbox: [number, number, number, number];
}): Promise<Array<{ ppe: number; loc: { coordinates: [number, number] } }>> => {
  const collection = await clientPromise.then((client) =>
    client.db(dbName).collection(collectionName)
  );

  const { bbox, zoom } = opts;

  const resolutionFilterValue = getResolutionFilter(zoom);
  const resolutionFilter: Document = {};

  if (resolutionFilterValue > 1) {
    resolutionFilter["$expr"] = {
      $eq: [{ $mod: ["$aggregateId", resolutionFilterValue] }, 0],
    };
  }

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
};
