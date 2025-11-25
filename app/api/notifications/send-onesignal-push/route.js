import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// OneSignal credentials for dispatcher app
const ONESIGNAL_APP_ID = 'ff9262e5-fe8a-4b14-827f-d67232a4c688';
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || 'os_v2_app_76jgfzp6rjfrjat72zzdfjggrckntqcjxdcu5mn3ovsn5rcxkaf77pyvdzg2a7wxhnzdxqaat2kolgqvngrebm4jqvv54l2di4bku4y';

// Send push notification via OneSignal API
async function sendOneSignalNotification(userIds, title, body, data = {}) {
  const message = {
    app_id: ONESIGNAL_APP_ID,
    include_aliases: {
      external_id: userIds, // Array of user IDs that logged in via OneSignal.login()
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
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('📨 OneSignal response:', result);

    if (result.errors) {
      console.error('❌ OneSignal errors:', result.errors);
    }

    return result;
  } catch (error) {
    console.error('❌ Error sending OneSignal notification:', error);
    throw error;
  }
}

// Get all dispatcher user IDs
async function getDispatcherUserIds() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .in('role', ['dispatcher', 'admin']);

  if (error) {
    console.error('Error fetching dispatcher IDs:', error);
    return [];
  }

  return data.map(d => d.id);
}

export async function POST(request) {
  try {
    const { tripId, action, tripDetails, source } = await request.json();

    console.log('📱 Sending OneSignal dispatcher notifications:', { tripId, action, source });

    // Get all dispatcher user IDs
    const dispatcherIds = await getDispatcherUserIds();

    if (dispatcherIds.length === 0) {
      console.log('No dispatchers found');
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

    // Send notification via OneSignal to all dispatchers
    const result = await sendOneSignalNotification(
      dispatcherIds,
      title,
      body,
      {
        type: 'trip',
        tripId: tripId,
        action: action,
        source: source || 'unknown',
        timestamp: new Date().toISOString(),
      }
    );

    // Also insert notification into database for in-app display
    const notificationInserts = dispatcherIds.map(userId => ({
      user_id: userId,
      title: title,
      body: body,
      app_type: 'dispatcher',
      data: {
        type: 'trip',
        tripId: tripId,
        action: action,
        source: source || 'unknown',
      },
      read: false,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('notifications')
      .insert(notificationInserts);

    if (insertError) {
      console.error('❌ Error saving notifications to database:', insertError);
    } else {
      console.log('✅ Notifications saved to database');
    }

    return NextResponse.json({
      success: true,
      oneSignalResult: result,
      dispatchersNotified: dispatcherIds.length,
    });

  } catch (error) {
    console.error('Error in send-onesignal-push:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
