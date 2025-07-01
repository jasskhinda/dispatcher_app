'use client';

/**
 * Route Cache utility for efficient route lookups
 * 
 * Caches route information by origin-destination pair to reduce
 * API calls for frequently used routes.
 */

// In-memory cache storage - could be replaced with localStorage
// for persistence across page loads
const routeCache = new Map();

// Cache expiration time (24 hours in milliseconds)
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000; 

/**
 * Generates a cache key from origin and destination
 */
const getCacheKey = (origin, destination) => {
  return `${origin}|${destination}`.toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * Add a route to the cache
 */
export function cacheRoute(origin, destination, routeData) {
  const key = getCacheKey(origin, destination);
  
  routeCache.set(key, {
    timestamp: Date.now(),
    data: routeData
  });
  
  // Also cache the reverse route with the same data but flipped
  // addresses to support round trips
  if (routeData) {
    const reverseData = {
      ...routeData,
      startAddress: routeData.endAddress,
      endAddress: routeData.startAddress
    };
    
    routeCache.set(getCacheKey(destination, origin), {
      timestamp: Date.now(),
      data: reverseData
    });
  }
  
  return routeData;
}

/**
 * Get a cached route if available and not expired
 */
export function getCachedRoute(origin, destination) {
  const key = getCacheKey(origin, destination);
  const cachedValue = routeCache.get(key);
  
  // Return null if no cache entry or entry is expired
  if (!cachedValue || Date.now() - cachedValue.timestamp > CACHE_EXPIRATION) {
    return null;
  }
  
  return cachedValue.data;
}

/**
 * Clear all cached routes or a specific route
 */
export function clearRouteCache(origin = null, destination = null) {
  if (origin && destination) {
    // Clear specific route
    const key = getCacheKey(origin, destination);
    routeCache.delete(key);
  } else {
    // Clear all routes
    routeCache.clear();
  }
}

/**
 * Get route with caching
 * 
 * First checks cache, then falls back to fetching from Google Maps
 */
export async function getRouteWithCache(origin, destination, fetchFn) {
  // Try to get from cache first
  const cachedRoute = getCachedRoute(origin, destination);
  if (cachedRoute) {
    console.log('Using cached route data for', origin, 'to', destination);
    return cachedRoute;
  }
  
  // Cache miss - fetch from source
  try {
    const freshRouteData = await fetchFn(origin, destination);
    // Store in cache
    cacheRoute(origin, destination, freshRouteData);
    return freshRouteData;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
}

export default {
  getCachedRoute,
  cacheRoute,
  clearRouteCache,
  getRouteWithCache
};
