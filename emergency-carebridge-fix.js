/**
 * EMERGENCY FRONTEND FIX FOR CAREBRIDGE LIVING
 * This script fixes the display on the current page if the data is correct but display is cached
 */

function emergencyCareBridgeFix() {
    console.log('🚨 EMERGENCY CAREBRIDGE LIVING FRONTEND FIX');
    console.log('==========================================');
    
    try {
        // Find all elements that contain "🏥 Facility e1b94bde"
        const facilityElements = Array.from(document.querySelectorAll('*'))
            .filter(el => {
                const text = el.textContent || '';
                return text.includes('🏥 Facility e1b94bde') || 
                       text.includes('Facility e1b94bde');
            });
            
        console.log(`Found ${facilityElements.length} elements to fix`);
        
        let fixCount = 0;
        
        facilityElements.forEach((element, index) => {
            const originalText = element.textContent;
            
            // Replace the problematic text
            if (originalText.includes('🏥 Facility e1b94bde')) {
                element.textContent = originalText.replace('🏥 Facility e1b94bde', '🏥 CareBridge Living');
                fixCount++;
                console.log(`Fixed element ${index + 1}: "${originalText}" → "${element.textContent}"`);
            } else if (originalText.includes('Facility e1b94bde')) {
                element.textContent = originalText.replace('Facility e1b94bde', 'CareBridge Living');
                fixCount++;
                console.log(`Fixed element ${index + 1}: "${originalText}" → "${element.textContent}"`);
            }
        });
        
        if (fixCount > 0) {
            console.log(`✅ Successfully fixed ${fixCount} elements!`);
            console.log('🎉 CareBridge Living should now display correctly on this page');
            console.log('⚠️ Note: This is a temporary fix. Refresh the page to see if the permanent fix is working.');
        } else {
            console.log('ℹ️ No elements found that need fixing');
            console.log('Either the page doesn\'t contain CareBridge Living trips or they\'re already fixed');
        }
        
        // Also fix any innerHTML that might contain the text
        const allElements = document.querySelectorAll('*');
        let htmlFixCount = 0;
        
        allElements.forEach(el => {
            if (el.innerHTML && el.innerHTML.includes('Facility e1b94bde')) {
                el.innerHTML = el.innerHTML.replace(/Facility e1b94bde/g, 'CareBridge Living');
                htmlFixCount++;
            }
        });
        
        if (htmlFixCount > 0) {
            console.log(`✅ Also fixed ${htmlFixCount} HTML elements`);
        }
        
        console.log('');
        console.log('🔍 VERIFICATION:');
        const verifyText = document.body.innerText;
        if (verifyText.includes('🏥 CareBridge Living')) {
            console.log('✅ SUCCESS: Page now shows "🏥 CareBridge Living"');
        } else if (verifyText.includes('CareBridge Living')) {
            console.log('⚠️ PARTIAL: Page shows "CareBridge Living" but missing 🏥 icon');
        } else {
            console.log('❌ FAILED: CareBridge Living still not visible');
        }
        
    } catch (error) {
        console.error('❌ Emergency fix failed:', error);
    }
}

// Auto-run the emergency fix
emergencyCareBridgeFix();
