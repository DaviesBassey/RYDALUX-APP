import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsMessage {
  phone: string;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  async send({ phone, message }: SmsMessage): Promise<void> {
    const provider = this.config.get<string>('SMS_PROVIDER') ?? 'none';

    if (provider === 'none' || !provider) {
      this.logger.error('SMS_PROVIDER is not configured. OTP cannot be delivered in production.');
      throw new Error('SMS provider is not configured.');
    }

    if (provider === 'africastalking') {
      return this.sendViaAfricasTalking({ phone, message });
    }

    this.logger.error(`Unknown SMS provider: ${provider}`);
    throw new Error(`Unknown SMS provider: ${provider}`);
  }

  private async sendViaAfricasTalking({ phone, message }: SmsMessage): Promise<void> {
    const username = this.config.get<string>('AFRICASTALKING_USERNAME');
    const apiKey = this.config.get<string>('AFRICASTALKING_API_KEY');
    const senderId = this.config.get<string>('AFRICASTALKING_SENDER_ID');

    if (!username || !apiKey) {
      this.logger.error('Africa\'s Talking credentials are not configured (AFRICASTALKING_USERNAME, AFRICASTALKING_API_KEY).');
      throw new Error('Africa\'s Talking credentials are not configured.');
    }

    // Ensure phone has international format (Africa's Talking requires it)
    const to = phone.startsWith('+') ? phone : `+${phone}`;

    const body = new URLSearchParams({
      username,
      to,
      message,
      ...(senderId ? { from: senderId } : {}),
    });

    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: {
        'apiKey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      this.logger.error(`Africa's Talking SMS failed: ${res.status} ${text}`);
      throw new Error(`SMS send failed: ${res.status}`);
    }

    const data = await res.json().catch(() => ({}));
    this.logger.log(`SMS sent to ${to}: ${JSON.stringify(data)}`);
  }
}
