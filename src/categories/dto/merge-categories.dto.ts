import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class MergeCategoriesDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  targetCategoryId: string;
}
