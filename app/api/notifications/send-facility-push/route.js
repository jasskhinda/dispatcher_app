import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// OneSignal credentials for facility app
const ONESIGNAL_FACILITY_APP_ID = process.env.ONESIGNAL_FACILITY_APP_ID || '142adebf-6670-4617-b4f7-1087b795ed8a';
const ONESIGNAL_FACILITY_REST_API_KEY = process.env.ONESIGNAL_FACILITY_REST_API_KEY;

/**
 * Send Push Notification to Facility Users
 *
 * Called when dispatcher sends a message or updates trip status
 */
export async function POST(request) {
  const supabase = getSupabase();

  try {
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

    const notificationData = {
      ...data,
      facilityId,
      timestamp: new Date().toISOString(),
    };

    // 1. Save notification to database for facility users
    await saveNotificationToDatabase(supabase, facilityId, userId, title, notificationBody, data);

    // 2. Send via OneSignal
    let oneSignalResult = null;

    if (ONESIGNAL_FACILITY_REST_API_KEY) {
      // Build the OneSignal message
      // If userId is provided, target that specific user
      // Otherwise, target all users with app_type=facility tag
      let oneSignalMessage;

      if (userId) {
        // Target specific user by external_id
        oneSignalMessage = {
          app_id: ONESIGNAL_FACILITY_APP_ID,
          include_aliases: {
            external_id: [userId]
          },
          target_channel: 'push',
          headings: { en: title },
          contents: { en: notificationBody },
          data: notificationData,
          priority: 10,
          ios_sound: 'default',
        };
      } else {
        // Target all facility users for this facility using tags
        oneSignalMessage = {
          app_id: ONESIGNAL_FACILITY_APP_ID,
          filters: [
            { field: 'tag', key: 'facility_id', relation: '=', value: facilityId }
          ],
          headings: { en: title },
          contents: { en: notificationBody },
          data: notificationData,
          priority: 10,
          ios_sound: 'default',
        };
      }

      try {
        console.log('📤 Sending OneSignal notification to facility:', facilityId);

        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Key ${ONESIGNAL_FACILITY_REST_API_KEY}`,
          },
          body: JSON.stringify(oneSignalMessage),
        });

        oneSignalResult = await response.json();
        console.log('📨 OneSignal response:', oneSignalResult);
      } catch (error) {
        console.error('❌ Error sending OneSignal notification:', error);
      }
    } else {
      console.log('⚠️ ONESIGNAL_FACILITY_REST_API_KEY not configured');
    }

    // 3. Also try Expo Push as fallback if user has a push token
    let expoPushSent = false;

    // Get push tokens for the facility users
    let query = supabase
      .from('facility_push_tokens')
      .select('user_id, push_token, platform')
      .eq('facility_id', facilityId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error: tokenError } = await query;

    if (!tokenError && tokens && tokens.length > 0) {
      // Filter for valid Expo tokens
      const validTokens = tokens.filter(t =>
        t.push_token &&
        t.push_token !== 'LOCAL_NOTIFICATIONS_ONLY' &&
        t.push_token.startsWith('ExponentPushToken[')
      );

      if (validTokens.length > 0) {
        console.log(`📱 Also sending to ${validTokens.length} Expo push token(s) as fallback`);

        const messages = validTokens.map(token => ({
          to: token.push_token,
          sound: 'default',
          title: title,
          body: notificationBody,
          data: notificationData,
          priority: 'high',
          channelId: 'default',
          badge: 1,
        }));

        try {
          const expoPushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Accept-Encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
          });

          if (expoPushResponse.ok) {
            const expoPushResult = await expoPushResponse.json();
            console.log('📨 Expo Push API response:', expoPushResult);
            expoPushSent = true;
          }
        } catch (error) {
          console.error('❌ Error sending Expo push notification:', error);
        }
      }
    }

    return NextResponse.json({
      success: true,
      oneSignal: oneSignalResult,
      expoPush: expoPushSent,
    });

  } catch (error) {
    console.error('❌ Error in send-facility-push API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function saveNotificationToDatabase(supabase, facilityId, userId, title, body, data) {
  try {
    let userIds = [];

    if (userId) {
      userIds = [userId];
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
