import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { DatabaseModule } from '../database/database.module';
import { testDatabaseConfig } from '../database/testing';
import {
  decodeUploadName,
  isAllowedMime,
  isInlineSafe,
  resolveInsideDir,
  safeDisplayName,
  storageName,
} from './attachments';
import { ContactsService, type UploadedAttachment } from './contacts.service';

describe('ContactsService', () => {
  let moduleRef: TestingModule;
  let config: Record<string, string>;
  let contacts: ContactsService;

  const uploadDir = () => path.join(config.UPLOAD_DIR, 'contacts');

  const form = (extra: Record<string, unknown> = {}) => ({
    name: 'Nguyễn Văn A',
    email: 'a@example.com',
    message: 'Tôi muốn tư vấn về hệ thống quản trị.',
    ...extra,
  });

  const upload = (
    extra: Partial<UploadedAttachment> = {},
  ): UploadedAttachment => ({
    originalname: 'ho-so.pdf',
    mimetype: 'application/pdf',
    size: 1234,
    buffer: Buffer.from('%PDF-1.4 nội dung thử'),
    ...extra,
  });

  beforeEach(async () => {
    config = testDatabaseConfig();

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => config],
        }),
        DatabaseModule,
      ],
      providers: [ContactsService],
    }).compile();

    await moduleRef.init();
    contacts = moduleRef.get(ContactsService);
  });

  afterEach(async () => {
    await moduleRef.close();
    rmSync(config.UPLOAD_DIR, { recursive: true, force: true });
  });

  describe('chính sách tệp đính kèm', () => {
    it('chỉ nhận định dạng trong allowlist', () => {
      expect(isAllowedMime('application/pdf')).toBe(true);
      expect(isAllowedMime('image/png')).toBe(true);
      expect(isAllowedMime('application/x-msdownload')).toBe(false);
      expect(isAllowedMime('text/html')).toBe(false);
    });

    /**
     * SVG là XML, trình duyệt chạy <script> bên trong khi mở trực tiếp. Một
     * người lạ gửi lên là có XSS ngay trên tên miền của mình.
     */
    it('từ chối SVG', () => {
      expect(isAllowedMime('image/svg+xml')).toBe(false);
    });

    it('chỉ ảnh và PDF được mở thẳng trong trình duyệt', () => {
      expect(isInlineSafe('image/png')).toBe(true);
      expect(isInlineSafe('application/pdf')).toBe(true);
      expect(isInlineSafe('application/zip')).toBe(false);
      expect(isInlineSafe('text/plain')).toBe(false);
    });

    it('tên lưu trữ sinh ngẫu nhiên, giữ đúng đuôi theo kiểu tệp', () => {
      const first = storageName('image/png');
      const second = storageName('image/png');

      expect(first).toMatch(/^[0-9a-f-]{36}\.png$/);
      expect(first).not.toBe(second);
      expect(storageName('application/pdf')).toMatch(/\.pdf$/);
    });

    it('tên hiển thị bỏ đường dẫn và ký tự điều khiển', () => {
      expect(safeDisplayName('../../../etc/passwd')).toBe('passwd');
      expect(safeDisplayName('C:\\Windows\\win.ini')).toBe('win.ini');
      expect(safeDisplayName('bao-cao"\u0000.pdf')).toBe('bao-cao.pdf');
      expect(safeDisplayName('   ')).toBe('tep-dinh-kem');
      expect(safeDisplayName('Báo cáo quý 1.pdf')).toBe('Báo cáo quý 1.pdf');
    });

    /**
     * busboy giải mã tham số filename theo latin1, nên tên tiếng Việt tới
     * service đã ở dạng mojibake. Phát hiện qua e2e chứ không phải suy đoán.
     */
    it('dựng lại được tên tệp tiếng Việt bị busboy giải mã sai', () => {
      const mojibake = Buffer.from('Báo cáo quý 1.pdf', 'utf8').toString(
        'latin1',
      );

      expect(mojibake).toBe('BÃ¡o cÃ¡o quÃ½ 1.pdf'); // đúng thứ e2e nhìn thấy
      expect(decodeUploadName(mojibake)).toBe('Báo cáo quý 1.pdf');
      expect(safeDisplayName(mojibake)).toBe('Báo cáo quý 1.pdf');
    });

    it('tên thuần ASCII đi qua phép giải mã không đổi', () => {
      expect(decodeUploadName('report-2026.pdf')).toBe('report-2026.pdf');
    });

    it('chặn đường dẫn thoát khỏi thư mục lưu trữ', () => {
      expect(() => resolveInsideDir(uploadDir(), '../../app.db')).toThrow(
        /không hợp lệ/,
      );
      expect(() => resolveInsideDir(uploadDir(), 'abc.png')).not.toThrow();
    });
  });

  describe('gửi liên hệ', () => {
    it('lưu được yêu cầu không kèm tệp', async () => {
      const contact = await contacts.create(form());

      expect(contact).toMatchObject({
        name: 'Nguyễn Văn A',
        email: 'a@example.com',
        status: 'new',
        attachment: null,
        handledAt: null,
        handledBy: null,
      });
    });

    it('ghi tệp xuống đĩa và lưu thông tin mô tả', async () => {
      const contact = await contacts.create(form(), upload());

      expect(contact.attachment).toMatchObject({
        name: 'ho-so.pdf',
        mime: 'application/pdf',
        size: 1234,
        inline: true,
      });

      const files = readdirSync(uploadDir());
      expect(files).toHaveLength(1);
      // Tên trên đĩa KHÁC tên người dùng gửi lên.
      expect(files[0]).not.toBe('ho-so.pdf');
      expect(files[0]).toMatch(/\.pdf$/);
    });

    it('tên tệp độc hại không chạm tới hệ thống tệp', async () => {
      const contact = await contacts.create(
        form(),
        upload({ originalname: '../../../app.db' }),
      );

      // Tên gốc được làm sạch khi hiển thị...
      expect(contact.attachment?.name).toBe('app.db');
      // ...và tên thật trên đĩa là uuid do mình sinh.
      expect(readdirSync(uploadDir())[0]).toMatch(/^[0-9a-f-]{36}\.pdf$/);
      // Không có gì bị ghi ra ngoài thư mục upload: gốc UPLOAD_DIR chỉ có
      // thư mục `contacts`.
      expect(readdirSync(config.UPLOAD_DIR)).toEqual(['contacts']);
    });

    it('đọc lại được đúng nội dung tệp đã gửi', async () => {
      const contact = await contacts.create(form(), upload());
      const stored = await contacts.attachmentPath(contact.id);

      expect(readFileSync(stored.path).toString()).toContain('nội dung thử');
      expect(stored.name).toBe('ho-so.pdf');
      expect(stored.mime).toBe('application/pdf');
    });

    it('liên hệ không có tệp thì báo 404 khi đòi tệp', async () => {
      const contact = await contacts.create(form());

      await expect(contacts.attachmentPath(contact.id)).rejects.toThrow(
        /không có tệp đính kèm/,
      );
    });
  });

  describe('xử lý trong trang quản trị', () => {
    it('đổi trạng thái thì ghi lại ai xử lý và lúc nào', async () => {
      const contact = await contacts.create(form());
      const updated = await contacts.update(contact.id, {
        status: 'resolved',
        handledBy: 'admin@uyvu.vn',
      });

      expect(updated.status).toBe('resolved');
      expect(updated.handledBy).toBe('admin@uyvu.vn');
      expect(updated.handledAt).not.toBeNull();
    });

    it('sửa ghi chú không làm đổi mốc đã xử lý', async () => {
      const contact = await contacts.create(form());
      const handled = await contacts.update(contact.id, {
        status: 'resolved',
        handledBy: 'admin@uyvu.vn',
      });

      const noted = await contacts.update(contact.id, {
        note: 'Đã gọi lại.',
      });

      expect(noted.note).toBe('Đã gọi lại.');
      expect(noted.handledAt).toBe(handled.handledAt);
      expect(noted.handledBy).toBe('admin@uyvu.vn');
    });

    it('trả về hàng đợi thì xoá dấu vết đã xử lý', async () => {
      const contact = await contacts.create(form());
      await contacts.update(contact.id, {
        status: 'resolved',
        handledBy: 'admin@uyvu.vn',
      });

      const back = await contacts.update(contact.id, { status: 'new' });

      expect(back.status).toBe('new');
      expect(back.handledAt).toBeNull();
      expect(back.handledBy).toBeNull();
    });

    it('thống kê đếm theo từng trạng thái', async () => {
      await contacts.create(form());
      const b = await contacts.create(form({ email: 'b@example.com' }));
      const c = await contacts.create(form({ email: 'c@example.com' }));
      await contacts.update(b.id, { status: 'in_progress' });
      await contacts.update(c.id, { status: 'resolved' });

      expect(await contacts.stats()).toEqual({
        total: 3,
        pending: 1,
        inProgress: 1,
        resolved: 1,
      });
    });

    it('lọc theo trạng thái', async () => {
      const a = await contacts.create(form());
      await contacts.create(form({ email: 'b@example.com' }));
      await contacts.update(a.id, { status: 'rejected' });

      expect(await contacts.list({ status: 'rejected' })).toHaveLength(1);
      expect(await contacts.list({ status: 'new' })).toHaveLength(1);
    });

    it('tìm kiếm bỏ dấu trên tên, email và nội dung', async () => {
      await contacts.create(form({ name: 'Trần Thị Bích' }));
      await contacts.create(
        form({ email: 'khac@example.com', message: 'Hỏi giá' }),
      );

      expect(await contacts.list({ search: 'tran thi bich' })).toHaveLength(1);
      expect(await contacts.list({ search: 'hoi gia' })).toHaveLength(1);
      expect(await contacts.list({ search: 'khong-co-gi' })).toHaveLength(0);
    });

    it('mới nhất lên đầu', async () => {
      await contacts.create(form({ name: 'Cũ' }));
      await contacts.create(form({ name: 'Mới' }));

      expect((await contacts.list())[0].name).toBe('Mới');
    });
  });

  describe('xoá', () => {
    it('xoá liên hệ thì xoá luôn tệp đính kèm', async () => {
      const contact = await contacts.create(form(), upload());
      expect(readdirSync(uploadDir())).toHaveLength(1);

      await contacts.remove(contact.id);

      expect(await contacts.findOne(contact.id)).toBeNull();
      expect(readdirSync(uploadDir())).toHaveLength(0);
    });

    it('xoá liên hệ không có tệp vẫn bình thường', async () => {
      const contact = await contacts.create(form());
      await expect(contacts.remove(contact.id)).resolves.toBeUndefined();
    });

    it('xoá id không tồn tại báo 404', async () => {
      await expect(contacts.remove(9999)).rejects.toThrow(
        /Không tìm thấy liên hệ/,
      );
    });
  });
});
