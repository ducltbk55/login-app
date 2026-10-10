import type { Candidate } from '../recruitment/recruitment.entity';

/** Hồ sơ mẫu cho test và script xem trước email ứng viên. */
export function sampleCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    id: 42,
    jobId: 2,
    batchId: 1,
    job: { id: 2, slug: 'ky-su-devops', title: 'Kỹ sư DevOps' },
    batch: { id: 1, name: 'Tuyển dụng quý IV/2026' },
    fullName: 'Lê Hoàng Cường',
    email: 'cuong.le@example.com',
    phone: '0935 555 666',
    experience: 'Trên 5 năm',
    portfolioUrl: null,
    coverLetter: null,
    cv: {
      name: 'CV Lê Hoàng Cường.pdf',
      mime: 'application/pdf',
      size: 120_000,
      inline: true,
    },
    status: 'new',
    interviewAt: null,
    // Ghi chú nội bộ — test kiểm tra chuỗi này không bao giờ lọt vào email.
    note: 'NỘI BỘ: lương mong muốn hơi cao',
    handledBy: null,
    handledAt: null,
    createdAt: '2026-10-08T03:15:00.000Z',
    updatedAt: '2026-10-08T03:15:00.000Z',
    ...overrides,
  };
}
