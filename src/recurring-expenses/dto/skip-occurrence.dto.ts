import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class SkipOccurrenceDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsDateString()
  date: string;
}
