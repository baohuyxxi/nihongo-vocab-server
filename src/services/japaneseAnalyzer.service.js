
import kuromoji from "kuromoji";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

// ==========================================
// PATH
// ==========================================

const require = createRequire(import.meta.url);

// Đường dẫn thực tế của file kuromoji.js
const kuromojiEntry = require.resolve("kuromoji");

// Thư mục node_modules/kuromoji/src
const kuromojiSourceDir = path.dirname(kuromojiEntry);

// Thư mục node_modules/kuromoji
const kuromojiRoot = path.resolve(kuromojiSourceDir, "..");

// Đường dẫn node_modules/kuromoji/dict
const DICT_PATH = path.join(kuromojiRoot, "dict");

const dictionaryFile = path.join(
  DICT_PATH,
  "base.dat.gz"
);

console.log("Kuromoji entry:", kuromojiEntry);
console.log("Kuromoji package:", kuromojiRoot);
console.log("Kuromoji dictionary:", DICT_PATH);
console.log(
  "Dictionary exists:",
  fs.existsSync(dictionaryFile)
);

if (!fs.existsSync(dictionaryFile)) {
  throw new Error(
    `Kuromoji dictionary not found: ${dictionaryFile}`
  );
}

// ==========================================
// TOKENIZER
// ==========================================

let tokenizerInstance = null;
let tokenizerPromise = null;

const getTokenizer = async () => {
  if (tokenizerInstance) {
    return tokenizerInstance;
  }

  if (tokenizerPromise) {
    return tokenizerPromise;
  }

  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji.builder({
      dictPath: DICT_PATH,
    }).build((error, tokenizer) => {
      if (error) {
        tokenizerPromise = null;
        return reject(error);
      }

      tokenizerInstance = tokenizer;
      resolve(tokenizer);
    });
  });

  return tokenizerPromise;
};

// ==========================================
// CONVERT KATAKANA -> HIRAGANA
// ==========================================

export const toHiragana = (text = "") => {
  return [...text]
    .map((char) => {
      const code = char.charCodeAt(0);

      if (code >= 0x30a1 && code <= 0x30f6) {
        return String.fromCharCode(code - 0x60);
      }

      return char;
    })
    .join("");
};

// ==========================================
// EXTRACT KANJI
// ==========================================

export const extractKanji = (text = "") => {
  return [
    ...new Set(
      [...text].filter((char) =>
        /\p{Script=Han}/u.test(char)
      )
    ),
  ];
};

// ==========================================
// ANALYZE JAPANESE WORD
// ==========================================

export const analyzeJapaneseWord = async (word) => {
  if (!word || typeof word !== "string") {
    throw new Error("Word must be a non-empty string");
  }

  const normalizedWord = word.trim();

  if (!normalizedWord) {
    throw new Error("Word must not be empty");
  }

  const tokenizer = await getTokenizer();

  const tokens = tokenizer.tokenize(normalizedWord);

  const analyzedTokens = tokens.map((token) => {
    const reading =
      token.reading && token.reading !== "*"
        ? toHiragana(token.reading)
        : "";

    const pronunciation =
      token.pronunciation &&
      token.pronunciation !== "*"
        ? toHiragana(token.pronunciation)
        : "";

    return {
      surface: token.surface_form,
      reading,
      pronunciation,
      partOfSpeech: token.pos,
      kanji: extractKanji(token.surface_form),
    };
  });

  return {
    word: normalizedWord,
    kanji: extractKanji(normalizedWord),
    tokens: analyzedTokens,
  };
};
