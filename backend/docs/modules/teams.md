# Teams

## Phạm vi và code

Module `src/modules/teams` quản lý Team trong đúng một Category, thông tin chung, roster, Captain, join requests và membership history. Team detail/list chỉ expose user id/name cho roster; không trả email/phone/password.

## API hiện có

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/api/v1/categories/:categoryId/teams` | PLAYER active | Tạo DRAFT team; Captain là actor token, captain tự có trong roster; nhận memberPhones đồng đội. |
| GET | `/api/v1/categories/:categoryId/teams` | Public | Danh sách phân trang, lọc visibility theo status/actor. |
| GET | `/api/v1/teams/:id` | Public có giới hạn visibility | Chi tiết Category, Captain và active members. |
| PATCH | `/api/v1/teams/:id` | Captain, DRAFT | Chỉ field chung name/tag/logoUrl. |
| POST | `/api/v1/teams/:id/members` | Captain, DRAFT, TEAM | Direct add member bằng phone; ghi history `ADDED`. |
| DELETE | `/api/v1/teams/:id/members/:phone` | Captain, DRAFT, TEAM | Soft-remove TeamMember và ghi history removal. |
| PATCH | `/api/v1/teams/:id/captain` | Captain, DRAFT | Đổi sang member đang có trong roster; SOLO không chuyển captain. |
| POST | `/api/v1/teams/:id/join-requests` | PLAYER active | User hiện tại gửi request; optional message. |
| GET | `/api/v1/teams/:id/join-requests` | Captain | Phân trang/lọc status; user relation chỉ id/name. |
| POST | `/api/v1/teams/:id/join-requests/:requestId/accept` | Captain | Accept request và thêm member atomically. |
| POST | `/api/v1/teams/:id/join-requests/:requestId/reject` | Captain | Reject pending request, không đổi roster. |

## Bảng và ý nghĩa

- `Team`: một category, captainId, name/tag/logoUrl, status.
- `TeamMember`: quan hệ Team/User hiện tại; một row per Team/User (`@@unique`), `leftAt = NULL` nghĩa là active. Remove ghi `leftAt`; re-add khôi phục row này và cập nhật `joinedAt`.
- `TeamJoinRequest`: request và membership history chung. Status `PENDING`, `ACCEPTED`, `REJECTED`, `ADDED` biểu diễn request/source; `removedAt`, `removedById`, `removalReason` biểu diễn kết thúc membership. Rejoin tạo history record mới; không reset metadata record cũ. `WITHDRAWN` có trong enum nhưng withdraw API chưa triển khai.

Roster hiện hành luôn xác định từ `TeamMember` lọc `leftAt: null`, không cần lọc lịch sử `ADDED/ACCEPTED`. History phục vụ nguồn gốc và audit join/remove.

## Lifecycle và invariant

- Team mới `DRAFT`; chỉ Captain chỉnh sửa thông tin chung/roster khi DRAFT.
- Team chỉ thuộc category tạo ra nó. Team `SOLO` có một member là Captain; không add/remove/join request.
- `TEAM` không vượt `maxPlayers`; remove giữ minPlayers theo rule hiện tại. Team có thể được tạo ban đầu chỉ với Captain; minPlayers phải đạt trước registration theo nghiệp vụ.
- Player chỉ ở tối đa một Team đang hoạt động trong cùng category. DRAFT/PENDING/ACCEPTED được xem là active team lifecycle cho kiểm tra roster; REJECTED/DISBANDED không chiếm slot.
- Join request chỉ cho TEAM/DRAFT và tournament `REGISTRATION_OPEN`; identity từ token. Một pending request per Team/User. Chỉ Captain của Team xử lý.
- Accept/reject là PENDING → ACCEPTED/REJECTED; không xử lý lần hai. Accept kiểm tra lại user, membership và capacity rồi cập nhật request + TeamMember trong transaction.
- Category row lock được dùng trong roster/request writes để serialize capacity và membership checks. DB có partial unique indexes cho pending request và active membership history.

## Ranh giới

Không có invitation, self-join approval, tournament registration hay team transfer trong module hiện tại. Registration endpoint/lifecycle gắn Team PENDING/ACCEPTED/REJECTED chưa implement trong current `src/modules`; đối chiếu docs chung trước khi phát triển.
