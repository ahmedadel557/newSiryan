import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { sendSuccess, sendError } from '../../utils/response';
import { chatbotSendMessageSchema } from '../../validations/patient.validation';
import ChatbotConversation from '../../models/ChatbotConversation';
import ChatbotMessage from '../../models/ChatbotMessage';
import { getChatCompletion } from '../../services/aiModel.service';

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = chatbotSendMessageSchema.safeParse({ body: req.body });
    if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 422);

    const patientId = req.user!.id;
    const { text, conversation_id } = parsed.data.body;
    const audioFile = req.file;

    let conversation;
    if (conversation_id) {
      conversation = await ChatbotConversation.findOne({ _id: conversation_id, patient_id: patientId });
      if (!conversation) return sendError(res, 'Conversation not found', 404);
    } else {
      conversation = await ChatbotConversation.create({ patient_id: patientId });
    }

    const audioUrl = audioFile ? `/uploads/chatbot-audio/${audioFile.filename}` : undefined;

    await ChatbotMessage.create({
      conversation_id: conversation._id,
      role: 'user',
      content_text: text,
      ...(audioUrl && { audio_url: audioUrl }),
    });

    // Fetch last 20 messages for context (ordered oldest→newest)
    const history = await ChatbotMessage.find({ conversation_id: conversation._id })
      .sort({ created_at: 1 })
      .limit(20)
      .lean();

    const aiMessages = history.map((m) => ({ role: m.role, content: m.content_text }));

    const reply = await getChatCompletion(aiMessages, conversation._id.toString());

    const assistantMessage = await ChatbotMessage.create({
      conversation_id: conversation._id,
      role: 'assistant',
      content_text: reply,
    });

    await ChatbotConversation.findByIdAndUpdate(conversation._id, { last_message_at: new Date() });

    sendSuccess(res, {
      conversation_id: conversation._id.toString(),
      message: assistantMessage.toJSON(),
    });
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid conversation ID', 400);
    next(err);
  }
};

export const getHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { conversation_id } = req.query as { conversation_id?: string };
    if (!conversation_id) return sendError(res, 'conversation_id query param is required', 400);

    const conversation = await ChatbotConversation.findById(conversation_id).lean();
    if (!conversation) return sendError(res, 'Conversation not found', 404);
    if (conversation.patient_id.toString() !== req.user!.id) return sendError(res, 'Forbidden', 403);

    const messages = await ChatbotMessage.find({ conversation_id })
      .sort({ created_at: 1 })
      .lean();

    sendSuccess(res, messages);
  } catch (err: any) {
    if (err.name === 'CastError') return sendError(res, 'Invalid conversation ID', 400);
    next(err);
  }
};

export const listConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversations = await ChatbotConversation.find({ patient_id: req.user!.id })
      .sort({ last_message_at: -1 })
      .lean();

    const convIds = conversations.map((c) => (c as any)._id);
    const firstMessages = await ChatbotMessage.aggregate([
      { $match: { conversation_id: { $in: convIds }, role: 'user' } },
      { $sort: { created_at: 1 } },
      { $group: { _id: '$conversation_id', content_text: { $first: '$content_text' } } },
    ]);
    const previewMap = new Map(firstMessages.map((m) => [m._id.toString(), m.content_text as string]));

    const result = conversations.map((c) => {
      const id = (c as any)._id.toString();
      return {
        id,
        started_at: c.started_at,
        last_message_at: c.last_message_at,
        status: c.status,
        preview: (previewMap.get(id) ?? '').slice(0, 120),
      };
    });

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
};
