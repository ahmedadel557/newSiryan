import { Schema, model, Types } from 'mongoose';

interface IAuditLog {
  performed_by: Types.ObjectId;
  action: string;
  resource: string;
  resource_id?: string;
  details?: string;
  ip_address?: string;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    performed_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action:       { type: String, required: true },
    resource:     { type: String, required: true },
    resource_id:  { type: String },
    details:      { type: String },
    ip_address:   { type: String },
  },
  { timestamps: true },
);

AuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: (_doc, ret: Record<string, any>) => {
    ret.id = ret._id?.toString();
    ret.created_at = ret.createdAt;
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
  },
});

export default model<IAuditLog>('AuditLog', AuditLogSchema);
