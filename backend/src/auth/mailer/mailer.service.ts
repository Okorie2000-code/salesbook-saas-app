import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Email abstraction so the app works without configuring a real provider.
 * The default implementation logs the email to the console — swap the bodies
 * for a real provider (SendGrid, Postmark, Resend…) without touching callers.
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);

  constructor(private readonly config: ConfigService) {}

  private frontendUrl(): string {
    return this.config.get('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async sendPasswordReset(email: string, token: string): Promise<void> {
    const resetUrl = `${this.frontendUrl()}/reset-password?token=${token}`;
    this.logger.log(`[PASSWORD RESET] ${email} → ${resetUrl}`);
  }

  async sendWelcome(email: string, temporaryPassword?: string): Promise<void> {
    this.logger.log(
      `[WELCOME] ${email}${temporaryPassword ? ` — temporary password: ${temporaryPassword}` : ''}`,
    );
  }
}
