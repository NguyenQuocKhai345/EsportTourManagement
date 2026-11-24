# User profile

## Phạm vi và code

Module `src/modules/user` phục vụ người dùng đang đăng nhập: xem/cập nhật hồ sơ cá nhân và đổi mật khẩu. Đây khác với `admin-users`, nơi Admin quản trị tài khoản của người khác.

## API hiện có

Base path `/api/v1/users`; các route yêu cầu authentication:

| Method | Path | Ý nghĩa |
|---|---|---|
| GET | `/profile/me` | Lấy hồ sơ của identity hiện tại. |
| PATCH | `/profile/me` | Cập nhật các trường hồ sơ cho phép qua DTO. Phone/email uniqueness được kiểm tra. |
| POST | `/change-password` | Đổi password của tài khoản hiện tại. |

## Dữ liệu và logic

Model dùng là `User`: name, email, phone, password hash, role, status, timestamps. API hồ sơ không được trả password hash. ID actor lấy từ JWT, không nhận userId mục tiêu từ client.

Phone và email là unique. Password hashing dùng argon2. Status/role do các luồng có quyền quản trị điều khiển, không phải field tự cập nhật qua profile DTO.

## Ranh giới

Đăng ký/đăng nhập và refresh/logout thuộc Authentication. Tạo/sửa/khóa/xóa tài khoản tùy role thuộc Admin users. Khi profile identity thay đổi, các module khác nên tham chiếu user id nội bộ, không dùng phone/email làm khóa quan hệ.
