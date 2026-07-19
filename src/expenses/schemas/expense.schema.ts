import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExpenseDocument = HydratedDocument<Expense>;

@Schema({ _id: false })
export class Attachment {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ default: () => new Date() })
  uploadedAt: Date;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, default: () => new Date() })
  date: Date;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  categoryId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  subCategoryId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethod' })
  paymentMethodId?: Types.ObjectId;

  @Prop()
  notes?: string;

  @Prop({ type: [AttachmentSchema], default: [] })
  attachments?: Attachment[];

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'RecurringSeries', default: null, index: true })
  recurringSeriesId: Types.ObjectId | null;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);

ExpenseSchema.index({ userId: 1, date: -1 });
ExpenseSchema.index({ userId: 1, isDeleted: 1 });
ExpenseSchema.index({ userId: 1, tags: 1 });
ExpenseSchema.index({ userId: 1, categoryId: 1 });
