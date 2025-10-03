'use client';

import { useState, useEffect } from 'react';
import EnhancedTripForm from './EnhancedTripForm';
import StreamlinedBookingForm from './StreamlinedBookingForm';

/**
 * Smart Booking Form - Switches between forms based on client type
 * - Facility clients: Uses StreamlinedBookingForm (with bariatric, holiday, dead mileage)
 * - Individual clients: Uses EnhancedTripForm (standard pricing)
 */
export default function SmartBookingForm({ user, userProfile, individualClients, managedClients, facilities }) {
  const [selectedClientType, setSelectedClientType] = useState(null);
  const [allClients, setAllClients] = useState([]);

  useEffect(() => {
    // Combine all clients with type indicators
    const combined = [
      ...individualClients.map(client => ({
        ...client,
        client_type: 'individual',
        display_name: `${client.first_name} ${client.last_name} (Individual)`
      })),
      ...managedClients.map(client => {
        const facility = facilities.find(f => f.id === client.facility_id);
        return {
          ...client,
          client_type: 'managed',
          display_name: `${client.first_name} ${client.last_name} (${facility?.name || 'Facility'})`
        };
      })
    ];
    setAllClients(combined);
  }, [individualClients, managedClients, facilities]);

  // Detect client type from the form when client is selected
  const handleClientTypeDetection = (clientType) => {
    setSelectedClientType(clientType);
  };

  // If a facility/managed client is selected, show StreamlinedBookingForm
  if (selectedClientType === 'managed' || selectedClientType === 'facility') {
    return (
      <StreamlinedBookingForm
        user={user}
        managedClients={managedClients}
        facilities={facilities}
        onClientTypeChange={handleClientTypeDetection}
      />
    );
  }

  // Otherwise show EnhancedTripForm
  return (
    <EnhancedTripForm
      user={user}
      userProfile={userProfile}
      individualClients={individualClients}
      managedClients={managedClients}
      facilities={facilities}
      onClientTypeChange={handleClientTypeDetection}
    />
  );
}
