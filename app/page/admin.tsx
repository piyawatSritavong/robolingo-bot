'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle, RefreshCcw, User, Zap } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'oa';
  text: string;
  timestamp: Date;
}

export default function AdminPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [lineUserId, setLineUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Polling every 3 seconds.
  useEffect(() => {
    const checkNewMessages = async () => {
      try {
        const response = await fetch('/api/line/webhook');
        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          const incoming = data.messages.map((m: any) => ({
            id: m.id,
            sender: 'oa',
            text: m.text,
            timestamp: new Date(m.timestamp)
          }));

          setMessages(prev => [...prev, ...incoming]);

          if (!lineUserId && data.messages[0].userId) {
            setLineUserId(data.messages[0].userId);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    const interval = setInterval(checkNewMessages, 3000);
    return () => clearInterval(interval);
  }, [lineUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !lineUserId.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentText = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/line/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lineUserId, message: currentText }),
      });

      if (!response.ok) throw new Error('Failed to send');
    } catch (error) {
      console.error('Send Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'oa',
          text: '⚠️ ส่งไม่สำเร็จ! กรุณาเช็ค Token และ User ID',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      <header className="bg-slate-900 text-white p-4 flex justify-between items-center shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-green-500 p-2 rounded-full">
            <MessageCircle size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-none">LINE Admin Panel</h1>
            <div className="flex items-center gap-1 mt-1">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-green-400">Polling Mode (No-DB)</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setMessages([])}
          className="p-2 hover:bg-slate-700 rounded-full transition-colors"
        >
          <RefreshCcw size={18} />
        </button>
      </header>

      <div className="bg-white border-b p-4 shadow-sm">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Target User ID
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              placeholder="Waiting for incoming message or enter ID..."
              className="w-full pl-10 pr-4 py-2 text-black bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all text-sm"
            />
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 max-w-2xl mx-auto w-full"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-3">
            <Zap size={40} strokeWidth={1} />
            <p className="text-sm">ไม่มีประวัติการแชท (ข้อมูลถูกเก็บชั่วคราว)</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-4 py-2 rounded-2xl shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-green-600 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none border border-gray-200'
              }`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <span className={`text-[10px] block mt-1 opacity-50 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="bg-white border-t p-4 pb-8">
        <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading || !lineUserId}
            placeholder={lineUserId ? "Type your message..." : "Please set Target ID first"}
            className="flex-1 text-black bg-gray-100 border-none rounded-full px-5 py-3 text-sm focus:ring-2 focus:ring-green-500 outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim() || !lineUserId}
            className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 disabled:bg-gray-300 transition-all shadow-md active:scale-90"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}