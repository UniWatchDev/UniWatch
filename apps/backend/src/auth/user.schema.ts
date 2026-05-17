import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, collection: 'users' })
export class UserRecord {
  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true, unique: true })
  userName!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ default: 0 })
  passwordVersion!: number;

  @Prop({ default: false })
  emailVerified!: boolean;
}

export type UserDocument = HydratedDocument<UserRecord> & {
  createdAt: Date;
  updatedAt: Date;
};

export const UserSchema = SchemaFactory.createForClass(UserRecord);
