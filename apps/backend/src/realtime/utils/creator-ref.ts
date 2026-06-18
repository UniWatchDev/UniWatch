import { Types } from 'mongoose';

export type CreatorRefLike =
  | Types.ObjectId
  | { _id: Types.ObjectId | string }
  | string
  | null
  | undefined;

/** Normalize a Mongoose creator reference (raw id or populated doc) to a string id. */
export function creatorRefToId(creator: CreatorRefLike): string | null {
  if (creator == null) return null;
  if (typeof creator === 'string') return creator;
  if (creator instanceof Types.ObjectId) return creator.toString();
  return String(creator._id);
}
