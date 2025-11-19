import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Send push notification via Expo Push API
async function sendPushNotification(expoPushToken, title, body, data = {}) {
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
    console.log('Push notification sent:', result);
    return result;
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
}

// Get all dispatcher push tokens
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

    // Get all dispatcher push tokens
    const dispatchers = await getDispatcherPushTokens();

    if (dispatchers.length === 0) {
      console.log('No dispatchers with push tokens found');
      return NextResponse.json(
        { success: true, message: 'No dispatchers to notify' },
        { status: 200 }
      );
    }

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
        body = `Trip #${tripId} has been approved`;
        break;

      case 'upcoming':
        title = '📅 Trip Upcoming';
        body = `Trip #${tripId} is now upcoming`;
        break;

      case 'completed':
        title = '✓ Trip Completed';
        body = `Trip #${tripId} has been completed`;
        break;

      case 'cancelled':
      case 'canceled':
        title = '❌ Trip Cancelled';
        body = `Trip #${tripId} has been cancelled`;
        break;

      case 'driver_assigned':
        title = '👤 Driver Assigned';
        body = `Driver assigned to trip #${tripId}`;
        break;

      case 'updated':
        title = '✏️ Trip Updated';
        body = `Trip #${tripId} has been updated`;
        break;

      default:
        title = '📋 Trip Notification';
        body = `Trip #${tripId} status changed`;
    }

    // Send notifications to all dispatchers
    const notificationPromises = dispatchers.map(dispatcher =>
      sendPushNotification(
        dispatcher.expo_push_token,
        title,
        body,
        {
          type: 'trip',
          tripId: tripId,
          action: action,
          source: source || 'unknown',
          timestamp: new Date().toISOString(),
        }
      )
    );

    const results = await Promise.allSettled(notificationPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Sent ${successful} notifications, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: dispatchers.length,
    });

  } catch (error) {
    console.error('Error in send-dispatcher-push:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
