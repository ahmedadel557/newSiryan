import apiClient from './api.client';
import type { ApiResponse, ChatbotMessage, ChatbotConversation } from '@/types';

const normalizeMessage = (m: any): ChatbotMessage => ({ ...m, id: m.id ?? m._id });

export const chatbotService = {
  async sendMessage(
    formData: FormData
  ): Promise<{ conversation_id: string; message: ChatbotMessage }> {
    const res = await apiClient.post<
      ApiResponse<{ conversation_id: string; message: ChatbotMessage }>
    >('/patient/chatbot', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const { conversation_id, message } = res.data.data;
    return { conversation_id, message: normalizeMessage(message) };
  },

  async getHistory(conversationId: string): Promise<ChatbotMessage[]> {
    const res = await apiClient.get<ApiResponse<ChatbotMessage[]>>(
      '/patient/chatbot/history',
      { params: { conversation_id: conversationId } }
    );
    return (res.data.data ?? []).map(normalizeMessage);
  },

  async listConversations(): Promise<ChatbotConversation[]> {
    const res = await apiClient.get<ApiResponse<ChatbotConversation[]>>(
      '/patient/chatbot/conversations'
    );
    return res.data.data ?? [];
  },
};
