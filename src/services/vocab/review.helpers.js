

export const normalize = (value) =>
    String(value ?? "").normalize("NFKC").trim();

export const normalizeKey = (value) =>
    normalize(value).toLocaleLowerCase();

export const parseArray = (value) => {
    if (Array.isArray(value)) {
        return value
            .map((x) => String(x).trim())
            .filter(Boolean);
    }
    if (value === null || value === undefined) {
        return [];
    }
    return String(value)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
};

export const parseNumbers = (value) => [
    ...new Set(
        parseArray(value)
            .map(Number)
            .filter((x) => Number.isInteger(x) && x > 0)
    ),
];

export const parseStrings = (value) => [
    ...new Set(parseArray(value)),
];

export const parseLimit = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }
    const number = Number(value);
    return Number.isInteger(number) && number > 0
        ? number
        : null;
};

export const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getJP = (v) => {
    if (v.defaultScript === "katakana") {
        return normalize(
            v.katakana || v.hiragana || v.romaji
        );
    }
    return normalize(
        v.hiragana || v.katakana || v.romaji
    );
};
// Kiểm tra có ký tự Kanji trong từ.

export const containsKanji = (value) =>
  /[\p{Script=Han}々〆ヶ]/u.test(String(value ?? ""));
// Nhật → Việt: ưu tiên chữ Kanji; nếu không có thì dùng Kana như trước.

export const getJPDisplay = (v) => {
    const kanji = normalize(v.kanji);
    return containsKanji(kanji) ? kanji : getJP(v);
};

export const hasImage = (v) =>
    typeof v.image === "string" &&
    v.image.trim().length > 0;
