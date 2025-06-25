// Simple test to check Supabase connection and query facilities
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MzcwOTIsImV4cCI6MjA2MDIxMzA5Mn0.FQtQXKvkBLVtmCqShLyg_y9EDPrufyWQnbD8EE25zSU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('🔍 Testing Supabase connection...');
    
    try {
        // Test basic connection
        const { data, error } = await supabase
            .from('facilities')
            .select('id, name')
            .limit(5);
            
        if (error) {
            console.error('❌ Error:', error);
            return;
        }
        
        console.log('✅ Connection successful!');
        console.log('📊 Sample facilities:', data);
        
        // Test the specific facility ID
        const targetId = 'e1b94bde-d092-4ce6-b78c-9cff1d0118a3';
        const { data: facility, error: facilityError } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', targetId)
            .single();
            
        if (facilityError) {
            console.log('❌ Target facility not found:', facilityError.message);
        } else {
            console.log('✅ Target facility found:', facility);
        }
        
    } catch (err) {
        console.error('💥 Connection failed:', err);
    }
}

testConnection();
