// Professional Wheelchair Selection Component
'use client';

import { useState, useEffect } from 'react';

export default function WheelchairSelectionFlow({ 
  onWheelchairChange, 
  initialValue = 'none',
  className = '' 
}) {
  const [wheelchairType, setWheelchairType] = useState(initialValue);
  const [needsWheelchair, setNeedsWheelchair] = useState(false);
  const [customWheelchairType, setCustomWheelchairType] = useState('');
  const [showProvideOption, setShowProvideOption] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Wheelchair pricing
  const WHEELCHAIR_PRICE = 25;

  useEffect(() => {
    // Reset states when wheelchair type changes
    if (wheelchairType !== 'none') {
      setShowProvideOption(false);
      setNeedsWheelchair(false);
      setShowCustomInput(false);
    } else {
      setShowProvideOption(true);
    }
  }, [wheelchairType]);

  useEffect(() => {
    // Notify parent component of changes
    const isTransportChair = wheelchairType === 'transport';
    // Only charge fee when CCT provides wheelchair (rental), not when bringing own wheelchair
    const hasWheelchairFee = needsWheelchair; // Only true when "Yes, please provide a wheelchair" is selected
    
    const wheelchairData = {
      type: wheelchairType,
      needsProvided: needsWheelchair,
      customType: customWheelchairType,
      hasWheelchairFee: hasWheelchairFee,
      fee: hasWheelchairFee ? WHEELCHAIR_PRICE : 0,
      isTransportChair: isTransportChair,
      isValidSelection: !isTransportChair
    };
    
    if (onWheelchairChange) {
      onWheelchairChange(wheelchairData);
    }
  }, [wheelchairType, needsWheelchair, customWheelchairType]);

  const handleWheelchairTypeChange = (type) => {
    setWheelchairType(type);
    
    if (type === 'none') {
      setShowProvideOption(true);
      setShowCustomInput(false);
      setCustomWheelchairType('');
    } else {
      setShowProvideOption(false);
      setNeedsWheelchair(false);
      setShowCustomInput(false);
      setCustomWheelchairType('');
    }
  };

  const handleProvideWheelchairChange = (provide) => {
    setNeedsWheelchair(provide);
    
    if (provide) {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCustomWheelchairType('');
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Question */}
      <div className="bg-white dark:bg-[#1E1E1E] border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#2E4F54] dark:text-[#E0F4F5] mb-4 flex items-center">
          ♿ Wheelchair Transportation
        </h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-3">
            What type of wheelchair do you have?
          </label>
          
          <div className="space-y-3">
            {/* None Option */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="none"
                checked={wheelchairType === 'none'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  None
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  No wheelchair needed
                </p>
              </div>
            </label>

            {/* Manual Wheelchair */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="manual"
                checked={wheelchairType === 'manual'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Manual wheelchair (I have my own)
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  Standard manual wheelchair that you bring
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    No additional fee
                  </span>
                </div>
              </div>
            </label>

            {/* Power Wheelchair */}
            <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-[#F8F9FA] dark:hover:bg-[#2A3A3D] cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="power"
                checked={wheelchairType === 'power'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                  Power wheelchair (I have my own)
                </span>
                <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70">
                  Electric/motorized wheelchair that you bring
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                    No additional fee
                  </span>
                </div>
              </div>
            </label>

            {/* Transport Wheelchair */}
            <label className="flex items-center p-3 border border-amber-200 dark:border-amber-700 rounded-lg bg-amber-50 dark:bg-amber-900/20 cursor-pointer transition-colors">
              <input
                type="radio"
                name="wheelchairType"
                value="transport"
                checked={wheelchairType === 'transport'}
                onChange={(e) => handleWheelchairTypeChange(e.target.value)}
                className="w-4 h-4 text-amber-600 border-amber-300 dark:border-amber-600 focus:ring-amber-500 focus:ring-2"
              />
              <div className="ml-3 flex-1">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Transport wheelchair
                  </span>
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                    Not Available
                  </span>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Lightweight transport chair - Not permitted for safety reasons
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Transport Wheelchair Safety Notice */}
        {wheelchairType === 'transport' && (
          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Important Safety Notice
                </h4>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  We're unable to accommodate transport wheelchairs due to safety regulations and vehicle accessibility requirements. Please consider selecting a manual or power wheelchair option, or choose "None" if you'd like us to provide suitable wheelchair accommodation.
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                  Our priority is ensuring safe and comfortable transportation for all passengers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Provide Wheelchair Option */}
        {showProvideOption && (
          <div className="mt-6 p-4 bg-[#F8F9FA] dark:bg-[#2A3A3D] rounded-lg border border-[#DDE5E7] dark:border-[#3F5E63]">
            <h4 className="text-md font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-3">
              Do you want us to provide a wheelchair?
            </h4>
            
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-white dark:hover:bg-[#1E1E1E] cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="provideWheelchair"
                  checked={needsWheelchair === true}
                  onChange={() => handleProvideWheelchairChange(true)}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                    Yes, please provide a wheelchair
                  </span>
                  <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
                    We will provide a suitable wheelchair for your trip
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs font-semibold text-[#7CCFD0]">
                      +${WHEELCHAIR_PRICE}
                    </span>
                    <span className="text-xs text-[#2E4F54]/50 dark:text-[#E0F4F5]/50 ml-1">
                      wheelchair rental fee
                    </span>
                  </div>
                </div>
              </label>
              
              <label className="flex items-center p-3 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg hover:bg-white dark:hover:bg-[#1E1E1E] cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="provideWheelchair"
                  checked={needsWheelchair === false}
                  onChange={() => handleProvideWheelchairChange(false)}
                  className="w-4 h-4 text-[#7CCFD0] border-[#DDE5E7] dark:border-[#3F5E63] focus:ring-[#7CCFD0] focus:ring-2"
                />
                <div className="ml-3 flex-1">
                  <span className="text-sm text-[#2E4F54] dark:text-[#E0F4F5]">
                    No, wheelchair not needed
                  </span>
                  <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
                    Passenger can walk or transfer independently
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Custom Wheelchair Type Input */}
        {showCustomInput && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5] mb-2">
              Please specify the type of wheelchair you need:
            </label>
            <input
              type="text"
              value={customWheelchairType}
              onChange={(e) => setCustomWheelchairType(e.target.value)}
              placeholder="e.g., Standard manual wheelchair, Lightweight transport chair..."
              className="w-full px-3 py-2 border border-[#DDE5E7] dark:border-[#3F5E63] rounded-lg bg-white dark:bg-[#24393C] text-[#2E4F54] dark:text-[#E0F4F5] placeholder-[#2E4F54]/50 dark:placeholder-[#E0F4F5]/50 focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0]"
            />
            <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
              This helps us ensure we provide the most suitable wheelchair for your needs.
            </p>
          </div>
        )}

        {/* Pricing Summary */}
        {needsWheelchair && (
          <div className="mt-4 p-3 bg-[#7CCFD0]/10 dark:bg-[#7CCFD0]/20 rounded-lg border border-[#7CCFD0]/30">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#2E4F54] dark:text-[#E0F4F5]">
                Wheelchair Rental Fee
              </span>
              <span className="text-sm font-bold text-[#7CCFD0]">
                +${WHEELCHAIR_PRICE}
              </span>
            </div>
            <p className="text-xs text-[#2E4F54]/70 dark:text-[#E0F4F5]/70 mt-1">
              This fee covers wheelchair rental and assistance
            </p>
          </div>
        )}

        {/* Information Notice */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                Wheelchair Accessibility Information
              </h5>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                All our vehicles are equipped with wheelchair accessibility features. The same fee applies to all wheelchair types to ensure fair and transparent pricing.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
