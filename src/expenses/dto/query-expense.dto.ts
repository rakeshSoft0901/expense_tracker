import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryExpenseDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @IsOptional()
  @IsMongoId()
  subCategoryId?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsMongoId()
  paymentMethodId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
