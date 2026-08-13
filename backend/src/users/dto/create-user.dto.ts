import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'Emeka' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Eze' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'emeka@mybusiness.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: [Role.MANAGER, Role.STAFF] })
  @IsEnum([Role.MANAGER, Role.STAFF])
  role: Role;

  @ApiProperty({ required: false, example: '+2348123456789' })
  @IsOptional()
  @IsString()
  phone?: string;
}
