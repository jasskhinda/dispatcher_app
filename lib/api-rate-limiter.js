'use client';

/**
 * API Rate Limiting Utility
 * 
 * Prevents excessive API calls to Google Maps services
 * by tracking and limiting requests within time periods.
 */

// Track API calls by timestamp
const apiCallTracker = {
  geocode: [],
  directions: [],
  places: [],
  distanceMatrix: []
};

// Rate limits per service (calls per minute)
const RATE_LIMITS = {
  geocode: 50,     // Geocoding API
  directions: 50,  // Directions API
  places: 100,     // Places API
  distanceMatrix: 50 // Distance Matrix API
};

// Time window for rate limiting (1 minute in ms)
const TIME_WINDOW = 60 * 1000;

/**
 * Check if a call to a specific API should be allowed
 * based on rate limiting
 * 
 * @param {string} apiType - The type of API ('geocode', 'directions', 'places', 'distanceMatrix')
 * @returns {boolean} - Whether the call should be allowed
 */
export function canMakeApiCall(apiType) {
  if (!apiCallTracker[apiType]) {
    console.warn(`Unknown API type: ${apiType}`);
    return true;
  }
  
  const now = Date.now();
  
  // Remove calls older than the time window
  apiCallTracker[apiType] = apiCallTracker[apiType].filter(
    timestamp => now - timestamp < TIME_WINDOW
  );
  
  // Check if we're under the rate limit
  return apiCallTracker[apiType].length < RATE_LIMITS[apiType];
}

/**
 * Record an API call
 * 
 * @param {string} apiType - The type of API ('geocode', 'directions', 'places', 'distanceMatrix')
 */
export function recordApiCall(apiType) {
  if (!apiCallTracker[apiType]) {
    console.warn(`Unknown API type: ${apiType}`);
    return;
  }
  
  apiCallTracker[apiType].push(Date.now());
}

/**
 * Get current API usage statistics
 * 
 * @returns {Object} - API usage stats
 */
export function getApiUsageStats() {
  const now = Date.now();
  const stats = {};
  
  Object.keys(apiCallTracker).forEach(apiType => {
    // Clean up old entries
    apiCallTracker[apiType] = apiCallTracker[apiType].filter(
      timestamp => now - timestamp < TIME_WINDOW
    );
    
    // Calculate usage
    const limit = RATE_LIMITS[apiType];
    const count = apiCallTracker[apiType].length;
    
    stats[apiType] = {
      current: count,
      limit: limit,
      available: limit - count,
      percentUsed: Math.round((count / limit) * 100)
    };
  });
  
  return stats;
}

/**
 * Wrapper function to make an API call with rate limiting
 * 
 * @param {string} apiType - The type of API
 * @param {Function} apiFn - The function to call
 * @param {...any} args - Arguments to pass to the function
 * @returns {Promise<any>} - Result of the API call
 */
export async function callWithRateLimit(apiType, apiFn, ...args) {
  if (!canMakeApiCall(apiType)) {
    throw new Error(`Rate limit exceeded for ${apiType} API`);
  }
  
  recordApiCall(apiType);
  return apiFn(...args);
}

export default {
  canMakeApiCall,
  recordApiCall,
  getApiUsageStats,
  callWithRateLimit
};
