import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateRecurringSeriesDto } from './create-recurring-series.dto';

export class UpdateRecurringSeriesDto extends PartialType(
  OmitType(CreateRecurringSeriesDto, ['userId'] as const),
) {}
