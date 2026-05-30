import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnouncement extends Document {
  title: string;
  message: string;
  target_roles: string[];
  priority: 'normal' | 'urgent';
  created_by: mongoose.Types.ObjectId;
}

const AnnouncementSchema = new Schema<IAnnouncement>(
  {
    title:        { type: String, required: true },
    message:      { type: String, required: true },
    target_roles: { type: [String], default: [] },
    priority:     { type: String, enum: ['normal', 'urgent'], default: 'normal' },
    created_by:   { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

export default mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema);
