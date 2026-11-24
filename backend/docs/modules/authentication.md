# Authentication

## Phạm vi và code

Authentication nằm trong `src/auth`, dùng Passport Local/JWT, `AuthService`, `JwtAuthGuard`, `RolesGuard`, `@Public()` và `@Roles()`. User nghiệp vụ được lưu bởi model `User`; device refresh session lưu trong `RefreshToken`.

## API hiện có

Base path `/api/v1/auth`:

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/login` | Public | Phone/password qua Local strategy; trả access/refresh credentials theo service. |
| POST | `/register` | Public | Tạo tài khoản player theo registration DTO. |
| POST | `/refresh` | Public | Đổi refresh token theo deviceId. |
| POST | `/logout` | Authenticated | Revoke session thiết bị hiện tại. |
| POST | `/logout-all-devices` | Authenticated | Revoke các session của user hiện tại. |

## Luồng và dữ liệu

- Local strategy tìm user theo phone, kiểm tra password hash và status trước khi cấp token.
- Access JWT chứa subject user; JWT strategy load identity hiện hành để guard gắn `req.user`.
- Refresh token thô chỉ trả cho client; DB lưu hash, deviceId, expiry, current/revoked flags, revoked reason và timestamps.
- Refresh/reuse/revocation phải tuân theo logic đang có trong `AuthService`; không tự tạo auth flow song song trong module nghiệp vụ.
- `Role` hiện là một enum trên User (`ADMIN`, `BTC`, `PLAYER`, `REFEREE`), mỗi tài khoản một role theo schema.

## Quyền truy cập

`JwtAuthGuard` bảo vệ mặc định; `@Public()` bỏ yêu cầu đăng nhập. `RolesGuard` kiểm tra role metadata. Resource ownership (ví dụ BTC sở hữu tournament, Player là captain team) được service nghiệp vụ kiểm tra bổ sung.

## Khi mở rộng

Không nhận userId/role từ body để xác định actor. Dùng `req.user` sau auth guard. Không trả password/hash hoặc token hash; cập nhật auth docs khi thay đổi token/session lifecycle hay API.
