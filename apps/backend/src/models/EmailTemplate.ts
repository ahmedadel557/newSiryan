import mongoose, { Document, Schema } from 'mongoose';

export interface IEmailTemplate extends Document {
  name: string;
  subject: string;
  html_body: string;
}

const EmailTemplateSchema = new Schema<IEmailTemplate>(
  {
    name:      { type: String, required: true, unique: true },
    subject:   { type: String, required: true },
    html_body: { type: String, required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IEmailTemplate>('EmailTemplate', EmailTemplateSchema);
