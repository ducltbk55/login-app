/**
 * Nội dung tĩnh của trang giới thiệu công ty.
 *
 * Cố tình để ở một chỗ duy nhất, không nhúng thẳng vào JSX: khi nào cần đưa
 * tin tức / tuyển dụng vào CSDL thì chỉ việc thay các hàm đọc ở đây, phần
 * giao diện giữ nguyên.
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

export type JobOpening = {
  slug: string;
  title: string;
  level: string;
  type: string;
  location: string;
  salary: string;
  requirements: string[];
  openings: number;
};

/** Dữ liệu mẫu — thay bằng truy vấn CSDL khi có phân hệ tuyển dụng. */
export const JOBS: JobOpening[] = [
  {
    slug: "lap-trinh-vien-fullstack",
    title: "Lập trình viên Fullstack (Next.js / NestJS)",
    level: "Middle",
    type: "Toàn thời gian",
    location: "Đà Nẵng",
    salary: "18 – 30 triệu",
    openings: 2,
    requirements: [
      "2 năm kinh nghiệm với TypeScript, React hoặc Next.js",
      "Hiểu REST API, cơ sở dữ liệu quan hệ",
      "Biết viết test và đọc được code của người khác",
    ],
  },
  {
    slug: "ky-su-devops",
    title: "Kỹ sư DevOps",
    level: "Middle – Senior",
    type: "Toàn thời gian",
    location: "Đà Nẵng",
    salary: "20 – 35 triệu",
    openings: 1,
    requirements: [
      "Thành thạo Linux, Docker, CI/CD",
      "Kinh nghiệm giám sát và xử lý sự cố hệ thống",
      "Ưu tiên có chứng chỉ cloud",
    ],
  },
  {
    slug: "chuyen-vien-phan-tich-nghiep-vu",
    title: "Chuyên viên phân tích nghiệp vụ (BA)",
    level: "Junior – Middle",
    type: "Toàn thời gian",
    location: "Đà Nẵng",
    salary: "Thoả thuận",
    openings: 1,
    requirements: [
      "Khả năng phỏng vấn khách hàng và viết tài liệu rõ ràng",
      "Vẽ được sơ đồ quy trình, wireframe",
      "Tiếng Anh đọc hiểu tài liệu kỹ thuật",
    ],
  },
  {
    slug: "thuc-tap-sinh-lap-trinh",
    title: "Thực tập sinh lập trình",
    level: "Internship",
    type: "Thực tập 3 – 6 tháng",
    location: "Đà Nẵng",
    salary: "Hỗ trợ 3 – 5 triệu",
    openings: 4,
    requirements: [
      "Sinh viên năm 3, năm 4 ngành CNTT",
      "Nắm cơ bản một ngôn ngữ lập trình",
      "Chủ động học hỏi, làm việc nhóm tốt",
    ],
  },
];

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
