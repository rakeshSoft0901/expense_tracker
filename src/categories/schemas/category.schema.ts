import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class SubCategory {
  _id: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: false })
  isArchived: boolean;
}

export const SubCategorySchema = SchemaFactory.createForClass(SubCategory);

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ default: '#9E9E9E' })
  color: string;

  @Prop({ default: 'tag' })
  icon: string;

  @Prop({ type: [SubCategorySchema], default: [] })
  subCategories: Types.DocumentArray<SubCategory>;

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: false, index: true })
  isArchived: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

CategorySchema.index({ userId: 1, name: 1 }, { unique: true });
