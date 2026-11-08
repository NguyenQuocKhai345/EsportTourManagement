<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Auth NestJS</h1>

<p align="center">Backend API xác thực & phân quyền (Authentication &amp; Authorization) xây dựng bằng <a href="http://nestjs.com/" target="_blank">NestJS</a> + <a href="https://www.prisma.io/" target="_blank">Prisma</a>.</p>

---

## Giới thiệu

Đây là dịch vụ backend cung cấp REST API cho đăng ký, đăng nhập và quản lý phiên đăng nhập theo thiết bị (multi-device refresh token), dùng PostgreSQL qua Prisma ORM (driver adapter `@prisma/adapter-pg`).

## Tính năng

- Đăng ký / đăng nhập bằng số điện thoại + mật khẩu (Passport Local)
- Xác thực bằng JWT access token (Passport JWT), route mặc định yêu cầu đăng nhập trừ khi đánh dấu `@Public()`
- Refresh token theo từng thiết bị (`deviceId`), lưu dạng hash (SHA-256) trong bảng `refresh_tokens`
- Đăng xuất một thiết bị hoặc tất cả thiết bị (thu hồi refresh token, ghi nhận `revokedReason`)
- Phân quyền theo vai trò đơn (`ADMIN`, `BTC`, `PLAYER`, `REFEREE`) qua guard toàn cục và decorator `@Roles()`. Đăng ký công khai mặc định là `PLAYER`; người đăng ký có thể chọn `BTC`, `PLAYER` hoặc `REFEREE`, còn `ADMIN` không thể tự đăng ký.
- Chuẩn hoá response thành công (`TransformInterceptor` + `@ResponseMessage()`) và response lỗi (`AppExceptionFilter`)
- Validate DTO tự động (`class-validator`, whitelist + forbid non-whitelisted)
- API versioning theo URI (`/api/v1/...`) và tài liệu Swagger tại `/api/docs`

## Công nghệ chính

| Thành phần | Công nghệ |
| --- | --- |
| Framework | NestJS 10 |
| ORM | Prisma 7 (`prisma-client`, output `src/generated/prisma`) |
| DB driver | PostgreSQL qua `@prisma/adapter-pg` (`pg`) |
| Xác thực | Passport (`passport-local`, `passport-jwt`) + `@nestjs/jwt` |
| Hash mật khẩu | argon2 |
| Validate | class-validator / class-transformer |
| Tài liệu API | `@nestjs/swagger` |

## Cấu trúc thư mục

```text
auth-nestjs/
├── prisma/
│   └── schema.prisma            # Định nghĩa datasource, generator, model User & RefreshToken
├── prisma.config.ts              # Cấu hình Prisma CLI (đọc DATABASE_URL từ .env)
├── src/
│   ├── main.ts                   # Bootstrap: prefix /api, versioning, Swagger, global pipes/filters/interceptors
│   ├── app.module.ts             # Module gốc: import Prisma/Auth/User, đăng ký JwtGuard toàn cục
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── auth/                     # Xác thực & phiên đăng nhập
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts    # POST login | refresh | logout | logout-all-devices | register
│   │   ├── auth.service.ts       # Business logic: validate, sinh token, quản lý refresh token theo thiết bị
│   │   ├── dto/
│   │   │   └── auth.dto.ts       # UserLoginDto, RefreshTokenDto, LogoutDto, RegisterDto
│   │   ├── decorator/
│   │   │   ├── public.ts         # @Public() — bỏ qua JwtGuard toàn cục
│   │   │   └── roles.ts          # @Roles() — dùng cùng RolesGuard
│   │   ├── jwt/
│   │   │   ├── index.ts
│   │   │   ├── jwt.strategy.ts   # PassportStrategy xác thực Bearer access token
│   │   │   ├── jwt.guard.ts      # Guard toàn cục, tôn trọng @Public()
│   │   │   └── roles.guard.ts    # Guard kiểm tra Role theo @Roles()
│   │   └── local/
│   │       ├── index.ts
│   │       ├── local.strategy.ts # PassportStrategy xác thực phone + password khi login
│   │       └── local.guard.ts
│   │
│   ├── modules/
│   │   └── user/                 # Domain người dùng
│   │       ├── user.module.ts
│   │       ├── user.controller.ts
│   │       └── user.service.ts   # findUserValidate, findUserById (dùng cho auth.service)
│   │
│   ├── prisma/                   # Kết nối database
│   │   ├── prisma.module.ts      # @Global() — export PrismaService cho toàn app
│   │   └── prisma.service.ts     # Bọc PrismaClient + PrismaPg adapter, connect/disconnect theo lifecycle Nest
│   │
│   ├── format-response/          # Chuẩn hoá response API
│   │   ├── success/
│   │   │   ├── transform.interceptor.ts  # Bọc data thành { success, statusCode, message, data }
│   │   │   └── message-decorator.ts      # @ResponseMessage('...')
│   │   └── errors/
│   │       ├── app.exception.ts          # AppException cơ sở
│   │       ├── error.ts                  # BadRequest/Unauthorized/NotFound/Forbidden/Conflict/InternalServerError
│   │       └── app-exception.filter.ts   # Global exception filter → { success:false, message }
│   │
│   ├── interfaces/
│   │   ├── index.ts
│   │   └── user.interface.ts     # UserAccount, UserValidate, UserInfo dùng xuyên suốt auth/user
│   │
│   └── generated/
│       └── prisma/               # Prisma Client được generate (KHÔNG sửa tay, chạy `npx prisma generate`)
│
├── test/
│   ├── app.e2e-spec.ts
│   └── jest-e2e.json
│
├── .env.example                  # Danh sách biến môi trường cần khai báo
├── nest-cli.json
├── tsconfig.json / tsconfig.build.json
├── webpack.config.ts             # Dùng cho `npm run dev` (build --webpack --watch)
└── package.json
```

## Mô hình dữ liệu (Prisma)

- **User**: `id, name, email (unique), phone (unique), password, role (ADMIN|BTC|PLAYER|REFEREE), status (ACTIVE|INACTIVE|BLOCKED), createdAt, updatedAt` — bảng `users`
- **RefreshToken**: `id, userId, deviceId, tokenHash, isCurrent, revoked, revokedAt, revokedReason, lastUsedAt, absoluteExpiredAt` — bảng `refresh_tokens`, ràng buộc `@@unique([userId, deviceId])` (mỗi thiết bị chỉ có một refresh token hiện hành)

## Cấu hình môi trường

Sao chép `.env.example` thành `.env` và điền các biến sau:

```env
PORT=
NODE_ENV=
BASE_URL=

# Database
DATABASE_URL=

# CORS
CORS_ORIGINS=

# JWT
JWT_USER_SECRET=
JWT_USER_EXPIRED=
JWT_USER_REFRESH_SECRET=
JWT_USER_REFRESH_EXPIRED=
```

## Cài đặt

```bash
npm install
```

## Chuẩn bị database (Prisma)

```bash
# Sinh Prisma Client vào src/generated/prisma
npx prisma generate

# Áp migration lên database (dev)
npx prisma migrate dev

# Seed dữ liệu mẫu
npm run seed
```

## Chạy ứng dụng

```bash
# development
npm run start

# watch mode
npm run start:dev

# production mode
npm run start:prod
```

Sau khi chạy, API nằm dưới tiền tố `/api/v1`, tài liệu Swagger tại `http://localhost:<PORT>/api/docs`.

## Kiểm thử

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## API chính (nhóm auth)

| Method | Endpoint | Public | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | ✅ | Đăng ký tài khoản mới, tự động đăng nhập trả về token |
| POST | `/api/v1/auth/login` | ✅ | Đăng nhập bằng `phone` + `password` + `deviceId` |
| POST | `/api/v1/auth/refresh` | ✅ | Làm mới `accessToken`/`refreshToken` theo `deviceId` |
| POST | `/api/v1/auth/logout` | ❌ | Thu hồi refresh token của một thiết bị |
| POST | `/api/v1/auth/logout-all-devices` | ❌ | Thu hồi refresh token của tất cả thiết bị |
