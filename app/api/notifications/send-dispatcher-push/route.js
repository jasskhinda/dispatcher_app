import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client lazily to avoid build-time errors
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// OneSignal credentials for dispatcher app
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || 'ff9262e5-fe8a-4b14-827f-d67232a4c688';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Send push notification via OneSignal API
async function sendOneSignalNotification(userIds, title, body, data = {}) {
  // Use tag-based filtering to target dispatcher app users
  // The mobile app sets tags: app_type=dispatcher, role=dispatcher
  const tagFilterMessage = {
    app_id: ONESIGNAL_APP_ID,
    filters: [
      { field: 'tag', key: 'app_type', relation: '=', value: 'dispatcher' }
    ],
    headings: { en: title },
    contents: { en: body },
    data: data,
    priority: 10,
    ios_sound: 'default',
  };

  try {
    console.log('📤 Sending OneSignal notification to dispatcher app users');

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(tagFilterMessage),
    });

    const result = await response.json();
    console.log('📨 OneSignal response:', result);

    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    return { error: error.message };
  }
}

// Send push notification via Expo Push API (fallback for older clients)
async function sendExpoPushNotification(expoPushToken, title, body, data = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
    priority: 'high',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Expo Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending Expo push notification:', error);
    throw error;
  }
}

// Get all dispatcher user IDs (for OneSignal)
async function getDispatcherUserIds(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['dispatcher', 'admin']);

  if (error) {
    console.error('Error fetching dispatcher IDs:', error);
    return [];
  }

  return data.map(d => d.id);
}

// Get all dispatcher push tokens (for Expo fallback)
async function getDispatcherPushTokens(supabase) {
  const { data, error } = await supabase
    .from('profiles')
    .select('expo_push_token, first_name, last_name')
    .in('role', ['dispatcher', 'admin'])
    .eq('push_notifications_enabled', true)
    .not('expo_push_token', 'is', null);

  if (error) {
    console.error('Error fetching dispatcher tokens:', error);
    return [];
  }

  return data;
}

export async function POST(request) {
  const supabase = getSupabase();

  try {
    const { tripId, action, tripDetails, source } = await request.json();

    console.log('📱 Sending dispatcher notifications:', { tripId, action, source });

    // Create notification title and body based on action
    let title, body;

    switch (action) {
      case 'created':
      case 'new':
        title = '🚗 New Trip Request';
        body = `New ${source === 'booking_app' ? 'individual' : 'facility'} trip: ${tripDetails?.pickup_address || 'Unknown location'}`;
        break;

      case 'approved':
      case 'confirmed':
        title = '✅ Trip Approved';
        body = `Trip has been approved`;
        break;

      case 'upcoming':
        title = '📅 Trip Upcoming';
        body = `A trip is now upcoming`;
        break;

      case 'completed':
        title = '✓ Trip Completed';
        body = `A trip has been completed`;
        break;

      case 'cancelled':
      case 'canceled':
        title = '❌ Trip Cancelled';
        body = `A trip has been cancelled`;
        break;

      case 'driver_assigned':
        title = '👤 Driver Assigned';
        body = `Driver has been assigned to a trip`;
        break;

      case 'updated':
        title = '✏️ Trip Updated';
        body = `A trip has been updated`;
        break;

      case 'message':
        title = '💬 New Message';
        body = `${tripDetails?.facility_name || 'A facility'}: ${tripDetails?.message_preview || 'New message'}`;
        break;

      default:
        title = '📋 Trip Notification';
        body = `Trip status changed`;
    }

    const notificationData = {
      type: action === 'message' ? 'message' : 'trip',
      tripId: tripId,
      action: action,
      source: source || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // 1. Get all dispatcher user IDs
    const dispatcherIds = await getDispatcherUserIds(supabase);

    // 2. Save notifications to database for each dispatcher (for in-app notification list)
    if (dispatcherIds.length > 0) {
      const notificationRecords = dispatcherIds.map(userId => ({
        user_id: userId,
        app_type: 'dispatcher',
        notification_type: action === 'message' ? 'message' : 'trip',
        title: title,
        body: body,
        data: notificationData,
        read: false,
      }));

      const { error: dbError } = await supabase
        .from('notifications')
        .insert(notificationRecords);

      if (dbError) {
        console.error('Error saving notifications to database:', dbError);
      } else {
        console.log('✅ Saved notifications to database for', dispatcherIds.length, 'dispatchers');
      }
    }

    // 3. Send via OneSignal (primary method for dispatcher_mobile)
    let oneSignalResult = null;

    if (dispatcherIds.length > 0) {
      oneSignalResult = await sendOneSignalNotification(
        dispatcherIds,
        title,
        body,
        notificationData
      );
      console.log('✅ OneSignal notifications sent to', dispatcherIds.length, 'dispatchers');
    }

    // 4. Also send via Expo Push (for backward compatibility)
    const dispatchers = await getDispatcherPushTokens(supabase);
    let expoSuccessful = 0;
    let expoFailed = 0;

    if (dispatchers.length > 0) {
      const expoPromises = dispatchers.map(dispatcher =>
        sendExpoPushNotification(
          dispatcher.expo_push_token,
          title,
          body,
          notificationData
        )
      );

      const expoResults = await Promise.allSettled(expoPromises);
      expoSuccessful = expoResults.filter(r => r.status === 'fulfilled').length;
      expoFailed = expoResults.filter(r => r.status === 'rejected').length;
      console.log(`✅ Expo Push: ${expoSuccessful} sent, ${expoFailed} failed`);
    }

    return NextResponse.json({
      success: true,
      oneSignal: {
        dispatchersNotified: dispatcherIds.length,
        result: oneSignalResult,
      },
      expo: {
        sent: expoSuccessful,
        failed: expoFailed,
        total: dispatchers.length,
      },
    });

  } catch (error) {
    console.error('Error in send-dispatcher-push:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
