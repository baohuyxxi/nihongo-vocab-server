import { getQuizAnswer } from './quiz.helpers.js';
import { normalizeKey } from './review.helpers.js';

// Kana-only typo decoys. Never generate Vietnamese meanings or Kanji.
const HIRA = Array.from('あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん');
const KATA = Array.from('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン');
const isKana = s => /^[\u3041-\u3096\u30a1-\u30faー]+$/u.test(s);
const small = /[ゃゅょャュョぁぃぅぇぉァィゥェォっッ]/u;
const sameScript = (a,b) => /[\u30a0-\u30ff]/u.test(a) === /[\u30a0-\u30ff]/u.test(b);
export const generateKanaDistractors = (correct, direction, forbidden = [], count = 10) => {
  if (!['vi_jp','kanji','image'].includes(direction)) return [];
  const answer = getQuizAnswer(correct, direction);
  if (!isKana(answer)) return [];
  const chars = Array.from(answer);
  if (chars.length < 3) return [];
  const alphabet = /[\u30a0-\u30ff]/u.test(answer) ? KATA : HIRA;
  const seen = new Set([normalizeKey(answer), ...forbidden.map(normalizeKey)]);
  const output = [];
  // Preserve final kana; for masu-form verbs preserve ます and change stem only.
  const suffix = answer.endsWith('ます') ? 2 : 1;
  for (let pos = chars.length - suffix - 1; pos >= 0; pos--) {
    if (small.test(chars[pos]) || chars[pos] === 'ー') continue;
    for (let offset = 1; offset < alphabet.length; offset++) {
      const oldIndex = alphabet.indexOf(chars[pos]);
      if (oldIndex < 0) continue;
      const replacement = alphabet[(oldIndex + offset) % alphabet.length];
      if (!sameScript(chars[pos], replacement) || replacement === chars[pos]) continue;
      const result = [...chars]; result[pos] = replacement;
      const word = result.join('');
      const key = normalizeKey(word);
      if (seen.has(key)) continue;
      seen.add(key);
      output.push({ answer: word, source: 'generated', score: 0 });
      if (output.length >= count) return output;
    }
  }
  return output;
};
