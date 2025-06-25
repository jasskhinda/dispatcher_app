-- 🔍 COMPREHENSIVE FACILITY INVESTIGATION FOR CAREBRIDGE LIVING
-- Run this in Supabase SQL Editor to diagnose the facility name issue
-- Expected: Find facility that should show "CareBridge Living" but shows "Facility e1b94bde"

-- =====================================================
-- 1️⃣ SHOW ALL FACILITIES (to see what we have)
-- =====================================================
SELECT 
    '=== ALL FACILITIES IN DATABASE ===' as section,
    id,
    name,
    contact_email,
    phone_number,
    address,
    facility_type,
    created_at,
    updated_at,
    CASE 
        WHEN name IS NULL THEN '❌ NAME IS NULL'
        WHEN name = '' THEN '❌ NAME IS EMPTY'
        WHEN name = 'CareBridge Living' THEN '✅ CORRECT NAME'
        ELSE '⚠️ DIFFERENT NAME'
    END as name_status
FROM facilities 
ORDER BY created_at DESC;

-- =====================================================
-- 2️⃣ FIND FACILITY WITH ID STARTING WITH e1b94bde
-- =====================================================
SELECT 
    '=== PROBLEMATIC FACILITY (e1b94bde) ===' as section,
    id,
    name,
    contact_email,
    phone_number,
    address,
    facility_type,
    created_at,
    updated_at,
    CASE 
        WHEN name IS NULL THEN 'NAME IS NULL - THIS IS THE PROBLEM!'
        WHEN name = '' THEN 'NAME IS EMPTY - THIS IS THE PROBLEM!'
        WHEN name = 'CareBridge Living' THEN 'NAME IS CORRECT'
        ELSE 'NAME IS: "' || name || '" - SHOULD BE "CareBridge Living"'
    END as diagnosis
FROM facilities 
WHERE id::text LIKE 'e1b94bde%';

-- =====================================================
-- 3️⃣ CHECK TRIPS USING THIS FACILITY
-- =====================================================
SELECT 
    '=== TRIPS USING PROBLEMATIC FACILITY ===' as section,
    t.id as trip_id,
    t.facility_id,
    t.pickup_address,
    t.status,
    t.created_at as trip_created,
    f.name as facility_name,
    CASE 
        WHEN f.name IS NULL THEN '❌ NULL - Shows as "Facility ' || SUBSTRING(t.facility_id::text, 1, 8) || '"'
        WHEN f.name = '' THEN '❌ EMPTY - Shows as "Facility ' || SUBSTRING(t.facility_id::text, 1, 8) || '"'
        ELSE '✅ HAS NAME: "' || f.name || '"'
    END as display_result
FROM trips t
LEFT JOIN facilities f ON t.facility_id = f.id
WHERE t.facility_id::text LIKE 'e1b94bde%'
ORDER BY t.created_at DESC
LIMIT 5;

-- =====================================================
-- 4️⃣ CHECK ALL FACILITY USAGE IN TRIPS
-- =====================================================
SELECT 
    '=== FACILITY USAGE SUMMARY ===' as section,
    t.facility_id,
    SUBSTRING(t.facility_id::text, 1, 8) as short_id,
    f.name as facility_name,
    COUNT(*) as trip_count,
    MAX(t.created_at) as latest_trip,
    CASE 
        WHEN f.name IS NULL THEN '❌ NULL NAME'
        WHEN f.name = '' THEN '❌ EMPTY NAME'
        WHEN f.name = 'CareBridge Living' THEN '✅ CORRECT NAME'
        ELSE '⚠️ NAME: "' || f.name || '"'
    END as name_status
FROM trips t
LEFT JOIN facilities f ON t.facility_id = f.id
WHERE t.facility_id IS NOT NULL
GROUP BY t.facility_id, f.name
ORDER BY trip_count DESC;

-- =====================================================
-- 5️⃣ SHOW WHAT THE DISPATCHER QUERY RETURNS
-- =====================================================
SELECT 
    '=== EXACT DISPATCHER QUERY SIMULATION ===' as section,
    t.id as trip_id,
    t.facility_id,
    t.status,
    t.pickup_address,
    -- This is what the dispatcher JOIN returns
    jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'contact_email', f.contact_email,
        'phone_number', f.phone_number
    ) as facility_data,
    -- This is what would be displayed
    CASE 
        WHEN f.name IS NOT NULL AND f.name != '' THEN '🏥 ' || f.name
        WHEN f.contact_email IS NOT NULL THEN '🏥 ' || f.contact_email
        ELSE '🏥 Facility ' || SUBSTRING(t.facility_id::text, 1, 8)
    END as dispatcher_display
FROM trips t
LEFT JOIN facilities f ON t.facility_id = f.id
WHERE t.facility_id::text LIKE 'e1b94bde%'
ORDER BY t.created_at DESC
LIMIT 3;

-- =====================================================
-- 6️⃣ GENERATE THE EXACT FIX NEEDED
-- =====================================================
SELECT 
    '=== SOLUTION SQL COMMANDS ===' as section,
    'UPDATE facilities SET name = ''CareBridge Living'' WHERE id = ''' || id || ''';' as fix_command,
    'This will fix the facility name issue' as description
FROM facilities 
WHERE id::text LIKE 'e1b94bde%';

-- =====================================================
-- 7️⃣ FINAL DIAGNOSIS
-- =====================================================
SELECT 
    '=== FINAL DIAGNOSIS ===' as section,
    COUNT(*) as total_facilities,
    COUNT(CASE WHEN name IS NULL OR name = '' THEN 1 END) as facilities_without_names,
    COUNT(CASE WHEN name = 'CareBridge Living' THEN 1 END) as carebridge_facilities,
    COUNT(CASE WHEN id::text LIKE 'e1b94bde%' THEN 1 END) as problematic_facility_exists,
    CASE 
        WHEN COUNT(CASE WHEN id::text LIKE 'e1b94bde%' AND (name IS NULL OR name = '') THEN 1 END) > 0 
        THEN '❌ PROBLEM: Facility e1b94bde has no name - UPDATE needed'
        WHEN COUNT(CASE WHEN id::text LIKE 'e1b94bde%' AND name != 'CareBridge Living' THEN 1 END) > 0
        THEN '⚠️ PROBLEM: Facility e1b94bde has wrong name - UPDATE needed'
        WHEN COUNT(CASE WHEN id::text LIKE 'e1b94bde%' AND name = 'CareBridge Living' THEN 1 END) > 0
        THEN '✅ GOOD: Facility e1b94bde has correct name - Check cache/deployment'
        ELSE '❓ UNKNOWN: Cannot find facility e1b94bde - Need more investigation'
    END as final_diagnosis
FROM facilities;
