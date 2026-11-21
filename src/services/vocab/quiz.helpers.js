import { getJP, getJPDisplay, hasImage, normalize, normalizeKey } from "./review.helpers.js";

export const getQuizAnswer = (v, direction) => {
    switch (direction) {
        case "jp_vi":
            return normalize(v.meaning);
        case "vi_jp":
        case "kanji":
        case "image":
            return getJP(v);
        case "jp_kanji":
            return normalize(v.kanji);
        default:
            return "";
    }
};

export const getQuizQuestion = (v, direction) => {
    switch (direction) {
        case "jp_vi":
            return getJPDisplay(v);
        case "vi_jp":
            return normalize(v.meaning);
        case "kanji":
            return normalize(v.kanji);
        case "jp_kanji":
            return getJP(v);
        case "image":
            return hasImage(v)
                ? { type: "image", value: v.image }
                : null;
        default:
            return null;
    }
};

export const toChars = (value) =>
    Array.from(normalize(value));

export const commonPrefix = (a, b) => {
    const x = toChars(a);
    const y = toChars(b);
    let count = 0;
    while (
        count < x.length &&
        count < y.length &&
        x[count] === y[count]
    ) {
        count++;
    }
    return count;
};

export const commonSuffix = (a, b) => {
    const x = toChars(a).reverse().join("");
    const y = toChars(b).reverse().join("");
    return commonPrefix(x, y);
};

export const commonCharacters = (a, b) => {
    const counts = new Map();
    for (const char of toChars(b)) {
        counts.set(
            char,
            (counts.get(char) || 0) + 1
        );
    }
    let total = 0;
    for (const char of toChars(a)) {
        const count = counts.get(char) || 0;
        if (count > 0) {
            total++;
            counts.set(char, count - 1);
        }
    }
    return total;
};

export const editDistance = (a, b) => {
    const x = toChars(a);
    const y = toChars(b);
    let previous = Array.from(
        { length: y.length + 1 },
        (_, index) => index
    );
    for (let i = 1; i <= x.length; i++) {
        const current = [i];
        for (let j = 1; j <= y.length; j++) {
            const cost =
                x[i - 1] === y[j - 1] ? 0 : 1;
            current[j] = Math.min(
                current[j - 1] + 1,
                previous[j] + 1,
                previous[j - 1] + cost
            );
        }
        previous = current;
    }
    return previous[y.length];
};

export const similarityScore = (a, b) => {
    const x = normalize(a);
    const y = normalize(b);
    if (!x || !y || x === y) {
        return -Infinity;
    }
    const lenA = toChars(x).length;
    const lenB = toChars(y).length;
    const lengthDifference = Math.abs(
        lenA - lenB
    );
    const maxLength = Math.max(lenA, lenB);
    const similarity =
        1 - editDistance(x, y) / maxLength;
    let score = similarity * 100;
    if (lengthDifference === 0) {
        score += 50;
    } else if (lengthDifference === 1) {
        score += 20;
    } else if (lengthDifference === 2) {
        score += 5;
    }
    score += commonCharacters(x, y) * 12;
    score += commonPrefix(x, y) * 10;
    score += commonSuffix(x, y) * 8;
    return score;
};
