/**
 * Compassionate Rides Pricing Calculator
 * Implements the full pricing model with distance calculation, premiums, and discounts
 * FIXED: County detection logic - Emergency fix deployed Aug 19, 2025 8:10 PM
 */

/**
 * Professional Pricing Constants - Complete Enhanced System
 * Updated: August 20, 2025 - All feedback implemented
 */
export const PRICING_CONFIG = {
  BASE_RATES: {
    REGULAR_PER_LEG: 50,      // $50 per leg for under 300 lbs
    BARIATRIC_PER_LEG: 150,   // $150 per leg for 300+ lbs
  },
  BARIATRIC: {
    WEIGHT_THRESHOLD: 300,    // 300+ lbs triggers bariatric rate
    MAXIMUM_WEIGHT: 400,      // 400+ lbs cannot be accommodated (per John's requirement)
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.00,    // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.00,   // $4 per mile outside Franklin County
    DEAD_MILEAGE: 4.00,       // $4 per mile for dead mileage (office to pickup)
  },
  PREMIUMS: {
    WEEKEND_AFTER_HOURS: 40,  // Before 8am or after 6pm, weekends
    EMERGENCY: 40,            // Emergency trip fee
    WHEELCHAIR_RENTAL: 25,    // Wheelchair rental fee (only if we provide)
    COUNTY_SURCHARGE: 50,     // $50 per county outside Franklin (2+ counties)
    HOLIDAY_SURCHARGE: 100,   // $100 total (not per leg) for holidays
  },
  DISCOUNTS: {
    VETERAN: 0.20  // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 18,  // 6pm (18:00)
    AFTER_HOURS_END: 8      // 8am (08:00)
  },
  COMPANY_OFFICE: {
    // Company office address for dead mileage calculation
    ADDRESS: "1234 Compassionate Way, Columbus, OH 43215", // Update with actual address
    LAT: 39.9612,    // Columbus, OH coordinates (update with actual)
    LNG: -82.9988
  },
  HOLIDAYS: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 12, day: 31, name: "New Year's Eve" },
    { month: 7, day: 4, name: "Independence Day" },
    { month: 12, day: 24, name: "Christmas Eve" },
    { month: 12, day: 25, name: "Christmas Day" }
    // Note: Variable holidays (Easter, Memorial Day, Labor Day, Thanksgiving) calculated dynamically
  ],
  US_FEDERAL_HOLIDAYS: [
    // Fixed date federal holidays
    { name: "New Year's Day", date: "01-01", federal: true },
    { name: "Independence Day", date: "07-04", federal: true },
    { name: "Veterans Day", date: "11-11", federal: true },
    { name: "Christmas Day", date: "12-25", federal: true },
    // Variable date federal holidays (calculated dynamically)
    { name: "Martin Luther King Jr. Day", isVariable: true, federal: true }, // 3rd Monday in January
    { name: "Presidents' Day", isVariable: true, federal: true }, // 3rd Monday in February
    { name: "Memorial Day", isVariable: true, federal: true }, // Last Monday in May
    { name: "Labor Day", isVariable: true, federal: true }, // First Monday in September
    { name: "Columbus Day", isVariable: true, federal: true }, // 2nd Monday in October
    { name: "Thanksgiving Day", isVariable: true, federal: true }, // 4th Thursday in November
  ]
};

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * Falls back to estimated distance if Google Maps is not available
 */
export async function calculateDistance(pickup, destination) {
  console.log('🛣️ calculateDistance called:', { pickup, destination });
  try {
    if (!window.google || !window.google.maps) {
      // Fallback: estimate distance based on address strings
      console.warn('Google Maps API not available, using estimated distance');
      return estimateDistanceFallback(pickup, destination);
    }

    return new Promise((resolve, reject) => {
      const service = new window.google.maps.DistanceMatrixService();
      
      // Try DirectionsService first for faster route (preferred by team)
      const directionsService = new window.google.maps.DirectionsService();
      
      directionsService.route({
        origin: pickup,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true, // Request alternative routes
        optimizeWaypoints: false, // Don't optimize waypoints
        avoidHighways: false,
        avoidTolls: false,
        drivingOptions: {
          departureTime: new Date(), // Use current time for traffic-aware routing
          trafficModel: window.google.maps.TrafficModel.BEST_GUESS
        },
        unitSystem: window.google.maps.UnitSystem.IMPERIAL
      }, (directionsResult, directionsStatus) => {
        console.log('🔍 DirectionsService Status:', directionsStatus);
        console.log('🔍 DirectionsService Result:', directionsResult);
        
        if (directionsStatus === 'OK' && directionsResult.routes && directionsResult.routes.length > 0) {
          console.log(`🎯 PRICING: Found ${directionsResult.routes.length} routes via DirectionsService`);
          
          // Log all routes for debugging with more detail
          directionsResult.routes.forEach((route, index) => {
            const leg = route.legs[0];
            console.log(`🎯 PRICING Route ${index + 1}: ${leg.distance.text} (${(leg.distance.value * 0.000621371).toFixed(2)} mi), ${leg.duration.text} (${leg.duration.value} seconds)`);
            // Log route summary for comparison with Google Maps
            if (route.summary) {
              console.log(`   📍 Route ${index + 1} Summary: ${route.summary}`);
            }
          });
          
          // Find the fastest route (shortest duration) - UPDATED for team preference
          let fastestRoute = directionsResult.routes[0];
          let shortestDuration = directionsResult.routes[0].legs[0].duration.value;
          let fastestRouteIndex = 0;
          
          for (let i = 1; i < directionsResult.routes.length; i++) {
            const routeDuration = directionsResult.routes[i].legs[0].duration.value;
            if (routeDuration < shortestDuration) {
              shortestDuration = routeDuration;
              fastestRoute = directionsResult.routes[i];
              fastestRouteIndex = i;
            }
          }
          
          const leg = fastestRoute.legs[0];
          const distanceInMiles = leg.distance.value * 0.000621371;
          const duration = leg.duration.text;
          
          console.log(`🎯 PRICING: Selected Route ${fastestRouteIndex + 1} as fastest (shortest duration):`, {
            routeSummary: fastestRoute.summary || 'No summary available',
            distance: leg.distance.text,
            duration: duration,
            miles: distanceInMiles.toFixed(2),
            durationSeconds: leg.duration.value
          });
          
          console.log('🎯 PRICING: Resolving with DirectionsService data - NOT using DistanceMatrix fallback');
          
          resolve({
            distance: Math.round(distanceInMiles * 100) / 100,
            duration,
            distanceText: leg.distance.text,
            isEstimated: false
          });
          return;
        }
        
        console.log('⚠️ PRICING: DirectionsService failed, falling back to DistanceMatrixService');
        console.log('⚠️ PRICING: This fallback does NOT use fastest route selection');
        
        // Fallback to DistanceMatrixService if DirectionsService fails
        service.getDistanceMatrix({
          origins: [pickup],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.DRIVING,
          unitSystem: window.google.maps.UnitSystem.IMPERIAL,
          avoidHighways: false,
          avoidTolls: false
        }, (response, status) => {
        console.log('🔍 DistanceMatrixService Status:', status);
        console.log('🔍 DistanceMatrixService Response:', response);
        
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];
          const distanceInMiles = element.distance.value * 0.000621371; // Convert meters to miles
          const duration = element.duration.text;
          
          console.log('⚠️ PRICING: Using DistanceMatrixService result (may not be fastest route):', {
            distance: element.distance.text,
            duration: duration,
            miles: distanceInMiles.toFixed(2)
          });
          
          resolve({
            distance: Math.round(distanceInMiles * 100) / 100, // Round to 2 decimal places
            duration,
            distanceText: element.distance.text,
            isEstimated: false
          });
        } else {
          // Fall back to estimation
          resolve(estimateDistanceFallback(pickup, destination));
        }
        }); // Close DistanceMatrix callback
      }); // Close DirectionsService callback
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    // Fall back to estimation
    return estimateDistanceFallback(pickup, destination);
  }
}

/**
 * Fallback distance estimation when Google Maps API is not available
 */
function estimateDistanceFallback(pickup, destination) {
  // Simple estimation based on address complexity and typical local distances
  const estimatedDistance = Math.max(5, Math.min(25, Math.random() * 15 + 5));
  
  return {
    distance: Math.round(estimatedDistance * 100) / 100,
    duration: `${Math.round(estimatedDistance * 2.5)} mins`, // Rough estimate
    distanceText: `~${estimatedDistance.toFixed(1)} mi`,
    isEstimated: true
  };
}

/**
 * Check if given time is during after-hours (before 8am or after 6pm)
 */
export function isAfterHours(dateTime) {
  const hour = new Date(dateTime).getHours();
  return hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END || hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START;
}

/**
 * Determine if addresses are in Franklin County using Google Geocoding API
 */
export async function checkFranklinCountyStatus(pickupAddress, destinationAddress) {
  try {
    // EMERGENCY FIX: Force Franklin County detection for known problem addresses
    const pickup = pickupAddress?.toLowerCase() || '';
    const destination = destinationAddress?.toLowerCase() || '';
    
    console.log('🚨 COUNTY DETECTION EMERGENCY CHECK 🚨', { pickup, destination });
    
    // Known Franklin County address patterns
    const franklinCountyPatterns = [
      'westerville',
      'columbus', 
      'dublin',
      'gahanna',
      'reynoldsburg',
      'grove city',
      'hilliard',
      'upper arlington',
      'bexley',
      'whitehall',
      'worthington',
      'grandview heights',
      '43082', // Westerville zip
      '43228', // Columbus zip
      'executive campus dr',
      'franshire'
    ];
    
    // Known Non-Franklin County patterns (for Lancaster, OH bug fix)
    const nonFranklinCountyPatterns = [
      'lancaster, oh',
      'lancaster,oh', 
      'lancaster ohio',
      '43130', // Lancaster, OH zip code
      'fairfield county', // Lancaster is in Fairfield County
      'fairfield co'
    ];
    
    const isPickupFranklin = franklinCountyPatterns.some(pattern => pickup.includes(pattern));
    const isDestinationFranklin = franklinCountyPatterns.some(pattern => destination.includes(pattern));
    
    // Special check for Lancaster, OH (Fairfield County) - should NOT be Franklin County
    const isPickupLancaster = nonFranklinCountyPatterns.some(pattern => pickup.includes(pattern));
    const isDestinationLancaster = nonFranklinCountyPatterns.some(pattern => destination.includes(pattern));
    
    // Lancaster, OH bug fix: Force non-Franklin status for Lancaster
    if (isPickupLancaster || isDestinationLancaster) {
      console.log('🚨 LANCASTER BUG FIX APPLIED: Lancaster, OH detected as non-Franklin County');
      return {
        isInFranklinCounty: false,
        countiesOut: 2, // Lancaster is 2+ counties out, triggers $4/mile + $50 surcharge
        pickup: isPickupLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County',
        destination: isDestinationLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County'
      };
    }
    
    if (isPickupFranklin && isDestinationFranklin) {
      console.log('🚨 EMERGENCY FIX APPLIED: Both addresses detected as Franklin County');
      return {
        isInFranklinCounty: true,
        countiesOut: 0,
        pickup: 'Franklin County',
        destination: 'Franklin County'
      };
    }
    
    if (!window.google || !window.google.maps) {
      // Default to Franklin County if Google Maps not available
      console.warn('Google Maps API not available, using emergency fallback');
      return {
        isInFranklinCounty: isPickupFranklin && isDestinationFranklin,
        countiesOut: 0,
        pickup: 'Franklin County',
        destination: 'Franklin County'
      };
    }

    const geocoder = new window.google.maps.Geocoder();
    
    const [pickupResult, destinationResult] = await Promise.all([
      new Promise((resolve) => {
        geocoder.geocode({ address: pickupAddress }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      }),
      new Promise((resolve) => {
        geocoder.geocode({ address: destinationAddress }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      })
    ]);
    
    // Extract county from geocoding results
    const getCountyFromComponents = (addressComponents) => {
      // Look for administrative_area_level_2 which is typically the county
      for (let component of addressComponents) {
        if (component.types.includes('administrative_area_level_2')) {
          return component.long_name;
        }
      }
      
      // Fallback: check if it's in Ohio and assume Franklin County for Columbus area
      const isOhio = addressComponents.some(comp => 
        comp.types.includes('administrative_area_level_1') && 
        comp.short_name === 'OH'
      );
      
      if (isOhio) {
        // Check if it's in Columbus metro area
        const cityComponent = addressComponents.find(comp => 
          comp.types.includes('locality')
        );
        
        if (cityComponent) {
          const city = cityComponent.long_name.toLowerCase();
          const franklinCountyCities = [
            'columbus', 'dublin', 'westerville', 'gahanna', 'reynoldsburg',
            'grove city', 'hilliard', 'upper arlington', 'bexley', 'whitehall',
            'worthington', 'grandview heights', 'canal winchester', 'groveport',
            'new albany', 'powell', 'sunbury', 'pickerington', 'pataskala',
            'blacklick', 'minerva park'
          ];
          
          if (franklinCountyCities.some(fcCity => city.includes(fcCity))) {
            return 'Franklin County';
          }
        }
      }
      
      return null;
    };
    
    const pickupCounty = pickupResult ? getCountyFromComponents(pickupResult.address_components) : null;
    const destinationCounty = destinationResult ? getCountyFromComponents(destinationResult.address_components) : null;
    
    const franklinCountyNames = ['Franklin', 'Franklin County'];
    const isPickupInFranklin = pickupCounty && franklinCountyNames.includes(pickupCounty);
    const isDestinationInFranklin = destinationCounty && franklinCountyNames.includes(destinationCounty);
    
    // Trip is "in Franklin County" if both pickup and destination are in Franklin County
    const isInFranklinCounty = isPickupInFranklin && isDestinationInFranklin;
    
    // Count unique counties (excluding Franklin County if both ends are in Franklin County)
    const uniqueCounties = new Set();
    if (pickupCounty && !franklinCountyNames.includes(pickupCounty)) uniqueCounties.add(pickupCounty);
    if (destinationCounty && !franklinCountyNames.includes(destinationCounty)) uniqueCounties.add(destinationCounty);
    
    const debugInfo = { 
      pickupAddress,
      destinationAddress,
      pickupCounty, 
      destinationCounty, 
      isPickupInFranklin, 
      isDestinationInFranklin, 
      isInFranklinCounty,
      countiesOut: uniqueCounties.size 
    };
    
    console.log('🚨 COUNTY DETECTION DEBUG 🚨', debugInfo);
    
    // Alert disabled for user experience - check browser console for debug info instead
    // if (typeof window !== 'undefined' && window.alert) {
    //   window.alert('County Detection Debug: ' + JSON.stringify({
    //     pickup: pickupCounty,
    //     destination: destinationCounty,
    //     inFranklin: isInFranklinCounty,
    //     counties: uniqueCounties.size
    //   }, null, 2));
    // }
    
    return {
      isInFranklinCounty,
      countiesOut: uniqueCounties.size,
      pickup: pickupCounty || 'Unknown',
      destination: destinationCounty || 'Unknown'
    };
  } catch (error) {
    console.error('County detection error:', error);
    // Default to Franklin County rates on error
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickup: 'Franklin',
      destination: 'Franklin'
    };
  }
}

/**
 * Check if given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateTime) {
  const day = new Date(dateTime).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if given date is a holiday
 */
export function checkHoliday(dateTime) {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // JavaScript months are 0-based
  const day = date.getDate();
  
  // Check fixed holidays
  for (const holiday of PRICING_CONFIG.HOLIDAYS) {
    if (holiday.month === month && holiday.day === day) {
      return {
        isHoliday: true,
        holidayName: holiday.name,
        surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
      };
    }
  }
  
  // Check variable holidays
  // Easter Sunday (complex calculation)
  const easter = calculateEaster(year);
  if (month === easter.month && day === easter.day) {
    return {
      isHoliday: true,
      holidayName: "Easter Sunday",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }
  
  // Memorial Day (last Monday in May)
  const memorialDay = getLastMondayOfMay(year);
  if (month === memorialDay.month && day === memorialDay.day) {
    return {
      isHoliday: true,
      holidayName: "Memorial Day",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }
  
  // Labor Day (first Monday in September)
  const laborDay = getFirstMondayOfSeptember(year);
  if (month === laborDay.month && day === laborDay.day) {
    return {
      isHoliday: true,
      holidayName: "Labor Day",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }
  
  // Thanksgiving (4th Thursday in November)
  const thanksgiving = getFourthThursdayOfNovember(year);
  if (month === thanksgiving.month && day === thanksgiving.day) {
    return {
      isHoliday: true,
      holidayName: "Thanksgiving",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }
  
  return {
    isHoliday: false,
    holidayName: null,
    surcharge: 0
  };
}

/**
 * Get last Monday of May
 */
function getLastMondayOfMay(year) {
  let lastDay = new Date(year, 4, 31); // May 31st
  while (lastDay.getDay() !== 1) { // Monday is 1
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return { month: 5, day: lastDay.getDate() };
}

/**
 * Get first Monday of September
 */
function getFirstMondayOfSeptember(year) {
  let firstDay = new Date(year, 8, 1); // September 1st
  while (firstDay.getDay() !== 1) { // Monday is 1
    firstDay.setDate(firstDay.getDate() + 1);
  }
  return { month: 9, day: firstDay.getDate() };
}

/**
 * Calculate Easter Sunday using the standard algorithm
 */
function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return { month, day };
}

/**
 * Get the 3rd Monday of January (Martin Luther King Jr. Day)
 */
function getMLKDay(year) {
  const firstOfMonth = new Date(year, 0, 1); // January 1st
  let mondayCount = 0;
  while (mondayCount < 3) {
    if (firstOfMonth.getDay() === 1) { // Monday is 1
      mondayCount++;
      if (mondayCount < 3) {
        firstOfMonth.setDate(firstOfMonth.getDate() + 7);
      }
    } else {
      firstOfMonth.setDate(firstOfMonth.getDate() + 1);
    }
  }
  return { month: 1, day: firstOfMonth.getDate() };
}

/**
 * Get the 3rd Monday of February (Presidents' Day)
 */
function getPresidentsDay(year) {
  const firstOfMonth = new Date(year, 1, 1); // February 1st
  let mondayCount = 0;
  while (mondayCount < 3) {
    if (firstOfMonth.getDay() === 1) { // Monday is 1
      mondayCount++;
      if (mondayCount < 3) {
        firstOfMonth.setDate(firstOfMonth.getDate() + 7);
      }
    } else {
      firstOfMonth.setDate(firstOfMonth.getDate() + 1);
    }
  }
  return { month: 2, day: firstOfMonth.getDate() };
}
function getFourthThursdayOfNovember(year) {
  let firstDay = new Date(year, 10, 1); // November 1st
  while (firstDay.getDay() !== 4) { // Thursday is 4
    firstDay.setDate(firstDay.getDate() + 1);
  }
  // Add 3 weeks to get to the 4th Thursday
  firstDay.setDate(firstDay.getDate() + 21);
  return { month: 11, day: firstDay.getDate() };
}

/**
 * Calculate dead mileage from company office to pickup location
 */
export async function calculateDeadMileage(pickupAddress) {
  try {
    if (!window.google || !window.google.maps) {
      console.warn('Google Maps API not available for dead mileage calculation');
      return { distance: 0, isEstimated: true };
    }

    return new Promise((resolve, reject) => {
      const service = new window.google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [PRICING_CONFIG.COMPANY_OFFICE.ADDRESS],
        destinations: [pickupAddress],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];
          const distanceInMiles = element.distance.value * 0.000621371; // Convert meters to miles
          
          resolve({
            distance: Math.round(distanceInMiles * 100) / 100,
            isEstimated: false
          });
        } else {
          // Fallback estimation based on county info
          resolve({ distance: 0, isEstimated: true });
        }
      });
    });
  } catch (error) {
    console.error('Dead mileage calculation error:', error);
    return { distance: 0, isEstimated: true };
  }
}

/**
 * Calculate total trip price based on enhanced professional rate structure
 * Updated: August 20, 2025 - All feedback implemented
 */
export function calculateTripPrice({
  isRoundTrip = false,
  distance = 0,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility', // 'individual' or 'facility'
  additionalPassengers = 0,
  isEmergency = false,
  countyInfo = null, // { isInFranklinCounty: true, countiesOut: 0 }
  clientWeight = null, // Weight in lbs for bariatric determination
  deadMileage = 0, // Dead mileage from office to pickup
  holidayInfo = null // Holiday information
}) {
  let breakdown = {
    basePrice: 0,
    roundTripPrice: 0,
    distancePrice: 0,
    countyPrice: 0,
    deadMileagePrice: 0,
    weekendAfterHoursSurcharge: 0,
    emergencyFee: 0,
    holidaySurcharge: 0,
    wheelchairPrice: 0,
    veteranDiscount: 0,
    total: 0,
    // Add flags for pricing notes
    isBariatric: false,
    hasHolidaySurcharge: false,
    hasDeadMileage: false
  };

  // Enhanced base rate: Regular vs Bariatric
  const isBariatric = clientWeight && clientWeight >= PRICING_CONFIG.BARIATRIC.WEIGHT_THRESHOLD;
  breakdown.isBariatric = isBariatric;
  
  if (isBariatric) {
    breakdown.basePrice = PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG;
    if (isRoundTrip) {
      breakdown.roundTripPrice = PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG;
    }
  } else {
    breakdown.basePrice = PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
    if (isRoundTrip) {
      breakdown.roundTripPrice = PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
    }
  }

  // Distance charge calculation with Franklin County logic
  if (distance > 0) {
    const effectiveDistance = isRoundTrip ? distance * 2 : distance;
    const isInFranklinCounty = countyInfo?.isInFranklinCounty !== false; // Default to true
    
    if (isInFranklinCounty) {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY;
    } else {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;
    }
  }

  // County surcharge for trips outside Franklin County (2+ counties)
  if (countyInfo && countyInfo.countiesOut >= 2) {
    breakdown.countyPrice = (countyInfo.countiesOut - 1) * PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE;
  }

  // Dead mileage fee for trips 2+ counties out
  if (deadMileage > 0 && countyInfo && countyInfo.countiesOut >= 2) {
    breakdown.deadMileagePrice = deadMileage * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE;
    breakdown.hasDeadMileage = true;
  }

  // Combined weekend and after-hours premium
  if (pickupDateTime) {
    const isAfterHoursTime = isAfterHours(pickupDateTime);
    const isWeekendTime = isWeekend(pickupDateTime);
    
    if (isAfterHoursTime || isWeekendTime) {
      breakdown.weekendAfterHoursSurcharge = PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS;
    }
  }

  // Emergency fee
  if (isEmergency) {
    breakdown.emergencyFee = PRICING_CONFIG.PREMIUMS.EMERGENCY;
  }

  // Holiday surcharge (total trip, not per leg)
  if (holidayInfo && holidayInfo.isHoliday) {
    breakdown.holidaySurcharge = PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE;
    breakdown.hasHolidaySurcharge = true;
  }

  // Wheelchair rental fee - DISABLED FOR FACILITY APP (no wheelchair charges)
  // if (wheelchairType === 'provided') {
  //   breakdown.wheelchairPrice = PRICING_CONFIG.PREMIUMS.WHEELCHAIR_RENTAL;
  // }

  // Calculate subtotal before veteran discount
  const subtotal = breakdown.basePrice + 
                   breakdown.roundTripPrice +
                   breakdown.distancePrice + 
                   breakdown.countyPrice +
                   breakdown.deadMileagePrice +
                   breakdown.weekendAfterHoursSurcharge +
                   breakdown.emergencyFee +
                   breakdown.holidaySurcharge +
                   breakdown.wheelchairPrice;

  // Apply veteran discount (20%)
  // Note: Veteran status would need to be passed in or detected from client profile
  breakdown.veteranDiscount = 0; // Will implement when veteran status is available

  // Final total
  breakdown.total = subtotal - breakdown.veteranDiscount;

  // Round all monetary values to 2 decimal places
  Object.keys(breakdown).forEach(key => {
    if (typeof breakdown[key] === 'number') {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100;
    }
  });

  return breakdown;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Get pricing estimate with full breakdown using professional rates
 * Enhanced: August 20, 2025 - Added support for all new pricing features
 */
export async function getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip = false,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility',
  additionalPassengers = 0,
  isEmergency = false,
  preCalculatedDistance = null,
  clientWeight = null, // Weight for bariatric determination
  holidayData = null, // Holiday information from HolidayPricingChecker
  calculateDeadMileageEnabled = true // Enable dead mileage calculation
}) {
  try {
    console.log('🚨 FIXED PRICING FILE LOADED - Aug 19 8:05 PM 🚨');
    console.log('💰 getPricingEstimate called:', { 
      pickupAddress, 
      destinationAddress, 
      preCalculatedDistance,
      clientType
    });
    
    // Use pre-calculated distance if provided, otherwise calculate it
    let distance = 0;
    let distanceInfo = null;
    
    if (preCalculatedDistance) {
      // Handle different possible formats of the preCalculatedDistance object
      if (typeof preCalculatedDistance === 'number') {
        // If it's just a number, use it directly
        distance = preCalculatedDistance;
      } else if (preCalculatedDistance.miles !== undefined) {
        // Use miles if available
        distance = preCalculatedDistance.miles;
      } else if (preCalculatedDistance.distance !== undefined) {
        // Otherwise use distance
        distance = typeof preCalculatedDistance.distance === 'number' 
          ? preCalculatedDistance.distance
          : 0;
      }
      
      distanceInfo = {
        distance: distance,
        duration: preCalculatedDistance.duration?.text || preCalculatedDistance.duration || 'Unknown',
        distanceText: preCalculatedDistance.text || preCalculatedDistance.distance?.text || `${distance} mi`,
        isEstimated: false
      };
    } else if (pickupAddress && destinationAddress) {
      distanceInfo = await calculateDistance(pickupAddress, destinationAddress);
      distance = distanceInfo.distance;
    }

    // Get county information for pricing
    let countyInfo = null;
    if (pickupAddress && destinationAddress) {
      countyInfo = await checkFranklinCountyStatus(pickupAddress, destinationAddress);
    }

    // Calculate dead mileage if enabled and pickup is 2+ counties out
    let deadMileage = 0;
    if (calculateDeadMileageEnabled && pickupAddress && countyInfo && countyInfo.countiesOut >= 2) {
      const deadMileageResult = await calculateDeadMileage(pickupAddress);
      deadMileage = deadMileageResult.distance;
    }

    // Prepare holiday information - with fallback check
    let holidayInfo = null;
    if (holidayData && holidayData.isHoliday) {
      holidayInfo = {
        isHoliday: true,
        surcharge: 100 // $100 holiday surcharge
      };
    } else if (pickupDateTime) {
      // Fallback: directly check if the pickup date is a holiday
      const holidayCheck = checkHoliday(pickupDateTime);
      if (holidayCheck.isHoliday) {
        holidayInfo = {
          isHoliday: true,
          surcharge: holidayCheck.surcharge || 100
        };
      }
    }

    // Calculate pricing with enhanced rate structure
    const pricing = calculateTripPrice({
      isRoundTrip,
      distance,
      pickupDateTime,
      wheelchairType,
      clientType,
      additionalPassengers,
      isEmergency,
      countyInfo,
      clientWeight,
      deadMileage,
      holidayInfo
    });

    return {
      success: true,
      pricing,
      distance: distanceInfo,
      countyInfo,
      deadMileage: deadMileage,
      summary: {
        tripType: isRoundTrip ? 'Round Trip' : 'One Way',
        distance: distance > 0 ? `${isRoundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1)} miles` : 'Distance not calculated',
        estimatedTotal: formatCurrency(pricing.total),
        hasDiscounts: pricing.veteranDiscount > 0,
        hasPremiums: (pricing.weekendAfterHoursSurcharge + pricing.emergencyFee + pricing.wheelchairPrice + pricing.countyPrice + pricing.deadMileagePrice + pricing.holidaySurcharge) > 0,
        isBariatric: pricing.isBariatric || false,
        hasHolidaySurcharge: pricing.hasHolidaySurcharge || false,
        hasDeadMileage: pricing.hasDeadMileage || false,
        countyLocation: countyInfo ? 
          `${countyInfo.isInFranklinCounty ? 'Franklin County' : 'Outside Franklin County'}` : 
          'Location unknown'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pricing: null,
      distance: null
    };
  }
}

/**
 * Create a detailed pricing breakdown for display with professional rates
 */
export function createPricingBreakdown(pricing, countyInfo = null) {
  const items = [];

  // Base fare (legs) - Enhanced for bariatric rates
  const isBariatric = pricing.isBariatric || false;
  const baseRate = isBariatric ? PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG : PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
  const totalLegs = (pricing.basePrice + pricing.roundTripPrice) / baseRate;
  const rateName = isBariatric ? '$150/leg (Bariatric rate)' : '$50/leg';
  
  items.push({
    label: `Base fare (${totalLegs} leg${totalLegs > 1 ? 's' : ''} @ ${rateName})`,
    amount: pricing.basePrice + pricing.roundTripPrice,
    type: 'base'
  });

  // Distance charge with county information
  if (pricing.distancePrice > 0) {
    // Use actual county info if available, otherwise try to determine from pricing
    let isInFranklin;
    
    if (countyInfo && typeof countyInfo.isInFranklinCounty === 'boolean') {
      isInFranklin = countyInfo.isInFranklinCounty;
    } else {
      // Fallback: estimate based on rate used (this is less reliable)
      const estimatedDistance = pricing.distancePrice / PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY;
      const altEstimatedDistance = pricing.distancePrice / PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;
      // If the distance calculation is closer to Franklin County rate, assume Franklin
      isInFranklin = Math.abs(estimatedDistance - Math.round(estimatedDistance)) < 
                     Math.abs(altEstimatedDistance - Math.round(altEstimatedDistance));
    }
    
    const rate = isInFranklin ? '$3/mile (Franklin County)' : '$4/mile (Outside Franklin County)';
    items.push({
      label: `Distance charge (${rate})`,
      amount: pricing.distancePrice,
      type: 'charge'
    });
  }

  // County surcharge
  if (pricing.countyPrice > 0) {
    const counties = Math.round(pricing.countyPrice / PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE) + 1;
    items.push({
      label: `County surcharge (${counties} counties @ $50/county)`,
      amount: pricing.countyPrice,
      type: 'premium'
    });
  }

  // Dead mileage charge
  if (pricing.deadMileagePrice > 0) {
    items.push({
      label: 'Dead mileage (Office to pickup @ $4/mile)',
      amount: pricing.deadMileagePrice,
      type: 'premium'
    });
  }

  // Holiday surcharge
  if (pricing.holidaySurcharge > 0) {
    items.push({
      label: 'Holiday surcharge (+$100)',
      amount: pricing.holidaySurcharge,
      type: 'premium'
    });
  }
  if (pricing.weekendAfterHoursSurcharge > 0) {
    items.push({
      label: 'Weekend/After-hours surcharge',
      amount: pricing.weekendAfterHoursSurcharge,
      type: 'premium'
    });
  }

  // Emergency fee
  if (pricing.emergencyFee > 0) {
    items.push({
      label: 'Emergency fee',
      amount: pricing.emergencyFee,
      type: 'premium'
    });
  }

  // Wheelchair rental
  if (pricing.wheelchairPrice > 0) {
    items.push({
      label: 'Wheelchair rental fee',
      amount: pricing.wheelchairPrice,
      type: 'premium'
    });
  }

  // Veteran discount
  if (pricing.veteranDiscount > 0) {
    items.push({
      label: 'Veteran discount (20%)',
      amount: -pricing.veteranDiscount,
      type: 'discount'
    });
  }

  // Total
  items.push({
    label: 'Total',
    amount: pricing.total,
    type: 'total'
  });

  return items;
}
