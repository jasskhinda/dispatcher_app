'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import DashboardLayout from '../../components/DashboardLayout';

export default function MessagingPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const messagesEndRef = useRef(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    loadUserAndConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    // Subscribe to new messages
    const subscription = supabase
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

          // Mark as read
          if (payload.new.sender_type === 'facility') {
            markMessageAsRead(payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedConversation]);

  const loadUserAndConversations = async () => {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Load all conversations
      const { data: conversationsData, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          facilities (
            id,
            name
          )
        `)
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;

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

  if (loading) {
    return (
      <DashboardLayout user={user} activeTab="messaging">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading messages...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user} activeTab="messaging">
      <div className="h-[calc(100vh-4rem)] flex">
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
                    selectedConversation?.id === conv.id ? 'bg-teal-50' : ''
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
                  {conv.subject && (
                    <p className="text-sm text-gray-600 truncate">{conv.subject}</p>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900">
                  {selectedConversation.facilities?.name || 'Unknown Facility'}
                </h2>
                <p className="text-sm text-gray-500">
                  {selectedConversation.subject || 'General Support'}
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(message => {
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
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
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
                    className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {sending ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </form>
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
    </DashboardLayout>
  );
}
