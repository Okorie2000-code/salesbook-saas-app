import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsString, ValidateNested } from 'class-validator';

export class SettingEntryDto {
  @ApiProperty({ example: 'support_email' })
  @IsString()
  key: string;

  @ApiProperty({ description: 'Any JSON value' })
  value: unknown;
}

export class UpdateSettingsDto {
  @ApiProperty({ type: [SettingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SettingEntryDto)
  settings: SettingEntryDto[];
}
