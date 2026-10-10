/**
 * Nhận diện doanh nghiệp dùng trong email. Trùng với `frontend/src/lib/company.ts`
 * — đổi bên đó thì sửa cả ở đây (backend không import được code của frontend).
 */
export type MailBrand = {
  companyName: string;
  shortName: string;
  /** Origin công khai của website, không có `/` ở cuối. Logo và link đều dựa vào đây. */
  siteUrl: string;
  logoPath: string;
  bankQrPath: string;
  address: string;
  email: string;
  phone: string;
  workingHours: string;
  bank: { bankName: string; accountNumber: string; accountName: string };
};

export const DEFAULT_MAIL_BRAND: Omit<MailBrand, 'siteUrl'> = {
  companyName: 'Công ty TNHH UY VŨ ICT',
  shortName: 'UY VŨ ICT',
  logoPath: '/logo-uy-vu-ict.png',
  bankQrPath: '/bank-qr.png',
  address:
    'Tầng 7, Toà nhà Vĩnh Trung Plaza, 255 Hùng Vương, Phường Hải Châu, Thành phố Đà Nẵng',
  email: 'lienhe@uyvuict.vn',
  phone: '0236 3 888 999',
  workingHours: 'Thứ 2 – Thứ 6, 08:00 – 17:30',
  bank: {
    bankName: 'Techcombank',
    accountNumber: '7992456789',
    accountName: 'LÊ TRUNG ĐỨC',
  },
};

export function mailBrand(siteUrl: string): MailBrand {
  return { ...DEFAULT_MAIL_BRAND, siteUrl: siteUrl.replace(/\/+$/, '') };
}
