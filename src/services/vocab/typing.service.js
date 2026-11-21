import { shuffle } from "../../utils/shuffle.js";

const cleanTypingText = (value) =>
    String(value ?? "").normalize("NFKC").trim();
// Tách mỗi ký tự Kana thành một ô

const splitKanaCells = (value) =>
    Array.from(
        cleanTypingText(value).replace(/\s+/g, "")
    );
// Lấy cách đọc Kana của từ vựng

const getTypingKana = (vocab) => {
    const value = cleanTypingText(
        vocab.defaultScript === "katakana"
            ? vocab.katakana || vocab.hiragana
            : vocab.hiragana || vocab.katakana
    );
    // Chỉ chấp nhận Hiragana / Katakana
    if (
        !value ||
        !/^[\u3040-\u30ff\u31f0-\u31ffー\s]+$/u.test(value)
    ) {
        return "";
    }
    return value;
};
// Tạo câu hỏi điền từ

export const buildTyping = (vocabs, directions) => {
    const questions = [];
    for (const vocab of vocabs) {
        const answer = getTypingKana(vocab);
        if (!answer) continue;
        const answerCells = splitKanaCells(answer);
        if (!answerCells.length) continue;
        for (const direction of directions) {
            let question = "";
            // Việt → Nhật
            if (direction === "vi_jp") {
                question = cleanTypingText(vocab.meaning);
            }
            // Kanji → Nhật
            if (direction === "kanji") {
                question = cleanTypingText(vocab.kanji);
            }
            if (!question) continue;
            questions.push({
                id: String(vocab._id),
                direction,
                question,
                answer,
                correct: answer,
                // Frontend tạo ô vuông từ mảng này
                answerCells,
                cellCount: answerCells.length,
                meaning: vocab.meaning || "",
                kanji: vocab.kanji || "",
                hiragana: vocab.hiragana || "",
                katakana: vocab.katakana || "",
            });
        }
    }
    return {
        mode: "typing",
        total: questions.length,
        questions: shuffle(questions),
    };
};
