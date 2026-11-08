# Bối cảnh và logic dự án -- Hệ thống quản lý giải đấu Esport

> Tài liệu này tổng hợp hiểu biết đã thảo luận về sản phẩm, nghiệp vụ,
> vai trò, quy tắc, dữ liệu và kiến trúc. Đây là ngữ cảnh mô tả dự án để
> agent hiểu hệ thống, không phải danh sách mệnh lệnh triển khai. 

## 1. Tổng quan

Dự án là **Hệ thống quản lý giải đấu thể thao điện tử (Esport Tournament
Management System)**. Hệ thống hỗ trợ BTC tổ chức giải có nhiều trò chơi
và nhiều hạng mục; người chơi tạo đội và đăng ký; trọng tài điều hành
trận; người xem theo dõi lịch, kết quả và bảng xếp hạng. AI hỗ trợ phân
tích hồ sơ, xếp hạng ứng viên, seeding, dự đoán và hỗ trợ giải quyết
khiếu nại bằng RAG.

Bài toán chính không chỉ là CRUD giải đấu. Một giải có thể chứa nhiều
category, mỗi category có game, điều kiện tham gia, giới hạn đội, quy mô
roster và thể thức riêng. Một người chơi có thể đủ điều kiện tham gia
nhiều category trong cùng giải, vì vậy lịch thi đấu cần phát hiện xung
đột ở cả cấp đội lẫn người chơi.

Ví dụ: một giải sinh viên có các hạng mục Liên Minh Huyền Thoại nam/nữ,
Liên Quân nam/nữ và hạng mục sinh viên năm nhất. Một người có thể đồng
thời đủ điều kiện ở category theo giới tính và category theo năm học.

Mục tiêu: - Quản lý giải, game, category, thể lệ và điều kiện tham
gia. - Quản lý tài khoản và các vai trò Admin, BTC, người chơi, trọng
tài. - Quản lý đội, thành viên, yêu cầu gia nhập và đăng ký giải. - Quản
lý nhiều stage trong một category; mỗi stage có thể có format riêng. -
Tạo lịch, bảng đấu, trận, kết quả, phân công trọng tài và luồng đi
tiếp. - Hỗ trợ rating, seeding và dự đoán. - Dùng AI hỗ trợ đánh giá hồ
sơ, xếp hạng ứng viên và phân tích khiếu nại. - Có thông báo, audit log,
báo cáo và các chức năng vận hành.

## 2. Vai trò người dùng

### Admin

Quản trị phạm vi toàn hệ thống: quản lý tài khoản, vai trò, giám sát
hoạt động và audit log. Admin không đồng nghĩa BTC của một giải.

### BTC (Ban tổ chức)

Quản lý giải do mình tổ chức: tạo giải/category, cấu hình game, format,
điều kiện, thể lệ, duyệt đăng ký, tạo stage/lịch, phân công trọng tài,
theo dõi kết quả, xử lý khiếu nại và công bố thông tin. BTC có thể gọi
AI để nhận đề xuất nhưng vẫn là người ra quyết định chính thức.

Thiết kế đã thảo luận: mỗi giải có một BTC/người tổ chức chính; một user
có thể tổ chức nhiều giải. BTC chỉ có duy nhất 1 người là người tạo giải

### Người chơi

Tạo đội, làm đội trưởng/thành viên, mời hoặc xin gia nhập đội, đăng ký
giải, theo dõi lịch và kết quả, xác nhận kết quả theo quy định, gửi
khiếu nại và xem rating theo game. Người tạo đội sẽ mặc định là đội trưởng (không phải role chính thức, nhưng sẽ có quyền hạn nhất định trong team như xét duyệt thành viên,...)

### Trọng tài

Theo dõi các trận được phân công, ghi nhận/xác minh kết quả, hỗ trợ điều
hành trận và tham gia xử lý tranh chấp theo quyền được cấp. Trọng tài
chỉ thao tác trên trận được phân công, không mặc nhiên có quyền điều
hành mọi trận.

### Role trong USERS

Người dùng đã cập nhật rằng `USERS` sẽ có role Admin, BTC, người chơi và
trọng tài. - mỗi tài khoản chỉ có một role, xác định lúc đăng kí luôn.

Backend phải kiểm tra quyền ở từng API và theo phạm vi tài nguyên. Ví dụ
BTC chỉ quản lý giải mình phụ trách; trọng tài chỉ thao tác trên trận
được giao.

## 3. Giải đấu, game và category

### Tournament

Là đối tượng cấp cao nhất, lưu tên, mô tả, thời gian, BTC tổ chức, trạng
thái và thể lệ chung. Một tournament có thể chứa nhiều category, không
bị giới hạn ở một game.

### Game

`GAMES` lưu danh mục trò chơi Esport được hỗ trợ, ví dụ Liên Minh Huyền
Thoại, Liên Quân Mobile.

### Category

Mỗi category thuộc một tournament và gắn với một game. Một game có thể
xuất hiện ở nhiều category. Category lưu: - Tên, mô tả, game. - Loại
tham gia `TEAM` hoặc `SOLO`. - Số thành viên tối thiểu/tối đa. - Số đội
tối đa. - Điều kiện tham gia. - Các stage và format thi đấu.

Ví dụ: một giải có category LoL Nam, LoL Nữ, AOV Nam, AOV Nữ và Sinh
viên năm nhất. Mỗi category có thể cấu hình số đội, roster, điều kiện và
format khác nhau.

### Điều kiện tham gia

`CATEGORY_ELIGIBILITY_RULES` lưu các tiêu chí như giới tính, năm
học/khóa, tư cách sinh viên, rank hoặc điều kiện BTC đặt ra. Các điều kiện cần này chỉ là mô tả văn bản vì mỗi BTC lại nhắm đến những đối tượng khác nhau.

### Thể lệ chung và riêng

Một giải có thể có tài liệu thể lệ chung và tài liệu riêng theo
category. `RULE_DOCUMENTS` lưu tài liệu; `RULE_CHUNKS` lưu các đoạn đã
tách để truy xuất RAG. Cần đảm bảo category-specific rule thuộc đúng
tournament. Nếu `category_id` null thì tài liệu là thể lệ chung; nếu có
giá trị thì là thể lệ riêng của category.

## 4. Đội, thành viên và đăng ký

### Team

Đội được tạo trong một category, không phải đội dùng chung tự do cho mọi
category. `TEAMS` lưu category, captain, tên đội và thông tin cần thiết.

### SOLO vẫn dùng TEAMS

Cả TEAM và SOLO đều dùng thực thể `TEAMS`: - Category TEAM: đội có nhiều
thành viên theo giới hạn. - Category SOLO: đội có đúng một thành viên và
người đó là captain.

Cách biểu diễn chung giúp registration, bracket, match, standings và kết
quả dùng cùng một mô hình.

### Thành viên và yêu cầu gia nhập

`TEAM_MEMBERS` lưu thành viên đã được chấp nhận. `TEAM_JOIN_REQUESTS`
lưu yêu cầu xin gia nhập đang chờ hoặc đã được xử lý. Một request chưa
được chấp nhận không có nghĩa người đó đã là thành viên chính thức.

Đội trưởng có thể chủ động yêu cầu AI xếp hạng ứng viên. Ví dụ đội tối
đa 5 người nhưng có 7 yêu cầu gia nhập; đội trưởng kích hoạt AI để so
sánh rank, profile và điều kiện category. AI trả về thứ tự/điểm/lý do đề
xuất; đội trưởng tự quyết định ai được nhận. Tính năng này không tự động
chạy mỗi khi có request mới và AI không tự chấp nhận ứng viên.

### Registration

Đăng ký tham gia giải là quy trình riêng với yêu cầu gia nhập đội: 1.
Đội được thành lập và roster phù hợp. 2. Captain gửi hồ sơ đăng ký
category. 3. Hồ sơ có trạng thái chờ duyệt, được duyệt hoặc bị từ chối.
4. BTC quyết định cuối cùng.

Vì team đã thuộc category, có thể suy ra category từ
`TEAMS.category_id`. Nếu `REGISTRATIONS` cũng lưu `category_id`, cần đảm
bảo nó trùng với category của team.

### Roster

Category đặt min/max team size; đội quản lý thành viên. Khóa roster sau khi
được duyệt; thay đổi cần BTC chấp thuận và có lịch sử.

## 5. Stage, format, group và match

Một category có nhiều stage theo thứ tự. Mỗi stage có thể có format
riêng. Các format đã thảo luận gồm: - `GROUP` - `SINGLE_ELIMINATION` -
`DOUBLE_ELIMINATION` - `ROUND_ROBIN` - `SWISS`

Một stage có thể có hoặc không có group. `STAGE_GROUPS` dùng cho các
bảng như A/B trong stage chia bảng. Match có thể thuộc một group hoặc
không.

Đội đăng ký category một lần. Khi stage trước kết thúc, đội đủ điều kiện
đi tiếp sang stage sau theo kết quả và luật progression; không đăng ký
lại cho từng stage.

`STAGE_STANDINGS` lưu thứ hạng/thành tích/trạng thái đi tiếp của đội
trong một stage. Có thể tính từ kết quả match hoặc lưu để truy vấn
nhanh. Nếu lưu, cần cập nhật/tính lại khi kết quả trận bị sửa hoặc khiếu
nại được chấp thuận.

`MATCHES` lưu stage, group nếu có, hai đội/slot, lịch, trạng thái và kết
quả. Khi bracket mới tạo, một hoặc cả hai đội có thể chưa xác định; slot
đội có thể rỗng cho đến khi trận trước kết thúc. Khi trận hoàn tất,
winner phải là một trong các đội tham gia hợp lệ.

`MATCH_GAMES` lưu từng ván trong một match (ví dụ Bo3/Bo5); `MATCHES`
lưu kết quả tổng hợp cả trận.

`MATCH_ADVANCEMENTS` biểu diễn luồng đi tiếp: đội thắng hoặc đội thua từ
trận nguồn đến trận đích và slot tương ứng. Cấu trúc này hữu ích cho
Single/Double Elimination. Round Robin/Swiss có quy tắc tính tiếp riêng.

### Lịch và xung đột

Lịch cần kiểm tra: - Một team không bị xếp hai trận trùng thời gian. -
Một player không bị xếp hai trận trùng thời gian nếu họ thuộc roster của
các đội ở nhiều category. - Có thể xét thời lượng trận và khoảng đệm
giữa trận. - Khi đổi lịch, cần kiểm tra lại xung đột.

Vì Chưa chốt cách tính thời lượng trận và buffer time nên nếu trận đấu ko có cấu hình thời gian cụ thể từ mấy giờ đến mấy giờ thì sẽ kiểm tra xung đột theo ngày, còn nếu có cấu hình thời gian theo giừo thì kiểm tra xung đôt theo giờ. 
Ví dụ: 
- Nếu trận A được quy định rõ ngày thi đấu, giờ thi đấu, giờ kết thúc thì sẽ kiểm tra xung đột xem team, player có bị trùng lịch ở khung giờ đó không
- Nếu trận B chỉ quy định rõ ngày thi đấu mà không quy định rõ giờ thi đấu, giờ kết thúc thì sẽ kiểm tra xung đột xem team, player có trận đấu nào ở ngày đó không.

## 6. Trọng tài và kết quả

`MATCH_REFEREES` lưu phân công trọng tài theo từng match, thay vì chỉ
một `referee_id` trong `MATCHES`, vì một match có thể có nhiều trọng tài
và cần trạng thái/lịch sử phân công.

`TOURNAMENT_REFEREES` có thể ghi nhận danh sách trọng tài tham gia phục
vụ một tournament; `MATCH_REFEREES` xác định ai được giao trận nào. Hai
bảng có mục đích khác nhau nếu cần quản lý roster trọng tài cấp giải.

`MATCH_RESULT_SUBMISSIONS` lưu các lần gửi/nhập kết quả để có lịch sử.
`MATCH_RESULT_CONFIRMATIONS` lưu xác nhận hoặc phản hồi của các bên. Có
thể lưu team xác nhận và user đại diện thực hiện.

Trọng tài là người nộp kết quả, đội trưởng các team sẽ đứng ra xác nhận, nếu quá thời gian xác nhận thì sẽ mặc định là đồng ý với kết quả, thời gian xác nhận có thể là BTC set lúc tạo giải hoặc để default 3-5h sau khi trận đấu kết thúc

## 7. Khiếu nại và tranh chấp

Một team có thể gửi khiếu nại liên quan đến match. Hồ sơ gồm nội dung,
trận liên quan, đội gửi, trạng thái, bằng chứng và lịch sử xử lý.

-   `DISPUTES`: hồ sơ khiếu nại.
-   `DISPUTE_EVIDENCE`: ảnh/video/tài liệu bằng chứng.
-   `DISPUTE_EVENTS`: timeline trạng thái và thao tác.
-   `DISPUTE_AI_SUGGESTIONS`: phân tích/đề xuất của AI.
-   `DISPUTE_AI_CITATIONS`: trích dẫn nguồn thể lệ.
-   `RULE_CHUNKS`: nội dung thể lệ được truy xuất.

RAG truy xuất các đoạn thể lệ liên quan, đưa context vào LLM và tạo phân
tích có citations. AI chỉ tham khảo; quyết định cuối thuộc BTC hoặc
người có thẩm quyền.

## 8. Rating, seeding và prediction

`PLAYER_RATINGS` lưu rating theo cặp user/game, không phải một rating
chung cho tất cả trò chơi. `RATING_HISTORY` lưu lịch sử thay đổi, có thể
liên kết match tạo ra thay đổi.

Team rating có thể được suy ra từ rating thành viên (trung bình hoặc
trung bình có trọng số), nhưng cách tính chưa chốt. 

Rating dùng hỗ trợ seeding ban đầu của stage đầu tiên. Các stage sau dựa
trên kết quả và đội đi tiếp từ stage trước, không tự động xếp lại theo
rating ban đầu.

Sau giải cập nhật lại ratting dựa vào rating trước giải và kết quả thi đấu cho player, rating ban đầu khi tạo tài khoản là do người chơi cung cấp, dựa vào số liệu cụ thể của game như rank hiện tại, số năm chơi game, số trận đã chơi.

Hai bảng seeding: - `SEEDING_RUNS`: metadata của một lần chạy. -
`SEEDING_RUN_ITEMS`: kết quả theo từng team trong lần chạy.

Đây là quan hệ cha-con của một run, không có nghĩa phải seeding hai lần.
Item có thể lưu `suggested_seed` do AI đề xuất và `final_seed` do BTC
xác nhận/chỉnh sửa. Nếu chỉ cho phép một seeding chính thức ở stage đầu,
có thể có ràng buộc tương ứng.

`MATCH_PREDICTIONS` lưu dự đoán AI về trận, đội được dự đoán thắng, xác
suất/độ tin cậy, thời điểm và thông tin model nếu cần. Prediction không
phải kết quả chính thức và không được ghi đè winner.

## 9. Các chức năng AI

AI hiện được định hướng dùng LLM hoặc RAG, embedding, retrieval và các logic đánh
giá; dự án không đặt mục tiêu tự training foundation model. Dù không
training, AI Service vẫn có lý do tách riêng do stack thư viện, xử lý và
vòng đời khác Backend.

### AI Registration Review

BTC chủ động gọi AI đánh giá hồ sơ đăng ký. AI phân tích dữ liệu và điều
kiện category, trả nhận xét/cảnh báo/đề xuất. BTC tự duyệt hoặc từ chối.
Kết quả review được lưu để tham khảo và truy vết.

### AI Candidate Ranking

Captain chủ động gọi AI xếp hạng các ứng viên xin gia nhập đội. AI so
sánh profile, rank và điều kiện category, trả thứ hạng/điểm/lý do.
Captain tự chọn thành viên. Không tự chạy theo từng request mới, không
tự động accept.

### AI Seeding và Match Prediction

AI hỗ trợ BTC đề xuất seeding ban đầu và dự đoán trận từ rating/thành
tích. BTC xác nhận seeding; AI không tự thay đổi kết quả trận.

### RAG Dispute Assistant

Nguồn tri thức là thể lệ chung và riêng của tournament/category. Tài
liệu được chia chunks và embeddings. Khi có dispute, hệ thống truy xuất
chunks phù hợp, đưa vào prompt cho LLM và lưu đề xuất cùng citations.
Quyết định cuối cùng thuộc người có thẩm quyền.

### Ranh giới Backend -- AI

Backend: - Xác thực và phân quyền. - Kiểm tra quyền theo
tournament/category/team/match. - Lấy dữ liệu nghiệp vụ cần thiết. - Gọi
AI Service với payload đã chọn lọc. - Kiểm tra response và lưu kết quả
AI vào database nghiệp vụ. - Quản lý quyết định chính thức.

AI Service: - Nhận payload từ Backend. - Thực hiện LLM, embedding,
retrieval, RAG và đánh giá. - Trả kết quả có cấu trúc, lý do và
citations nếu phù hợp. - Không tự sửa các bảng nghiệp vụ chính và không
quyết định thay con người.

AI Service có thể quản lý vector index riêng. Đây là dữ liệu tìm
kiếm/tri thức, không phải nguồn dữ liệu nghiệp vụ chính thức.

## 10. Kiến trúc ứng dụng

Định hướng là **Frontend + Backend + AI Service chạy độc lập**, trong
khi Backend vẫn có thể là Modular Monolith. Không đồng nghĩa hệ thống
phải dùng Microservices cho từng module.

### Frontend

Định hướng React + Vite, giao diện cho Admin, BTC, người chơi, trọng tài
và trang công khai theo dõi giải. Gọi Backend qua REST API; nhận cập
nhật qua SSE/WebSocket. Port phát triển ví dụ: `5173`.

### Backend

Node.js với NestJS là các lựa chọn đã cân nhắc; framework
cuối cùng phụ thuộc codebase thực tế. Port ví dụ `5000`. Backend cung
cấp REST API, auth/RBAC, module nghiệp vụ, transaction, tính nhất quán
và lưu dữ liệu chính thức. Backend gọi AI Service qua HTTP/REST nội bộ.

### AI Service

Định hướng Python + FastAPI, port ví dụ `8000`. Chứa LLM provider
adapter, embedding/retrieval, RAG pipeline, registration review,
candidate ranking, seeding/prediction và dispute assistant.

### Data/Infrastructure

-   PostgreSQL: nguồn dữ liệu nghiệp vụ chính.
-   Redis: cache, queue/background jobs, có thể Pub/Sub (hướng phát triển về sau).
-   pgvector hoặc vector store khác: embedding và retrieval cho RAG. Có
    thể dùng pgvector trong PostgreSQL để giảm hạ tầng.
-   File Storage: ảnh, video, tài liệu thể lệ, bằng chứng.
-   External LLM Provider: Gemini/OpenAI hoặc nhà cung cấp tương đương.

Mô hình phù hợp giai đoạn hiện tại: Frontend riêng, Backend Modular
Monolith, AI FastAPI riêng, PostgreSQL/Redis dùng chung. Chưa có nhu cầu
bắt buộc phải tách từng module nghiệp vụ thành microservice.

## 11. Cache, real-time và xử lý nền (hướng mở rộng)

### Redis Cache

Có thể cache thông tin giải công khai, lịch thi đấu, standings và thống
kê đọc nhiều. Luồng cơ bản: Backend kiểm tra cache; cache miss thì đọc
PostgreSQL, tạo cache; khi kết quả chính thức thay đổi thì cập nhật hoặc
invalidate cache. Cần TTL và quy tắc invalidation. Không cache tùy tiện
quyền người dùng, trạng thái duyệt hay dữ liệu cần chính xác tức thời.

### Real-time

Use case: cập nhật kết quả, trạng thái trận, lịch thay đổi và standings.
SSE phù hợp server-to-browser one-way; WebSocket phù hợp giao tiếp hai
chiều liên tục. Có thể bắt đầu bằng SSE cho trang theo dõi giải.

### Background Jobs / Queue

Tác vụ phù hợp: AI review số lượng lớn, candidate ranking, tạo
embeddings/index tài liệu, email/thông báo, báo cáo và tính lại thống
kê. Backend có thể tạo job, trả trạng thái processing; worker thực hiện
và cập nhật kết quả. BullMQ + Redis là lựa chọn với Node.js. Cần cân
nhắc retry, timeout và trạng thái job; tránh giữ HTTP request mở quá lâu
khi chờ LLM.

### Transaction và concurrency

Các nghiệp vụ quan trọng cần transaction/locking phù hợp: - Duyệt đăng
ký khi số đội gần đạt giới hạn. - Cập nhật kết quả và đội đi tiếp. - Sửa
lịch hoặc roster đồng thời. - Cập nhật standings và cache sau khi kết
quả chính thức thay đổi.

Ví dụ category tối đa 32 đội, hiện có 31 đội được duyệt. Hai request
duyệt đồng thời không được làm số đội vượt 32.

## 12. Luồng nghiệp vụ tổng quát

1.  BTC tạo tournament.
2.  BTC tạo category, chọn game, TEAM/SOLO, giới hạn và eligibility.
3.  BTC thêm rule chung và rule riêng category.
4.  BTC tạo stage và cấu hình format.
5.  Người chơi tạo team, quản lý thành viên/yêu cầu gia nhập.
6.  Captain có thể chủ động dùng AI xếp hạng ứng viên.
7.  Captain gửi registration cho category.
8.  BTC xem hồ sơ, có thể yêu cầu AI review.
9.  BTC quyết định approve/reject.
10. Khi đủ đội, BTC chạy seeding ban đầu và tạo bracket/lịch.
11. Hệ thống kiểm tra xung đột lịch theo team và player giữa category.
12. BTC phân công referee theo match.
13. Trận diễn ra; referee/người có quyền ghi nhận kết quả.
14. Các bên xác nhận/phản hồi theo chính sách.
15. Nếu có dispute, team gửi nội dung và evidence.
16. AI RAG truy xuất thể lệ và đưa phân tích tham khảo.
17. BTC/người có thẩm quyền quyết định xử lý.
18. Kết quả chính thức cập nhật standings, progression và dữ liệu thống
    kê/rating liên quan.
19. Người xem theo dõi lịch, kết quả, standings và notifications.
20. Tournament kết thúc; dữ liệu phục vụ báo cáo và audit.

## 13. Danh mục bảng dữ liệu và chức năng

Tên bảng là danh sách đã xuất hiện trong phương án ERD thảo luận; cần
đối chiếu ERD/codebase cuối cùng.

### Người dùng, giải và thể lệ

  -----------------------------------------------------------------------
  Bảng                                Chức năng
  ----------------------------------- -----------------------------------
  `USERS`                             Lưu thông tin tài khoản và hồ sơ
                                      người dùng; role có thể lưu trực
                                      tiếp hoặc tách riêng.

  `TOURNAMENTS`                       Lưu giải đấu, BTC tổ chức, thời
                                      gian và trạng thái.

  `GAMES`                             Danh mục trò chơi Esport.

  `CATEGORIES`                        Hạng mục thuộc giải, game,
                                      TEAM/SOLO, giới hạn đội và cấu
                                      hình.

  `TOURNAMENT_REFEREES`               Danh sách trọng tài tham gia phục
                                      vụ một giải nếu cần quản lý cấp
                                      giải.

  `CATEGORY_ELIGIBILITY_RULES`        Điều kiện đủ tư cách tham gia
                                      category.

  `RULE_DOCUMENTS`                    Tài liệu thể lệ chung hoặc riêng
                                      category.

  `RULE_CHUNKS`                       Các đoạn thể lệ được tách để truy
                                      xuất RAG.
  -----------------------------------------------------------------------

### Đội và đăng ký

  -----------------------------------------------------------------------
  Bảng                                Chức năng
  ----------------------------------- -----------------------------------
  `TEAMS`                             Đội thuộc category, đội trưởng và
                                      thông tin đội.

  `TEAM_MEMBERS`                      Thành viên đã được chấp nhận vào
                                      đội.

  `TEAM_JOIN_REQUESTS`                Yêu cầu xin gia nhập đội và trạng
                                      thái xử lý.

  `REGISTRATIONS`                     Hồ sơ đội đăng ký category/giải và
                                      trạng thái duyệt.

  `REGISTRATION_AI_REVIEWS`           Phân tích/đề xuất AI cho hồ sơ đăng
                                      ký.

  `AI_CANDIDATE_RANKING_RUNS`         Metadata mỗi lần captain chủ động
                                      gọi AI xếp hạng ứng viên.

  `AI_CANDIDATE_RANKING_ITEMS`        Thứ hạng, điểm và lý do AI đề xuất
                                      cho từng ứng viên.
  -----------------------------------------------------------------------

### Stage và match

  -----------------------------------------------------------------------
  Bảng                                Chức năng
  ----------------------------------- -----------------------------------
  `STAGES`                            Các giai đoạn của category, thứ tự,
                                      format và cấu hình.

  `STAGE_GROUPS`                      Các bảng con như A/B trong stage
                                      chia bảng.

  `STAGE_STANDINGS`                   Thứ hạng/thành tích/trạng thái đi
                                      tiếp của team trong stage.

  `MATCHES`                           Trận đấu, stage/group, đội/slot,
                                      lịch, trạng thái và kết quả.

  `MATCH_REFEREES`                    Phân công trọng tài cho từng trận.

  `MATCH_ADVANCEMENTS`                Đội thắng/thua từ trận nguồn đi đến
                                      slot trận đích.

  `MATCH_GAMES`                       Từng ván trong một match Bo3/Bo5.

  `MATCH_RESCHEDULES`                 Lịch sử thay đổi lịch thi đấu.

  `MATCH_RESULT_SUBMISSIONS`          Các lần gửi/nhập kết quả trận.

  `MATCH_RESULT_CONFIRMATIONS`        Xác nhận hoặc phản hồi kết quả.
  -----------------------------------------------------------------------

### Khiếu nại

  Bảng                       Chức năng
  -------------------------- --------------------------------------------
  `DISPUTES`                 Hồ sơ khiếu nại gắn với trận và đội gửi.
  `DISPUTE_EVIDENCE`         Bằng chứng ảnh/video/tài liệu.
  `DISPUTE_EVENTS`           Timeline và lịch sử xử lý.
  `DISPUTE_AI_SUGGESTIONS`   Phân tích và đề xuất AI.
  `DISPUTE_AI_CITATIONS`     Trích dẫn các đoạn thể lệ được AI sử dụng.

### Rating, seeding và dự đoán

  -----------------------------------------------------------------------
  Bảng                                Chức năng
  ----------------------------------- -----------------------------------
  `PLAYER_RATINGS`                    Rating hiện tại của người chơi theo
                                      từng game.

  `RATING_HISTORY`                    Lịch sử thay đổi rating, có thể
                                      liên kết match.

  `SEEDING_RUNS`                      Metadata một lần chạy seeding.

  `SEEDING_RUN_ITEMS`                 Kết quả seeding theo từng đội, gồm
                                      đề xuất AI và thứ tự cuối do BTC
                                      xác nhận.

  `MATCH_PREDICTIONS`                 Dự đoán AI về trận, xác suất/độ tin
                                      cậy và thời điểm.
  -----------------------------------------------------------------------

### Thông báo và vận hành

  Bảng                        Chức năng
  --------------------------- ------------------------------------------------------
  `NOTIFICATIONS`             Nội dung thông báo được tạo.
  `NOTIFICATION_RECIPIENTS`   Người nhận và trạng thái đọc/nhận.
  `AUDIT_LOGS`                Nhật ký thao tác quan trọng để truy vết và giám sát.


## 14. Quy tắc dữ liệu/nghiệp vụ quan trọng

1.  Một tournament có nhiều category; mỗi category thuộc một tournament.
2.  Mỗi category gắn với một game.
3.  Mỗi team thuộc một category.
4.  Category SOLO vẫn dùng TEAMS với đúng một thành viên là captain.
5.  Join request không phải thành viên chính thức cho đến khi được chấp
    nhận.
6.  Registration là quy trình khác với join request.
7.  Team chỉ đăng ký category mà team thuộc về.
8.  Một category có nhiều stage; stage có thứ tự và format riêng.
9.  Stage có thể có hoặc không có group.
10. Team đi tiếp giữa stage theo kết quả, không đăng ký lại.
11. Match có thể chưa có đủ hai đội khi bracket mới tạo.
12. Referee được phân công ở cấp match; quyền thao tác kiểm tra theo
    assignment.
14. Kết quả có lịch sử submission và confirmation phù hợp.
15. Dispute lưu evidence, timeline và quyết định cuối.
16. AI chỉ đề xuất; người có thẩm quyền quyết định.
17. Rating là theo user/game.
18. Rating hỗ trợ seeding ban đầu; stage sau dựa trên kết quả stage
    trước.
19. Seeding run và items là quan hệ cha-con, không phải hai lần seeding.
20. Prediction là dự đoan, không phải kết quả chính thức.
21. Backend là nguồn dữ liệu và kiểm soát nghiệp vụ chính.
22. AI Service không tự sửa dữ liệu nghiệp vụ.
23. Cache phải được cập nhật/invalidate khi dữ liệu gốc đổi.
24. Nghiệp vụ nhiều bước cần transaction và kiểm soát đồng thời phù hợp.

## 15. Quy ước kiểu dữ liệu trên ERD

Trong sơ đồ ERD phục vụ báo cáo, nhóm muốn dùng đúng bốn kiểu tổng quát:

  Kiểu         Ý nghĩa
  ------------ -------------------------------------------------------
  `String`     Tên, email, mô tả, URL, nội dung văn bản.
  `Number`     ID, số lượng, thứ hạng, điểm, rating.
  `Enum`       Trạng thái hoặc giá trị thuộc tập cố định.
  `DateTime`   Thời điểm tạo/cập nhật/bắt đầu/kết thúc/lịch thi đấu.

`PK` và `FK` là ký hiệu khóa, không phải kiểu dữ liệu. Boolean có thể
được biểu diễn bằng Enum TRUE/FALSE theo quy ước sơ đồ. JSON config có
thể được biểu diễn là String trong ERD báo cáo và giải thích rằng dữ
liệu thực tế lưu dạng JSON. Đây là quy ước trình bày, không nhất thiết
là kiểu vật lý trong DB.

## 16. Sơ đồ kiến trúc và quy ước màu

Bản kiến trúc tổng quan gần nhất được chia theo bốn mục tiêu: 1. Trải
nghiệm cho các vai trò người dùng. 2. Xử lý nghiệp vụ và quản lý giải
đấu. 3. Lưu trữ và khai thác dữ liệu. 4. Vận hành hệ thống.

Các thành phần: - Người dùng: BTC, Admin, người chơi, trọng tài. -
Frontend: Web Application, giao diện đa vai trò. - Backend/API Layer:
API Gateway, xác thực/phân quyền và module nghiệp vụ. - Database: người
dùng, giải, đội, trận, kết quả, rating/seeding, thể lệ. - AI Service:
LLM/RAG và Vector DB. - Vận hành: bảo mật, backup/recovery, phân
tích/báo cáo.

Quy ước màu đã thống nhất theo hướng: - Frontend/nhóm người dùng: xanh
lá hoặc xanh dương nhạt. - Backend/module nghiệp vụ: cam. - Database:
xanh dương. - AI Service: tím nhạt để thể hiện service độc lập, không
phải module con của Backend. - Vận hành: tím rất nhạt.

AI Service giao tiếp Backend qua HTTP/REST nội bộ. Backend có thể có AI
Integration Adapter, nhưng xử lý LLM, embedding và RAG thuộc AI Service.


## 17. Tóm tắt tư duy hệ thống

Chuỗi nghiệp vụ cốt lõi:

**Người dùng và vai trò → Giải đấu → Hạng mục → Đội và đăng ký → Giai
đoạn → Trận đấu → Kết quả → Bảng xếp hạng/đội đi tiếp → Khiếu nại và vận
hành.**

Các năng lực xuyên suốt: - **Phân quyền:** ai được thao tác trên từng
tài nguyên. - **AI:** phân tích và đề xuất, không thay thế quyết định
của người có thẩm quyền. - **Dữ liệu:** PostgreSQL là nguồn nghiệp vụ
chính; file storage giữ tài liệu/bằng chứng; vector index hỗ trợ RAG. -
**Hiệu năng:** Redis cache dữ liệu đọc nhiều; background jobs xử lý tác
vụ dài; SSE/WebSocket cập nhật trực tiếp. - **Tính nhất quán:**
transaction và concurrency control bảo vệ duyệt đăng ký, cập nhật kết
quả, standings và lịch.


