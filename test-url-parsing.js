// Test URL parsing logic
const facilityMonth = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3-2025-06';

console.log('🔍 Testing URL parsing logic');
console.log('=====================================');
console.log('Input URL parameter:', facilityMonth);

// Parse the facilityMonth parameter to extract facility ID and target month
const parts = facilityMonth.split('-');
console.log('Split parts:', parts);

if (parts.length < 3) {
    console.error('❌ Invalid facilityMonth format');
} else {
    // Extract year and month (last two parts)
    const monthPart = parts.pop();
    const yearPart = parts.pop();
    const facilityId = parts.join('-');
    const targetMonth = `${yearPart}-${monthPart}`;
    
    console.log('Extracted values:');
    console.log('  Month part:', monthPart);
    console.log('  Year part:', yearPart);
    console.log('  Facility ID:', facilityId);
    console.log('  Target month:', targetMonth);
    
    // Expected facility ID should be: e1b94bde-d092-4ce6-b78c-9cff1d0118a3
    const expectedFacilityId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
    
    if (facilityId === expectedFacilityId) {
        console.log('✅ Facility ID parsing is correct!');
    } else {
        console.log('❌ Facility ID parsing issue:');
        console.log('  Expected:', expectedFacilityId);
        console.log('  Got:     ', facilityId);
    }
}
