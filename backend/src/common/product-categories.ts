/**
 * Lĩnh vực sản phẩm được lưu như một danh mục bình thường (`DM_LINH_VUC_SP`),
 * mỗi lĩnh vực là một chi tiết của nó — cùng cách với chuyên mục bài viết
 * (xem `common/article-categories.ts`): admin thêm/sửa/tắt lĩnh vực ngay trong
 * màn Danh mục, không cần màn hình riêng.
 *
 * Không seed sẵn chi tiết nào: lĩnh vực kinh doanh là dữ liệu của doanh
 * nghiệp, không phải của phần mềm. Chỉ bảo đảm danh mục cha tồn tại.
 */
export const PRODUCT_CATEGORY_CODE = 'DM_LINH_VUC_SP';
export const PRODUCT_CATEGORY_NAME = 'Danh mục lĩnh vực sản phẩm';
export const PRODUCT_CATEGORY_DESCRIPTION =
  'Lĩnh vực của chức năng sản phẩm. Mỗi chi tiết là một lĩnh vực để phân ' +
  'loại sản phẩm trên trang Product.';
