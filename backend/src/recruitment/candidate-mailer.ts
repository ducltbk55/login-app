import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  renderCandidateEmail,
  type CandidateEmailKind,
  type CandidateEmailOptions,
} from '../mail/candidate-email.templates';
import { mailBrand, type MailBrand } from '../mail/mail-brand';
import { MailService } from '../mail/mail.service';
import type { Candidate, EmailResult } from './recruitment.entity';

/** Dựng nội dung và gửi email cho ứng viên. */
@Injectable()
export class CandidateMailer {
  private readonly brand: MailBrand;

  constructor(
    private readonly mail: MailService,
    config: ConfigService,
  ) {
    // Logo và link trong email trỏ về website công khai.
    this.brand = mailBrand(
      config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000',
    );
  }

  /** Không bao giờ ném lỗi — MailService đã nuốt lỗi SMTP. */
  async send(
    candidate: Candidate,
    kind: CandidateEmailKind,
    options: CandidateEmailOptions = {},
  ): Promise<EmailResult> {
    const email = renderCandidateEmail(kind, candidate, this.brand, options);
    // SMTP tắt thì MailService chỉ ghi log rồi trả `false` — phân biệt với
    // gửi lỗi để nhật ký hồ sơ không báo "gửi thất bại" oan.
    const ok = await this.mail.send({
      to: candidate.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (ok) return 'sent';
    return this.mail.enabled ? 'failed' : 'off';
  }
}
