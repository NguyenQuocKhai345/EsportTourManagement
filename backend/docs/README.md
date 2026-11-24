# Backend docs

Tài liệu này là bản đồ bối cảnh cho các phiên làm việc với Backend Esport Tournament Management System.

## Đọc theo thứ tự

1. [Bối cảnh toàn hệ thống](./esport_tournament_system_context.md): nghiệp vụ tổng quan, thuật ngữ, các domain đã thảo luận và định hướng sản phẩm.
2. [Kiến trúc và database](./modules/architecture-database.md): cấu trúc backend thực tế, các bảng/nhóm bảng và ranh giới giữa phần đã triển khai với phần roadmap.
3. Tài liệu module tương ứng với chức năng đang sửa:
   - [Authentication](./modules/authentication.md)
   - [User profile](./modules/user-profile.md)
   - [Admin users](./modules/admin-users.md)
   - [Games](./modules/games.md)
   - [Tournaments](./modules/tournaments.md)
   - [Categories](./modules/categories.md)
   - [Teams](./modules/teams.md)

`../agent.md` quy định quy trình bắt buộc: đọc tài liệu chung và module liên quan trước khi sửa; cập nhật tài liệu module khi có behavior, lifecycle, schema hoặc API mới; cập nhật tài liệu chung nếu thay đổi ảnh hưởng xuyên module hoặc thay đổi nguyên tắc nghiệp vụ toàn hệ thống.

Tài liệu mô tả hiện trạng phải được đối chiếu với source code và `backend/prisma/schema.prisma`. Nếu có khác biệt, source code/migration hiện hành là bằng chứng về implementation; không biến nội dung roadmap thành behavior đã có.
