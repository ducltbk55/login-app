import { articleImageUrl, uploadArticleImage } from "@/lib/articles";
import { handleImageUpload } from "@/lib/image-routes";

/**
 * Ảnh chèn trong mô tả vị trí. Dùng chung kho ảnh công khai của bài viết
 * (phát ở /media/articles/...) — chỉ khác quyền cần có để tải lên.
 */
export async function POST(request: Request) {
  return handleImageUpload(
    request,
    uploadArticleImage,
    articleImageUrl,
    "RECRUITMENT.WRITE",
  );
}
