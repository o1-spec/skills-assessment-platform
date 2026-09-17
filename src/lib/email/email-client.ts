import nodemailer, { type Transporter } from 'nodemailer';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | Uint8Array | string;
  contentType?: string;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  success: boolean;
  status: 'SENT' | 'FAILED' | 'SKIPPED';
  messageId?: string;
  error?: string;
}

export interface EmailClient {
  sendEmail(options: SendEmailOptions): Promise<EmailSendResult>;
}

export interface DispatchedTestEmail extends SendEmailOptions {
  dispatchedAt: Date;
}

class InMemoryTestEmailClient implements EmailClient {
  private dispatched: DispatchedTestEmail[] = [];
  private shouldFailNext: boolean = false;
  private failureErrorMessage: string = 'Simulated email provider network failure';

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    if (this.shouldFailNext) {
      this.shouldFailNext = false;
      return {
        success: false,
        status: 'FAILED',
        error: this.failureErrorMessage,
      };
    }

    this.dispatched.push({
      ...options,
      dispatchedAt: new Date(),
    });

    return {
      success: true,
      status: 'SENT',
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  getDispatchedEmails(): DispatchedTestEmail[] {
    return [...this.dispatched];
  }

  getLastDispatchedEmail(): DispatchedTestEmail | undefined {
    return this.dispatched[this.dispatched.length - 1];
  }

  findEmailsByRecipient(recipient: string): DispatchedTestEmail[] {
    const target = recipient.toLowerCase().trim();
    return this.dispatched.filter((e) => e.to.toLowerCase().trim() === target);
  }

  clear(): void {
    this.dispatched = [];
    this.shouldFailNext = false;
  }

  simulateNextFailure(errorMessage?: string): void {
    this.shouldFailNext = true;
    if (errorMessage) {
      this.failureErrorMessage = errorMessage;
    }
  }
}

class ResendEmailClient implements EmailClient {
  private apiKey: string;
  private from: string;

  constructor(apiKey: string, from?: string) {
    this.apiKey = apiKey;
    this.from = from || 'Skills Assessment <notifications@example.com>';
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      const payload: Record<string, unknown> = {
        from: this.from,
        to: [options.to],
        subject: options.subject,
        text: options.text,
        html: options.html,
      };

      if (options.attachments && options.attachments.length > 0) {
        payload.attachments = options.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content)
            ? att.content.toString('base64')
            : typeof att.content === 'string'
            ? Buffer.from(att.content).toString('base64')
            : Buffer.from(att.content).toString('base64'),
        }));
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let parsedMessage = `HTTP ${response.status} ${response.statusText}`;
        try {
          const json = JSON.parse(errorBody);
          if (json.message) parsedMessage = json.message;
        } catch {
          // ignore parsing error, retain status message
        }
        return {
          success: false,
          status: 'FAILED',
          error: `Resend API error: ${parsedMessage}`,
        };
      }

      const data = (await response.json()) as { id?: string };
      return {
        success: true,
        status: 'SENT',
        messageId: data.id,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown network error';
      return {
        success: false,
        status: 'FAILED',
        error: `Email transport failure: ${errorMsg}`,
      };
    }
  }
}

class SmtpEmailClient implements EmailClient {
  private transporter: Transporter;
  private from: string;

  constructor(host: string, port: number, secure: boolean, user: string, pass: string, from: string) {
    this.from = from;
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    try {
      const attachments = options.attachments?.map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content),
        contentType: att.contentType,
      }));

      const info = (await this.transporter.sendMail({
        from: this.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments,
      })) as { messageId?: string };

      return {
        success: true,
        status: 'SENT',
        messageId: info.messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown SMTP error';
      return {
        success: false,
        status: 'FAILED',
        error: `SMTP transport failure: ${errorMsg}`,
      };
    }
  }
}

class FallbackDevEmailClient implements EmailClient {
  async sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      console.warn(
        '[NotificationEngine:Email] WARNING: Email provider credentials are not configured in production environment. Email delivery was skipped.'
      );
      return {
        success: false,
        status: 'SKIPPED',
        error: 'Email provider credentials not configured in production',
      };
    }

    console.info(
      `[NotificationEngine:Email:Dev] Email to <${options.to}> skipped: "${options.subject}" (attachments: ${options.attachments?.length ?? 0})`
    );
    return {
      success: true,
      status: 'SKIPPED',
    };
  }
}

let mockEmailClientInstance: InMemoryTestEmailClient | null = null;

export function getMockEmailClient(): InMemoryTestEmailClient {
  if (!mockEmailClientInstance) {
    mockEmailClientInstance = new InMemoryTestEmailClient();
  }
  return mockEmailClientInstance;
}

export function setMockEmailClient(client: InMemoryTestEmailClient | null): void {
  mockEmailClientInstance = client;
}

export function getEmailClient(): EmailClient {
  if (mockEmailClientInstance) {
    return mockEmailClientInstance;
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (smtpUser && smtpPass) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true';
    const from = process.env.EMAIL_FROM || `"skillsiq" <${smtpUser}>`;
    return new SmtpEmailClient(host, port, secure, smtpUser, smtpPass, from);
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey && resendApiKey.trim().length > 0) {
    return new ResendEmailClient(resendApiKey.trim(), process.env.EMAIL_FROM);
  }

  return new FallbackDevEmailClient();
}

export async function sendEmail(options: SendEmailOptions): Promise<EmailSendResult> {
  const client = getEmailClient();
  return client.sendEmail(options);
}
