import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OneSignal credentials for dispatcher app
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID || 'ff9262e5-fe8a-4b14-827f-d67232a4c688';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

// Send push notification via OneSignal API
async function sendOneSignalNotification(userIds, title, body, data = {}) {
  // First try with external_id targeting (for users who have logged in via OneSignal.login())
  const targetedMessage = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: {
      external_id: userIds,
    },
    target_channel: 'push',
    headings: { en: title },
    contents: { en: body },
    data: data,
    android_channel_id: 'default',
    priority: 10,
  };

  try {
    console.log('📤 Sending OneSignal notification to users:', userIds);

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(targetedMessage),
    });

    const result = await response.json();
    console.log('📨 OneSignal targeted response:', result);

    // If all aliases are invalid, fallback to sending to all subscribed users
    if (result.errors?.invalid_aliases) {
      console.log('⚠️ Invalid aliases detected, falling back to All segment');

      const broadcastMessage = {
        app_id: ONESIGNAL_APP_ID,
        included_segments: ['All'],
        headings: { en: title },
        contents: { en: body },
        data: data,
        android_channel_id: 'default',
        priority: 10,
      };

      const broadcastResponse = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(broadcastMessage),
      });

      const broadcastResult = await broadcastResponse.json();
      console.log('📨 OneSignal broadcast response:', broadcastResult);
      return { ...broadcastResult, fallback: true };
    }

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
async function getDispatcherUserIds() {
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
async function getDispatcherPushTokens() {
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

      default:
        title = '📋 Trip Notification';
        body = `Trip status changed`;
    }

    const notificationData = {
      type: 'trip',
      tripId: tripId,
      action: action,
      source: source || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // 1. Send via OneSignal (primary method for dispatcher_mobile)
    const dispatcherIds = await getDispatcherUserIds();
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

    // 2. Also send via Expo Push (for backward compatibility)
    const dispatchers = await getDispatcherPushTokens();
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
