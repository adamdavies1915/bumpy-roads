import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI; // your mongodb connection string

declare global {
  let _mongoClientPromise: Promise<MongoClient>;
}

class Singleton {
  private static _instance: Singleton;
  private client: MongoClient;
  private clientPromise: Promise<MongoClient>;
  private constructor() {
    if (!uri) {
      throw "Missing MONGODB_URI from envrionment";
    }

    this.client = new MongoClient(uri);
    this.clientPromise = this.client.connect();
  }

  public static get instance() {
    if (!this._instance) {
      this._instance = new Singleton();
    }
    return this._instance.clientPromise;
  }
}
const clientPromise = Singleton.instance;

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;
