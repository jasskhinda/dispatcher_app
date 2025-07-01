'use client';

import { useState, useEffect } from 'react';
import { getPricingEstimate, createPricingBreakdown, formatCurrency } from '@/lib/pricing';

export default function PricingDisplay({ 
  formData, 
  selectedClient,
  routeInfo = null,
  isVisible = true,
  onPricingCalculated = null 
}) {
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate pricing when relevant form data changes
  useEffect(() => {
    if (isVisible && formData.pickupAddress && formData.destinationAddress && formData.pickupDate && formData.pickupTime) {
      calculatePricing();
    } else {
      setPricing(null);
      if (onPricingCalculated) {
        onPricingCalculated(null);
      }
    }
  }, [
    formData.pickupAddress,
    formData.destinationAddress,
    formData.pickupDate,
    formData.pickupTime,
    formData.isRoundTrip,
    formData.wheelchairType,
    formData.isEmergency,
    selectedClient?.client_type,
    routeInfo,
    isVisible
  ]);

  const calculatePricing = async () => {
    setLoading(true);
    setError('');
    
    try {
      const pickupDateTime = new Date(`${formData.pickupDate}T${formData.pickupTime}`);
      
      // Determine client type for discount calculation
      const clientType = selectedClient?.client_type === 'authenticated' ? 'individual' : 'facility';
      
      console.log('Calculating pricing with routeInfo:', routeInfo);
      
      const result = await getPricingEstimate({
        pickupAddress: formData.pickupAddress,
        destinationAddress: formData.destinationAddress,
        isRoundTrip: formData.isRoundTrip,
        pickupDateTime: pickupDateTime.toISOString(),
        wheelchairType: formData.wheelchairType,
        clientType,
        additionalPassengers: formData.additionalPassengers || 0,
        isEmergency: formData.isEmergency || false,
        preCalculatedDistance: routeInfo ? {
          miles: routeInfo.distance?.miles || 0,
          distance: routeInfo.distance?.value / 1609.34, // Convert meters to miles
          text: routeInfo.distance?.text || '',
          duration: routeInfo.duration?.text || ''
        } : null
      });

      if (result.success) {
        setPricing(result);
        if (onPricingCalculated) {
          onPricingCalculated(result);
        }
      } else {
        setError(result.error || 'Unable to calculate pricing');
        setPricing(null);
        if (onPricingCalculated) {
          onPricingCalculated(null);
        }
      }
    } catch (err) {
      console.error('Pricing calculation error:', err);
      setError('Error calculating trip fare');
      setPricing(null);
      if (onPricingCalculated) {
        onPricingCalculated(null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-[#7CCFD0]/10 to-[#60BFC0]/5 dark:from-[#7CCFD0]/20 dark:to-[#60BFC0]/10 rounded-lg border border-[#7CCFD0]/20 dark:border-[#7CCFD0]/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5] flex items-center">
          <svg className="w-5 h-5 mr-2 text-[#7CCFD0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          Fare Estimate
        </h3>
        
        {loading && (
          <div className="flex items-center text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-[#7CCFD0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Calculating...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-3">
          <div className="flex">
            <svg className="w-4 h-4 text-red-400 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {pricing && (
        <div className="space-y-3">
          {/* Quick Summary */}
          <div className="flex justify-between items-center p-3 bg-white/60 dark:bg-[#1C2C2F]/60 rounded-lg">
            <div>
              <p className="text-sm text-[#2E4F54]/80 dark:text-[#E0F4F5]/80">
                {pricing.summary.tripType} • {pricing.summary.distance}
                {pricing.distance?.isEstimated && (
                  <span className="ml-1 text-xs text-orange-600 dark:text-orange-400">
                    (estimated)
                  </span>
                )}
              </p>
              {pricing.distance?.duration && (
                <p className="text-xs text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
                  Est. travel time: {pricing.distance.duration}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#2E4F54] dark:text-[#E0F4F5]">
                {pricing.summary.estimatedTotal}
              </p>
              {pricing.pricing.discount > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  10% discount applied
                </p>
              )}
            </div>
          </div>

          {/* Detailed Breakdown */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-[#7CCFD0] hover:text-[#60BFC0] flex items-center">
              <span>View price breakdown</span>
              <svg className="w-4 h-4 ml-1 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="mt-3 space-y-2">
              {createPricingBreakdown(pricing.pricing).map((item, index) => (
                <div 
                  key={index} 
                  className={`flex justify-between items-center py-1 ${
                    item.type === 'total' ? 'border-t border-[#DDE5E7] dark:border-[#3F5E63] pt-2 font-semibold' :
                    item.type === 'subtotal' ? 'border-t border-[#DDE5E7] dark:border-[#3F5E63] pt-2' : ''
                  }`}
                >
                  <span className={`text-sm ${
                    item.type === 'total' ? 'text-[#2E4F54] dark:text-[#E0F4F5] font-semibold' :
                    item.type === 'discount' ? 'text-green-600 dark:text-green-400' :
                    item.type === 'premium' ? 'text-orange-600 dark:text-orange-400' :
                    'text-[#2E4F54]/80 dark:text-[#E0F4F5]/80'
                  }`}>
                    {item.label}
                  </span>
                  <span className={`text-sm ${
                    item.type === 'total' ? 'text-[#2E4F54] dark:text-[#E0F4F5] font-semibold' :
                    item.type === 'discount' ? 'text-green-600 dark:text-green-400' :
                    item.type === 'premium' ? 'text-orange-600 dark:text-orange-400' :
                    'text-[#2E4F54]/80 dark:text-[#E0F4F5]/80'
                  }`}>
                    {formatCurrency(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          </details>

          {/* Pricing Notes */}
          <div className="text-xs text-[#2E4F54]/60 dark:text-[#E0F4F5]/60 space-y-1">
            {pricing.distance?.isEstimated && (
              <p>• Distance is estimated - actual fare may vary based on route</p>
            )}
            {pricing.summary.hasPremiums && (
              <p>• Additional charges apply for off-hours, weekends, or wheelchair accessibility</p>
            )}
            {pricing.summary.hasDiscounts && (
              <p>• 10% discount applied for individual client</p>
            )}
            <p>• Final fare may vary based on actual route and traffic conditions</p>
          </div>
        </div>
      )}

      {!loading && !pricing && !error && (
        <div className="text-center py-6">
          <svg className="mx-auto h-8 w-8 text-[#2E4F54]/40 dark:text-[#E0F4F5]/40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
          <p className="text-sm text-[#2E4F54]/60 dark:text-[#E0F4F5]/60">
            Enter pickup location, destination, date and time to see fare estimate
          </p>
        </div>
      )}
    </div>
  );
}
