# Rules (Tài liệu Thể lệ Giải đấu & Hạng mục)

## Phạm vi và code

Module `src/modules/rules` quản lý tài liệu thể lệ chung của Tournament và tài liệu thể lệ riêng cho từng Category bên trong giải đấu (Task `BE006`).

## API hiện có

Base path: `/api/v1`

| Method | Path | Quyền | Ý nghĩa |
|---|---|---|---|
| POST | `/tournaments/:tournamentId/rules` | BTC (owner) / Admin | Tạo tài liệu thể lệ (chung hoặc chỉ định categoryId). |
| GET | `/tournaments/:tournamentId/rules` | Public | Danh sách thể lệ của giải (hỗ trợ lọc `categoryId`, `isGeneral`, `search`, phân trang). |
| GET | `/tournaments/:tournamentId/categories/:categoryId/rules` | Public | Danh sách thể lệ áp dụng riêng cho category. |
| GET | `/rules/:id` | Public | Xem chi tiết tài liệu thể lệ. |
| PATCH | `/rules/:id` | BTC (owner) / Admin | Cập nhật thông tin tài liệu thể lệ (tiêu đề, fileUrl, categoryId). |
| DELETE | `/rules/:id` | BTC (owner) / Admin | Xóa tài liệu thể lệ (cascade xóa chunks nếu có). |

## Bảng và cấu trúc dữ liệu

- `RuleDocument`:
  - `tournamentId`: Khóa ngoại tham chiếu `Tournament`.
  - `categoryId`: Tùy chọn tham chiếu `Category` (nếu `null` là thể lệ chung của giải, nếu có giá trị là thể lệ riêng cho hạng mục).
  - `title`, `fileUrl`, `mimeType`, `checksum`, `isProcessed`.
- `RuleChunk`: Các phân đoạn văn bản được băm nhỏ từ tài liệu để phục vụ AI Service tạo embeddings và trích xuất ngữ cảnh RAG khi xử lý tranh chấp (Dispute).

## Quy tắc nghiệp vụ và phân quyền

1. **Ràng buộc thể lệ riêng**: Khi tạo hoặc cập nhật tài liệu có gắn `categoryId`, hệ thống bắt buộc kiểm tra `Category` phải tồn tại và có `tournamentId` trùng khớp với giải đấu đang thao tác.
2. **Quyền sở hữu**: Chỉ BTC tạo giải đấu (`organizerId`) hoặc người dùng có vai trò `ADMIN` mới có quyền tạo, cập nhật hoặc xóa tài liệu thể lệ của giải đó.
3. **Hiển thị**: Nếu giải đấu đang ở trạng thái `DRAFT`, tài liệu thể lệ chỉ hiển thị với chính BTC tạo giải; khi giải đã công bố (`PUBLISHED`, `REGISTRATION_OPEN`,...), tài liệu thể lệ hiển thị công khai cho mọi người dùng.
4. **Audit log**: Ghi nhận nhật ký kiểm toán với các action `RULE_DOCUMENT_CREATED`, `RULE_DOCUMENT_UPDATED`, `RULE_DOCUMENT_DELETED`.
