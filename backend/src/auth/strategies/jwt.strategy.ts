import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * Validates the bearer access token and maps its claims to the AuthUser shape
 * that the rest of the app consumes via @CurrentUser().
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      // Fail fast with a clear message instead of silently signing tokens with
      // a hard-coded secret (which would be a security hole in production).
      throw new Error('JWT_SECRET environment variable is required — see backend/.env.example');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: { sub: string; email: string; role: string; businessId: string | null }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      businessId: payload.businessId ?? null,
    };
  }
}
