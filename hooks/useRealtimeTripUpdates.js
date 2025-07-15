'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export function useRealtimeTripUpdates(initialTrips = []) {
  const [trips, setTrips] = useState(initialTrips);
  const [lastUpdate, setLastUpdate] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    // Set up real-time subscription for trips table
    const channel = supabase
      .channel('trips-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'trips',
        },
        (payload) => {
          console.log('🔄 Real-time trip update received:', payload);
          setLastUpdate(new Date());
          
          const { eventType, new: newRecord, old: oldRecord } = payload;
          
          setTrips(currentTrips => {
            switch (eventType) {
              case 'INSERT':
                // Add new trip if it doesn't exist
                if (!currentTrips.find(trip => trip.id === newRecord.id)) {
                  return [...currentTrips, newRecord];
                }
                return currentTrips;
                
              case 'UPDATE':
                // Update existing trip
                return currentTrips.map(trip =>
                  trip.id === newRecord.id ? { ...trip, ...newRecord } : trip
                );
                
              case 'DELETE':
                // Remove deleted trip
                return currentTrips.filter(trip => trip.id !== oldRecord.id);
                
              default:
                return currentTrips;
            }
          });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Function to manually update a trip (optimistic update)
  const updateTripOptimistically = (tripId, updates) => {
    setTrips(currentTrips =>
      currentTrips.map(trip =>
        trip.id === tripId ? { ...trip, ...updates } : trip
      )
    );
  };

  return {
    trips,
    lastUpdate,
    updateTripOptimistically
  };
}