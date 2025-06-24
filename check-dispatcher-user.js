// Quick test to verify dispatcher user exists in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://btzfgasugkycbavcwvnx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0emZnYXN1Z2t5Y2JhdmN3dm54Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYzNzA5MiwiZXhwIjoyMDYwMjEzMDkyfQ.kyMoPfYsqEXPkCBqe8Au435teJA0Q3iQFEMt4wDR_yA';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDispatcherUser() {
    console.log('🔍 Checking for dispatcher user...');
    
    try {
        // Check auth.users table
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
        
        if (authError) {
            console.error('❌ Error fetching auth users:', authError);
            return;
        }
        
        console.log(`📊 Total auth users: ${authUsers.users.length}`);
        
        const dispatcherUser = authUsers.users.find(user => 
            user.email === 'dispatcher_test@compassionatecaretransportation.com'
        );
        
        if (dispatcherUser) {
            console.log('✅ Dispatcher user found in auth.users:');
            console.log(`   - ID: ${dispatcherUser.id}`);
            console.log(`   - Email: ${dispatcherUser.email}`);
            console.log(`   - Created: ${dispatcherUser.created_at}`);
            console.log(`   - Email Confirmed: ${dispatcherUser.email_confirmed_at ? '✅' : '❌'}`);
            console.log(`   - Last Sign In: ${dispatcherUser.last_sign_in_at || 'Never'}`);
            
            // Check profiles table
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', dispatcherUser.id)
                .single();
                
            if (profileError) {
                console.log('❌ No profile found:', profileError.message);
                
                // Create profile for dispatcher user
                console.log('🔧 Creating profile for dispatcher user...');
                const { data: newProfile, error: createError } = await supabase
                    .from('profiles')
                    .insert({
                        id: dispatcherUser.id,
                        email: dispatcherUser.email,
                        role: 'dispatcher',
                        first_name: 'Dispatcher',
                        last_name: 'Test',
                        full_name: 'Dispatcher Test'
                    })
                    .select()
                    .single();
                    
                if (createError) {
                    console.error('❌ Error creating profile:', createError);
                } else {
                    console.log('✅ Profile created successfully:', newProfile);
                }
            } else {
                console.log('✅ Profile found:');
                console.log(`   - Role: ${profile.role}`);
                console.log(`   - Name: ${profile.full_name}`);
            }
            
        } else {
            console.log('❌ Dispatcher user NOT found in auth.users');
            console.log('📋 Available users:');
            authUsers.users.forEach(user => {
                console.log(`   - ${user.email} (${user.id})`);
            });
            
            // Create the dispatcher user
            console.log('🔧 Creating dispatcher user...');
            const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
                email: 'dispatcher_test@compassionatecaretransportation.com',
                password: 'dispatcher_test',
                email_confirm: true
            });
            
            if (createError) {
                console.error('❌ Error creating user:', createError);
            } else {
                console.log('✅ Dispatcher user created successfully:', newUser);
            }
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

checkDispatcherUser();
