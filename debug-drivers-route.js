// Debug script to test drivers route
// Run this in the browser console on your production site

console.log('=== DEBUGGING DRIVERS ROUTE ===');

// Test 1: Check if the route exists
fetch('/drivers', { method: 'HEAD' })
  .then(response => {
    console.log('Route status:', response.status);
    console.log('Route headers:', [...response.headers.entries()]);
  })
  .catch(error => console.error('Route test failed:', error));

// Test 2: Check current user profile
fetch('/api/debug/profile', {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' }
})
  .then(response => response.json())
  .then(data => console.log('User profile:', data))
  .catch(error => console.error('Profile check failed:', error));

// Test 3: Try to access drivers page with fetch
fetch('/drivers')
  .then(response => {
    console.log('Drivers page response status:', response.status);
    console.log('Drivers page final URL:', response.url);
    return response.text();
  })
  .then(html => {
    if (html.includes('dashboard')) {
      console.log('ISSUE: Drivers page returned dashboard content');
    } else if (html.includes('driver')) {
      console.log('SUCCESS: Drivers page returned driver content');
    } else {
      console.log('UNKNOWN: Drivers page returned unexpected content');
    }
  })
  .catch(error => console.error('Drivers page test failed:', error));

console.log('=== DEBUG COMPLETE ===');