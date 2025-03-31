# Bumpy Roads - Street Quality Map

This is a [Next.js](https://nextjs.org) project that visualizes street quality data using interactive maps with custom tile rendering.

## Features

- Interactive map interface using Leaflet
- Custom map tile generation based on street quality data
- MongoDB integration for storing and querying geographic data
- Color-coded visualization of street quality (PPE - Points Per Error)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local installation or MongoDB Atlas)

### Setup

1. Clone the repository:

```bash
git clone https://github.com/yourusername/bumpy-roads.git
cd bumpy-roads
```

2. Install the dependencies:

```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE_NAME=street_quality_map
MONGODB_COLLECTION_NAME=features
```

4. Initialize the database with sample data:

```bash
npm run initDb
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the map.

## API Endpoints

### Map Tiles

`GET /api/tiles/[zoom]/[x]/[y]`

Generates PNG map tiles for the specified coordinates and zoom level.

- `zoom`: Zoom level (1-16)
- `x`: X coordinate of the tile
- `y`: Y coordinate of the tile (with .png extension)

Example: `/api/tiles/12/1205/1539.png`

## Testing

The project includes a comprehensive test suite for API routes and database functionality:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Project Structure

- `/app` - Next.js application pages and API routes
- `/lib` - Utility functions and database access
  - `/lib/db` - MongoDB connection and query functions
  - `/lib/drawFeatures.ts` - Tile rendering logic
- `/public` - Static assets
- `/__tests__` - Test files

## Technologies Used

- Next.js 15 with App Router
- React 19
- TypeScript
- MongoDB
- Leaflet for map rendering
- Canvas for tile generation
- Jest for testing

## Data Format

The application uses MongoDB to store geographic data points with the following structure:

```typescript
type Feature = {
  ppe: number;          // Points Per Error (street quality metric)
  loc: {
    type: "Point";
    coordinates: [number, number];  // [longitude, latitude]
  };
  aggregateId: number;  // Used for resolution filtering at different zoom levels
};
```

Each feature represents a data point on the map, with a PPE value that indicates street quality. These points are rendered as colored circles on the map tiles, with colors ranging from green (good quality) to red (poor quality).

## License

[MIT](LICENSE)