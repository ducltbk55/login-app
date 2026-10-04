import { articleImage } from "@/lib/articles";
import { serveImage } from "@/lib/image-routes";

/** Ảnh trong bài viết — công khai, ảnh nằm trong bài đã đăng. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  return serveImage(() => articleImage(file));
}
