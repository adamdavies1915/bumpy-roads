/* eslint-disable @typescript-eslint/no-require-imports */
// initDb.js
require("dotenv").config();
const { MongoClient } = require("mongodb");

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE_NAME;
const collectionName = process.env.MONGODB_COLLECTION_NAME;

async function initDatabase() {
  if (!uri || !dbName || !collectionName) {
    console.error("Missing required environment variables");
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    // Connect to the MongoDB server
    await client.connect();
    console.log("Connected to MongoDB");

    // Get reference to the database
    const db = client.db(dbName);

    // Create collection if it doesn't exist
    const collections = await db
      .listCollections({ name: collectionName })
      .toArray();
    if (collections.length === 0) {
      await db.createCollection(collectionName);
      console.log(`Created collection: ${collectionName}`);
    }

    // Get reference to the collection
    const collection = db.collection(collectionName);

    // Create index for geospatial queries
    await collection.createIndex({ loc: "2dsphere" });
    console.log("Created 2dsphere index on loc field");

    // Sample data - generate points around the world with various PPE values
    const sampleData = [];

    // Generate some random points
    for (let i = 0; i < 1000; i++) {
      const lon = -180 + Math.random() * 360; // Random longitude between -180 and 180
      const lat = -85 + Math.random() * 170; // Random latitude between -85 and 85
      const ppe = Math.random() * 5; // Random PPE value between 0 and 5

      sampleData.push({
        aggregateId: i, // For resolution filtering
        ppe: ppe,
        loc: {
          type: "Point",
          coordinates: [lon, lat],
        },
      });
    }

    // Add more concentrated points in a specific area (e.g., New York City area)
    const nycLon = -74.006;
    const nycLat = 40.7128;

    for (let i = 0; i < 200; i++) {
      const lon = nycLon - 0.1 + Math.random() * 0.2; // Points around NYC
      const lat = nycLat - 0.1 + Math.random() * 0.2;
      const ppe = Math.random() * 5;

      sampleData.push({
        aggregateId: 1000 + i,
        ppe: ppe,
        loc: {
          type: "Point",
          coordinates: [lon, lat],
        },
      });
    }

    // Insert the data
    if (sampleData.length > 0) {
      await collection.insertMany(sampleData);
      console.log(
        `Inserted ${sampleData.length} documents into ${collectionName}`,
      );
    }

    console.log("Database initialization completed");
  } catch (err) {
    console.error("Error initializing database:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed");
  }
}

// Run the initialization
initDatabase();
