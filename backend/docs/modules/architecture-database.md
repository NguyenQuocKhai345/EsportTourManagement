# Kiến trúc Backend và database

## Trạng thái implementation

Backend hiện là NestJS modular monolith dùng Prisma và PostgreSQL. Module API hiện diện trong `backend/src/modules`: `admin-users`, `categories`, `games`, `teams`, `tournaments`, `user`. Authentication nằm riêng tại `backend/src/auth`. Các module stages, matches, registrations, referee operations, disputes, ratings, seeding, prediction, notification và audit workflow chưa có API module tương ứng trong `src/modules`; schema có một số bảng dành cho các giai đoạn sau.

## Cấu trúc request

HTTP request đi qua global authentication/role guards, route controller, DTO validation, service và Prisma. Controller chủ yếu nhận input và identity; nghiệp vụ/authorization theo resource nằm trong service. Prisma client được cung cấp qua `PrismaService`. Các exception nghiệp vụ dùng lớp trong `src/format-response/errors`.

Prefix version API là `/api/v1`. `@Public()` đánh dấu route bỏ authentication theo cấu hình guard; `@Roles(...)` giới hạn role. Những route công khai vẫn có thể nhận identity tùy chọn để lọc tài nguyên DRAFT.

## Nhóm bảng hiện có trong schema

| Nhóm | Bảng/model | Vai trò và liên hệ chính |
|---|---|---|
| Identity | `User`, `RefreshToken` | Hồ sơ, role/status; refresh session theo user/device, lưu token hash và revoke metadata. |
| Competition setup | `Tournament`, `Game`, `Category`, `CategoryEligibilityRule`, `RuleDocument`, `RuleChunk`, `TournamentReferee` | Giải do organizer sở hữu; category gắn một game và tournament; category chứa luật/điều kiện; thể lệ chung/riêng có chunks; danh sách referee cấp giải. |
| Team | `Team`, `TeamMember`, `TeamJoinRequest`, `AICandidateRankingRun`, `AICandidateRankingItem` | Team thuộc category, captain; membership hiện tại/soft removal; join request kiêm lịch sử gia nhập; ranking run tham chiếu candidate/request. |
| Tournament application | `Registration`, `RegistrationRosterChange`, `RegistrationAIReview` | Hồ sơ team đăng ký, roster change, AI review. API registration chưa có module hiện tại. |
| Competition execution | `Stage`, `StageGroup`, `StageStanding`, `Match`, `MatchGame`, `MatchAdvancement`, `MatchReschedule`, `MatchReferee`, `MatchResultSubmission`, `MatchResultConfirmation` | Stage/bracket/match, slot, game con, advancement, lịch, trọng tài theo match, result submission/confirmation. Schema hiện có; API module chưa triển khai. |
| Dispute | `Dispute`, `DisputeEvidence`, `DisputeEvent`, `DisputeAISuggestion`, `DisputeAICitation` | Khiếu nại, chứng cứ, timeline và gợi ý/citation AI. Schema hiện có; API module chưa triển khai. |
| Player metrics | `PlayerRating`, `RatingHistory`, `SeedingRun`, `SeedingRunItem`, `MatchPrediction` | Rating theo user/game, lịch sử, seeding run/items, prediction. Schema hiện có; API module chưa triển khai. |
| Platform | `Notification`, `NotificationRecipient`, `AuditLog` | Notification/audit storage; không đồng nghĩa toàn bộ workflow/API đã được implement. |

Chi tiết cột, quan hệ, indexes và FK chuẩn nằm trong `prisma/schema.prisma`; schema/migrations là nguồn quyết định cấu trúc vật lý. Tài liệu module nên nêu các cột nghiệp vụ trọng tâm thay vì sao chép toàn bộ DDL.

## Lifecycle quan trọng đã được xác nhận

- Tournament: `DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → IN_PROGRESS → COMPLETED`; có thể `CANCELLED`, trạng thái cuối không thể sửa tùy ý. Chi tiết transition được service hiện tại kiểm soát.
- Team: `DRAFT`, `PENDING`, `ACCEPTED`, `REJECTED`, `DISBANDED`. Team mới `DRAFT`; chỉ captain được sửa thông tin và roster khi DRAFT. Registration API chưa nằm trong module hiện tại, vì vậy transition PENDING/ACCEPTED/REJECTED đang được mô tả theo nghiệp vụ/schema, không suy ra endpoint đã tồn tại.
- Team membership: `TeamMember.leftAt = NULL` là roster hiện hoạt. Join history giữ nguồn gia nhập (`ACCEPTED`/`ADDED`) và metadata rời team; không đổi history cũ khi rejoin.

## Quy tắc dữ liệu và triển khai

- Dùng FK, unique và indexes hiện có; xem migration trước khi đổi schema.
- Không trả password hash/token. Select response fields tường minh.
- Giao dịch nhiều bản ghi cần Prisma transaction; locking/constraint cần thiết cho giới hạn cạnh tranh.
- Không giả định bảng đã có API CRUD chỉ vì model tồn tại.
- Khi sửa module, cập nhật module doc và context chung theo quy tắc trong `agent.md`.
