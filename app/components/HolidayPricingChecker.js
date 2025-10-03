'use client';

import { useState, useEffect } from 'react';

// Specific holidays with $100 surcharge (as per requirements)
const US_FEDERAL_HOLIDAYS = [
  // Fixed date holidays
  { name: "New Year's Day", date: "01-01", surcharge: 100, federal: true },
  { name: "New Year's Eve", date: "12-31", surcharge: 100, federal: false },
  { name: "Independence Day", date: "07-04", surcharge: 100, federal: true },
  { name: "Christmas Eve", date: "12-24", surcharge: 100, federal: false },
  { name: "Christmas Day", date: "12-25", surcharge: 100, federal: true },
  
  // Variable date holidays (calculated dynamically)
  { name: "Easter Sunday", isVariable: true, surcharge: 100, federal: false }, // Variable date
  { name: "Memorial Day", isVariable: true, surcharge: 100, federal: true }, // Last Monday in May
  { name: "Labor Day", isVariable: true, surcharge: 100, federal: true }, // First Monday in September
  { name: "Thanksgiving Day", isVariable: true, surcharge: 100, federal: true }, // 4th Thursday in November
];

export default function HolidayPricingChecker({ 
  pickupDate, 
  onHolidayChange,
  className = '' 
}) {
  const [holidayInfo, setHolidayInfo] = useState({
    isHoliday: false,
    holidayName: '',
    surcharge: 0
  });

  // Calculate Easter Sunday using the algorithm
  const calculateEaster = (year) => {
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
    
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Calculate variable holidays for a given year (only the ones we need)
  const calculateAllVariableHolidays = (year) => {
    const holidays = {};
    
    // Easter Sunday
    holidays.easter = calculateEaster(year);
    
    // Memorial Day - Last Monday in May
    const lastMondayMay = new Date(year, 4, 31); // May 31st
    while (lastMondayMay.getDay() !== 1) { // Monday is 1
      lastMondayMay.setDate(lastMondayMay.getDate() - 1);
    }
    holidays.memorialDay = `${String(lastMondayMay.getMonth() + 1).padStart(2, '0')}-${String(lastMondayMay.getDate()).padStart(2, '0')}`;
    
    // Labor Day - First Monday in September
    const firstMondaySept = new Date(year, 8, 1); // September 1st
    while (firstMondaySept.getDay() !== 1) { // Monday is 1
      firstMondaySept.setDate(firstMondaySept.getDate() + 1);
    }
    holidays.laborDay = `${String(firstMondaySept.getMonth() + 1).padStart(2, '0')}-${String(firstMondaySept.getDate()).padStart(2, '0')}`;
    
    // Thanksgiving - Fourth Thursday in November
    const fourthThursdayNov = new Date(year, 10, 1); // November 1st
    let thursdayCount = 0;
    while (thursdayCount < 4) {
      if (fourthThursdayNov.getDay() === 4) { // Thursday is 4
        thursdayCount++;
        if (thursdayCount < 4) {
          fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 7);
        }
      } else {
        fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 1);
      }
    }
    holidays.thanksgiving = `${String(fourthThursdayNov.getMonth() + 1).padStart(2, '0')}-${String(fourthThursdayNov.getDate()).padStart(2, '0')}`;
    
    return holidays;
  };

  useEffect(() => {
    if (!pickupDate || pickupDate === '') {
      setHolidayInfo({ isHoliday: false, holidayName: '', surcharge: 0 });
      if (onHolidayChange) onHolidayChange({ isHoliday: false, holidayName: '', surcharge: 0 });
      return;
    }

    // Parse date carefully to avoid timezone issues
    // If pickupDate is in ISO format (YYYY-MM-DD), parse it as local date
    let date;
    if (pickupDate.includes('T')) {
      // Full datetime string
      date = new Date(pickupDate);
    } else {
      // Date only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
      const [yearStr, monthStr, dayStr] = pickupDate.split('-');
      date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
    }
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Check fixed holidays
    const fixedHoliday = US_FEDERAL_HOLIDAYS.find(holiday => !holiday.isVariable && holiday.date === monthDay);
    if (fixedHoliday) {
      const info = {
        isHoliday: true,
        holidayName: fixedHoliday.name,
        surcharge: fixedHoliday.surcharge,
        isFederal: fixedHoliday.federal
      };
      setHolidayInfo(info);
      if (onHolidayChange) {
        onHolidayChange(info);
      }
      return;
    }

    // Check variable holidays
    const variableHolidays = calculateAllVariableHolidays(year);
    let matchedHoliday = null;
    
    // Check all variable holidays (only the ones we need)
    if (monthDay === variableHolidays.easter) {
      matchedHoliday = { name: "Easter Sunday", surcharge: 100, federal: false };
    } else if (monthDay === variableHolidays.memorialDay) {
      matchedHoliday = { name: "Memorial Day", surcharge: 100, federal: true };
    } else if (monthDay === variableHolidays.laborDay) {
      matchedHoliday = { name: "Labor Day", surcharge: 100, federal: true };
    } else if (monthDay === variableHolidays.thanksgiving) {
      matchedHoliday = { name: "Thanksgiving Day", surcharge: 100, federal: true };
    }

    if (matchedHoliday) {
      const info = {
        isHoliday: true,
        holidayName: matchedHoliday.name,
        surcharge: matchedHoliday.surcharge,
        isFederal: matchedHoliday.federal
      };
      setHolidayInfo(info);
      if (onHolidayChange) {
        onHolidayChange(info);
      }
    } else {
      const info = { isHoliday: false, holidayName: '', surcharge: 0, isFederal: false };
      setHolidayInfo(info);
      if (onHolidayChange) {
        onHolidayChange(info);
      }
    }
  }, [pickupDate, onHolidayChange]);

  if (!holidayInfo.isHoliday) {
    return null; // Don't show anything if not a holiday
  }

  return (
    <div className={`${className}`}>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-amber-800">
              🎄 Holiday Pricing Notice
            </h4>
            <p className="text-sm text-amber-700 mt-1">
              <strong>{holidayInfo.holidayName}</strong>
              {holidayInfo.isFederal && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Federal Holiday
                </span>
              )}
              <span className="text-amber-600"> - Additional holiday surcharge applies</span>
            </p>
            <div className="mt-2 p-2 bg-amber-100 rounded text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium text-amber-800">Holiday Surcharge:</span>
                <span className="font-bold text-amber-800">+${holidayInfo.surcharge}</span>
              </div>
              <p className="text-amber-700 mt-1">
                Applied to total bill (one-way or round trip)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export helper function for other components to use
export const checkHolidaySurcharge = (pickupDate) => {
  if (!pickupDate) return { isHoliday: false, surcharge: 0 };
  
  // Parse date carefully to avoid timezone issues
  let date;
  if (pickupDate.includes('T')) {
    // Full datetime string
    date = new Date(pickupDate);
  } else {
    // Date only string (YYYY-MM-DD) - parse as local date to avoid timezone shift
    const [yearStr, monthStr, dayStr] = pickupDate.split('-');
    date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr));
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const monthDay = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  
  // Check fixed holidays
  const fixedHoliday = US_FEDERAL_HOLIDAYS.find(holiday => !holiday.isVariable && holiday.date === monthDay);
  if (fixedHoliday) {
    return { isHoliday: true, surcharge: fixedHoliday.surcharge, name: fixedHoliday.name };
  }
  
  // Check variable holidays using the same calculation logic as the main component
  const calculateEaster = (year) => {
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
    
    return `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const calculateAllVariableHolidays = (year) => {
    const holidays = {};
    
    // Easter Sunday
    holidays.easter = calculateEaster(year);
    
    // Memorial Day - Last Monday in May
    const lastMondayMay = new Date(year, 4, 31);
    while (lastMondayMay.getDay() !== 1) {
      lastMondayMay.setDate(lastMondayMay.getDate() - 1);
    }
    holidays.memorialDay = `${String(lastMondayMay.getMonth() + 1).padStart(2, '0')}-${String(lastMondayMay.getDate()).padStart(2, '0')}`;
    
    // Labor Day - First Monday in September
    const firstMondaySept = new Date(year, 8, 1);
    while (firstMondaySept.getDay() !== 1) {
      firstMondaySept.setDate(firstMondaySept.getDate() + 1);
    }
    holidays.laborDay = `${String(firstMondaySept.getMonth() + 1).padStart(2, '0')}-${String(firstMondaySept.getDate()).padStart(2, '0')}`;
    
    // Thanksgiving - Fourth Thursday in November
    const fourthThursdayNov = new Date(year, 10, 1);
    let thursdayCount = 0;
    while (thursdayCount < 4) {
      if (fourthThursdayNov.getDay() === 4) {
        thursdayCount++;
        if (thursdayCount < 4) {
          fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 7);
        }
      } else {
        fourthThursdayNov.setDate(fourthThursdayNov.getDate() + 1);
      }
    }
    holidays.thanksgiving = `${String(fourthThursdayNov.getMonth() + 1).padStart(2, '0')}-${String(fourthThursdayNov.getDate()).padStart(2, '0')}`;
    
    return holidays;
  };

  const variableHolidays = calculateAllVariableHolidays(year);
  let matchedHoliday = null;
  
  // Check all variable holidays (only the ones we need)
  if (monthDay === variableHolidays.easter) {
    matchedHoliday = { name: "Easter Sunday", surcharge: 100, federal: false };
  } else if (monthDay === variableHolidays.memorialDay) {
    matchedHoliday = { name: "Memorial Day", surcharge: 100, federal: true };
  } else if (monthDay === variableHolidays.laborDay) {
    matchedHoliday = { name: "Labor Day", surcharge: 100, federal: true };
  } else if (monthDay === variableHolidays.thanksgiving) {
    matchedHoliday = { name: "Thanksgiving Day", surcharge: 100, federal: true };
  }

  if (matchedHoliday) {
    return { isHoliday: true, surcharge: matchedHoliday.surcharge, name: matchedHoliday.name };
  }
  
  return { isHoliday: false, surcharge: 0 };
};
