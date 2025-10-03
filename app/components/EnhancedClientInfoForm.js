'use client';

import { useState, useEffect } from 'react';

export default function EnhancedClientInfoForm({ 
  onClientInfoChange, 
  initialData = {},
  className = '',
  selectedClient = null 
}) {
  const [clientInfo, setClientInfo] = useState({
    weight: initialData.weight || '',
    height_feet: initialData.height_feet || '',
    height_inches: initialData.height_inches || '',
    date_of_birth: initialData.date_of_birth || '',
    email: initialData.email || '',
    ...initialData
  });

  useEffect(() => {
    // Auto-populate if client is pre-selected
    if (selectedClient) {
      setClientInfo(prev => ({
        ...prev,
        email: selectedClient.email || prev.email
      }));
    }
  }, [selectedClient]);

  useEffect(() => {
    // Determine if bariatric rate applies
    const weight = parseFloat(clientInfo.weight);
    const isBariatric = weight >= 300;
    
    const enhancedData = {
      ...clientInfo,
      isBariatric,
      bariatricRate: isBariatric ? 150 : 50,
      emailAllowNA: clientInfo.email === 'N/A' || clientInfo.email === 'n/a'
    };
    
    if (onClientInfoChange) {
      onClientInfoChange(enhancedData);
    }
  }, [clientInfo, onClientInfoChange]);

  const handleChange = (field, value) => {
    setClientInfo(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    // Allow N/A as per team feedback
    if (value.toLowerCase() === 'n/a' || value === 'N/A') {
      handleChange('email', 'N/A');
    } else {
      handleChange('email', value);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white border border-[#DDE5E7] rounded-lg p-6">
        <h3 className="text-lg font-semibold text-[#2E4F54] mb-4 flex items-center">
          👤 Enhanced Client Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weight Field - Critical for bariatric determination */}
          <div>
            <label className="block text-sm font-medium text-[#2E4F54] mb-2">
              Weight (lbs) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={clientInfo.weight}
              onChange={(e) => handleChange('weight', e.target.value)}
              placeholder="Enter weight in pounds"
              className="w-full px-3 py-2 border border-[#DDE5E7] rounded-lg bg-white text-[#2E4F54] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0]"
              min="50"
              max="800"
              required
            />
            {parseFloat(clientInfo.weight) >= 400 && (
              <p className="text-xs text-red-700 mt-1 font-bold">
                🚫 Cannot accommodate rides over 400 lbs - Please contact us for alternative arrangements
              </p>
            )}
            {parseFloat(clientInfo.weight) >= 300 && parseFloat(clientInfo.weight) < 400 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                ⚠️ Bariatric transportation required ($150 per leg vs $50 regular rate)
              </p>
            )}
          </div>

          {/* Height Fields */}
          <div>
            <label className="block text-sm font-medium text-[#2E4F54] mb-2">
              Height <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <div className="flex-1">
                <select
                  value={clientInfo.height_feet}
                  onChange={(e) => handleChange('height_feet', e.target.value)}
                  className="w-full px-3 py-2 border border-[#DDE5E7] rounded-lg bg-white text-[#2E4F54] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                >
                  <option value="">Feet</option>
                  {[3, 4, 5, 6, 7, 8].map(feet => (
                    <option key={feet} value={feet}>{feet} ft</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <select
                  value={clientInfo.height_inches}
                  onChange={(e) => handleChange('height_inches', e.target.value)}
                  className="w-full px-3 py-2 border border-[#DDE5E7] rounded-lg bg-white text-[#2E4F54] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0]"
                  required
                >
                  <option value="">Inches</option>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(inches => (
                    <option key={inches} value={inches}>{inches} in</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date of Birth - Important for hospital records */}
          <div>
            <label className="block text-sm font-medium text-[#2E4F54] mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={clientInfo.date_of_birth}
              onChange={(e) => handleChange('date_of_birth', e.target.value)}
              className="w-full px-3 py-2 border border-[#DDE5E7] rounded-lg bg-white text-[#2E4F54] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0]"
              max={new Date().toISOString().split('T')[0]} // Max date is today
              required
            />
            <p className="text-xs text-[#2E4F54]/70 mt-1">
              Required for hospital record verification when needed
            </p>
          </div>

          {/* Email Field - Allow N/A as per team feedback */}
          <div>
            <label className="block text-sm font-medium text-[#2E4F54] mb-2">
              Email Address
            </label>
            <input
              type="text"
              value={clientInfo.email}
              onChange={handleEmailChange}
              placeholder="Enter email or 'N/A' if not available"
              className="w-full px-3 py-2 border border-[#DDE5E7] rounded-lg bg-white text-[#2E4F54] focus:outline-none focus:ring-2 focus:ring-[#7CCFD0] focus:border-[#7CCFD0]"
            />
            <p className="text-xs text-[#2E4F54]/70 mt-1">
              Enter 'N/A' if email address is not available to proceed without delays
            </p>
          </div>
        </div>

        {/* Information Notice */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-blue-800">
                Why This Information Matters
              </h5>
              <ul className="text-xs text-blue-700 mt-1 space-y-1">
                <li>• <strong>Weight:</strong> Determines regular ($50) vs bariatric ($150) transportation rate</li>
                <li>• <strong>Height:</strong> Helps ensure proper vehicle and equipment selection</li>
                <li>• <strong>Date of Birth:</strong> Required for hospital record verification when needed</li>
                <li>• <strong>Email:</strong> Use 'N/A' when client doesn't have email to avoid booking delays</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
