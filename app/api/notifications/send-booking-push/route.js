import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// OneSignal credentials for booking app
// IMPORTANT: The booking app has its own OneSignal app, separate from dispatcher
const ONESIGNAL_BOOKING_APP_ID = 'ae7b0431-a892-437f-81ed-dda534b3d57d';
// Use dedicated booking REST API key, falling back to shared key if not set
const ONESIGNAL_BOOKING_REST_API_KEY = process.env.ONESIGNAL_BOOKING_REST_API_KEY;

/**
 * Send Push Notification to Booking App Users
 *
 * Called when dispatcher updates trip status for a booking user's trip
 */
export async function POST(request) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { userId, tripId, action, title, body: notificationBody, data = {} } = body;

    console.log('📤 Sending push to booking user:', { userId, tripId, action });

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    // Generate title and body if not provided
    let finalTitle = title;
    let finalBody = notificationBody;

    if (!finalTitle || !finalBody) {
      switch (action) {
        case 'created':
        case 'new':
          finalTitle = '🚗 New Trip Created';
          finalBody = 'A dispatcher has created a trip for you';
          break;
        case 'approved':
        case 'upcoming':
          finalTitle = '✅ Trip Approved';
          finalBody = 'Your trip has been approved and scheduled!';
          break;
        case 'assigned':
          finalTitle = '🚗 Driver Assigned';
          finalBody = 'A driver has been assigned to your trip';
          break;
        case 'in_progress':
          finalTitle = '🛣️ Trip In Progress';
          finalBody = 'Your trip is now in progress';
          break;
        case 'completed':
          finalTitle = '✅ Trip Completed';
          finalBody = 'Your trip has been completed. Thank you for using our service!';
          break;
        case 'cancelled':
          finalTitle = '❌ Trip Cancelled';
          finalBody = 'Your trip has been cancelled';
          break;
        case 'rejected':
          finalTitle = '❌ Trip Request Denied';
          finalBody = 'Unfortunately, your trip request could not be accommodated at this time.';
          break;
        default:
          finalTitle = '📋 Trip Update';
          finalBody = 'Your trip status has been updated';
      }
    }

    const notificationData = {
      type: 'trip',
      tripId: tripId,
      action: action,
      ...data,
      timestamp: new Date().toISOString(),
    };

    // 1. Save notification to database for the user
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        app_type: 'booking',
        notification_type: 'trip',
        title: finalTitle,
        body: finalBody,
        data: notificationData,
        read: false,
      });

    if (dbError) {
      console.error('❌ Error saving notification to database:', dbError);
    } else {
      console.log('✅ Saved notification to database for user:', userId);
    }

    // 2. Send via OneSignal using external_user_id filter
    let oneSignalResult = null;

    if (ONESIGNAL_BOOKING_REST_API_KEY) {
      const oneSignalMessage = {
        app_id: ONESIGNAL_BOOKING_APP_ID,
        include_aliases: {
          external_id: [userId]
        },
        target_channel: 'push',
        headings: { en: finalTitle },
        contents: { en: finalBody },
        data: notificationData,
        priority: 10,
        ios_sound: 'default',
      };

      try {
        console.log('📤 Sending OneSignal notification to booking user:', userId);

        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Key ${ONESIGNAL_BOOKING_REST_API_KEY}`,
          },
          body: JSON.stringify(oneSignalMessage),
        });

        oneSignalResult = await response.json();
        console.log('📨 OneSignal response:', oneSignalResult);
      } catch (error) {
        console.error('❌ Error sending OneSignal notification:', error);
      }
    } else {
      console.log('⚠️ ONESIGNAL_BOOKING_REST_API_KEY not configured - get it from OneSignal dashboard for booking app');
    }

    // 3. Also try Expo Push if user has a push token
    let expoPushSent = false;
    const { data: pushToken } = await supabase
      .from('push_tokens')
      .select('push_token')
      .eq('user_id', userId)
      .eq('app_type', 'booking')
      .single();

    if (pushToken?.push_token &&
        pushToken.push_token.startsWith('ExponentPushToken[')) {
      try {
        const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: pushToken.push_token,
            sound: 'default',
            title: finalTitle,
            body: finalBody,
            data: notificationData,
            priority: 'high',
          }),
        });

        const expoResult = await expoResponse.json();
        console.log('📨 Expo Push result:', expoResult);
        expoPushSent = true;
      } catch (error) {
        console.error('❌ Error sending Expo push notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      oneSignal: oneSignalResult,
      expoPush: expoPushSent,
      savedToDatabase: !dbError,
    });

  } catch (error) {
    console.error('❌ Error in send-booking-push API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
