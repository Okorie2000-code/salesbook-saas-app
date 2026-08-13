import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetPlanActiveDto {
  @ApiProperty({ description: 'true = active, false = deactivated' })
  @IsBoolean()
  isActive: boolean;
}
