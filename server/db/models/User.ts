import mongoose, { Document, Schema } from 'mongoose';

export interface IUserDocument extends Document {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Fallback in-memory/JSON store for dev environments when Mongo daemon is not running
export interface UserRecord {
  _id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
