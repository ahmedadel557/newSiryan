import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: 'appointment' | 'prescription' | 'lab' | 'radiology' | 'pharmacy' | 'inventory' | 'emergency' | 'general' | 'room';
  title: string;
  message: string;
  is_read: boolean;
  metadata?: Record<string, unknown>;
}

const NotificationSchema = new Schema<INotification>(
  {
    user:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:    { type: String, enum: ['appointment','prescription','lab','radiology','pharmacy','inventory','emergency','general','room'], required: true },
    title:   { type: String, required: true },
    message: { type: String, required: true },
    is_read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, is_read: 1, createdAt: -1 });

NotificationSchema.set('toJSON', {
  virtuals: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id?.toString();
    ret.created_at = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
  },
});

export default mongoose.model<INotification>('Notification', NotificationSchema);
