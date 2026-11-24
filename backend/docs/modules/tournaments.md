# Tournaments

## Phạm vi và code

Module `src/modules/tournaments` quản lý giải và owner/organizer. Category là module con theo tournament, nhưng có service riêng.

## API hiện có

Base path `/api/v1/tournaments`:

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/` | BTC | Tạo giải, organizer lấy từ authenticated identity. |
| GET | `/` | Public | Search/filter/paginate; DRAFT chỉ hiện với organizer tương ứng. |
| GET | `/:id` | Public | Chi tiết và categories; DRAFT chỉ organizer thấy. |
| PATCH | `/:id` | BTC + owner check | Sửa trường cho phép và trạng thái theo service. |
| DELETE | `/:id` | BTC + owner check | Xóa theo trạng thái/quan hệ cho phép. |

## Bảng chính

`Tournament` lưu `organizerId`, thông tin, lifecycle status, registration/event dates, `resultConfirmationHours`, generalRules. Quan hệ gồm categories, tournament referees và rule documents. Tournament owner được kiểm tra trong service; role BTC đơn lẻ không cho quyền sửa mọi giải.

## Lifecycle

Enum hiện có: `DRAFT`, `REGISTRATION_OPEN`, `REGISTRATION_CLOSED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. Service kiểm tra ngày hợp lệ và các transition; COMPLETED/CANCELLED là trạng thái cuối theo logic hiện hành. Kiểm tra trực tiếp `TournamentsService` trước khi mô tả/thay đổi chi tiết transition.

Audit event được ghi cho thao tác tạo và các sự kiện tournament/category liên quan qua `recordAudit`; xem service để biết chính xác event hiện được emit.

## Ranh giới

Tournament xác định quyền sở hữu và khung giải; game catalog không nằm trong đây. Category config nằm ở module Categories. Registration, stage, match, referee operations hiện chưa có API module tương ứng; không coi bảng schema tương lai là workflow đã có.
