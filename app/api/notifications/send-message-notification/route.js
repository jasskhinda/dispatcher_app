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

export async function POST(request) {
  try {
    const { conversationId, senderName, message, senderRole } = await request.json();

    console.log('📨 Sending message notification:', { conversationId, senderName, senderRole });

    // Only send to dispatchers if sender is facility
    if (senderRole !== 'facility') {
      return NextResponse.json(
        { success: true, message: 'No notifications needed for dispatcher-sent messages' },
        { status: 200 }
      );
    }

    // Get all dispatcher push tokens
    const { data: dispatchers, error } = await supabase
      .from('profiles')
      .select('expo_push_token, first_name, last_name')
      .in('role', ['dispatcher', 'admin'])
      .eq('push_notifications_enabled', true)
      .not('expo_push_token', 'is', null);

    if (error) {
      console.error('Error fetching dispatcher tokens:', error);
      return NextResponse.json(
        { error: 'Failed to fetch dispatcher tokens' },
        { status: 500 }
      );
    }

    if (!dispatchers || dispatchers.length === 0) {
      console.log('No dispatchers with push tokens found');
      return NextResponse.json(
        { success: true, message: 'No dispatchers to notify' },
        { status: 200 }
      );
    }

    const title = `💬 New Message from ${senderName}`;
    const body = message.length > 100 ? message.substring(0, 100) + '...' : message;

    // Send notifications to all dispatchers
    const notificationPromises = dispatchers.map(dispatcher =>
      sendPushNotification(
        dispatcher.expo_push_token,
        title,
        body,
        {
          type: 'message',
          conversationId: conversationId,
          senderName: senderName,
          timestamp: new Date().toISOString(),
        }
      )
    );

    const results = await Promise.allSettled(notificationPromises);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ Sent ${successful} message notifications, ${failed} failed`);

    return NextResponse.json({
      success: true,
      sent: successful,
      failed: failed,
      total: dispatchers.length,
    });

  } catch (error) {
    console.error('Error in send-message-notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications', details: error.message },
      { status: 500 }
    );
  }
}
