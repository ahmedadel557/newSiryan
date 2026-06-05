import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  description?: string;
  assigned_roles: string[];
  is_active: boolean;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name:           { type: String, required: true, unique: true, trim: true },
    description:    { type: String },
    assigned_roles: { type: [String], default: [] },
    is_active:      { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
