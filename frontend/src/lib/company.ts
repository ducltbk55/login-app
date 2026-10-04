/** Nhận diện doanh nghiệp, dùng chung cho metadata, trang giới thiệu và admin. */
export const COMPANY_NAME = "Công ty TNHH UY VŨ ICT";
export const COMPANY_SHORT_NAME = "UY VŨ ICT";

/** Ảnh nằm trong `public/`, đã cắt tròn và xoá nền. */
export const COMPANY_LOGO = "/logo-uy-vu-ict.png";

export const COMPANY_TAGLINE =
  "Giải pháp công nghệ thông tin cho doanh nghiệp Việt";

export const COMPANY_PROFILE = {
  foundedYear: 2022,
  industry: "Công nghệ thông tin",
  director: "Lê Trung Đức",
  directorTitle: "Giám đốc",
  /**
   * Địa chỉ tạm, dùng tên phường có thật sau sắp xếp đơn vị hành chính
   * 01/07/2025 (Đà Nẵng không còn cấp quận).
   */
  address: "Tầng 7, Toà nhà Vĩnh Trung Plaza, 255 Hùng Vương",
  ward: "Phường Hải Châu",
  city: "Thành phố Đà Nẵng",
  email: "lienhe@uyvuict.vn",
  phone: "0236 3 888 999",
  taxCode: "0402xxxxxx",
  workingHours: "Thứ 2 – Thứ 6, 08:00 – 17:30",
} as const;

/**
 * Tài khoản nhận chuyển khoản cho đơn hàng. Hiện ở trang đặt hàng, màn hình
 * đặt thành công và đơn chưa thanh toán trong trang cá nhân.
 */
export const COMPANY_BANK = {
  accountName: "LÊ TRUNG ĐỨC",
  accountNumber: "7992456789",
  bankName: "Techcombank",
} as const;

/**
 * Mã VietQR của tài khoản trên (cắt từ ảnh app Techcombank). Mã tĩnh: chỉ
 * chứa ngân hàng + số tài khoản, không có số tiền/nội dung. Đổi tài khoản
 * thì thay cả ảnh này.
 */
export const COMPANY_BANK_QR = "/bank-qr.png";

/** Địa chỉ đầy đủ một dòng. */
export const COMPANY_ADDRESS = [
  COMPANY_PROFILE.address,
  COMPANY_PROFILE.ward,
  COMPANY_PROFILE.city,
].join(", ");

/** Số năm hoạt động, tính theo năm hiện tại nên không phải sửa tay hằng năm. */
export function yearsInBusiness(now: Date = new Date()): number {
  return Math.max(1, now.getFullYear() - COMPANY_PROFILE.foundedYear);
}
