# Registrations (Đăng ký Tham gia Giải đấu & Xét duyệt Hồ sơ)

## Phạm vi và code

Module `src/modules/registrations` quản lý quy trình nộp đơn đăng ký tham gia giải đấu của đội (Captain nộp hồ sơ - Task `BE010`) và quy trình xét duyệt của Ban tổ chức với kiểm soát giới hạn số đội (Approve/Reject - Task `BE011`).

## API hiện có

Base path: `/api/v1`

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/teams/:teamId/registration` | Captain (PLAYER/BTC/ADMIN) | Nộp hồ sơ đăng ký tham gia hạng mục (`BE010`). |
| POST | `/teams/:teamId/registration/withdraw` | Captain | Rút hồ sơ đăng ký khi còn đang chờ xét duyệt. |
| GET | `/tournaments/:tournamentId/registrations` | BTC (owner) / Admin | Danh sách hồ sơ đăng ký giải đấu (lọc `categoryId`, `status`, `search`, phân trang) (`BE011`). |
| GET | `/registrations/:id` | BTC (owner) / Admin / Captain | Xem chi tiết hồ sơ đăng ký và danh sách thành viên đội. |
| POST | `/registrations/:id/approve` | BTC (owner) / Admin | Phê duyệt hồ sơ với kiểm soát quota `maxTeams` bằng row locking (`BE011`). |
| POST | `/registrations/:id/reject` | BTC (owner) / Admin | Từ chối hồ sơ đăng ký kèm lý do. |

## Bảng và cấu trúc dữ liệu

- `Registration`:
  - `teamId` (Unique): Một đội chỉ có tối đa một bản ghi registration hiện hành.
  - `submittedById`: Người nộp đơn (bắt buộc là Captain của đội).
  - `reviewedById`: BTC hoặc Admin duyệt hồ sơ.
  - `status`: `PENDING`, `APPROVED`, `REJECTED`, `WITHDRAWN`.
  - `application`: Thông tin bổ sung dạng JSON.
  - `rosterLockedAt`: Thời điểm khóa danh sách thi đấu chính thức (được ghi nhận khi duyệt thành công).
- `Team`: Trạng thái đội được đồng bộ tương ứng:
  - Khi nộp đơn: `DRAFT` $\rightarrow$ `PENDING`.
  - Khi rút đơn: `PENDING` $\rightarrow$ `DRAFT`.
  - Khi được duyệt: `PENDING` $\rightarrow$ `ACCEPTED`.
  - Khi bị từ chối: `PENDING` $\rightarrow$ `REJECTED`.

## Quy tắc nghiệp vụ và kiểm soát đồng thời (Concurrency Control)

1. **Điều kiện nộp đơn**:
   - Giải đấu (`Tournament`) bắt buộc phải ở trạng thái `REGISTRATION_OPEN`.
   - Số lượng thành viên hoạt động (`leftAt = null`) của đội phải thỏa mãn: $\text{minPlayers} \le \text{roster} \le \text{maxPlayers}$ của `Category`.
   - Chỉ có Captain mới được nộp đơn hoặc rút đơn.
2. **Kiểm soát hạn ngạch (Quota Locking)**:
   - Khi BTC thực hiện duyệt (`approve`), hệ thống bắt đầu một Database Transaction và khóa bản ghi Category bằng cú pháp `SELECT "id" FROM "categories" WHERE "id" = ... FOR UPDATE`.
   - Kiểm tra số lượng đội đã được chấp nhận (`TeamStatus.ACCEPTED`): nếu đã đạt hoặc vượt `category.maxTeams`, hệ thống sẽ ném ngoại lệ `ConflictException` để ngăn chặn race condition khi nhiều admin duyệt cùng lúc.
3. **Audit Log**:
   - Tự động ghi nhận audit log: `REGISTRATION_SUBMITTED`, `REGISTRATION_WITHDRAWN`, `REGISTRATION_APPROVED`, `REGISTRATION_REJECTED`.
