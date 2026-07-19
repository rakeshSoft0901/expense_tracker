import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { RecurrenceFrequency } from '../schemas/recurring-series.schema';

export class CreateRecurringSeriesDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @ValidateIf((o: CreateRecurringSeriesDto) => o.categoryId !== null)
  @IsMongoId()
  categoryId?: string | null;

  @IsOptional()
  @ValidateIf((o: CreateRecurringSeriesDto) => o.subCategoryId !== null)
  @IsMongoId()
  subCategoryId?: string | null;

  @IsOptional()
  @IsMongoId()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  interval?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @ValidateIf((o: CreateRecurringSeriesDto) => o.endDate !== null)
  @IsDateString()
  endDate?: string | null;

  @IsOptional()
  @ValidateIf((o: CreateRecurringSeriesDto) => o.reminderDaysBefore !== null)
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reminderDaysBefore?: number | null;
}
