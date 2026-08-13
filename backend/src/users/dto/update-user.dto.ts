import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: [Role.MANAGER, Role.STAFF] })
  @IsOptional()
  @IsEnum([Role.MANAGER, Role.STAFF])
  role?: Role;

  @ApiPropertyOptional({ description: 'Enable/disable the account' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
