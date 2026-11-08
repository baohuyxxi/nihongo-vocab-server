# N3 Kanji API Handoff

## 1. Tổng quan hệ thống N3 Kanji

Backend hiện tại đã tích hợp các module mới cho N3 Kanji theo giáo trình Sou Matome, được mount vào Express như sau:

- `/api/kanji-curriculum` -> `src/routes/kanjiCurriculum.routes.js`
- `/api/kanji` -> `src/routes/kanji.routes.js` + `src/routes/kanjiReview.routes.js`
- `/api/kanji-vocabulary` -> `src/routes/kanjiVocabulary.routes.js`

Route registration nằm trong [src/routes/index.js](../src/routes/index.js). Cấu trúc mount thực tế:

```js
app.use("/api/kanji", kanjiReviewRoutes);
app.use("/api/kanji", kanjiRoutes);
app.use("/api/kanji-curriculum", kanjiCurriculumRoutes);
app.use("/api/kanji-vocabulary", kanjiVocabularyRoutes);
```

Các phần chính:

1. Kanji Curriculum
   - Quản lý giáo trình, tuần/ngày, entry gắn Kanji + vocabulary
   - Import dữ liệu theo payload bài học
   - Query overview và chi tiết entry

2. Kanji
   - CRUD cơ bản cho collection `Kanji`
   - Query all / by id / related vocabulary by kanjiId

3. Kanji Vocabulary
   - CRUD cho collection `KanjiVocabulary`
   - Tìm kiếm, phân trang, liên kết `kanjiIds`

4. Kanji Review Session
   - Tạo session review theo `weeks`, `days`, `contentType`, `mode`, `directions`
   - Render flashcards / quiz / typing
   - Lưu lịch sử review vào `KanjiReviewHistory`

5. Import dữ liệu N3
   - `POST /api/kanji-curriculum/import`
   - Yêu cầu admin key

Lưu ý quan trọng:
- Tài liệu này dựa trên source code thực tế của Backend, không phải suy luận từ tên file.
- Nếu không có môi trường MongoDB / env chạy thực tế, phần JSON mẫu là ví dụ từ schema + controller + service, không phải response runtime đã test trên máy local.
- Tất cả response thành công đều đi qua `successResponse` trong [src/utils/response.js](../src/utils/response.js):

```js
{
  success: true,
  message: "...",
  data: {...},
  ...extra
}
```

Error response đi qua `errorResponse`:

```json
{
  "success": false,
  "message": "..."
}
```

---

## 2. Bảng API toàn bộ (phân tích từ code)

| Method | Endpoint | Auth | Mục đích | Ghi chú |
|---|---|---:|---|---|
| GET | `/api/kanji-curriculum` | Không | Lấy overview tuần/ngày của curriculum | `/api/kanji-curriculum/` |
| GET | `/api/kanji-curriculum/entries` | Không | Lấy entry theo `week` và `day` | Có populate `kanjiId`, `vocabularyIds` |
| GET | `/api/kanji-curriculum/entries/:id` | Không | Lấy chi tiết một entry | Populate + map `kanjiDetails` |
| POST | `/api/kanji-curriculum/import` | Có (`x-admin-key`) | Import curriculum payload | Yêu cầu `ADMIN_API_KEY` |
| GET | `/api/kanji` | Không | Danh sách tất cả Kanji | Hỗ trợ search/jlpt/radicalId/status |
| GET | `/api/kanji/:id` | Không | Chi tiết Kanji theo id | Populate `radicalId` |
| POST | `/api/kanji` | Không | Tạo Kanji mới | Bắt buộc `kanji` |
| PUT | `/api/kanji/:id` | Không | Cập nhật Kanji | Validate `radicalId` |
| DELETE | `/api/kanji/:id` | Không | Xóa Kanji | Cấm nếu đang dùng bởi vocabulary |
| GET | `/api/kanji-vocabulary` | Không | Danh sách từ vựng | Search + filter + pagination |
| GET | `/api/kanji-vocabulary/:id` | Không | Chi tiết vocabulary | Populate `kanjiIds` |
| POST | `/api/kanji-vocabulary` | Không | Tạo vocabulary | Gắn `kanjiIds` từ sync |
| PUT | `/api/kanji-vocabulary/:id` | Không | Cập nhật vocabulary | Sync Kanji lại từ `word` |
| DELETE | `/api/kanji-vocabulary/:id` | Không | Xóa vocabulary | Không có soft delete |
| GET | `/api/kanji/review-session` | Không | Tạo session ôn tập N3 | `mode` có thể flashcard/quiz/typing |
| POST | `/api/kanji/review-session/complete` | Không | Đánh dấu item đã hoàn thành | Yêu cầu `reviewId`, `itemType`, `itemId` |

---

## 3. Chi tiết request/response từng API

### 3.1 GET /api/kanji-curriculum

#### Route
```js
router.get("/", getOverview);
```

#### Mục đích
Trả về overview curriculum dạng ma trận tuần x ngày, dùng để hiển thị dashboard / thống kê cho frontend.

#### Query parameters
Không có query param bắt buộc.

#### Response thành công
`getCurriculumOverview()` trả về `weeks` (1..6) và `days` (1..7) với số liệu tổng hợp:

```json
{
  "success": true,
  "message": "Get curriculum overview successfully",
  "data": [
    {
      "week": 1,
      "days": [
        { "day": 1, "totalEntries": 0, "kanjiCount": 0, "vocabularyCount": 0 },
        { "day": 2, "totalEntries": 0, "kanjiCount": 0, "vocabularyCount": 0 }
      ]
    }
  ]
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "..."
}
```

#### Ghi chú
- Không có `title`/`description` trong response này.
- Curriculum ID được hardcode là `sou-matome-n3-kanji` trong service.
- Frontend nên coi đây là metadata tổng hợp, không phải payload bài học chi tiết.

---

### 3.2 GET /api/kanji-curriculum/entries

#### Route
```js
router.get("/entries", getEntries);
```

#### Mục đích
Lấy danh sách `KanjiCurriculumEntry` theo `week` và `day`.

#### Query params
- `week`: number, bắt buộc, 1..6
- `day`: number, bắt buộc, 1..7

#### Validation
Trong `getEntriesByWeekAndDay`:

```js
if (!Number.isInteger(weekNumber) || weekNumber < 1 || weekNumber > 6) throwError(...)
if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) throwError(...)
```

#### Response thành công
```json
{
  "success": true,
  "message": "Get curriculum entries successfully",
  "data": [
    {
      "_id": "64f9e0d1bc6d2e0fbfd55f9a",
      "curriculum": "sou-matome-n3-kanji",
      "week": 1,
      "day": 1,
      "order": 1,
      "kanjiId": {
        "_id": "64f9e0d1bc6d2e0fbfd55f99",
        "kanji": "駐",
        "onyomi": [
          { "reading": "チュウ", "romaji": "", "okurigana": "", "note": "", "type": "other" }
        ],
        "kunyomi": [],
        "hanViet": ["Trú"],
        "meanings": ["đỗ, dừng (xe)"],
        "radicalId": null,
        "components": [],
        "status": "active"
      },
      "vocabularyIds": [
        {
          "_id": "64f9e0d1bc6d2e0fbfd55f9b",
          "word": "駐車場",
          "hiragana": "ちゅうしゃじょう",
          "hanViet": "Trú Xa Trường",
          "meaning": "bãi đỗ xe",
          "kanjiIds": ["64f9e0d1bc6d2e0fbfd55f99", "..."],
          "jlpt": ["N3"],
          "wordType": "compound",
          "status": "active"
        }
      ],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "Week must be between 1 and 6"
}
```

#### Ghi chú
- `kanjiId` và `vocabularyIds` được populate nếu document tồn tại.
- Frontend không nên giả định `kanjiId` là string thuần; đây là object populate thực tế.
- `vocabularyIds` là danh sách object `KanjiVocabulary` được populate.

---

### 3.3 GET /api/kanji-curriculum/entries/:id

#### Route
```js
router.get("/entries/:id", getEntry);
```

#### Mục đích
Lấy chi tiết đặc biệt của một `KanjiCurriculumEntry` theo `_id`.

#### Path param
- `id`: Mongo ObjectId hợp lệ

#### Response thành công mẫu
```json
{
  "success": true,
  "message": "Get curriculum entry successfully",
  "data": {
    "_id": "64f9e0d1bc6d2e0fbfd55f9a",
    "curriculum": "sou-matome-n3-kanji",
    "week": 1,
    "day": 1,
    "order": 1,
    "kanji": {
      "_id": "64f9e0d1bc6d2e0fbfd55f99",
      "kanji": "駐",
      "onyomi": [
        { "reading": "チュウ", "romaji": "", "okurigana": "", "note": "", "type": "other" }
      ],
      "kunyomi": [],
      "hanViet": ["Trú"],
      "meanings": ["đỗ, dừng (xe)"],
      "status": "active"
    },
    "relatedVocabulary": [
      {
        "_id": "64f9e0d1bc6d2e0fbfd55f9b",
        "word": "駐車場",
        "hiragana": "ちゅうしゃじょう",
        "hanViet": "Trú Xa Trường",
        "meaning": "bãi đỗ xe",
        "kanjiIds": ["64f9e0d1bc6d2e0fbfd55f99"],
        "status": "active"
      }
    ],
    "kanjiDetails": {
      "id": "64f9e0d1bc6d2e0fbfd55f99",
      "kanji": "駐",
      "onyomi": ["チュウ"],
      "kunyomi": [],
      "hanViet": ["Trú"],
      "meanings": ["đỗ, dừng (xe)"],
      "radical": null
    }
  }
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "Curriculum entry not found"
}
```

#### Ghi chú
- Đây là response đầy đủ nhất để build màn hình chi tiết Kanji + từ vựng liên quan.
- `relatedVocabulary` là array được populate.
- `kanji` nằm ở cấp root như một object đã populate.

---

### 3.4 POST /api/kanji-curriculum/import

#### Route
```js
router.post("/import", importEntries);
```

#### Mục đích
Import dữ liệu curriculum vào MongoDB. Không là API cho Frontend hiển thị nội dung, mà là API admin import dữ liệu nội bộ.

#### Authentication
Yêu cầu Header:

```http
x-admin-key: <ADMIN_API_KEY>
```

Controller gọi:

```js
ensureAdminAccess(req);
```

Và service kiểm tra:

```js
if (!apiKey) throwError("Import is restricted. Set ADMIN_API_KEY to enable curriculum import.", 403);
if (headerKey !== apiKey) throwError("Forbidden: invalid admin key", 403);
```

#### Request body mẫu
```json
{
  "curriculum": "sou-matome-n3-kanji",
  "week": 1,
  "day": 1,
  "title": "でかける① — 駐車場",
  "sourcePdfPage": 11,
  "entries": [
    {
      "order": 1,
      "kanji": "駐",
      "onyomi": ["チュウ"],
      "kunyomi": [],
      "hanViet": "Trú",
      "meanings": ["đỗ, dừng (xe)"],
      "vocabulary": [
        {
          "word": "駐車場",
          "hiragana": "ちゅうしゃじょう",
          "hanViet": "Trú Xa Trường",
          "meaning": "bãi đỗ xe"
        }
      ]
    }
  ]
}
```

#### Response thành công
```json
{
  "success": true,
  "message": "Import curriculum entries successfully",
  "data": {
    "success": true,
    "curriculum": "sou-matome-n3-kanji",
    "importedCount": 1,
    "createdKanjiCount": 1,
    "updatedKanjiCount": 0,
    "createdVocabularyCount": 1,
    "updatedVocabularyCount": 0,
    "items": [
      {
        "_id": "64f9e0d1bc6d2e0fbfd55f9a",
        "curriculum": "sou-matome-n3-kanji",
        "week": 1,
        "day": 1,
        "order": 1,
        "kanjiId": "64f9e0d1bc6d2e0fbfd55f99",
        "vocabularyIds": ["64f9e0d1bc6d2e0fbfd55f9b"],
        "kanji": {
          "_id": "64f9e0d1bc6d2e0fbfd55f99",
          "kanji": "駐"
        },
        "vocabulary": [
          {
            "_id": "64f9e0d1bc6d2e0fbfd55f9b",
            "word": "駐車場"
          }
        ],
        "inserted": true
      }
    ]
  }
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "Forbidden: invalid admin key"
}
```

#### Ghi chú cho Frontend
- Đây là API admin, không phải API thuộc UX học tập thông thường.
- Frontend quản trị có thể gọi trực tiếp nếu có quyền, nhưng màn hình người dùng không nên gọi theo cách người dùng bình thường.
- Import service dùng `curriculum`, `week`, `day`, `order` để upsert. Không có auto-delete toàn bộ collection.
- Dữ liệu nhập mới được upsert dựa trên `curriculum + week + day + order` trong `KanjiCurriculumEntry`.

---

### 3.5 GET /api/kanji

#### Route
```js
router.get("/", getAllKanji);
router.get("/:id", getKanjiById);
router.post("/", createKanji);
router.put("/:id", updateKanji);
router.delete("/:id", deleteKanji);
```

#### Mục đích
CRUD cho collection `Kanji`.

#### Query params
- `search`: string
- `jlpt`: `N5|N4|N3|N2|N1`
- `radicalId`: Mongo ObjectId
- `status`: `active|inactive`
- `page`: default 1
- `limit`: default 20, max 100

#### Response thành công mẫu
```json
{
  "success": true,
  "message": "Get kanji successfully",
  "data": [
    {
      "_id": "64f9e0d1bc6d2e0fbfd55f99",
      "kanji": "駐",
      "onyomi": [
        { "reading": "チュウ", "romaji": "", "okurigana": "", "note": "", "type": "other" }
      ],
      "kunyomi": [],
      "radicalId": null,
      "components": [],
      "hanViet": ["Trú"],
      "meanings": ["đỗ, dừng (xe)"],
      "mnemonic": "",
      "strokes": 0,
      "jlpt": [],
      "frequency": null,
      "notes": "",
      "status": "active",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Ghi chú
- `Kanji` schema có `unique: true` trên `kanji`.
- `deleteKanji` refuses nếu document đang được dùng bởi `KanjiVocabulary` (`kanjiIds` reference), trả `409`.

---

### 3.6 GET /api/kanji-vocabulary

#### Route
```js
router.get("/", getAllKanjiVocabulary);
router.get("/:id", getKanjiVocabularyById);
router.post("/", createKanjiVocabulary);
router.put("/:id", updateKanjiVocabulary);
router.delete("/:id", deleteKanjiVocabulary);
```

#### Mục đích
CRUD cho collection `KanjiVocabulary`.

#### Query params
- `search`: string
- `jlpt`: `N5|N4|N3|N2|N1`
- `wordType`: `compound|standalone|other`
- `partOfSpeech`: array/string tùy controller
- `topic`: string
- `kanjiId`: Mongo ObjectId
- `status`: `active|inactive`
- `page`, `limit`

#### Response thành công mẫu
```json
{
  "success": true,
  "message": "Get kanji vocabulary successfully",
  "data": [
    {
      "_id": "64f9e0d1bc6d2e0fbfd55f9b",
      "word": "駐車場",
      "hiragana": "ちゅうしゃじょう",
      "katakana": "",
      "romaji": "",
      "kanjiIds": [
        "64f9e0d1bc6d2e0fbfd55f99"
      ],
      "segments": [],
      "readings": [
        {
          "reading": "ちゅうしゃじょう",
          "type": "other",
          "note": "Imported from curriculum sou-matome-n3-kanji"
        }
      ],
      "meaning": "bãi đỗ xe",
      "hanViet": "Trú Xa Trường",
      "partOfSpeech": [],
      "jlpt": ["N3"],
      "wordType": "compound",
      "topic": "",
      "examples": [],
      "notes": "",
      "image": "",
      "audio": "",
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

#### Ghi chú
- `kanjiIds` là mảng ObjectId thật của `Kanji`; không phải string giả hoặc index.
- `create/update` service dùng `syncKanjiFromWord()` để tìm hoặc tạo Kanji bằng ký tự Kanji trong từ `word`.

---

### 3.7 GET /api/kanji/review-session

#### Route
```js
router.get("/review-session", getReviewSession);
```

#### Mục đích
Tạo session ôn tập N3 theo `weeks`, `days`, `contentType`, `mode`, `directions`.

#### Query parameters
Theo service `parseReviewScope(query)`:

- `curriculum`: default `sou-matome-n3-kanji`
- `weeks`: CSV integer, ví dụ `1` hoặc `1,2,3`, 1..6
- `days`: CSV integer, ví dụ `1` hoặc `1,2,3`, 1..7
- `contentType`: `kanji | vocabulary | both`, default `both`
- `mode`: `flashcard | quiz | typing`, default `flashcard`
- `directions`: CSV string hoặc array; valid values gồm:
  - `kanji`
  - `kanji_meaning`
  - `meaning_kanji`
  - `onyomi`
  - `kunyomi`
  - `hanviet`
  - `kanji_reading`
  - `reading_kanji`
  - `vocab_meaning`
  - `meaning_vocab`
- `limit`: number, default `20`
- `reviewId`: optional, dùng khi resume / continue session

#### Validation
```js
if (curriculum !== "sou-matome-n3-kanji") throwError("Unsupported curriculum. Only sou-matome-n3-kanji is allowed.", 400)
```

#### Response thành công – Flashcard
```json
{
  "success": true,
  "message": "Get flashcard review session successfully",
  "data": {
    "mode": "flashcard",
    "total": 20,
    "cards": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "itemId": "64f9e0d1bc6d2e0fbfd55f99",
        "direction": "kanji",
        "front": "駐",
        "back": {
          "kanji": "駐",
          "hanViet": "Trú",
          "onyomi": ["チュウ"],
          "kunyomi": [],
          "meaning": "đỗ, dừng (xe)"
        }
      },
      {
        "id": "vocabulary-64f9e0d1bc6d2e0fbfd55f9b-kanji",
        "itemType": "vocabulary",
        "itemId": "64f9e0d1bc6d2e0fbfd55f9b",
        "direction": "kanji",
        "front": "駐車場",
        "back": {
          "word": "駐車場",
          "hanViet": "Trú Xa Trường",
          "hiragana": "ちゅうしゃじょう",
          "meaning": "bãi đỗ xe"
        }
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 20,
    "reviewedVocabs": 0,
    "total": 20,
    "remaining": 20,
    "completed": false
  }
}
```

#### Response thành công – Quiz
```json
{
  "success": true,
  "message": "Get quiz review session successfully",
  "data": {
    "mode": "quiz",
    "total": 20,
    "questions": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "direction": "kanji",
        "question": "駐",
        "correct": "駐",
        "acceptedAnswers": ["駐"],
        "choices": ["駐", "満", "車", "場"]
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 20,
    "reviewedVocabs": 0,
    "total": 20,
    "remaining": 20,
    "completed": false
  }
}
```

#### Response thành công – Typing
```json
{
  "success": true,
  "message": "Get typing review session successfully",
  "data": {
    "mode": "typing",
    "total": 20,
    "questions": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "direction": "kanji",
        "question": "駐",
        "correct": "駐",
        "acceptedAnswers": ["駐"]
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 20,
    "reviewedVocabs": 0,
    "total": 20,
    "remaining": 20,
    "completed": false
  }
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "No curriculum entries matched the selected weeks and days"
}
```

#### Ghi chú quan trọng
- `id` được tạo theo dạng `"${itemType}-${itemId}-${effectiveDirection}"`.
- `itemId` phải là Mongo ObjectId hợp lệ, không được `undefined`.
- `front` sẽ bị filter nếu rỗng, nên trên backend không nên trả `front: ""` cho card hợp lệ.
- `back` cho Kanji và vocabulary là object, không phải array.
- `directions` có thể override, nhưng service ưu tiên `kanji` nếu `requestedDirections.includes("kanji")`.

---

### 3.8 POST /api/kanji/review-session/complete

#### Route
```js
router.post("/review-session/complete", completeReview);
```

#### Mục đích
Đánh dấu một item của session hiện tại là đã học xong.

#### Request body chính xác
```json
{
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "itemType": "kanji",
  "itemId": "64f9e0d1bc6d2e0fbfd55f99"
}
```

#### Validation
- `reviewId` bắt buộc
- `itemType` phải là `kanji` hoặc `vocabulary`
- `itemId` phải là ObjectId hợp lệ
- `itemId` phải nằm trong selectedIds của review session

#### Response thành công
```json
{
  "success": true,
  "message": "Review item marked as completed",
  "data": {
    "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
    "itemType": "kanji",
    "itemId": "64f9e0d1bc6d2e0fbfd55f99",
    "completed": true,
    "remaining": 19,
    "selected": 20,
    "reviewed": 1
  }
}
```

#### Response lỗi
```json
{
  "success": false,
  "message": "Item is not part of the active review session"
}
```

#### Khi nào Frontend nên gọi
- Sau khi người dùng trả lời đúng hoặc đúng theo flow review hiện tại
- Dùng để cập nhật tiến độ và tiếp tục session

#### Resume / Continue
- Khi tạo session, `reviewId` sẽ được trả trong `meta.reviewId` và `meta.progress`
- Nếu người dùng quay lại hoặc resume, Frontend gọi lại `GET /api/kanji/review-session?reviewId=<id>&...`
- Backend sẽ validate session đang khớp với `curriculum`, `weeks`, `days`, `contentType`, `mode`, `directions`

---

## 4. JSON mẫu cho Curriculum, Flashcard, Quiz, Typing

### 4.1 Curriculum Overview
```json
{
  "success": true,
  "message": "Get curriculum overview successfully",
  "data": [
    {
      "week": 1,
      "days": [
        { "day": 1, "totalEntries": 2, "kanjiCount": 1, "vocabularyCount": 2 },
        { "day": 2, "totalEntries": 0, "kanjiCount": 0, "vocabularyCount": 0 }
      ]
    }
  ]
}
```

### 4.2 Curriculum Entries
```json
{
  "success": true,
  "message": "Get curriculum entries successfully",
  "data": [
    {
      "_id": "64f9e0d1bc6d2e0fbfd55f9a",
      "curriculum": "sou-matome-n3-kanji",
      "week": 1,
      "day": 1,
      "order": 1,
      "kanjiId": {
        "_id": "64f9e0d1bc6d2e0fbfd55f99",
        "kanji": "駐",
        "onyomi": [
          { "reading": "チュウ", "type": "other" }
        ],
        "kunyomi": [],
        "hanViet": ["Trú"],
        "meanings": ["đỗ, dừng (xe)"]
      },
      "vocabularyIds": [
        {
          "_id": "64f9e0d1bc6d2e0fbfd55f9b",
          "word": "駐車場",
          "hiragana": "ちゅうしゃじょう",
          "hanViet": "Trú Xa Trường",
          "meaning": "bãi đỗ xe",
          "kanjiIds": ["64f9e0d1bc6d2e0fbfd55f99"]
        }
      ]
    }
  ]
}
```

### 4.3 Flashcard Example
```json
{
  "success": true,
  "message": "Get flashcard review session successfully",
  "data": {
    "mode": "flashcard",
    "total": 2,
    "cards": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "itemId": "64f9e0d1bc6d2e0fbfd55f99",
        "direction": "kanji",
        "front": "駐",
        "back": {
          "kanji": "駐",
          "hanViet": "Trú",
          "onyomi": ["チュウ"],
          "kunyomi": [],
          "meaning": "đỗ, dừng (xe)"
        }
      },
      {
        "id": "vocabulary-64f9e0d1bc6d2e0fbfd55f9b-kanji",
        "itemType": "vocabulary",
        "itemId": "64f9e0d1bc6d2e0fbfd55f9b",
        "direction": "kanji",
        "front": "駐車場",
        "back": {
          "word": "駐車場",
          "hanViet": "Trú Xa Trường",
          "hiragana": "ちゅうしゃじょう",
          "meaning": "bãi đỗ xe"
        }
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 2,
    "reviewedVocabs": 0,
    "total": 2,
    "remaining": 2,
    "completed": false
  }
}
```

### 4.4 Quiz Example
```json
{
  "success": true,
  "message": "Get quiz review session successfully",
  "data": {
    "mode": "quiz",
    "total": 2,
    "questions": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "direction": "kanji",
        "question": "駐",
        "correct": "駐",
        "acceptedAnswers": ["駐"],
        "choices": ["駐", "車", "場", "満"]
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 2,
    "reviewedVocabs": 0,
    "total": 2,
    "remaining": 2,
    "completed": false
  }
}
```

### 4.5 Typing Example
```json
{
  "success": true,
  "message": "Get typing review session successfully",
  "data": {
    "mode": "typing",
    "total": 2,
    "questions": [
      {
        "id": "kanji-64f9e0d1bc6d2e0fbfd55f99-kanji",
        "itemType": "kanji",
        "direction": "kanji",
        "question": "駐",
        "correct": "駐",
        "acceptedAnswers": ["駐"]
      }
    ]
  },
  "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
  "progress": {
    "selectedVocabs": 2,
    "reviewedVocabs": 0,
    "total": 2,
    "remaining": 2,
    "completed": false
  }
}
```

### 4.6 Complete Review Example
```json
{
  "success": true,
  "message": "Review item marked as completed",
  "data": {
    "reviewId": "64f9e0d1bc6d2e0fbfd55f98",
    "itemType": "kanji",
    "itemId": "64f9e0d1bc6d2e0fbfd55f99",
    "completed": true,
    "remaining": 19,
    "selected": 20,
    "reviewed": 1
  }
}
```

---

## 5. Bộ lọc được hỗ trợ

Backend hiện tại hỗ trợ các filter sau:

### 5.1 Curriculum filters
- `curriculum`: constrained to `sou-matome-n3-kanji`
- `weeks`: CSV int, 1..6
- `days`: CSV int, 1..7
- `contentType`: `kanji | vocabulary | both`
- `mode`: `flashcard | quiz | typing`
- `directions`: CSV string/array
- `limit`: numeric, default `20`
- `reviewId`: string ObjectId khi resume

### 5.2 Kanji filters
- `search`
- `jlpt`
- `radicalId`
- `status`
- `page`
- `limit`

### 5.3 KanjiVocabulary filters
- `search`
- `jlpt`
- `wordType`
- `partOfSpeech`
- `topic`
- `kanjiId`
- `status`
- `page`
- `limit`

### 5.4 Giới hạn và cách kết hợp
- `weeks` và `days` được parse bằng `parseCsvNumberList`, chấp nhận chuỗi CSV như `1,2,3`.
- `mode` không có default tùy theo `contentType`; default là `flashcard`.
- `directions` nếu rỗng sẽ fallback theo `contentType`:
  - `vocabulary` => `['kanji']`
  - `kanji` => `['kanji']`
  - `both` => `['kanji', 'kanji']` (sẽ vẫn normalize về đầu vào hợp lệ, tối đa là "kanji")
- `week=1`, `day=2,3,4` hiện không có API riêng để query multiple day trên `GET /api/kanji-curriculum/entries`; nó chỉ hỗ trợ 1 `week` + 1 `day` cho endpoint curriculum entries. Đối với review session, `days` cho phép CSV nhiều giá trị, nên `days=2,3,4` là hợp lệ ở API review.

---

## 6. Hướng dẫn tích hợp Frontend hiện tại

### 6.1 Tái sử dụng Review flow hiện có
Frontend hiện đã có hệ thống N5/N4 review (Flashcard/Quiz/Typing/ReviewConfig/ReviewSummary/ReviewHistory/Timer). Với N3 Kanji, backend đã chuẩn hóa theo cấu trúc review chung, nên có thể tái sử dụng:

- `GET /api/kanji/review-session` để lấy dữ liệu session
- `POST /api/kanji/review-session/complete` để cập nhật progress
- `reviewId` để resume / continue
- `meta.progress` để hiển thị tiến độ

### 6.2 Phân biệt `itemType`
- `itemType = "kanji"`:
  - `front` là ký tự Kanji, ví dụ `駐`
  - `back` chứa `kanji`, `hanViet`, `onyomi`, `kunyomi`, `meaning`
- `itemType = "vocabulary"`:
  - `front` là từ vựng, ví dụ `駐車場`
  - `back` chứa `word`, `hanViet`, `hiragana`, `meaning`

### 6.3 Không làm ảnh hưởng N5/N4
- Không thay đổi endpoint N5/N4 hiện có
- Không sửa `ReviewSession` logic của các module cũ
- N3 nên dùng flow review riêng với `curriculum = "sou-matome-n3-kanji"`
- Chỉ lưu localStorage cho N3 trong scope riêng nếu cần, tránh trùng với N5/N4

### 6.4 Reuse / không reuse
Có thể reuse:
- UI Flashcard wrapper
- UI Quiz wrapper
- UI Typing wrapper
- Review summary/card logic
- Timer / progress component

Không nên reuse nguyên vẹn nếu:
- Bản chất đáp án hoặc front/back khác nhau giữa N5/N4 và N3
- `kanji`/`vocabulary` cần xử lý riêng với distinct directions

### 6.5 Khuyến nghị frontend
- Tách namespace config:
  - N5/N4: config cũ
  - N3: config mới / riêng
- Không coi `curriculum` đang hiện tại là `review session` hiện tại; backend lưu cả `selectedIds`, `completedIds`, `remainingIds` trong `KanjiReviewHistory`
- Khi resume, truyền `reviewId` để backend xác thực scope đang khớp

---

## 7. Các vấn đề / giới hạn Backend hiện tại

1. Không có route `GET /api/kanji-curriculum?curriculum=...` để query theo curriculum cụ thể; overview hiện chỉ return ma trận tuần/ngày cho curriculum cố định.
2. `getCurriculumOverview()` không trả `title` hoặc metadata văn bản khác ngoài counts.
3. `GET /api/kanji-curriculum/entries` chỉ hỗ trợ 1 `week` và 1 `day` mỗi request. Không có endpoint `?week=1&days=2,3,4` ở curriculum entries.
4. `GET /api/kanji/review-session` validate `curriculum` rất chặt và chỉ cho phép `sou-matome-n3-kanji`.
5. `direction` trong service không đồng nhất hoàn toàn với tên frontend N5/N4 cũ; backend có tập hợp `VALID_DIRECTIONS` khá rộng nhưng logic render chính đang ưu tiên `kanji` cho item kanji/vocabulary nếu `requestedDirections` chứa `kanji`.
6. Các response "thật" cuối cùng phụ thuộc vào môi trường MongoDB và collection data hiện có. Đây là contract từ code, không phải dữ liệu runtime đã chạy trong session này.
7. `createReviewSession` sẽ sử dụng `selectedItems.slice(0, Number(scope.limit || 20))` sau khi resolve; nên `limit` áp dụng theo selected scope, không phải theo tổng corpus.
8. `completeReviewSession` chỉ đánh dấu item hoàn thành, không thực hiện logic reset/next round trên frontend; frontend cần xử lý UI tương ứng.

---

## 8. Tóm tắt API cho Frontend

### N3 Kanji curriculum
- `GET /api/kanji-curriculum` -> overview tuần/ngày
- `GET /api/kanji-curriculum/entries?week=1&day=1` -> entry detail per day
- `GET /api/kanji-curriculum/entries/:id` -> chi tiết entry
- `POST /api/kanji-curriculum/import` -> admin import, cần `x-admin-key`

### N3 Kanji data
- `GET /api/kanji` -> danh sách Kanji
- `GET /api/kanji/:id` -> chi tiết Kanji
- `GET /api/kanji-vocabulary` -> từ vựng query/filter
- `GET /api/kanji-vocabulary/:id` -> chi tiết vocabulary

### N3 Review
- `GET /api/kanji/review-session?weeks=1&days=1&contentType=both&mode=flashcard&directions=kanji&limit=20`
- `POST /api/kanji/review-session/complete`

### Đề xuất frontend khi tích hợp
- Tạo một tầng wrapper riêng cho N3 review vào Frontend hiện tại
- Tái sử dụng component Flashcard / Quiz / Typing nhưng parse dữ liệu theo `itemType`
- Không hack response backend để phù hợp N5/N4 cũ; nên xử lý riêng theo itemType
- Resume / continue phải dựa trên `reviewId`

---

## 9. Kết luận ngắn gọn

Backend N3 Kanji hiện đã có các API chính để hỗ trợ:
- import curriculum
- truy xuất entry/week-day
- quản lý Kanji và KanjiVocabulary
- khởi tạo session ôn tập / review history
- duy trì progress ở server qua `KanjiReviewHistory`

Tuy nhiên, contract vẫn đang là contract backend code, chưa phải evidence runtime live. Với môi trường chưa chạy hoặc không có MongoDB, mọi JSON trên đây cần được xem như ví dụ schema-driven, dùng để frontend chuẩn bị giao diện và hợp đồng API, nhưng cần kiểm tra lại khi app backend đang chạy thật.

Đường dẫn file tài liệu:
- `docs/N3_KANJI_API_HANDOFF.md`
