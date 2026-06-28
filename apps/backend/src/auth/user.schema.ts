import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class UserRecord {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, unique: true })
  userName!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ type: String, required: false })
  lastName?: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: 0 })
  passwordVersion!: number;

  @Prop({ default: false })
  emailVerified!: boolean;

  @Prop({ default: false })
  isProfilePrivate!: boolean;

  /** App operator with access to admin-only routes (e.g. catalog publishing). */
  @Prop({ default: false })
  isAdmin!: boolean;

  @Prop({ default: 'violet-reel' })
  avatarId!: string;

  /** 6-digit email verification code while `emailVerified` is false. */
  @Prop({ type: String, required: false })
  emailVerificationCode?: string;

  @Prop({ type: Date, required: false })
  emailVerificationExpiresAt?: Date;

  /** SHA-256 hex of opaque password-reset token. */
  @Prop({ type: String, required: false })
  passwordResetTokenHash?: string;

  @Prop({ type: Date, required: false })
  passwordResetExpiresAt?: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'UserRecord' }], default: [] })
  friends!: Types.ObjectId[];
}

export type UserDocument = HydratedDocument<UserRecord> & {
  createdAt: Date;
  updatedAt: Date;
};

export const UserSchema = SchemaFactory.createForClass(UserRecord);

UserSchema.index({ passwordResetTokenHash: 1 }, { sparse: true, unique: true });
