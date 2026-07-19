import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteCategoryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsMongoId()
  reassignToCategoryId?: string;
}
