import mongoose, { Document, Schema } from 'mongoose';

export interface IDepartment extends Document {
  name: string;
  description?: string;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name:        { type: String, required: true, unique: true, trim: true },
    description: { type: String },
  },
  { timestamps: true },
);

export default mongoose.model<IDepartment>('Department', DepartmentSchema);
