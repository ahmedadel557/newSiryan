'use client';
import { useCallback, useState } from 'react';
import { patientService } from '@/services/patient.service';
import { useToast } from './useToast';
import type { ChatMessage } from '@/types';

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const { showToast } = useToast();

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const userMsg: ChatMessage = { id: crypto.randomUUID(), from: 'user', text };
      const loadingId = crypto.randomUUID();
      const loadingMsg: ChatMessage = { id: loadingId, from: 'bot', text: '', isLoading: true };
      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setInput('');
      setIsTyping(true);
      try {
        const { message } = await patientService.sendChatMessage({ message: text });
        setMessages((prev) => prev.map((m) => (m.id === loadingId ? { ...m, text: message, isLoading: false } : m)));
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== loadingId));
        showToast('Failed to get response', 'error');
      } finally {
        setIsTyping(false);
      }
    },
    [showToast]
  );

  const attachFile = useCallback((file: File) => {
    setAttachedFile(file);
  }, []);
  const clearChat = useCallback(() => {
    setMessages([]);
    setAttachedFile(null);
  }, []);

  return { messages, isTyping, input, setInput, attachedFile, sendMessage, attachFile, clearChat };
}
