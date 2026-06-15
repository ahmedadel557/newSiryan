---
name: project-chatbot-backend
description: AI chatbot backend implementation — models, AI adapter, routes, audio upload (2026-06-15)
metadata:
  type: project
---

AI chatbot backend completed 2026-06-15. Frontend not yet built.

**Models** (registered in models/index.ts):
- `ChatbotConversation` — patient_id, started_at, last_message_at, status ('active'|'closed')
- `ChatbotMessage` — conversation_id, role, content_text, audio_url?, language?, created_at; compound index (conversation_id, created_at)

**AI adapter**: `services/aiModel.service.ts` — `getChatCompletion(messages, sessionId?)`. Env: AI_MODEL_API_URL, AI_MODEL_API_KEY. Parses `data.reply ?? data.content ?? data.message`. 30s timeout, 1 network-error retry. See adapter contract comment at top of file.

**Audio upload**: `uploadChatbotAudio` in config/upload.ts — audio/webm|ogg|mpeg|wav, max 10MB, stored at uploads/chatbot-audio/. Served statically at /uploads/chatbot-audio/<filename>.

**Controller**: `controllers/patient/chatbot.ts` — sendMessage, getHistory, listConversations.

**Routes** under /api/patient (all require authenticate + requireCompleteProfile + authorize('patient')):
- `POST /chatbot` — requireEmailVerified + 20/1h rate-limit + Multer('audio') + validateRequest(chatbotSendMessageSchema) → sendMessage
- `GET /chatbot/history?conversation_id=` → getHistory (403 if not owner)
- `GET /chatbot/conversations` → listConversations

**Why:** Next step is frontend: patient chatbot page, hooks, service calls.

**How to apply:** When building the frontend chatbot page, the three endpoints above are the contract. The POST accepts multipart/form-data with `text` (required) and optional `audio` file + `conversation_id`.
