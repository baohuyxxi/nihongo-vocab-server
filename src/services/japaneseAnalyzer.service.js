
import kuromoji from "kuromoji";
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";

// ==========================================
// CONFIG
// ==========================================

// Tạm thời vô hiệu hóa Kuromoji
const KUROMOJI_ENABLED = false;

// ==========================================
// PATH
// ==========================================

const require = createRequire(import.meta.url);

const kuromojiEntry = require.resolve("kuromoji");

const kuromojiSourceDir = path.dirname(kuromojiEntry);

const kuromojiRoot = path.resolve(
  kuromojiSourceDir,
  ".."
);

const DICT_PATH = path.join(
  kuromojiRoot,
  "dict"
);

const dictionaryFile = path.join(
  DICT_PATH,
  "base.dat.gz"
);

// Chỉ kiểm tra từ điển khi bật Kuromoji
if (KUROMOJI_ENABLED) {
  console.log("Kuromoji entry:", kuromojiEntry);
  console.log("Kuromoji package:", kuromojiRoot);
  console.log("Kuromoji dictionary:", DICT_PATH);

  if (!fs.existsSync(dictionaryFile)) {
    console.warn(
      "Kuromoji dictionary not found:",
      dictionaryFile
    );
  }
}

// ==========================================
// TOKENIZER
// ==========================================

let tokenizerInstance = null;
let tokenizerPromise = null;

const getTokenizer = async () => {
  if (!KUROMOJI_ENABLED) {
    throw new Error(
      "Kuromoji is temporarily disabled"
    );
  }

  if (!fs.existsSync(dictionaryFile)) {
    throw new Error(
      `Kuromoji dictionary not found: ${dictionaryFile}`
    );
  }

  if (tokenizerInstance) {
    return tokenizerInstance;
  }

  if (tokenizerPromise) {
    return tokenizerPromise;
  }

  tokenizerPromise = new Promise((resolve, reject) => {
    kuromoji.builder({
      dicPath: DICT_PATH,
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
    throw new Error(
      "Word must be a non-empty string"
    );
  }

  const normalizedWord = word.trim();

  if (!normalizedWord) {
    throw new Error(
      "Word must not be empty"
    );
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
