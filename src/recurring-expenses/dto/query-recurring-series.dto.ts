import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { RecurringSeriesStatus } from '../schemas/recurring-series.schema';

export class QueryRecurringSeriesDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsEnum(RecurringSeriesStatus)
  status?: RecurringSeriesStatus;
}
