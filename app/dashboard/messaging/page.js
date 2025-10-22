'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function MessagingPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [facilityDetails, setFacilityDetails] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [joining, setJoining] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  const supabase = createClientComponentClient();

  useEffect(() => {
    loadUserAndConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();

          if (payload.new.sender_type === 'facility') {
            markMessageAsRead(payload.new.id);
          }
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationSubscription = supabase
      .channel('conversation-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setSelectedConversation(payload.new);
          // Update in conversations list
          setConversations(prev =>
            prev.map(conv => conv.id === payload.new.id ? { ...conv, ...payload.new } : conv)
          );
        }
      )
      .subscribe();

    return () => {
      messagesSubscription.unsubscribe();
      conversationSubscription.unsubscribe();
    };
  }, [selectedConversation]);

  const loadUserAndConversations = async () => {
    try {
      setLoading(true);

      // Wait for session to be ready
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.log('❌ No session found, waiting...');
        // Retry after a short delay
        setTimeout(loadUserAndConversations, 500);
        return;
      }

      const user = session.user;
      setUser(user);
      console.log('✅ User authenticated:', user.email);

      // Check user profile and role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      console.log('👤 User role:', profileData?.role);

      // Load all conversations with facility details
      console.log('📋 Loading conversations...');
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          facilities (
            id,
            name,
            email,
            phone,
            address
          )
        `)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('❌ Error loading conversations:', convError);
        throw convError;
      }

      console.log('✅ Conversations loaded:', conversationsData?.length || 0);
      if (conversationsData && conversationsData.length > 0) {
        console.log('📝 First conversation:', conversationsData[0]);
      }

      // Load assigned dispatcher info separately if needed
      if (conversationsData) {
        for (const conv of conversationsData) {
          if (conv.assigned_dispatcher_id) {
            const { data: dispatcherData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', conv.assigned_dispatcher_id)
              .single();

            if (dispatcherData) {
              conv.assigned_dispatcher = dispatcherData;
            }
          }
        }
      }

      setConversations(conversationsData || []);

      // Auto-select first conversation
      if (conversationsData && conversationsData.length > 0) {
        selectConversation(conversationsData[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    try {
      setSelectedConversation(conversation);
      setFacilityDetails(conversation.facilities);

      // Load messages for this conversation
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(messagesData || []);

      // Mark unread messages as read
      const unreadMessages = messagesData?.filter(
        m => m.sender_type === 'facility' && !m.read_by_dispatcher
      );

      if (unreadMessages?.length > 0) {
        await supabase
          .from('messages')
          .update({ read_by_dispatcher: true })
          .in('id', unreadMessages.map(m => m.id));
      }

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleJoinConversation = async () => {
    if (!selectedConversation || joining) return;

    try {
      setJoining(true);

      const { error } = await supabase
        .from('conversations')
        .update({
          assigned_dispatcher_id: user.id,
          status: 'active'
        })
        .eq('id', selectedConversation.id);

      if (error) throw error;

      // Send automated join message
      await supabase.from('messages').insert({
        conversation_id: selectedConversation.id,
        sender_id: user.id,
        sender_type: 'dispatcher',
        message_text: '👋 Hello! I\'m here to help. How can I assist you today?',
        read_by_facility: false,
        read_by_dispatcher: true
      });

      // Update local state
      setSelectedConversation(prev => ({
        ...prev,
        assigned_dispatcher_id: user.id,
        status: 'active'
      }));
    } catch (error) {
      console.error('Error joining conversation:', error);
      alert('Failed to join conversation');
    } finally {
      setJoining(false);
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await supabase
        .from('messages')
        .update({ read_by_dispatcher: true })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sending) return;

    // Auto-join if not already assigned
    if (!selectedConversation.assigned_dispatcher_id) {
      await handleJoinConversation();
    }

    try {
      setSending(true);

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: user.id,
          sender_type: 'dispatcher',
          message_text: newMessage.trim(),
          read_by_facility: false,
          read_by_dispatcher: true
        });

      if (error) throw error;

      setNewMessage('');
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatConversationTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit'
      });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getStatusBadge = (status, rating) => {
    if (rating) {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
          ⭐ {rating}/5
        </span>
      );
    }
    if (status === 'active') {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Active</span>;
    }
    if (status === 'resolved') {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">Resolved</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-700">Waiting</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="h-full flex">
        {/* Conversations List */}
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            <p className="text-sm text-gray-500">Facility Communications</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="text-4xl mb-4">💬</p>
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full p-4 border-b border-gray-100 hover:bg-gray-50 text-left transition ${
                    selectedConversation?.id === conv.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {conv.facilities?.name || 'Unknown Facility'}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatConversationTime(conv.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    {getStatusBadge(conv.status, conv.rating)}
                    {conv.assigned_dispatcher && (
                      <span className="text-xs text-gray-500">
                        {conv.assigned_dispatcher.full_name}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header with Facility Details */}
              <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="font-semibold text-gray-900 text-lg">
                        {facilityDetails?.name || 'Unknown Facility'}
                      </h2>
                      {getStatusBadge(selectedConversation.status, selectedConversation.rating)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {facilityDetails?.email && (
                        <div className="text-gray-600">
                          <span className="font-medium">Email:</span> {facilityDetails.email}
                        </div>
                      )}
                      {facilityDetails?.phone && (
                        <div className="text-gray-600">
                          <span className="font-medium">Phone:</span> {facilityDetails.phone}
                        </div>
                      )}
                      {facilityDetails?.address && (
                        <div className="text-gray-600 col-span-2">
                          <span className="font-medium">Address:</span> {facilityDetails.address}
                        </div>
                      )}
                    </div>
                  </div>
                  {!selectedConversation.assigned_dispatcher_id && selectedConversation.status !== 'resolved' && (
                    <button
                      onClick={handleJoinConversation}
                      disabled={joining}
                      className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                    >
                      {joining ? 'Joining...' : 'Join Conversation'}
                    </button>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <p className="text-6xl mb-4">💬</p>
                      <p className="text-lg">No messages yet</p>
                      <p className="text-sm">Start the conversation by joining and sending a message</p>
                    </div>
                  </div>
                ) : (
                  messages.map(message => {
                    const isDispatcher = message.sender_type === 'dispatcher';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isDispatcher ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                            isDispatcher
                              ? 'bg-teal-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-900 shadow-sm rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed">{message.message_text}</p>
                          <p
                            className={`text-xs mt-1 ${
                              isDispatcher ? 'text-teal-100' : 'text-gray-500'
                            }`}
                          >
                            {formatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {selectedConversation.status !== 'resolved' ? (
                <form onSubmit={sendMessage} className="bg-white border-t border-gray-200 p-4">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      maxLength={500}
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition font-medium"
                    >
                      {sending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-gray-100 border-t border-gray-200 p-4 text-center text-gray-600">
                  <p className="text-sm">
                    This conversation has been resolved and rated by the facility.
                    {selectedConversation.feedback && (
                      <span className="block mt-2 italic">
                        "{selectedConversation.feedback}"
                      </span>
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <p className="text-6xl mb-4">💬</p>
                <p className="text-lg">Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
