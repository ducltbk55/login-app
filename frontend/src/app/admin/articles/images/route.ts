import { articleImageUrl, uploadArticleImage } from "@/lib/articles";
import { handleImageUpload } from "@/lib/image-routes";

/** Ảnh CKEditor (nội dung bài) và ô Ảnh bìa tải lên. */
export async function POST(request: Request) {
  return handleImageUpload(request, uploadArticleImage, articleImageUrl);
}
