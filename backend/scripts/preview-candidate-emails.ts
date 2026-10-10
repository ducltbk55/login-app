/**
 * Xuất mọi mẫu email ứng viên ra `data/email-previews/ung-vien-*.html` để mở
 * bằng trình duyệt. Chạy kèm trong `npm run email:preview`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { sampleCandidate } from '../src/mail/candidate-email.fixtures';
import {
  renderCandidateEmail,
  type CandidateEmailKind,
  type CandidateEmailOptions,
} from '../src/mail/candidate-email.templates';
import { mailBrand } from '../src/mail/mail-brand';
import type { Candidate } from '../src/recruitment/recruitment.entity';

const brand = mailBrand(process.env.SITE_URL ?? 'http://localhost:3000');
const outDir = join(__dirname, '..', 'data', 'email-previews');
mkdirSync(outDir, { recursive: true });

const cases: {
  file: string;
  kind: CandidateEmailKind;
  candidate: Partial<Candidate>;
  options?: CandidateEmailOptions;
}[] = [
  { file: 'received', kind: 'received', candidate: {} },
  {
    file: 'screening',
    kind: 'screening',
    candidate: { status: 'screening' },
  },
  {
    file: 'interview',
    kind: 'interview',
    candidate: { status: 'interview', interviewAt: '2026-10-15T02:00:00.000Z' },
    options: {
      message:
        'Địa điểm: Phòng họp 7A, Tầng 7, Vĩnh Trung Plaza.\nNgười phỏng vấn: anh Phạm Đức Long — Trưởng nhóm Hạ tầng.\nVui lòng mang theo CMND/CCCD để đăng ký với lễ tân.',
    },
  },
  {
    file: 'interview-no-time',
    kind: 'interview',
    candidate: { status: 'interview' },
  },
  {
    file: 'interview-rescheduled',
    kind: 'interview',
    candidate: { status: 'interview', interviewAt: '2026-10-16T07:30:00.000Z' },
    options: {
      rescheduled: true,
      message:
        'Phỏng vấn online qua Google Meet: https://meet.google.com/abc-defg-hij',
    },
  },
  {
    file: 'offered',
    kind: 'offered',
    candidate: { status: 'offered' },
    options: {
      message:
        'Mức lương: 30.000.000đ/tháng (gross)\nNgày bắt đầu dự kiến: 02/11/2026\nThư mời chi tiết được đính kèm trong email riêng từ phòng Nhân sự.',
    },
  },
  {
    file: 'hired',
    kind: 'hired',
    candidate: { status: 'hired' },
    options: {
      message:
        'Ngày đầu tiên: 08:30 thứ Hai, 02/11/2026 tại lễ tân tầng 7.\nVui lòng mang theo bản sao bằng cấp và sổ BHXH (nếu có).',
    },
  },
  { file: 'rejected', kind: 'rejected', candidate: { status: 'rejected' } },
];

for (const { file, kind, candidate, options } of cases) {
  const email = renderCandidateEmail(
    kind,
    sampleCandidate(candidate),
    brand,
    options,
  );
  writeFileSync(join(outDir, `ung-vien-${file}.html`), email.html);
  writeFileSync(
    join(outDir, `ung-vien-${file}.txt`),
    `${email.subject}\n\n${email.text}`,
  );
  console.log(`✓ ung-vien-${file.padEnd(22)} ${email.subject}`);
}
console.log(`\nĐã ghi vào ${outDir}`);
