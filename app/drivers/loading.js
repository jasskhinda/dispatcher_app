import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center">
        <div className="w-16 h-16 border-t-4 border-b-4 border-blue-500 rounded-full animate-spin mb-4"></div>
        <h2 className="text-2xl font-semibold text-gray-700">Loading drivers...</h2>
        <p className="text-gray-500 mt-2">Please wait while we fetch driver information</p>
      </div>
    </div>
  );
}
