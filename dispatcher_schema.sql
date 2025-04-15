-- DISPATCHER APP SCHEMA FIXES
-- Run this script in Supabase SQL Editor to fix missing policies

-- This script adds policies that allow dispatchers to see and manage all trips and profiles
-- It assumes the basic schema from the booking app is already created

-- Create invoices table if it doesn't exist
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  trip_id UUID REFERENCES trips(id),
  invoice_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
  issue_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  due_date TIMESTAMP WITH TIME ZONE,
  payment_date TIMESTAMP WITH TIME ZONE,
  payment_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
-- Users can view their own invoices
CREATE POLICY "Users can view their own invoices" 
ON invoices FOR SELECT 
USING (auth.uid() = user_id);

-- Dispatchers can view all invoices
CREATE POLICY "Dispatchers can view all invoices" 
ON invoices FOR SELECT 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Dispatchers can create invoices
CREATE POLICY "Dispatchers can create invoices" 
ON invoices FOR INSERT 
WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Dispatchers can update invoices
CREATE POLICY "Dispatchers can update invoices" 
ON invoices FOR UPDATE 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Dispatchers can delete invoices
CREATE POLICY "Dispatchers can delete invoices" 
ON invoices FOR DELETE 
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher');

-- Add a dispatcher profile for testing (modify email as needed)
INSERT INTO profiles (id, first_name, last_name, role)
SELECT 
  id, 
  'Dispatcher', 
  'Admin', 
  'dispatcher'
FROM auth.users
WHERE email = 'test@example.com'  -- CHANGE THIS to your actual dispatcher email
ON CONFLICT (id) DO UPDATE SET role = 'dispatcher';

-- Ensure dispatcher policies exist for trips table
-- This allows dispatchers to view all trips regardless of who created them
DROP POLICY IF EXISTS "Dispatchers can view all trips" ON trips;
CREATE POLICY "Dispatchers can view all trips" 
ON trips FOR SELECT 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);

-- Allow dispatchers to insert trips for any user
DROP POLICY IF EXISTS "Dispatchers can insert trips" ON trips;
CREATE POLICY "Dispatchers can insert trips" 
ON trips FOR INSERT 
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);

-- Allow dispatchers to update any trip
DROP POLICY IF EXISTS "Dispatchers can update all trips" ON trips;
CREATE POLICY "Dispatchers can update all trips" 
ON trips FOR UPDATE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);

-- Allow dispatchers to delete any trip
DROP POLICY IF EXISTS "Dispatchers can delete trips" ON trips;
CREATE POLICY "Dispatchers can delete trips" 
ON trips FOR DELETE 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'dispatcher'
);

-- Create sample data if needed
-- Sample trips
INSERT INTO trips (
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  status,
  price,
  special_requirements
)
SELECT 
  id,  -- This gets the user ID from the subquery
  '123 Main Street, Anytown',
  'Memorial Hospital, 500 Healthcare Blvd',
  NOW() + interval '1 day',
  'pending',
  35.00,
  'Wheelchair accessible vehicle needed'
FROM auth.users
WHERE email = 'client@example.com'  -- CHANGE THIS to an actual client email in your system
AND NOT EXISTS (SELECT 1 FROM trips LIMIT 1)  -- Only insert if no trips exist
LIMIT 1;

-- Add another sample trip
INSERT INTO trips (
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  status,
  price,
  driver_name,
  vehicle,
  special_requirements
)
SELECT 
  id,
  '456 Oak Avenue, Somewhere',
  'Physical Therapy Center, 200 Wellness Way',
  NOW() + interval '3 hours',
  'upcoming',
  27.50,
  'John Driver',
  'Toyota Sienna (Wheelchair Accessible)',
  'Passenger needs assistance getting in/out of vehicle'
FROM auth.users
WHERE email = 'client@example.com'  -- CHANGE THIS to an actual client email in your system
AND EXISTS (SELECT 1 FROM trips)  -- Only insert if at least one trip already exists
AND (SELECT COUNT(*) FROM trips) < 2  -- Only insert if fewer than 2 trips exist
LIMIT 1;

-- Add a completed trip sample
INSERT INTO trips (
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  status,
  price,
  driver_name,
  vehicle,
  rating,
  feedback
)
SELECT 
  id,
  '789 Pine Street, Elsewhere',
  'Oncology Center, 300 Medical Parkway',
  NOW() - interval '2 days',
  'completed',
  42.00,
  'Sarah Driver',
  'Honda Odyssey (Wheelchair Accessible)',
  5,
  'Driver was very helpful and professional'
FROM auth.users
WHERE email = 'client@example.com'  -- CHANGE THIS to an actual client email in your system
AND EXISTS (SELECT 1 FROM trips)  -- Only insert if at least one trip already exists
AND (SELECT COUNT(*) FROM trips) < 3  -- Only insert if fewer than 3 trips exist
LIMIT 1;