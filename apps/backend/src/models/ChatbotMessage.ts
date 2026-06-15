import mongoose, { Document, Schema } from 'mongoose';

export interface IChatbotMessage extends Document {
  conversation_id: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content_text: string;
  audio_url?: string;
  language?: 'ar' | 'en';
  created_at: Date;
}

const ChatbotMessageSchema = new Schema<IChatbotMessage>({
  conversation_id: { type: Schema.Types.ObjectId, ref: 'ChatbotConversation', required: true },
  role:            { type: String, enum: ['user', 'assistant'], required: true },
  content_text:    { type: String, required: true },
  audio_url:       { type: String },
  language:        { type: String, enum: ['ar', 'en'] },
  created_at:      { type: Date, default: Date.now },
});

// Ordered history queries
ChatbotMessageSchema.index({ conversation_id: 1, created_at: 1 });

ChatbotMessageSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export default mongoose.model<IChatbotMessage>('ChatbotMessage', ChatbotMessageSchema);
