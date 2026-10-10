/**
 * Schema MySQL của ứng dụng, chạy tuần tự mỗi lần khởi động.
 *
 * Mọi câu đều `CREATE TABLE IF NOT EXISTS` nên chạy lại không đổi gì. MySQL
 * không có `CREATE INDEX IF NOT EXISTS`, vì vậy index khai báo ngay trong bảng.
 *
 * Quy ước:
 * - Ngày giờ lưu chuỗi ISO 8601 (`VARCHAR(30)`) như trước, nên so sánh/sắp xếp
 *   theo chuỗi vẫn đúng thứ tự thời gian và API trả ra không đổi định dạng.
 * - Collation `utf8mb4_unicode_ci` không phân biệt hoa thường, thay cho
 *   `COLLATE NOCASE` của SQLite (email, sku, tên khi sắp xếp...).
 * - `order` là từ khoá nên luôn viết `` `order` ``.
 */
const TABLE_OPTIONS =
  'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

export const SCHEMA: readonly string[] = [
  // Migration dữ liệu đã chạy (xem `migrations/index.ts`).
  `CREATE TABLE IF NOT EXISTS migrations (
    name VARCHAR(191) NOT NULL PRIMARY KEY,
    appliedAt VARCHAR(30) NOT NULL
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS users (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    accountId VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NULL,
    image TEXT NULL,
    provider VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    createdAt VARCHAR(30) NOT NULL,
    lastLoginAt VARCHAR(30) NOT NULL,
    loginCount INT NOT NULL DEFAULT 1,
    -- Hồ sơ thành viên: người dùng tự khai sau lần đăng nhập đầu tiên.
    phone VARCHAR(30) NULL,
    gender VARCHAR(20) NULL,
    birthDate VARCHAR(30) NULL,
    addressLine VARCHAR(500) NULL,
    provinceCode VARCHAR(50) NULL,
    wardCode VARCHAR(50) NULL,
    UNIQUE KEY uq_users_accountId (accountId),
    UNIQUE KEY uq_users_email (email)
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS login_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    occurredAt VARCHAR(30) NOT NULL,
    KEY idx_login_events_userId (userId),
    CONSTRAINT fk_login_events_user FOREIGN KEY (userId)
      REFERENCES users(id) ON DELETE CASCADE
  ) ${TABLE_OPTIONS}`,

  // Phân nhóm: một danh mục có thể lấy danh mục khác làm "nhóm", khi đó mỗi
  // chi tiết thuộc về một chi tiết của danh mục nhóm đó.
  `CREATE TABLE IF NOT EXISTS categories (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    descriptions TEXT NULL,
    \`order\` INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    groupCategoryId INT NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_categories_code (code),
    KEY idx_categories_groupCategoryId (groupCategoryId),
    CONSTRAINT fk_categories_group FOREIGN KEY (groupCategoryId)
      REFERENCES categories(id)
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS category_details (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    categoryId INT NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    descriptions TEXT NULL,
    \`order\` INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    groupDetailId INT NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_category_details_code (categoryId, code),
    KEY idx_category_details_categoryId (categoryId),
    KEY idx_category_details_groupDetailId (groupDetailId),
    CONSTRAINT fk_category_details_category FOREIGN KEY (categoryId)
      REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_category_details_group FOREIGN KEY (groupDetailId)
      REFERENCES category_details(id)
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS permission_groups (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(191) NOT NULL,
    description TEXT NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_permission_groups_slug (slug)
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS permission_group_permissions (
    groupId INT NOT NULL,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (groupId, permission),
    CONSTRAINT fk_pgp_group FOREIGN KEY (groupId)
      REFERENCES permission_groups(id) ON DELETE CASCADE
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS user_permission_groups (
    userId INT NOT NULL,
    groupId INT NOT NULL,
    assignedAt VARCHAR(30) NOT NULL,
    PRIMARY KEY (userId, groupId),
    KEY idx_user_groups_groupId (groupId),
    CONSTRAINT fk_upg_user FOREIGN KEY (userId)
      REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_upg_group FOREIGN KEY (groupId)
      REFERENCES permission_groups(id) ON DELETE CASCADE
  ) ${TABLE_OPTIONS}`,

  // Bài viết. Chuyên mục là một chi tiết của danh mục DM_CHUYEN_MUC, tham
  // chiếu bằng khoá ngoại thật. Không ON DELETE CASCADE — xoá một chuyên mục
  // không được phép kéo theo bài viết; CategoryDetailsService chặn việc đó.
  `CREATE TABLE IF NOT EXISTS articles (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    categoryDetailId INT NOT NULL,
    slug VARCHAR(191) NOT NULL,
    title VARCHAR(500) NOT NULL,
    summary TEXT NULL,
    content LONGTEXT NOT NULL,
    coverImage TEXT NULL,
    author VARCHAR(255) NOT NULL,
    publishedAt VARCHAR(30) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    featured TINYINT NOT NULL DEFAULT 0,
    viewCount INT NOT NULL DEFAULT 0,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_articles_slug (slug),
    KEY idx_articles_categoryDetailId (categoryDetailId),
    -- Trang Tin tức luôn lọc theo trạng thái rồi sắp theo ngày đăng.
    KEY idx_articles_status_publishedAt (status, publishedAt),
    CONSTRAINT fk_articles_category_detail FOREIGN KEY (categoryDetailId)
      REFERENCES category_details(id)
  ) ${TABLE_OPTIONS}`,

  // Sản phẩm. Lĩnh vực là một chi tiết của danh mục DM_LINH_VUC_SP.
  // Giá lưu số nguyên VNĐ, NULL = chưa công bố giá.
  // `gallery`/`specs` là mảng JSON lưu dạng chuỗi, luôn đọc/ghi cả bộ.
  // MySQL cho UNIQUE trên cột NULL nhiều lần, nên sku để trống không đụng nhau.
  `CREATE TABLE IF NOT EXISTS products (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    categoryDetailId INT NOT NULL,
    slug VARCHAR(191) NOT NULL,
    name VARCHAR(500) NOT NULL,
    sku VARCHAR(100) NULL,
    summary TEXT NULL,
    description LONGTEXT NULL,
    image TEXT NULL,
    price BIGINT NULL,
    salePrice BIGINT NULL,
    launchedAt VARCHAR(30) NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    inStock TINYINT NOT NULL DEFAULT 1,
    gallery LONGTEXT NOT NULL,
    specs LONGTEXT NOT NULL,
    videoUrl TEXT NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_products_slug (slug),
    UNIQUE KEY uq_products_sku (sku),
    KEY idx_products_categoryDetailId (categoryDetailId),
    KEY idx_products_status (status),
    CONSTRAINT fk_products_category_detail FOREIGN KEY (categoryDetailId)
      REFERENCES category_details(id),
    CONSTRAINT chk_products_price CHECK (price IS NULL OR price >= 0),
    CONSTRAINT chk_products_sale_price CHECK (
      salePrice IS NULL OR (price IS NOT NULL AND salePrice < price)
    )
  ) ${TABLE_OPTIONS}`,

  // Đơn hàng. Dòng hàng lưu BẢN CHỤP tên/giá lúc đặt; `productId` chỉ để
  // dẫn về sản phẩm, xoá sản phẩm thì về NULL chứ không làm mất đơn.
  `CREATE TABLE IF NOT EXISTS orders (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    customerName VARCHAR(255) NOT NULL,
    customerPhone VARCHAR(30) NOT NULL,
    customerEmail VARCHAR(255) NULL,
    address TEXT NULL,
    note TEXT NULL,
    userEmail VARCHAR(255) NULL,
    paymentMethod VARCHAR(30) NOT NULL,
    paymentStatus VARCHAR(20) NOT NULL DEFAULT 'unpaid',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    subtotal BIGINT NOT NULL,
    discount BIGINT NOT NULL DEFAULT 0,
    total BIGINT NOT NULL,
    adminNote TEXT NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_orders_code (code),
    KEY idx_orders_status_createdAt (status, createdAt),
    KEY idx_orders_userEmail (userEmail),
    CONSTRAINT chk_orders_total CHECK (
      total >= 0 AND discount >= 0 AND total = subtotal - discount
    )
  ) ${TABLE_OPTIONS}`,

  `CREATE TABLE IF NOT EXISTS order_items (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    productId INT NULL,
    productName VARCHAR(500) NOT NULL,
    productSlug VARCHAR(191) NULL,
    sku VARCHAR(100) NULL,
    image TEXT NULL,
    listPrice BIGINT NOT NULL,
    unitPrice BIGINT NOT NULL,
    quantity INT NOT NULL,
    KEY idx_order_items_orderId (orderId),
    KEY idx_order_items_productId (productId),
    CONSTRAINT fk_order_items_order FOREIGN KEY (orderId)
      REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (productId)
      REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)
  ) ${TABLE_OPTIONS}`,

  // Lịch sử đơn hàng chỉ thêm, không sửa — đó là nhật ký đối chiếu.
  `CREATE TABLE IF NOT EXISTS order_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orderId INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    fromValue VARCHAR(255) NULL,
    toValue VARCHAR(255) NULL,
    note TEXT NULL,
    actor VARCHAR(255) NULL,
    createdAt VARCHAR(30) NOT NULL,
    KEY idx_order_events_orderId (orderId),
    CONSTRAINT fk_order_events_order FOREIGN KEY (orderId)
      REFERENCES orders(id) ON DELETE CASCADE
  ) ${TABLE_OPTIONS}`,

  // Yêu cầu liên hệ. Tệp đính kèm nằm trên đĩa (`<UPLOAD_DIR>/contacts`):
  //   attachmentFile = tên do hệ thống sinh, dùng để đọc file
  //   attachmentName = tên gốc người gửi, CHỈ để hiển thị lại
  `CREATE TABLE IF NOT EXISTS contacts (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NULL,
    subject VARCHAR(500) NULL,
    message TEXT NOT NULL,
    attachmentName VARCHAR(500) NULL,
    attachmentFile VARCHAR(255) NULL,
    attachmentMime VARCHAR(100) NULL,
    attachmentSize INT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    note TEXT NULL,
    handledBy VARCHAR(255) NULL,
    handledAt VARCHAR(30) NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    -- Trang quản trị mặc định lọc theo trạng thái rồi sắp theo thời gian gửi.
    KEY idx_contacts_status_createdAt (status, createdAt)
  ) ${TABLE_OPTIONS}`,

  // Tuyển dụng: đợt → vị trí → ứng viên (xem recruitment/recruitment.entity.ts).
  // Ngày mở/đóng đợt là ngày lịch YYYY-MM-DD, không có giờ.
  `CREATE TABLE IF NOT EXISTS recruitment_batches (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    startDate VARCHAR(10) NOT NULL,
    endDate VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    KEY idx_recruitment_batches_status (status),
    CONSTRAINT chk_recruitment_batches_dates CHECK (startDate <= endDate)
  ) ${TABLE_OPTIONS}`,

  // Không ON DELETE CASCADE ở cả hai tầng: xoá đợt hay vị trí không được kéo
  // theo hồ sơ ứng viên — service chặn xoá khi còn dữ liệu con.
  `CREATE TABLE IF NOT EXISTS recruitment_jobs (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    batchId INT NOT NULL,
    slug VARCHAR(191) NOT NULL,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(255) NULL,
    level VARCHAR(100) NOT NULL,
    employmentType VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    salary VARCHAR(255) NULL,
    openings INT NOT NULL DEFAULT 1,
    summary TEXT NULL,
    requirements TEXT NULL,
    description LONGTEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    UNIQUE KEY uq_recruitment_jobs_slug (slug),
    KEY idx_recruitment_jobs_batchId (batchId),
    CONSTRAINT fk_recruitment_jobs_batch FOREIGN KEY (batchId)
      REFERENCES recruitment_batches(id),
    CONSTRAINT chk_recruitment_jobs_openings CHECK (openings > 0)
  ) ${TABLE_OPTIONS}`,

  // Hồ sơ ứng viên. CV nằm trên đĩa (`<UPLOAD_DIR>/candidates`), giống đính
  // kèm liên hệ: cvFile = tên hệ thống sinh, cvName = tên gốc chỉ để hiển thị.
  // `batchId` là đợt LÚC NỘP, giữ nguyên dù vị trí sau này bị chuyển đợt.
  `CREATE TABLE IF NOT EXISTS candidates (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    jobId INT NOT NULL,
    batchId INT NOT NULL,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    experience VARCHAR(100) NULL,
    portfolioUrl VARCHAR(500) NULL,
    coverLetter TEXT NULL,
    cvName VARCHAR(500) NOT NULL,
    cvFile VARCHAR(255) NOT NULL,
    cvMime VARCHAR(100) NOT NULL,
    cvSize INT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'new',
    interviewAt VARCHAR(30) NULL,
    note TEXT NULL,
    handledBy VARCHAR(255) NULL,
    handledAt VARCHAR(30) NULL,
    createdAt VARCHAR(30) NOT NULL,
    updatedAt VARCHAR(30) NOT NULL,
    KEY idx_candidates_jobId (jobId),
    KEY idx_candidates_batchId (batchId),
    KEY idx_candidates_status_createdAt (status, createdAt),
    -- Service tra index này để chặn một email nộp trùng vào cùng vị trí.
    KEY idx_candidates_job_email (jobId, email),
    CONSTRAINT fk_candidates_job FOREIGN KEY (jobId)
      REFERENCES recruitment_jobs(id),
    CONSTRAINT fk_candidates_batch FOREIGN KEY (batchId)
      REFERENCES recruitment_batches(id)
  ) ${TABLE_OPTIONS}`,

  // Nhật ký hồ sơ chỉ thêm, không sửa — như lịch sử đơn hàng.
  `CREATE TABLE IF NOT EXISTS candidate_events (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    candidateId INT NOT NULL,
    type VARCHAR(30) NOT NULL,
    fromValue VARCHAR(255) NULL,
    toValue VARCHAR(255) NULL,
    actor VARCHAR(255) NULL,
    createdAt VARCHAR(30) NOT NULL,
    KEY idx_candidate_events_candidateId (candidateId),
    CONSTRAINT fk_candidate_events_candidate FOREIGN KEY (candidateId)
      REFERENCES candidates(id) ON DELETE CASCADE
  ) ${TABLE_OPTIONS}`,
];
