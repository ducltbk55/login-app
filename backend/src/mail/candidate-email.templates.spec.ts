import { sampleCandidate } from './candidate-email.fixtures';
import {
  CANDIDATE_EMAIL_KINDS,
  candidateEmailKindFor,
  renderCandidateEmail,
} from './candidate-email.templates';
import { mailBrand } from './mail-brand';

const brand = mailBrand('https://uyvuict.vn/');

describe('renderCandidateEmail', () => {
  it.each(CANDIDATE_EMAIL_KINDS)(
    '"%s" có tiêu đề, HTML, bản chữ và mã hồ sơ',
    (kind) => {
      const email = renderCandidateEmail(kind, sampleCandidate(), brand);
      expect(email.subject).toMatch(/^\[UY VŨ ICT\] /);
      expect(email.html).toContain('<!DOCTYPE html>');
      expect(email.html).toContain('UV000042');
      expect(email.text).toContain('Kỹ sư DevOps');
      expect(email.preheader).not.toMatch(/<|&amp;/);
    },
  );

  it('không bao giờ lộ ghi chú nội bộ', () => {
    for (const kind of CANDIDATE_EMAIL_KINDS) {
      const email = renderCandidateEmail(kind, sampleCandidate(), brand, {
        message: 'Lời nhắn công khai',
      });
      expect(email.html).not.toContain('NỘI BỘ');
      expect(email.text).not.toContain('NỘI BỘ');
      expect(email.html).toContain('Lời nhắn công khai');
    }
  });

  it('escape dữ liệu ứng viên nhập và lời nhắn', () => {
    const email = renderCandidateEmail(
      'received',
      sampleCandidate({ fullName: '<script>x</script>' }),
      brand,
      { message: '<img onerror=1>' },
    );
    expect(email.html).not.toContain('<script>x');
    expect(email.html).not.toContain('<img onerror');
    expect(email.text).toContain('<script>x</script>');
  });

  it('thư mời phỏng vấn có giờ VN và link thêm vào lịch', () => {
    const email = renderCandidateEmail(
      'interview',
      sampleCandidate({
        status: 'interview',
        interviewAt: '2026-10-15T02:00:00.000Z',
      }),
      brand,
    );
    // 02:00 UTC = 09:00 giờ Việt Nam.
    expect(email.html).toContain('09:00');
    expect(email.text).toContain('09:00');
    expect(email.html).toContain('calendar.google.com');
    expect(email.html).toContain('20261015T020000Z%2F20261015T030000Z');
  });

  it('chưa có giờ phỏng vấn thì hẹn sẽ liên hệ, không có khối lịch', () => {
    const email = renderCandidateEmail(
      'interview',
      sampleCandidate({ status: 'interview' }),
      brand,
    );
    expect(email.html).toContain('thống nhất thời gian');
    expect(email.html).not.toContain('calendar.google.com');
  });

  it('đổi lịch dùng tiêu đề riêng', () => {
    const email = renderCandidateEmail(
      'interview',
      sampleCandidate({
        status: 'interview',
        interviewAt: '2026-10-15T02:00:00.000Z',
      }),
      brand,
      { rescheduled: true },
    );
    expect(email.subject).toContain('Cập nhật lịch phỏng vấn');
  });

  it('thư từ chối dẫn về danh sách vị trí, không có thanh tiến trình', () => {
    const email = renderCandidateEmail(
      'rejected',
      sampleCandidate({ status: 'rejected' }),
      brand,
    );
    expect(email.html).toContain('https://uyvuict.vn/tuyen-dung"');
    expect(email.html).not.toContain('Nhận việc');
  });
});

describe('candidateEmailKindFor', () => {
  it('đưa về "Mới nộp" thì không gửi, các bước khác gửi đúng loại', () => {
    expect(candidateEmailKindFor('new')).toBeNull();
    expect(candidateEmailKindFor('interview')).toBe('interview');
    expect(candidateEmailKindFor('rejected')).toBe('rejected');
  });
});
