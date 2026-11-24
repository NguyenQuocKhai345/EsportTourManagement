# Admin users

## Phạm vi và code

Module `src/modules/admin-users` cung cấp quản trị User cho role `ADMIN`. Đây không phải profile API của chính người dùng.

## API hiện có

Base path `/api/v1/admin/users`; tất cả route yêu cầu `Role.ADMIN`:

| Method | Path | Ý nghĩa |
|---|---|---|
| POST | `/` | Tạo tài khoản quản trị viên. |
| GET | `/` | Tìm kiếm/lọc/phân trang user. |
| GET | `/:id` | Xem tài khoản an toàn theo id. |
| PATCH | `/:id` | Cập nhật các trường được DTO cho phép. |
| PATCH | `/:id/status` | Thay đổi trạng thái tài khoản. |
| DELETE | `/:id` | Xóa theo quy tắc service và FK hiện có. |

## Dữ liệu và quy tắc

Dùng model `User`; email và phone unique. Khi tạo user, Admin chỉ định role và status. Password được hash argon2 khi tạo. Response sử dụng `SAFE_USER_SELECT` (id/name/email/phone/role/status/timestamps), không expose password. Danh sách hỗ trợ search theo name/phone/email, filter role/status, sort và pagination. Role chỉ được chỉ định lúc tạo; DTO cập nhật profile không nhận role và backend từ chối field ngoài DTO.

Trạng thái `ACTIVE`, `INACTIVE`, `BLOCKED` ảnh hưởng đăng nhập và các thao tác yêu cầu Player active. Lỗi unique được trả qua exception thống nhất.

## Ranh giới

Không dùng module này để sửa dữ liệu hồ sơ thay user; không bypass auth lifecycle/token revocation logic. Status có thể được cập nhật theo API riêng; role không thể cập nhật sau khi tài khoản đã được tạo.
