import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RecurringSeriesDocument = HydratedDocument<RecurringSeries>;

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export enum RecurringSeriesStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped',
}

@Schema({ timestamps: true })
export class RecurringSeries {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  categoryId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, default: null })
  subCategoryId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethod', default: null })
  paymentMethodId: Types.ObjectId | null;

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ required: true, type: String, enum: RecurrenceFrequency })
  frequency: RecurrenceFrequency;

  @Prop({ default: 1, min: 1 })
  interval: number;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ type: Date, default: null })
  endDate: Date | null;

  @Prop({ required: true })
  nextOccurrenceDate: Date;

  @Prop({ type: [Date], default: [] })
  skippedDates: Date[];

  @Prop({
    type: String,
    enum: RecurringSeriesStatus,
    default: RecurringSeriesStatus.ACTIVE,
    index: true,
  })
  status: RecurringSeriesStatus;

  @Prop({ type: Number, default: null })
  reminderDaysBefore: number | null;
}

export const RecurringSeriesSchema =
  SchemaFactory.createForClass(RecurringSeries);

RecurringSeriesSchema.index({ status: 1, nextOccurrenceDate: 1 });
RecurringSeriesSchema.index({ userId: 1, status: 1 });
