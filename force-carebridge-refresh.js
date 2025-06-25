/**
 * FORCE REFRESH SCRIPT - Run this in browser console to force data refresh
 * Use this on the dispatcher dashboard if hard refresh doesn't work
 */

async function forceDataRefresh() {
    console.log('🔄 FORCING CAREBRIDGE LIVING DATA REFRESH');
    console.log('========================================');
    
    try {
        // Clear localStorage
        console.log('1️⃣ Clearing localStorage...');
        localStorage.clear();
        
        // Clear sessionStorage  
        console.log('2️⃣ Clearing sessionStorage...');
        sessionStorage.clear();
        
        // Clear any cached data
        if ('caches' in window) {
            console.log('3️⃣ Clearing cache storage...');
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        // Force reload with cache bypass
        console.log('4️⃣ Force reloading page...');
        window.location.reload(true);
        
    } catch (error) {
        console.error('❌ Error during refresh:', error);
        console.log('🔄 Falling back to normal reload...');
        window.location.reload();
    }
}

// Auto-run the refresh
console.log('🎯 CAREBRIDGE LIVING CACHE FIX');
console.log('This will clear all cached data and force refresh');
console.log('Expected result: "🏥 CareBridge Living" instead of "🏥 Facility e1b94bde"');

forceDataRefresh();
