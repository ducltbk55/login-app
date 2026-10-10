/**
 * Nội dung tĩnh của trang giới thiệu công ty.
 *
 * Cố tình để ở một chỗ duy nhất, không nhúng thẳng vào JSX. Tin tức và tuyển
 * dụng đã chuyển vào CSDL; phần còn lại vẫn là nội dung tĩnh.
 */

export type Service = {
  slug: string;
  title: string;
  summary: string;
  bullets: string[];
};

export const SERVICES: Service[] = [
  {
    slug: "phan-mem-theo-yeu-cau",
    title: "Phát triển phần mềm theo yêu cầu",
    summary:
      "Xây dựng hệ thống web và ứng dụng nội bộ bám sát quy trình thực tế của doanh nghiệp.",
    bullets: [
      "Khảo sát quy trình, thiết kế giải pháp",
      "Web app, cổng thông tin, hệ thống quản trị",
      "Bàn giao mã nguồn và tài liệu đầy đủ",
    ],
  },
  {
    slug: "chuyen-doi-so",
    title: "Tư vấn chuyển đổi số",
    summary:
      "Đưa giấy tờ và thao tác thủ công lên hệ thống, đo được và kiểm soát được.",
    bullets: [
      "Rà soát hiện trạng, lập lộ trình theo giai đoạn",
      "Số hoá biểu mẫu, luồng duyệt, báo cáo",
      "Đào tạo và chuyển giao cho đội ngũ nội bộ",
    ],
  },
  {
    slug: "ha-tang-van-hanh",
    title: "Hạ tầng & vận hành",
    summary:
      "Thiết lập máy chủ, sao lưu, giám sát để hệ thống chạy ổn định sau khi lên sóng.",
    bullets: [
      "Triển khai máy chủ, tên miền, chứng chỉ bảo mật",
      "Sao lưu định kỳ và phương án khôi phục",
      "Giám sát, cảnh báo sự cố 24/7",
    ],
  },
  {
    slug: "bao-tri-ho-tro",
    title: "Bảo trì & hỗ trợ kỹ thuật",
    summary:
      "Đồng hành sau bàn giao: sửa lỗi, nâng cấp và mở rộng theo nhu cầu mới.",
    bullets: [
      "Cam kết thời gian phản hồi theo hợp đồng",
      "Nâng cấp tính năng theo từng đợt",
      "Báo cáo tình trạng hệ thống hàng tháng",
    ],
  },
];

/* Tin bài giờ nằm trong DB — xem lib/articles.ts và bảng `articles`. */

/* Tuyển dụng giờ nằm trong DB — xem lib/recruitment.ts và các bảng recruitment_*. */

export const CORE_VALUES = [
  {
    title: "Làm thật, nói thật",
    description:
      "Cam kết đúng năng lực, báo cáo đúng tiến độ — kể cả khi tiến độ không như mong đợi.",
  },
  {
    title: "Giải pháp vừa vặn",
    description:
      "Chọn công nghệ phù hợp bài toán và ngân sách của khách hàng, không đắp thêm thứ không cần.",
  },
  {
    title: "Đi đường dài",
    description:
      "Bàn giao mã nguồn và tài liệu đầy đủ để khách hàng luôn làm chủ hệ thống của mình.",
  },
];

export const MILESTONES = [
  {
    year: "2022",
    text: "Thành lập công ty tại Đà Nẵng, tập trung phát triển phần mềm theo yêu cầu.",
  },
  {
    year: "2023",
    text: "Mở rộng đội ngũ, triển khai những hệ thống quản trị đầu tiên cho khách hàng doanh nghiệp.",
  },
  {
    year: "2024",
    text: "Bổ sung mảng hạ tầng và vận hành, nhận bảo trì hệ thống dài hạn.",
  },
  {
    year: "2025",
    text: "Chuẩn hoá quy trình phát triển, áp dụng kiểm thử tự động cho toàn bộ dự án.",
  },
  {
    year: "2026",
    text: "Đưa bộ giải pháp quản trị danh mục và phân quyền dùng chung vào khai thác.",
  },
];
