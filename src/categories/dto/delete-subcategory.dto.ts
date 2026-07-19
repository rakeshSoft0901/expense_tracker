import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class DeleteSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsMongoId()
  reassignToSubCategoryId?: string;
}
