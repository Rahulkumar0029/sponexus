import mongoose, { Schema, Model } from 'mongoose';
import { User } from '@/types/user';

const userSchema = new Schema<User>(
  {
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['ORGANIZER', 'SPONSOR'],
      required: [true, 'Role is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
    },
    phone: {
      type: String,
    },

    // Forgot password fields
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre('validate', function (next) {
  if (!this.name && this.firstName && this.lastName) {
    this.name = `${this.firstName.trim()} ${this.lastName.trim()}`;
  }
  next();
});

export const UserModel: Model<User> =
  mongoose.models.User || mongoose.model<User>('User', userSchema);