import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * Send Push Notification to Facility Users
 *
 * Called when dispatcher sends a message or updates trip status
 */
export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await request.json();

    const {
      facilityId,
      userId, // Optional: specific user
      title,
      body: notificationBody,
      data = {}
    } = body;

    console.log('📤 Dispatcher sending push to facility:', { facilityId, userId, title });

    if (!facilityId || !title || !notificationBody) {
      return NextResponse.json(
        { error: 'Missing required fields: facilityId, title, body' },
        { status: 400 }
      );
    }

    // Get push tokens for the facility users
    let query = supabase
      .from('facility_push_tokens')
      .select('user_id, push_token, platform')
      .eq('facility_id', facilityId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (tokenError) {
      console.error('❌ Error fetching push tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch push tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('⚠️ No push tokens found for facility:', facilityId);
      // Still save to database even if no push tokens
      await saveNotificationToDatabase(supabase, facilityId, userId, title, notificationBody, data);
      return NextResponse.json(
        { message: 'No push tokens found, saved to database only', sent: 0 },
        { status: 200 }
      );
    }

    console.log(`📱 Found ${tokens.length} push token(s)`);

    // Filter out LOCAL_NOTIFICATIONS_ONLY tokens
    const validTokens = tokens.filter(t =>
      t.push_token &&
      t.push_token !== 'LOCAL_NOTIFICATIONS_ONLY' &&
      t.push_token.startsWith('ExponentPushToken[')
    );

    if (validTokens.length === 0) {
      console.log('⚠️ No valid Expo push tokens, saving to database only');
      await saveNotificationToDatabase(supabase, facilityId, userId, title, notificationBody, data);
      return NextResponse.json(
        { message: 'No valid Expo push tokens, saved to database', sent: 0 },
        { status: 200 }
      );
    }

    console.log(`✅ Sending to ${validTokens.length} valid token(s)`);

    // Prepare push notification messages
    const messages = validTokens.map(token => ({
      to: token.push_token,
      sound: 'default',
      title: title,
      body: notificationBody,
      data: {
        ...data,
        facilityId,
      },
      priority: 'high',
      channelId: 'default',
      badge: 1,
    }));

    // Send to Expo Push API
    const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!expoPushResponse.ok) {
      throw new Error(`Expo Push API returned ${expoPushResponse.status}`);
    }

    const expoPushResult = await expoPushResponse.json();
    console.log('📨 Expo Push API response:', expoPushResult);

    // Save notification to database for each user
    await saveNotificationToDatabase(supabase, facilityId, userId, title, notificationBody, data, validTokens);

    // Check for errors in Expo response
    const errors = expoPushResult.data?.filter(result => result.status === 'error') || [];
    if (errors.length > 0) {
      console.error('❌ Some push notifications failed:', errors);
    }

    return NextResponse.json({
      success: true,
      sent: validTokens.length,
      results: expoPushResult.data,
    });

  } catch (error) {
    console.error('❌ Error in send-facility-push API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function saveNotificationToDatabase(supabase, facilityId, userId, title, body, data, tokens = null) {
  try {
    let userIds = [];

    if (userId) {
      userIds = [userId];
    } else if (tokens && tokens.length > 0) {
      userIds = tokens.map(t => t.user_id);
    } else {
      // Get all users for the facility
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('facility_id', facilityId);

      if (profiles) {
        userIds = profiles.map(p => p.id);
      }
    }

    if (userIds.length === 0) {
      console.log('⚠️ No users found to save notification for');
      return;
    }

    const notificationInserts = userIds.map(uid => ({
      user_id: uid,
      facility_id: facilityId,
      title: title,
      body: body,
      data: data,
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('facility_notifications')
      .insert(notificationInserts);

    if (insertError) {
      console.error('❌ Error saving notifications to database:', insertError);
    } else {
      console.log(`✅ Saved ${notificationInserts.length} notification(s) to database`);
    }
  } catch (error) {
    console.error('❌ Error in saveNotificationToDatabase:', error);
  }
}
