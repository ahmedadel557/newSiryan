'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { chatbotService } from '@/services/chatbot.service';
import { queryKeys } from '@/lib/queryKeys';
import type { ChatbotMessage } from '@/types';

export function useChatbotHistory(conversationId?: string) {
  return useQuery({
    queryKey: queryKeys.chatbotHistory(conversationId),
    queryFn: () => chatbotService.getHistory(conversationId!),
    enabled: !!conversationId,
  });
}

export function useSendChatbotMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: chatbotService.sendMessage,

    onMutate: async (formData) => {
      const conversationId = formData.get('conversation_id') as string | null;
      if (!conversationId) return { conversationId: null, optimisticId: null, loadingId: null };

      await queryClient.cancelQueries({ queryKey: queryKeys.chatbotHistory(conversationId) });

      const text = (formData.get('text') as string | null) ?? '';
      const optimisticId = `opt-user-${Date.now()}`;
      const loadingId = `opt-loading-${Date.now()}`;

      const snapshot = queryClient.getQueryData<ChatbotMessage[]>(
        queryKeys.chatbotHistory(conversationId)
      );

      queryClient.setQueryData<ChatbotMessage[]>(
        queryKeys.chatbotHistory(conversationId),
        (prev = []) => [
          ...prev,
          {
            id: optimisticId,
            conversation_id: conversationId,
            role: 'user',
            content_text: text,
            created_at: new Date().toISOString(),
          } satisfies ChatbotMessage,
          {
            id: loadingId,
            conversation_id: conversationId,
            role: 'assistant',
            content_text: '',
            created_at: new Date().toISOString(),
            isLoading: true,
          } satisfies ChatbotMessage,
        ]
      );

      return { conversationId, optimisticId, loadingId, snapshot };
    },

    onError: (_err, _vars, context) => {
      if (context?.conversationId && context.snapshot !== undefined) {
        queryClient.setQueryData(
          queryKeys.chatbotHistory(context.conversationId),
          context.snapshot
        );
      }
    },

    onSuccess: (data, formData, context) => {
      const conversationId = data.conversation_id;
      const prevConvId = formData.get('conversation_id') as string | null;

      if (!prevConvId) {
        // Brand-new conversation — no optimistic data to fix, populate fresh
        const text = (formData.get('text') as string | null) ?? '';
        const userMessage: ChatbotMessage = {
          id: crypto.randomUUID(),
          conversation_id: conversationId,
          role: 'user',
          content_text: text,
          created_at: new Date().toISOString(),
        };
        queryClient.setQueryData<ChatbotMessage[]>(
          queryKeys.chatbotHistory(conversationId),
          [userMessage, data.message]
        );
      } else {
        // Existing conversation — replace loading placeholder with real assistant message
        queryClient.setQueryData<ChatbotMessage[]>(
          queryKeys.chatbotHistory(conversationId),
          (prev = []) =>
            prev.filter((m) => m.id !== context?.loadingId).concat([data.message])
        );
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.chatbotConversations() });
    },
  });
}

export function useChatbotConversations() {
  return useQuery({
    queryKey: queryKeys.chatbotConversations(),
    queryFn: chatbotService.listConversations,
  });
}
