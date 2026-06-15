import mongoose, { Document, Schema } from 'mongoose';

export interface IChatbotConversation extends Document {
  patient_id: mongoose.Types.ObjectId;
  started_at: Date;
  last_message_at: Date;
  status: 'active' | 'closed';
}

const ChatbotConversationSchema = new Schema<IChatbotConversation>({
  patient_id:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
  started_at:      { type: Date, default: Date.now },
  last_message_at: { type: Date, default: Date.now },
  status:          { type: String, enum: ['active', 'closed'], default: 'active' },
});

ChatbotConversationSchema.index({ patient_id: 1, last_message_at: -1 });

ChatbotConversationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = doc._id.toString();
    delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

export default mongoose.model<IChatbotConversation>('ChatbotConversation', ChatbotConversationSchema);
