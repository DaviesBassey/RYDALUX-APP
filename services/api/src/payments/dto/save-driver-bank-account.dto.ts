import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class SaveDriverBankAccountDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  bankCode: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  bankName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(20)
  @Matches(/^\d+$/)
  accountNumber: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  accountName: string;
}
