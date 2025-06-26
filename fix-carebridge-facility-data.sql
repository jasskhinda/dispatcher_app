-- Fix CareBridge Living Facility Data
-- Run this in the Supabase SQL Editor to update the facility with correct information

-- First, let's see the current state of the CareBridge Living facility
SELECT 
    id,
    name,
    address,
    contact_email,
    billing_email,
    phone_number,
    facility_type
FROM facilities 
WHERE name = 'CareBridge Living' 
   OR id LIKE 'e1b94bde%';

-- Update the CareBridge Living facility with correct data
UPDATE facilities 
SET 
    name = 'CareBridge Living',
    address = '5050 Blazer Pkwy Suite 100-B, Dublin, OH 43017',
    contact_email = 'contact@carebridgeliving.com',
    billing_email = 'billing@carebridgeliving.com',
    phone_number = '(614) 555-0123',
    facility_type = 'Assisted Living',
    updated_at = NOW()
WHERE name = 'CareBridge Living' 
   OR id LIKE 'e1b94bde%';

-- Verify the update worked
SELECT 
    id,
    name,
    address,
    contact_email,
    billing_email,
    phone_number,
    facility_type,
    updated_at
FROM facilities 
WHERE name = 'CareBridge Living' 
   OR id LIKE 'e1b94bde%';

-- If no rows were updated, you can also try finding the facility by trips
-- This query will help identify which facility_id needs updating:
SELECT DISTINCT 
    t.facility_id,
    COUNT(t.id) as trip_count,
    f.name,
    f.address,
    f.contact_email
FROM trips t 
LEFT JOIN facilities f ON t.facility_id = f.id 
WHERE t.facility_id IS NOT NULL 
GROUP BY t.facility_id, f.name, f.address, f.contact_email
ORDER BY trip_count DESC;
