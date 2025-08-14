"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageCircle, X, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  nickname: string;
  message: string;
  created_at: string;
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const roomRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // 메시지 스크롤을 맨 아래로
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 기존 메시지 로드
  useEffect(() => {
    if (isOpen) {
      loadMessages();
      // 채팅창 열리면 메시지 입력창에 포커스
      setTimeout(() => messageInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // 실시간 구독 (DB INSERT + Broadcast 모두 처리)
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          setMessages(prev => [payload.new as ChatMessage, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    // Broadcast 채널: DB 리플리케이션이 비활성인 환경에서도 즉시 반영
    const room = supabase
      .channel('chat_room', { config: { broadcast: { self: false } } })
      .on('broadcast', { event: 'new-message' }, (payload) => {
        const msg = (payload.payload as { message: ChatMessage }).message;
        if (!msg) return;
        setMessages(prev => (
          prev.some(m => m.id === msg.id)
            ? prev
            : [msg, ...prev].slice(0, 100)
        ));
      })
      .subscribe();
    roomRef.current = room;

    return () => {
      supabase.removeChannel(channel);
      if (roomRef.current) {
        supabase.removeChannel(roomRef.current);
        roomRef.current = null;
      }
    };
  }, [isOpen]);

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('메시지 로드 실패:', error);
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !nickname.trim() || isLoading) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          nickname: nickname.trim(),
          message: message.trim()
        })
        .select('*')
        .single();

      if (error) throw error;
      setMessage('');
      // 낙관적 업데이트: 실시간 수신 전에 즉시 화면에 반영
      if (data) {
        setMessages(prev => (
          prev.some(m => m.id === data.id)
            ? prev
            : [data as ChatMessage, ...prev].slice(0, 100)
        ));
        // 다른 브라우저로 즉시 전파 (Broadcast)
        try {
          roomRef.current?.send({
            type: 'broadcast',
            event: 'new-message',
            payload: { message: data as ChatMessage },
          });
        } catch {}
      }
    } catch (error) {
      console.error('메시지 전송 실패:', error);
    } finally {
      setIsLoading(false);
      // 전송 후 입력창에 다시 포커스
      setTimeout(() => messageInputRef.current?.focus(), 0);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* 채팅 버튼 */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
        aria-label="채팅 열기"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {/* 채팅창 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 h-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-t-2xl">
            <h3 className="font-semibold">💬 나는솔로 채팅방</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                <div className="text-2xl mb-2">💬</div>
                <p>첫 번째 메시지를 남겨보세요!</p>
              </div>
            ) : (
              messages.slice().reverse().map((msg) => (
                <div key={msg.id} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-pink-600 dark:text-pink-400">
                      {msg.nickname}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(msg.created_at)}
                    </span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 max-w-full">
                    <p className="text-sm text-gray-800 dark:text-gray-200 break-words">
                      {msg.message}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            {/* 닉네임 입력 */}
            <input
              type="text"
              placeholder="닉네임"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              maxLength={20}
            />
            
            {/* 메시지 입력 */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="메시지를 입력하세요..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                ref={messageInputRef}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                maxLength={200}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!message.trim() || !nickname.trim() || isLoading}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
