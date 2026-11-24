# Categories

## Phạm vi và code

Module `src/modules/categories` quản lý hạng mục bên trong một Tournament. Service phụ thuộc `TournamentsService` để xác minh giải tồn tại, quyền owner và trạng thái cho phép ghi.

## API hiện có

Base path `/api/v1/tournaments/:tournamentId/categories`:

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/` | BTC + owner check | Tạo category thuộc tournament. |
| GET | `/` | Public | Danh sách có pagination/filter gameId/participationType. |
| GET | `/:categoryId` | Public | Chi tiết category trong đúng tournament, gồm game và eligibility rules. |
| PATCH | `/:categoryId` | BTC + owner check | Cập nhật cấu hình category/eligibility. |
| DELETE | `/:categoryId` | BTC + owner check | Xóa khi các ràng buộc/trạng thái cho phép. |

## Bảng và cấu hình

- `Category`: tournamentId, gameId, name, description, `participationType`, `minPlayers`, `maxPlayers`, `maxTeams`, eligibilityNotes.
- `CategoryEligibilityRule`: tiêu chí mô tả có required/sort order.
- `RuleDocument`: luật theo tournament, tùy chọn category; chunks ở `RuleChunk` dùng cho RAG sau này.

Category name unique trong một tournament. Game phải tồn tại/active theo nghiệp vụ. `TEAM`/`SOLO` cùng dùng Team model: SOLO có đúng một member/captain. Size validation cần giữ cấu hình hợp lệ; tham chiếu schema và `validateSize` trong service để biết các ràng buộc thực tế.

## Lifecycle và quyền

Category lifecycle phụ thuộc Tournament; category không có status riêng. Thao tác ghi chỉ khi tournament của BTC còn cho phép chỉnh sửa. Đọc category xác minh tournamentId/categoryId khớp nhau. Không kiểm tra eligibility tự động trong Team create nếu nghiệp vụ hiện mới lưu các rule dạng mô tả.

## Ranh giới

Category sở hữu game, participation type và roster/team limits; Team service dùng chúng khi tạo/quản lý roster. Cập nhật category có thể ảnh hưởng Team, cần xem quan hệ và trạng thái tournament trước khi thêm rule mới.
