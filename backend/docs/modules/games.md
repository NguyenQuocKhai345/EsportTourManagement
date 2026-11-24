# Games

## Phạm vi và code

Module `src/modules/games` quản lý danh mục game mà category có thể chọn.

## API hiện có

Base path `/api/v1/games`:

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| GET | `/` | Public | Danh sách game active. |
| GET | `/:id` | Public | Chi tiết game active. |
| GET | `/manage` | ADMIN | Danh sách gồm inactive. |
| GET | `/manage/:id` | ADMIN | Chi tiết gồm inactive. |
| POST | `/` | ADMIN | Tạo game. |
| PATCH | `/:id` | ADMIN | Sửa game/active state. |

## Dữ liệu và lifecycle

Model `Game`: name unique, slug unique, description, `isActive`, timestamps. Category tham chiếu game bằng FK. Public endpoint ẩn inactive. Khi game đã được category tham chiếu, không cho deactivate qua service để tránh ngừng game đang dùng. Xóa game không có API hiện tại.

Tên và slug được trim/validate; trùng unique được chuyển thành conflict.

## Ranh giới

Game là catalog metadata; cấu hình số người, TEAM/SOLO, giải đấu và eligibility thuộc Category. Cập nhật doc khi thay đổi lifecycle active/inactive hoặc cách category tham chiếu game.
