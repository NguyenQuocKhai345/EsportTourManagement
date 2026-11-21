# Backend Engineering Guidelines -- Esport Tournament Management System

Tài liệu này quy định nguyên tắc tổ chức và viết mã Backend. `esport_tournament_system_context.md`
mô tả bối cảnh, nghiệp vụ và kiến trúc sản phẩm; tài liệu này mô tả cách
tổ chức code. Khi triển khai, cần đối chiếu cả hai tài liệu và codebase
thực tế.
File này chỉ quy định cách code, không lặp lại toàn bộ nghiệp vụ.

## 1. Mục tiêu kiến trúc

Backend hướng đến **Modular Monolith**: một ứng dụng Backend thống nhất,
chia thành các module nghiệp vụ có ranh giới rõ ràng. Kiến trúc cần dễ
đọc, kiểm thử, bảo trì và có thể mở rộng mà không cần áp dụng
Microservices quá sớm.

Nguyên tắc: - Separation of Concerns: mỗi lớp có trách nhiệm riêng. -
Single Responsibility: mỗi class/function tập trung vào một nhiệm vụ
chính. - Low Coupling, High Cohesion: giảm phụ thuộc chéo giữa các
module. - Business Rules First: quy tắc nghiệp vụ nằm ở đúng lớp, không
rải rác trong Controller. - Consistency: thống nhất naming, validation,
response, error handling và truy cập database. - YAGNI: không tạo
abstraction hoặc hạ tầng phức tạp khi chưa có nhu cầu. -
Maintainability: ưu tiên code dễ hiểu, dễ sửa và dễ kiểm thử.

Không áp dụng máy móc design pattern hoặc tạo abstraction chỉ để tăng số
lớp.

## 2. Luồng xử lý và trách nhiệm từng lớp

Luồng tổng quát:

``` text
HTTP Request
    |
 Routes
    |
 Middleware (authentication, authorization, validation...)
    |
 Controller
    |
 Service
    +---- Repository / Data Access
    +---- Other Module Services
    +---- External Service Adapter (AI, file storage...)
    |
 Database / External Services
```

  -----------------------------------------------------------------------
  Thành phần              Trách nhiệm             Không nên làm
  ----------------------- ----------------------- -----------------------
  Route                   Khai báo endpoint, HTTP Chứa business logic.
                          method, middleware và   
                          controller tương ứng.   

  Middleware/Guard        Authentication,         Thay thế toàn bộ
                          authorization,          business rule trong
                          validation và xử lý     Service.
                          chung ở ranh giới       
                          request.                

  Controller              Nhận request, lấy input Query DB, tính toán
                          đã validate, gọi        nghiệp vụ, gọi AI trực
                          Service, chuyển kết quả tiếp, chứa luồng xử lý
                          thành HTTP response.    dài.

  Service                 Chứa use case/business  Phụ thuộc `req`, `res`
                          logic; điều phối        hoặc HTTP framework.
                          repository, module khác 
                          và external adapter.    

  Repository/Data Access  Đóng gói truy vấn và    Quyết định nghiệp vụ
                          thao tác lưu trữ.       như duyệt đội hoặc chọn
                                                  winner.

  DTO/Schema              Định nghĩa và validate  Thay thế kiểm tra quyền
                          dữ liệu đầu vào/đầu ra. hoặc business rule.

  Model/Entity            Mô tả cấu trúc dữ liệu  Chứa toàn bộ luồng
                          và quan hệ lưu trữ.     nghiệp vụ của nhiều
                                                  domain.

  External Adapter        Đóng gói giao tiếp với  Để kết nối dịch vụ
                          AI Service, file        ngoài rải rác khắp
                          storage và dịch vụ      codebase.
                          ngoài.                  
  -----------------------------------------------------------------------

**Quy tắc cốt lõi: Controller điều hướng, Service xử lý logic,
Repository truy cập dữ liệu.**

Controller nên mỏng: nhận dữ liệu, gọi một use case chính, trả response.
Service không biết HTTP status code hay đối tượng request/response.
Repository không tự quyết định nghiệp vụ.

Nếu ORM hiện tại đã cung cấp cách truy cập dữ liệu rõ ràng, không bắt
buộc tạo Repository chỉ để bọc một lệnh ORM đơn giản. Quan trọng là
không để truy vấn rải rác và thiếu nhất quán.

## 3. Tổ chức module theo nghiệp vụ

Chia source theo domain/nghiệp vụ, không gom toàn bộ controller vào một
thư mục, service vào một thư mục khác nếu điều đó làm các thành phần của
cùng nghiệp vụ bị phân tán.

Các module dự kiến theo `system.md`:

``` text
src/
├── config/
├── common/
│   ├── constants/
│   ├── errors/
│   ├── guards-or-middleware/
│   ├── decorators/
│   ├── types/
│   └── utils/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tournaments/
│   ├── games/
│   ├── categories/
│   ├── rules/
│   ├── teams/
│   ├── registrations/
│   ├── stages/
│   ├── matches/
│   ├── referees/
│   ├── disputes/
│   ├── ratings/
│   ├── seeding/
│   ├── predictions/
│   ├── notifications/
│   └── audit-logs/
├── integrations/
│   ├── ai-service/
│   └── file-storage/
├── database/
│   ├── migrations/
│   └── seeds/
└── main
```

Đây là cấu trúc tham khảo, không phải danh sách bắt buộc phải tạo ngay.
Framework thực tế (NestJS), convention và cấu trúc repository
hiện có được ưu tiên.

Một module có thể có:

``` text
teams/
├── teams.routes
├── teams.controller
├── teams.service
├── teams.repository
├── dto/
├── validators/
├── models/
├── types/
└── teams.spec
```

Không bắt buộc module nào cũng có đủ mọi file. Chỉ tạo thành phần khi có
lý do và thực sự cần thiết.

### Ranh giới module

-   Module sở hữu nghiệp vụ và dữ liệu thuộc phạm vi của nó.
-   Module khác nên gọi public service/interface của module sở hữu thay
    vì truy cập sâu vào repository nội bộ.
-   Tránh circular dependency và import ngược qua lại.
-   Không gom logic không liên quan vào `CommonService`, `UtilsService`
    hoặc một service khổng lồ.
-   `common/` chỉ chứa thành phần dùng chung thực sự.
-   Khi cần dữ liệu từ module khác, chỉ lấy phần cần thiết và hạn chế
    phụ thuộc vào chi tiết triển khai nội bộ.

## 4. Quy tắc Controller

Controller phải là **thin controller**.

Controller được phép: - Nhận path params, query, body và authenticated
user. - Dùng input đã được validate. - Gọi Service tương ứng. - Chuyển
kết quả thành HTTP status/response theo convention. - Chuyển lỗi đến
error handler chung. Chỉ được validate ở tầng cú pháp và cấu trúc dữ 
liệu đầu vào (Input/Syntax Validation) thông qua các cơ chế gắn liền 
với Controller như DTO/Form Request/Middleware

Controller không được: - Viết SQL/ORM query. - Tự kiểm tra nhiều điều
kiện nghiệp vụ. - Tự tính số đội còn trống, eligibility, winner,
standings hoặc progression. - Gọi trực tiếp LLM provider/AI Service. -
Chứa transaction phức tạp. - Tự điều phối nhiều repository để thực hiện
một use case. - Trả toàn bộ database entity một cách tùy tiện.

Ví dụ minh họa:

``` javascript
async function approveRegistration(req, res, next) {
  try {
    const result = await registrationService.approve({
      registrationId: req.params.registrationId,
      actor: req.user
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
```

Kiểm tra trạng thái registration, quyền BTC, giới hạn số đội,
transaction và cập nhật dữ liệu phải nằm trong Service.

## 5. Quy tắc Service

Service là nơi đặt use case và business logic: - Kiểm tra điều kiện và
trạng thái nghiệp vụ. - Điều phối nhiều repository/module. - Thực hiện
transaction khi một use case cập nhật nhiều dữ liệu liên quan. - Gọi
external adapter khi cần. - Trả kết quả có cấu trúc cho Controller. Thực hiện
phân trang nếu cần thiết -Phát sinh application/domain event khi có nhu cầu 
tích hợp hoặc xử lý phụ.

Service không nên: - Biết `req`, `res`, HTTP status code. - Đọc
environment variables rải rác. - Tự khởi tạo DB connection hoặc HTTP
client mỗi lần gọi. - Chứa logic của nhiều domain không liên quan. -
Nuốt lỗi rồi trả thành công giả. - Trả database error thô cho client.

Tên method nên thể hiện use case: `createTournament`,
`approveRegistration`, `submitMatchResult`, `assignReferee`,
`createDispute`, `runCandidateRanking`.

Nếu method quá dài hoặc điều phối nhiều bước, tách thành hàm private
hoặc service chuyên trách. Không chia nhỏ một cách hình thức.

## 6. Repository và database

-   Tập trung truy vấn dữ liệu để dễ tìm, kiểm thử và tối ưu.
-   Service quyết định cần làm gì; Repository quyết định lấy/lưu dữ liệu
    như thế nào.
-   Tránh N+1 query; không query lặp trong vòng lặp nếu có thể batch.
-   Chỉ lấy các cột cần thiết; phân trang danh sách có thể tăng lớn.
-   Dùng parameterized query hoặc ORM binding an toàn.
-   Tạo index dựa trên query và constraint thực tế, không thêm tùy tiện.
-   Quản lý schema bằng migration có thể theo dõi và tái lập.
-   Dùng foreign key, unique, not-null, check constraint phù hợp.
    Validation Backend không thay thế ràng buộc bảo vệ dữ liệu ở DB.
-   Không trả quan hệ lồng quá sâu hoặc dữ liệu không cần thiết.

### Transaction và concurrency

Cân nhắc transaction/locking cho: - Duyệt registration khi category có
giới hạn số đội. - Cập nhật kết quả match và progression. - Cập nhật
standings khi kết quả chính thức thay đổi. - Thay roster ảnh hưởng
eligibility. - Xử lý dispute làm thay đổi kết quả.

Không chỉ query kiểm tra giới hạn rồi insert riêng rẽ nếu nhiều request
có thể chạy đồng thời. Chọn transaction, locking hoặc cơ chế concurrency
phù hợp.

## 7. DTO, validation và dữ liệu đầu vào

-   Mọi dữ liệu từ client đều không đáng tin cậy.
-   Validate body, params và query ở ranh giới API.
-   Kiểm tra kiểu, format, độ dài, miền giá trị và trường bắt buộc.
-   Không dùng `userId` do client tự gửi để xác định người thực hiện nếu
    danh tính đã có trong token/session.
-   Không tin các trường `role`, `isAdmin`, `captainId`, `winnerId` nếu
    chưa kiểm tra quyền và quan hệ thực tế.
-   Tách input DTO khỏi database model/entity và response DTO khi cần.
-   Không trả password hash, token nội bộ, secret hoặc trường nhạy cảm.
-   Chuẩn hóa ngày giờ và timezone theo quy ước hệ thống.

## 8. Authentication và Authorization

Authentication xác định người gọi là ai; Authorization xác định họ được
làm gì trên tài nguyên nào.

-   Kiểm tra JWT/session ở middleware/guard.
-   Role theo `system.md`: Admin, BTC, người chơi, trọng tài.
-   Kiểm tra cả role và phạm vi tài nguyên (resource-level
    authorization).
-   BTC chỉ quản lý tournament thuộc phạm vi được giao.
-   Captain chỉ thao tác với team mình làm captain.
-   Trọng tài chỉ thao tác trên match được phân công.
-   Admin có quyền quản trị theo chính sách hệ thống.
-   Backend luôn kiểm tra quyền; ẩn nút ở Frontend không phải biện pháp
    bảo mật.
-   Không mặc định mọi user có role BTC được quản lý tất cả tournament.
-   Audit các hành động quan trọng.

Nếu schema cho phép một user có nhiều role, logic phân quyền phải hỗ trợ
đúng mô hình đó; không tự giả định một role duy nhất.

## 9. Error handling và API response

-   Dùng error handler thống nhất.
-   Phân biệt validation, unauthenticated, forbidden, not found,
    conflict, business rule và internal error.
-   Không trả stack trace, SQL, secret hoặc thông tin nội bộ trong
    production.
-   Log lỗi có context/request ID khi phù hợp.
-   Không lặp `try/catch` chỉ để ném lại nguyên lỗi.
-   Không trả HTTP 200 cho mọi trường hợp.
-   Message rõ ràng nhưng không tiết lộ dữ liệu nhạy cảm.

Response tham khảo:

``` json
{
  "success": true,
  "data": { "id": "..." },
  "message": "Operation completed"
}
```

Lỗi tham khảo:

``` json
{
  "success": false,
  "error": {
    "code": "REGISTRATION_ALREADY_REVIEWED",
    "message": "Registration has already been reviewed"
  }
}
```

Nếu codebase đã có response convention thì giữ convention hiện tại và áp
dụng nhất quán.

## 10. Tích hợp AI Service

AI Service là ứng dụng riêng. Backend kiểm soát quyền, dữ liệu nghiệp vụ
và quyết định cuối.

-   Gọi AI qua adapter như `integrations/ai-service`; không gọi provider
    trực tiếp từ Controller hoặc Service nghiệp vụ.
-   API key, endpoint và model config lấy từ config/environment, không
    hard-code.
-   Chỉ gửi dữ liệu cần thiết; hạn chế dữ liệu cá nhân không cần thiết.
-   Xem response AI là dữ liệu external không đáng tin cậy; validate
    trước khi sử dụng/lưu.
-   Có timeout và xử lý lỗi kết nối.
-   Phân biệt suggestion của AI với quyết định chính thức.
-   AI không tự approve registration, accept thành viên, xác nhận winner
    hoặc kết luận dispute.
-   Lưu trạng thái, thời điểm và kết quả cần thiết để truy vết.
-   Tác vụ dài có thể chuyển sang background job khi phù hợp.
-   Prompt, embedding, RAG pipeline và provider-specific logic thuộc AI
    Service.

## 11. Cache, real-time và background jobs

ĐACN có thể chưa triển khai Redis, WebSocket/SSE hoặc queue. Tuy nhiên,
business logic không nên phụ thuộc trực tiếp vào các công nghệ này.

-   Không đặt nghiệp vụ trong WebSocket handler.
-   Không để mọi Service phụ thuộc trực tiếp vào Redis client.
-   Có thể bổ sung adapter/interface cho cache, event publisher hoặc
    queue khi nhu cầu xuất hiện.
-   PostgreSQL vẫn là nguồn dữ liệu nghiệp vụ chính; cache không phải
    nguồn dữ liệu chính thức.
-   Khi kết quả, standings hoặc lịch thay đổi, cần chiến lược
    invalidate/update cache.
-   Event nên biểu diễn sự kiện nghiệp vụ có ý nghĩa như
    `MatchCompleted`, `RegistrationApproved`, `ScheduleChanged`.
-   Không tạo event cho mọi CRUD nếu không có use case.
-   Background job cần trạng thái, timeout, retry có giới hạn và cơ chế
    tránh xử lý trùng khi cần.
-   Lỗi gửi notification hoặc tác vụ phụ không được làm sai lệch
    transaction nghiệp vụ chính.

## 12. Security

-   Không commit `.env`, secret, private key, token hoặc credential.
-   Có `.env.example` không chứa secret thật.
-   Validate/sanitize input theo ngữ cảnh.
-   Dùng parameterized query/ORM an toàn.
-   Cấu hình CORS theo môi trường.
-   Cân nhắc rate limit cho login, đăng ký, khiếu nại và endpoint gọi
    AI.
-   Giới hạn kích thước upload; kiểm tra loại file và quyền truy cập.
-   Không tin file path/URL client gửi nếu chưa kiểm tra.
-   Không log password, token, secret hoặc dữ liệu nhạy cảm.
-   Phân quyền theo tài nguyên để tránh IDOR.
-   Audit các hành động quan trọng.

## 13. Logging và audit

Phân biệt: - **Application log:** lỗi, cảnh báo, request, thời gian xử
lý và thông tin kỹ thuật. - **Audit log:** ai thực hiện hành động nghiệp
vụ nào, trên tài nguyên nào, lúc nào và kết quả ra sao.

Các hành động cần cân nhắc audit: tạo/sửa giải, duyệt đăng ký, đổi
roster, đổi lịch, phân công trọng tài, nhập/sửa/xác nhận kết quả, xử lý
dispute, thay đổi role/quyền.

Không ghi dữ liệu nhạy cảm vào log. Dùng logger thống nhất thay vì
`console.log` tùy tiện nếu dự án đã có logger.

## 14. Testing

Kiểm thử tập trung vào hành vi và rủi ro nghiệp vụ, không chỉ kiểm tra
API trả HTTP 200.

**Unit test** - Eligibility, giới hạn roster/số đội. - Quyền
captain/BTC/referee. - Progression, winner và standings. - Điều kiện
mở/đóng dispute.

**Integration test** - Duyệt registration có transaction. - Không vượt
giới hạn category khi request đồng thời. - Kết quả trận cập nhật đúng
standings/progression. - User không thể thao tác tài nguyên ngoài
quyền. - AI adapter xử lý timeout/response không hợp lệ.

**API/E2E test** - BTC tạo giải/category. - Người chơi tạo team và đăng
ký. - BTC duyệt registration. - BTC tạo stage/lịch và phân công trọng
tài. - Trọng tài ghi nhận kết quả. - Người chơi gửi dispute. - BTC xử lý
dispute.

Test cần setup/cleanup rõ ràng, độc lập và không phụ thuộc thứ tự chạy.

## 15. Naming và code style

Tuân theo formatter/linter và convention đã có trong repository. Nếu
chưa có, thống nhất quy ước trước khi mở rộng.

-   JavaScript/TypeScript: camelCase cho biến/hàm; PascalCase cho
    class/type/interface; UPPER_SNAKE_CASE cho constant khi phù hợp.
-   Boolean có tên rõ nghĩa như `isApproved`, `hasPermission`,
    `canRegister`.
-   Hàm thể hiện hành động/use case: `approveRegistration`,
    `assignReferee`.
-   Tránh tên mơ hồ như `data`, `item`, `handle`, `process` khi có thể
    cụ thể hơn.
-   Ưu tiên hàm dễ đọc; dùng early return khi làm luồng rõ hơn.
-   Tránh nested condition quá sâu.
-   Tránh magic number/string; dùng constant/enum có ý nghĩa.
-   Không lặp business rule ở nhiều nơi.
-   Không tạo abstraction chung cho hai đoạn code chỉ vì chúng giống cú
    pháp nhưng khác ý nghĩa.
-   Comment giải thích tại sao có quyết định đặc biệt, không diễn giải
    lại từng dòng.
-   Xóa code chết, import thừa và debug output trước khi hoàn tất.

## 16. Configuration và môi trường

-   Đọc environment variables tập trung qua config module.
-   Validate config khi khởi động để phát hiện thiếu biến sớm.
-   Không đọc `process.env` rải rác trong business logic.
-   Tách config theo môi trường khi cần.
-   Không hard-code port, DB URL, AI endpoint, secret hoặc storage
    credential.
-   Cung cấp `.env.example` với giá trị mẫu an toàn.
-   Không giả định máy developer nào cũng có cấu hình local giống nhau.

## 17. API design

-   Dùng REST resource-oriented và HTTP method phù hợp.
-   Có pagination/filter/sort cho danh sách có thể tăng lớn.
-   Thống nhất status code, response và error code.
-   Không cho client cập nhật tùy ý mọi field của entity.
-   Dùng endpoint thể hiện hành động nghiệp vụ cụ thể khi phù hợp, ví dụ
    approve/reject/submit-result.
-   Kiểm tra quyền trên từng endpoint và tài nguyên.
-   Tránh response quá lớn hoặc quan hệ lồng sâu.
-   Cập nhật OpenAPI/Swagger nếu dự án đang sử dụng.

## 18. Quy tắc đặc thù nghiệp vụ Esport

Các quy tắc cần được bảo vệ trong Service và bằng DB constraint khi phù
hợp:

-   Một team thuộc một category; không đăng ký team sang category khác.
-   Category SOLO dùng chung mô hình `TEAMS`, nhưng team chỉ có một
    thành viên và người đó là captain.
-   Join request chưa được chấp nhận không phải thành viên chính thức.
-   Captain chỉ quản lý team mình làm captain.
-   BTC chỉ duyệt registration trong tournament thuộc quyền quản lý.
-   Số đội được duyệt không vượt giới hạn category, kể cả khi nhiều
    request chạy đồng thời.
-   Stage thuộc category và có thứ tự trong category.
-   Stage có thể có hoặc không có group tùy format.
-   Team đi tiếp giữa các stage theo kết quả, không đăng ký lại.
-   Match có thể chưa có đủ team slot khi bracket chưa hoàn tất.
-   Winner của match hoàn tất phải là một đội tham gia hợp lệ.
-   Lịch cần kiểm tra xung đột theo team và player giữa các category.
-   Referee chỉ thao tác trên match được phân công.
-   Referee không thi đấu trong category mà họ được giao làm trọng tài
    theo quy tắc đã thống nhất.
-   Kết quả chính thức, prediction và AI suggestion phải phân biệt rõ.
-   Rating quản lý theo user/game.
-   Rating hỗ trợ seeding ban đầu; stage sau dựa trên kết quả stage
    trước.
-   AI chỉ đề xuất; người có thẩm quyền ra quyết định cuối.

Không tự suy diễn các chính sách chưa chốt như roster lock, công thức
team rating, thời hạn xác nhận kết quả hoặc cách xử lý khi một đội không
xác nhận. Đối chiếu `system.md` và quyết định của nhóm.

## 19. Quy trình thay đổi code

Khi thực hiện feature hoặc bug fix:

1.  Đọc cấu trúc codebase và các module liên quan trước khi sửa.
2.  Đối chiếu nghiệp vụ trong `system.md`; không tự giả định quy tắc
    chưa xác nhận.
3.  Xác định module sở hữu use case và các module phụ thuộc.
4.  Giữ thay đổi tập trung; tránh sửa file không liên quan.
5.  Kiểm tra ảnh hưởng tới schema/migration, API contract, authorization
    và luồng nghiệp vụ.
6.  Viết/cập nhật test cho hành vi bị ảnh hưởng.
7.  Chạy formatter, linter, test và build phù hợp với repository.
8.  Review diff để phát hiện thay đổi thừa, secret hoặc debug code.
9.  Báo cáo file đã thay đổi, hành vi thay đổi, migration/config cần
    thiết và kết quả kiểm thử.

Không tự ý đổi framework, ORM, database hoặc kiến trúc lớn nếu task
không yêu cầu. Không thêm dependency nếu công cụ hiện có đáp ứng hợp lý.
Không thay API contract mà không xem xét ảnh hưởng Frontend. Không bỏ
qua lỗi test/lint mà không nêu rõ.

## 20. Definition of Done

-   [ ] Đúng nghiệp vụ và đúng quyền.
-   [ ] Controller mỏng; business logic nằm trong Service.
-   [ ] Database access theo cấu trúc nhất quán.
-   [ ] Input được validate.
-   [ ] Error handling và response theo convention.
-   [ ] Có transaction/concurrency handling khi cần.
-   [ ] Không lộ dữ liệu nhạy cảm.
-   [ ] Có test cho nhánh nghiệp vụ quan trọng.
-   [ ] API documentation được cập nhật nếu contract thay đổi.
-   [ ] Không có debug code, secret hoặc thay đổi ngoài phạm vi.
-   [ ] Formatter/linter/test/build đạt yêu cầu hoặc ghi rõ phần chưa
    chạy được.

## 21. Thứ tự ưu tiên khi có xung đột

1.  Quyết định nghiệp vụ đã được nhóm xác nhận và tài liệu `system.md`.
2.  Kiến trúc, convention và dependency thực tế trong repository.
3.  Quy tắc trong tài liệu này.
4.  Đề xuất kỹ thuật mới.

Nếu codebase khác ví dụ trong tài liệu, không tái cấu trúc toàn bộ chỉ
để khớp ví dụ. Hiểu cấu trúc hiện tại, giữ tính nhất quán và chỉ thay
đổi trong phạm vi cần thiết. Nếu thiếu thông tin hoặc phát hiện mâu
thuẫn ảnh hưởng thiết kế, nêu rõ điểm chưa chắc chắn thay vì tự đặt ra
nghiệp vụ.
