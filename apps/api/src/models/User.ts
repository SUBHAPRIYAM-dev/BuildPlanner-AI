import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
  organization?: string;
  role: 'HOMEOWNER' | 'ARCHITECT' | 'ENGINEER' | 'BUILDER' | 'DEVELOPER' | 'ADMIN';
  provider?: 'local' | 'google';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    passwordHash: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    organization: {
      type: String,
      trim: true
    },
    role: {
      type: String,
      enum: ['HOMEOWNER', 'ARCHITECT', 'ENGINEER', 'BUILDER', 'DEVELOPER', 'ADMIN'],
      default: 'HOMEOWNER'
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    }
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
