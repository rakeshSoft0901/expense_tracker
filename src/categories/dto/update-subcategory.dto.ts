import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSubCategoryDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
