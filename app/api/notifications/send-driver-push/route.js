import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// OneSignal credentials for driver app
// IMPORTANT: The driver app has its own OneSignal app, separate from dispatcher
const ONESIGNAL_DRIVER_APP_ID = '3dddb13c-3657-4e87-810c-38bf2dac5245';
const ONESIGNAL_DRIVER_REST_API_KEY = process.env.ONESIGNAL_DRIVER_REST_API_KEY;

/**
 * Send Push Notification to Driver App Users
 *
 * Called when dispatcher assigns a trip to a driver or updates driver-related trip status
 */
export async function POST(request) {
  const supabase = getSupabase();

  try {
    const body = await request.json();
    const { driverId, tripId, action, title, body: notificationBody, data = {} } = body;

    console.log('📤 Sending push to driver:', { driverId, tripId, action });

    if (!driverId) {
      return NextResponse.json(
        { error: 'Missing required field: driverId' },
        { status: 400 }
      );
    }

    // Generate title and body if not provided
    let finalTitle = title;
    let finalBody = notificationBody;

    if (!finalTitle || !finalBody) {
      switch (action) {
        case 'assigned':
        case 'trip_assigned':
          finalTitle = '🚗 New Trip Assigned';
          finalBody = data.pickupAddress
            ? `You have been assigned a trip to ${data.pickupAddress.split(',')[0]}`
            : 'You have been assigned a new trip';
          break;
        case 'unassigned':
          finalTitle = '❌ Trip Unassigned';
          finalBody = 'You have been removed from a trip';
          break;
        case 'trip_updated':
          finalTitle = '📝 Trip Updated';
          finalBody = 'Trip details have been updated. Please review.';
          break;
        case 'trip_cancelled':
          finalTitle = '❌ Trip Cancelled';
          finalBody = 'A trip you were assigned to has been cancelled';
          break;
        case 'reminder':
          finalTitle = '⏰ Trip Reminder';
          finalBody = data.pickupAddress
            ? `Your trip to ${data.pickupAddress.split(',')[0]} is coming up soon`
            : 'You have an upcoming trip';
          break;
        default:
          finalTitle = '📋 Trip Update';
          finalBody = 'You have a trip update';
      }
    }

    const notificationData = {
      type: 'trip',
      tripId: tripId,
      action: action,
      ...data,
      timestamp: new Date().toISOString(),
    };

    // 1. Save notification to database for the driver
    const { error: dbError } = await supabase
      .from('notifications')
      .insert({
        user_id: driverId,
        app_type: 'driver',
        notification_type: 'trip',
        title: finalTitle,
        body: finalBody,
        data: notificationData,
        read: false,
      });

    if (dbError) {
      console.error('❌ Error saving notification to database:', dbError);
    } else {
      console.log('✅ Saved notification to database for driver:', driverId);
    }

    // 2. Send via OneSignal using external_user_id filter
    let oneSignalResult = null;

    if (ONESIGNAL_DRIVER_REST_API_KEY) {
      const oneSignalMessage = {
        app_id: ONESIGNAL_DRIVER_APP_ID,
        include_aliases: {
          external_id: [driverId]
        },
        target_channel: 'push',
        headings: { en: finalTitle },
        contents: { en: finalBody },
        data: notificationData,
        priority: 10,
        ios_sound: 'default',
      };

      try {
        console.log('📤 Sending OneSignal notification to driver:', driverId);

        const response = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `Key ${ONESIGNAL_DRIVER_REST_API_KEY}`,
          },
          body: JSON.stringify(oneSignalMessage),
        });

        oneSignalResult = await response.json();
        console.log('📨 OneSignal response:', oneSignalResult);
      } catch (error) {
        console.error('❌ Error sending OneSignal notification:', error);
      }
    } else {
      console.log('⚠️ ONESIGNAL_DRIVER_REST_API_KEY not configured - get it from OneSignal dashboard for driver app');
    }

    // 3. Also try Expo Push if driver has a push token
    let expoPushSent = false;
    const { data: pushToken } = await supabase
      .from('push_tokens')
      .select('push_token')
      .eq('user_id', driverId)
      .eq('app_type', 'driver')
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
    console.error('❌ Error in send-driver-push API:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
