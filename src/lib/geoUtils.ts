/**
 * Utility functions for processing and validating geographic features
 */

// Constants for validation
export const GEO_CONSTANTS = {
    MIN_LONGITUDE: -180,
    MAX_LONGITUDE: 180,
    MIN_LATITUDE: -90,
    MAX_LATITUDE: 90,
    MIN_PPE: 0,
    MAX_PPE: 10
  };
  
  /**
   * Check if coordinates are within valid range
   */
  export function isValidCoordinates(
    lon: number, 
    lat: number
  ): boolean {
    return (
      lon >= GEO_CONSTANTS.MIN_LONGITUDE &&
      lon <= GEO_CONSTANTS.MAX_LONGITUDE &&
      lat >= GEO_CONSTANTS.MIN_LATITUDE &&
      lat <= GEO_CONSTANTS.MAX_LATITUDE
    );
  }
  
  /**
   * Check if PPE (Points Per Error) value is within valid range
   */
  export function isValidPPE(ppe: number): boolean {
    return (
      ppe >= GEO_CONSTANTS.MIN_PPE &&
      ppe <= GEO_CONSTANTS.MAX_PPE
    );
  }
  
  /**
   * Generate a deterministic aggregateId based on coordinates
   * This ensures that nearby points have similar IDs for efficient filtering
   */
  export function generateAggregateId(
    lon: number, 
    lat: number,
    seed = 1000000
  ): number {
    // Normalize coordinates to positive values in range [0,1]
    const normalizedLon = (lon - GEO_CONSTANTS.MIN_LONGITUDE) / 
      (GEO_CONSTANTS.MAX_LONGITUDE - GEO_CONSTANTS.MIN_LONGITUDE);
    
    const normalizedLat = (lat - GEO_CONSTANTS.MIN_LATITUDE) / 
      (GEO_CONSTANTS.MAX_LATITUDE - GEO_CONSTANTS.MIN_LATITUDE);
    
    // Simple hash function: combine normalized coordinates
    // and multiply by seed to get an integer
    return Math.floor((normalizedLon * 31 + normalizedLat * 17) * seed);
  }
  
  /**
   * Calculate distance between two points in kilometers
   * using the Haversine formula
   */
  export function getDistanceInKm(
    lon1: number, 
    lat1: number, 
    lon2: number, 
    lat2: number
  ): number {
    const R = 6371; // Earth radius in kilometers
    
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
  
  /**
   * Create a bounding box around a point with a given radius in kilometers
   * Returns [west, south, east, north] coordinates
   */
  export function createBoundingBoxKm(
    lon: number, 
    lat: number, 
    radiusKm: number
  ): [number, number, number, number] {
    // Approximate degrees per kilometer
    const latDegPerKm = 1 / 110.574;
    const lonDegPerKm = 1 / (111.320 * Math.cos(lat * Math.PI / 180));
    
    const latDiff = radiusKm * latDegPerKm;
    const lonDiff = radiusKm * lonDegPerKm;
    
    return [
      Math.max(GEO_CONSTANTS.MIN_LONGITUDE, lon - lonDiff), // west
      Math.max(GEO_CONSTANTS.MIN_LATITUDE, lat - latDiff),  // south
      Math.min(GEO_CONSTANTS.MAX_LONGITUDE, lon + lonDiff), // east
      Math.min(GEO_CONSTANTS.MAX_LATITUDE, lat + latDiff)   // north
    ];
  }