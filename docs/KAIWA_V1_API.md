# Kaiwa V1

## API

Các API công khai nằm dưới `/api/kaiwa`. Response thành công có dạng `{ success, message, data }`. Lỗi có dạng `{ success: false, message }`.

| Method | Path | Tham số |
| --- | --- | --- |
| GET | `/dialogues` | Query tùy chọn `textbook`, `lesson`, `level`. Trả danh sách tóm tắt. |
| GET | `/dialogues/:id` | MongoDB ObjectId. Trả speakers và lines theo thứ tự. |
| GET | `/questions` | Query tùy chọn `textbook`, `lesson`, `source`, `difficulty`, `limit`. Trả câu đang hoạt động cùng mẫu trả lời. |
| POST | `/practice-sessions` | Body `textbook`, `lessons`, `source?`, `limit?`. Trả HTTP 201. |
| GET | `/practice-sessions/:id` | Resume bằng ID phiên và bearer token. |
| PATCH | `/practice-sessions/:id` | Body `questionId`, `selfAssessment`, `userAnswer?`. Yêu cầu bearer token. |
| POST | `/practice-sessions/:id/complete` | Không cần body. Yêu cầu bearer token và tự đánh giá đầy đủ. |

`textbook` nhận `minna_1` hoặc `minna_2`. `lesson` là số nguyên dương. `source` nhận `textbook`, `custom` hoặc `all` (mặc định). `limit` từ 1 đến 50 (mặc định 50). `difficulty` nhận `easy`, `medium`, `hard`. `level` nhận `N5`, `N4`, `N3`. Danh sách không có dữ liệu trả `[]`. Tạo phiên khi không có câu phù hợp trả 404.

### Ví dụ

`POST /api/kaiwa/practice-sessions`

```json
{
  "textbook": "minna_2",
  "lessons": [27],
  "source": "custom",
  "limit": 1
}
```

```json
{
  "success": true,
  "message": "Session created",
  "data": {
    "sessionId": "5a7ca827-e8c1-470c-91d3-cb9ce07e416f",
    "accessToken": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    "textbook": "minna_2",
    "lessons": [27],
    "questionIds": ["65aa12345678901234567890"],
    "questions": [
      {
        "_id": "65aa12345678901234567890",
        "textbook": "minna_2",
        "lesson": 27,
        "source": "custom",
        "question": {
          "jp": "休みの日に何をしますか。",
          "vi": "Bạn làm gì vào ngày nghỉ?"
        },
        "suggestedAnswers": [
          { "id": "answer_1", "jp": "本を読みます。", "vi": "Tôi đọc sách." },
          { "id": "answer_2", "jp": "散歩します。", "vi": "Tôi đi dạo." }
        ],
        "order": 1
      }
    ],
    "currentIndex": 0,
    "answers": [],
    "status": "in_progress",
    "startedAt": "2026-11-21T03:00:00.000Z",
    "completedAt": null
  }
}
```

`PATCH /api/kaiwa/practice-sessions/5a7ca827-e8c1-470c-91d3-cb9ce07e416f` dùng header `Authorization: Bearer <accessToken>`.

```json
{
  "questionId": "65aa12345678901234567890",
  "selfAssessment": "retry"
}
```

```json
{ "success": false, "message": "Question is outside this session" }
```

Nếu gửi ID của câu ngoài phiên, server trả HTTP 400 như ví dụ trên. PATCH thành công trả phiên và kết quả đã lưu. Gửi lại cùng một đánh giá và nội dung trả lời sẽ trả phiên hiện có. Thay đổi đánh giá đã lưu trả 409. Hoàn thành trước khi đánh giá đủ trả 409.

Lưu ID phiên và token cùng nhau trên thiết bị để resume. Token chỉ xuất hiện lúc tạo phiên. `userAnswer` có thể bỏ qua nếu người học trả lời thành tiếng hoặc muốn giữ nội dung trên thiết bị. `currentIndex` là vị trí câu chưa đánh giá đầu tiên, tính từ 0. Khi đã đánh giá đủ, giá trị bằng số câu hỏi. UI có thể dùng danh sách câu có `retry` để mở lượt ôn lại trên thiết bị.

## MongoDB

| Model | Dữ liệu và ràng buộc |
| --- | --- |
| `KaiwaDialogue` | Giáo trình, bài, tiêu đề, mô tả, cấp độ, nguồn, speakers, lines, timestamps. Unique `{ textbook, lesson }`. Speaker ID, line ID và line order duy nhất trong hội thoại. Line giữ nguyên lượt thoại. |
| `KaiwaQuestion` | Phạm vi, nguồn, liên kết hội thoại/lượt thoại, câu hỏi, mẫu trả lời, thẻ, độ khó, giải thích, thứ tự, audio URL, trạng thái xuất bản và timestamps. Index `{ textbook, lesson, source, order }` và `{ dialogueId }`. Câu sách cần liên kết một lượt thoại sách cùng bài. Câu đang hoạt động cần nghĩa tiếng Việt. |
| `KaiwaPracticeSession` | UUID duy nhất, hash khóa truy cập, owner tùy chọn, giáo trình, bài, danh sách ID và bản chụp câu hỏi, vị trí, tự đánh giá, trạng thái và thời gian. API trả 404 sau 30 ngày kể từ khi tạo. MongoDB TTL dọn bản ghi hết hạn theo chu kỳ. |

Phiên giữ thứ tự và nội dung câu hỏi tại thời điểm tạo. Sửa hoặc xóa câu hỏi trong ngân hàng vẫn cho phép tiếp tục phiên cũ.

## Quản trị và nhập dữ liệu

| Method | URL cục bộ | Thành công |
| --- | --- | --- |
| POST | `http://localhost:5000/api/kaiwa/admin/dialogues` | 201 |
| POST | `http://localhost:5000/api/kaiwa/admin/questions` | 201 |

Server phải có biến môi trường `ADMIN_API_KEY`. Khởi động lại backend sau khi cập nhật `.env`. Trong Postman, chọn **Authorization → API Key**, đặt **Key** là `x-admin-key`, **Value** là `{{adminKey}}` và **Add to** là **Header**. Đặt giá trị bí mật trong biến local `adminKey` của Postman. Ở tab **Body**, chọn **raw → JSON** để gửi `Content-Type: application/json`.

Body mẫu cho dialogue tự biên soạn.

```json
{
  "textbook": "minna_2",
  "lesson": 27,
  "title": "Kế hoạch ngày nghỉ",
  "source": "custom",
  "speakers": [
    { "id": "speaker_1", "name": "アキ", "voiceId": null }
  ],
  "lines": [
    {
      "id": "line_1",
      "order": 1,
      "speakerId": "speaker_1",
      "jp": "休みの日に何をしますか。",
      "vi": "Bạn làm gì vào ngày nghỉ?"
    }
  ]
}
```

Body mẫu cho câu hỏi tự biên soạn độc lập.

```json
{
  "textbook": "minna_2",
  "lesson": 27,
  "source": "custom",
  "question": {
    "jp": "休みの日に何をしますか。",
    "vi": "Bạn làm gì vào ngày nghỉ?"
  },
  "suggestedAnswers": [
    { "id": "answer_1", "jp": "本を読みます。", "vi": "Tôi đọc sách." },
    { "id": "answer_2", "jp": "散歩します。", "vi": "Tôi đi dạo." }
  ],
  "order": 1
}
```

Để liên kết câu hỏi với hội thoại mẫu trên, thêm `dialogueId` bằng `data._id` từ response tạo dialogue và `sourceLineId` bằng `line_1`. Với `source: "textbook"`, cả hai trường là bắt buộc và phải tham chiếu đến lượt thoại sách cùng giáo trình và bài.

Hai API trả JSON theo dạng `{ success, message, data }` khi thành công. JSON hoặc dữ liệu sai trả `400`, thiếu hoặc sai khóa trả `403`, hội thoại trùng giáo trình và bài trả `409`. Câu hỏi dùng index thứ tự không unique theo schema hiện tại.

CLI dùng quyền truy cập database được chỉ định bởi `KAIWA_ADMIN_MONGO_URI`. Chạy từng lệnh thay đổi nội dung một lần để kiểm tra tham chiếu nhất quán.

```powershell
node src/scripts/kaiwaAdmin.js dialogues list
node src/scripts/kaiwaAdmin.js dialogues create dialogue.json
node src/scripts/kaiwaAdmin.js dialogues get <id>
node src/scripts/kaiwaAdmin.js dialogues update <id> changes.json
node src/scripts/kaiwaAdmin.js dialogues delete <id>
node src/scripts/kaiwaAdmin.js questions import <stable-object-id> question.json
```

Hai loại nội dung hỗ trợ cùng các lệnh `list`, `get`, `create`, `update`, `delete` và `import`. `import` bỏ qua ID hiện có, hoặc bài đã có hội thoại, để giữ dữ liệu nhập trước đó. Nhập hội thoại trước câu hỏi liên kết. Dùng ID speaker, line và answer ổn định giữa các lần cập nhật. Các bài chưa có tài liệu nguồn sẽ xuất hiện dưới dạng danh sách trống.

## Kiểm thử và bàn giao frontend

```powershell
$env:KAIWA_TEST_LOCAL_MONGO = '1'
node --test tests/kaiwa.integration.test.js
```

Bộ kiểm thử dùng MongoDB loopback và database tên ngẫu nhiên. Fixture là nội dung tự viết có nguồn `custom`.

Frontend hiện có `KaiwaPage`, WAV VOICEVOX tĩnh và `JapaneseIMEInput`. Khi nối API, dùng `audioUrl` cho clip có sẵn, tái sử dụng trình phát và fallback trình duyệt. Dùng URL HTTPS mà thiết bị người học truy cập được khi triển khai lên Vercel. Backend lưu voice ID và URL, còn WAV có thể phục vụ dưới dạng tài nguyên tĩnh hoặc qua CDN. Kiểm thử riêng playback nối tiếp và cleanup, reset ba trạng thái reveal khi chuyển câu, nhập tiếng Nhật trên iPad landscape, và bố cục desktop/mobile.
