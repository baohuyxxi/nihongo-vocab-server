import test from "node:test";
import assert from "node:assert/strict";

import {
  parseReviewScope,
  normalizeTypingAnswer,
  buildFlashcardItems,
  buildQuizQuestions,
  buildTypingQuestions,
} from "../src/services/kanjiReview.service.js";
import {
  normalizeCurriculumImportPayload,
  ensureAdminAccess,
} from "../src/services/kanjiCurriculum.service.js";
import {
  extractKanjiFromWord,
  mergeKanjiReadings,
} from "../src/services/kanjiSync.service.js";

test("parseReviewScope rejects incomplete scope", () => {
  assert.throws(
    () => parseReviewScope({ curriculum: "sou-matome-n3-kanji" }),
    /weeks/i
  );
});

test("normalizeTypingAnswer strips okurigana separators and katakana variants", () => {
  assert.equal(normalizeTypingAnswer("よ.む"), "よむ");
  assert.equal(normalizeTypingAnswer("ヨム"), "よむ");
  assert.equal(normalizeTypingAnswer("  よむ  "), "よむ");
});

test("buildFlashcardItems generates a single kanji info card in ordered back fields", () => {
  const items = [
    {
      itemType: "kanji",
      itemId: "64f0e3d8c6be5f3f4b7d9a01",
      kanji: "読",
      meanings: ["đọc"],
      onyomi: [{ reading: "ドク" }, { reading: "トク" }],
      kunyomi: [{ reading: "よむ" }],
      hanViet: ["độc"],
    },
  ];

  const cards = buildFlashcardItems(items, ["kanji"]);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].direction, "kanji");
  assert.deepEqual(cards[0].back, {
    kanji: "読",
    hanViet: "độc",
    onyomi: ["ドク", "トク"],
    kunyomi: ["よむ"],
    meaning: "đọc",
  });
});

test("buildFlashcardItems generates vocab info card without onyomi or kunyomi", () => {
  const items = [
    {
      itemType: "vocabulary",
      itemId: "64f0e3d8c6be5f3f4b7d9a10",
      word: "駐車場",
      hiragana: "ちゅうしゃじょう",
      meaning: "bãi đỗ xe",
      hanViet: "Trú xa trường",
    },
  ];

  const cards = buildFlashcardItems(items, ["kanji"]);

  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].back, {
    word: "駐車場",
    hanViet: "Trú xa trường",
    hiragana: "ちゅうしゃじょう",
    meaning: "bãi đỗ xe",
  });
});

test("buildQuizQuestions produces valid choices", () => {
  const items = [
    {
      itemType: "kanji",
      itemId: "64f0e3d8c6be5f3f4b7d9a02",
      kanji: "読",
      meanings: ["đọc"],
      onyomi: [{ reading: "ドク" }, { reading: "トク" }],
      kunyomi: [{ reading: "よむ" }],
      hanViet: ["độc"],
    },
    {
      itemType: "kanji",
      itemId: "64f0e3d8c6be5f3f4b7d9a03",
      kanji: "学",
      meanings: ["học"],
      onyomi: [{ reading: "ガク" }],
      kunyomi: [{ reading: "まな.ぶ" }],
      hanViet: ["học"],
    },
    {
      itemType: "kanji",
      itemId: "64f0e3d8c6be5f3f4b7d9a05",
      kanji: "校",
      meanings: ["trường"],
      onyomi: [{ reading: "コウ" }],
      kunyomi: [{ reading: "みせ" }],
      hanViet: ["hiệu"],
    },
  ];

  const questions = buildQuizQuestions(items, ["onyomi"]);

  assert.ok(questions.length >= 1);
  assert.ok(questions.every((question) => question.choices.length >= 4));
});

test("buildTypingQuestions normalizes valid answers", () => {
  const items = [
    {
      itemType: "kanji",
      itemId: "64f0e3d8c6be5f3f4b7d9a04",
      kanji: "読",
      meanings: ["đọc"],
      onyomi: [{ reading: "ドク" }],
      kunyomi: [{ reading: "よむ" }],
      hanViet: ["độc"],
    },
  ];

  const questions = buildTypingQuestions(items, ["kunyomi"]);

  assert.equal(questions[0].correct, "よむ");
  assert.deepEqual(questions[0].acceptedAnswers, ["よむ"]);
});

test("normalizeCurriculumImportPayload accepts PDF-style curriculum entries", () => {
  const payload = {
    curriculum: "sou-matome-n3-kanji",
    entries: [
      {
        week: 1,
        day: 1,
        order: 1,
        kanji: "駐",
        onyomi: ["チュウ"],
        kunyomi: [],
        hanViet: "Trú",
        meanings: ["đỗ, dừng (xe)"],
        vocabulary: [
          {
            word: "駐車",
            hiragana: "ちゅうしゃ",
            meaning: "đỗ xe",
          },
        ],
      },
    ],
  };

  const result = normalizeCurriculumImportPayload(payload);

  assert.equal(result.length, 1);
  assert.equal(result[0].kanji, "駐");
  assert.equal(result[0].curriculum, "sou-matome-n3-kanji");
  assert.equal(result[0].vocabulary.length, 1);
  assert.equal(result[0].vocabulary[0].word, "駐車");
});

test("ensureAdminAccess accepts the configured admin key only", () => {
  process.env.ADMIN_API_KEY = "test-admin-key";
  assert.doesNotThrow(() => ensureAdminAccess({ headers: { "x-admin-key": "test-admin-key" } }));
  assert.throws(
    () => ensureAdminAccess({ headers: { "x-admin-key": "wrong-key" } }),
    /Forbidden: invalid admin key/i
  );
  delete process.env.ADMIN_API_KEY;
});

test("extractKanjiFromWord identifies kanji in compound words without guessing readings", () => {
  const characters = extractKanjiFromWord("駐車場");

  assert.deepEqual(characters, ["駐", "車", "場"]);

  const merged = mergeKanjiReadings(
    [{ reading: "チュウ", type: "onyomi" }],
    [{ reading: "チュウ", type: "onyomi" }, { reading: "ちゅうしゃ", type: "other" }]
  );

  assert.deepEqual(merged.map((entry) => entry.reading), ["チュウ", "ちゅうしゃ"]);
});
