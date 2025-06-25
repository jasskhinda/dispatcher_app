-- DIRECT DATABASE FIX FOR CAREBRIDGE LIVING
-- Run this in Supabase SQL Editor if the diagnostic shows database issues

-- 1. Verify the facility exists and has the correct name
SELECT 
    'FACILITY VERIFICATION' as check_type,
    id,
    name,
    contact_email,
    created_at
FROM facilities 
WHERE name = 'CareBridge Living'
   OR id::text LIKE 'e1b94bde%';

-- 2. If facility exists but name is wrong, fix it
UPDATE facilities 
SET 
    name = 'CareBridge Living',
    updated_at = NOW()
WHERE id::text LIKE 'e1b94bde%' 
  AND (name IS NULL OR name != 'CareBridge Living');

-- 3. Verify trips are properly linked
SELECT 
    'TRIP VERIFICATION' as check_type,
    t.id,
    t.facility_id,
    t.pickup_address,
    t.status,
    f.name as facility_name
FROM trips t
LEFT JOIN facilities f ON t.facility_id = f.id
WHERE t.facility_id::text LIKE 'e1b94bde%'
ORDER BY t.created_at DESC
LIMIT 5;

-- 4. Show what the dispatcher query should return
SELECT 
    'DISPATCHER QUERY RESULT' as check_type,
    t.id,
    t.facility_id,
    t.pickup_address,
    jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'contact_email', f.contact_email,
        'phone_number', f.phone_number
    ) as facility_data,
    CASE 
        WHEN f.name IS NOT NULL AND f.name != '' THEN '🏥 ' || f.name
        WHEN f.contact_email IS NOT NULL THEN '🏥 ' || f.contact_email
        ELSE '🏥 Facility ' || SUBSTRING(t.facility_id::text, 1, 8)
    END as expected_display
FROM trips t
LEFT JOIN facilities f ON t.facility_id = f.id
WHERE t.facility_id::text LIKE 'e1b94bde%'
ORDER BY t.created_at DESC
LIMIT 3;
