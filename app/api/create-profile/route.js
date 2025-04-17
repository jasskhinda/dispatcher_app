import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/admin-supabase';

export async function POST(request) {
  try {
    console.log('Profile creation API called');
    
    // Extract data from the request
    const { id, email, firstName, lastName, phoneNumber, role } = await request.json();
    
    if (!id) {
      console.error('No user id provided');
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    console.log('Creating profile for user ID:', id);
    
    // Force the role to be 'dispatcher' for the signup flow
    const profileRole = 'dispatcher';
    
    console.log(`Setting profile role to ${profileRole} (overriding ${role} if provided)`);
    
    // First check if a profile already exists
    const { data: existingProfile, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', id)
      .single();
      
    if (checkError && !checkError.message.includes('No rows found')) {
      console.error('Error checking for existing profile:', checkError);
    }
    
    if (existingProfile) {
      console.log('Profile already exists, updating role if needed');
      
      // If profile exists but doesn't have dispatcher role, update it
      if (existingProfile.role !== profileRole) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({
            role: profileRole,
            email: email || existingProfile.email,
            first_name: firstName || existingProfile.first_name,
            last_name: lastName || existingProfile.last_name,
            phone_number: phoneNumber || existingProfile.phone_number,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);
          
        if (updateError) {
          console.error('Error updating existing profile:', updateError);
          return NextResponse.json(
            { error: `Failed to update profile: ${updateError.message}` },
            { status: 500 }
          );
        }
        
        console.log(`Profile updated with role: ${profileRole}`);
        return NextResponse.json({
          success: true,
          message: 'Profile updated successfully'
        });
      }
      
      console.log('Profile already has correct role, no update needed');
      return NextResponse.json({
        success: true,
        message: 'Profile already exists with correct role'
      });
    }
    
    console.log('Creating new profile with role:', profileRole);
    
    // Create profile record using admin client to bypass RLS
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert([
        {
          id,
          email,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
          role: profileRole, // Always use dispatcher role
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]);
    
    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json(
        { error: `Failed to create profile: ${profileError.message}` },
        { status: 500 }
      );
    }
    
    // Return success
    return NextResponse.json({
      success: true,
      message: 'Profile created successfully'
    });
  } catch (error) {
    console.error('Unexpected error in create-profile API:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}