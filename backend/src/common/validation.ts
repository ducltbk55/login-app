import { ValidationPipe } from '@nestjs/common';

/**
 * Cấu hình ValidationPipe dùng chung cho cả `main.ts` lẫn test e2e.
 *
 * Trước đây mỗi nơi tự dựng một bản sao, nên sửa một bên là test lặng lẽ kiểm
 * chứng cấu hình không còn tồn tại trong thực tế.
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    // Một trường thiếu sẽ phá vỡ nhiều ràng buộc cùng lúc (IsString,
    // MinLength, MaxLength...) và bắn ra ba câu, trong đó có câu vô nghĩa
    // kiểu "Tiêu đề tối đa 200 ký tự" cho ô đang để trống. Chỉ báo lỗi đầu
    // tiên của mỗi trường là đủ và dễ đọc hơn hẳn.
    //
    // Lưu ý: thứ tự decorator trong DTO vì thế có ý nghĩa — ràng buộc "không
    // được để trống" phải nằm sát tên trường (decorator đăng ký từ dưới lên).
    stopAtFirstError: true,
  });
}
