import { getJP, normalize, normalizeKey } from './review.helpers.js';
import { getQuizAnswer, similarityScore, toChars, commonCharacters, commonPrefix, commonSuffix } from './quiz.helpers.js';

const isNumeric = text => /^[\d\s.,+\-]+$/u.test(normalize(text));
const isKana = text => /^[\u3041-\u3096\u30a1-\u30faー]+$/u.test(normalize(text));
const canonicalMeaning = text => normalizeKey(text).replace(/[~～;,，、。.!?\s]+/g, ' ').trim();
const meaningParts = text => canonicalMeaning(text).split(' ').filter(Boolean);
const equivalentMeaning = (a,b) => {
  const x = canonicalMeaning(a), y = canonicalMeaning(b);
  if (!x || !y) return false;
  if (x === y) return true;
  // Avoid treating multi-definition fields as independent distractors.
  const split = s => normalizeKey(s).split(/[,;、，\/]|\s+[~～]\s+/u).map(x=>x.trim()).filter(x=>x.length>=3);
  const ax = split(a), by = split(b);
  return ax.some(v=>by.includes(v));
};
export const isAmbiguousAnswer = (correct,candidate,direction) => {
  const a = getQuizAnswer(correct,direction), b = getQuizAnswer(candidate,direction);
  if (normalizeKey(a) === normalizeKey(b)) return true;
  if (direction === 'jp_vi') return getJP(correct) === getJP(candidate) || equivalentMeaning(correct.meaning,candidate.meaning);
  if (direction === 'vi_jp') return equivalentMeaning(correct.meaning,candidate.meaning);
  if (direction === 'kanji') return normalize(correct.kanji) === normalize(candidate.kanji);
  if (direction === 'jp_kanji') return getJP(correct) === getJP(candidate);
  return false;
};
const compatible = (correct,candidate,direction) => {
  const a = getQuizAnswer(correct,direction), b = getQuizAnswer(candidate,direction);
  if (!a || !b || isNumeric(a)!==isNumeric(b)) return false;
  if (direction !== 'jp_vi' && isKana(a)!==isKana(b)) return false;
  return true;
};
const quickScore = (correct,candidate,direction) => {
  const a=getQuizAnswer(correct,direction), b=getQuizAnswer(candidate,direction);
  const diff=Math.abs(toChars(a).length-toChars(b).length);
  let score = diff===0?45:diff===1?18:diff===2?5:0;
  score += commonCharacters(a,b)*9 + commonPrefix(a,b)*7 + commonSuffix(a,b)*15;
  if(correct.partOfSpeech && correct.partOfSpeech===candidate.partOfSpeech)score+=30;
  if(correct.topic && correct.topic===candidate.topic)score+=12;
  if(correct.n3Topic && correct.n3Topic===candidate.n3Topic)score+=8;
  if(direction==='jp_vi' && correct.partOfSpeech && candidate.partOfSpeech!==correct.partOfSpeech)score-=35;
  return score;
};
export const scoreDistractor = (correct,candidate,direction) => {
  if(!compatible(correct,candidate,direction)||isAmbiguousAnswer(correct,candidate,direction))return -Infinity;
  const a=getQuizAnswer(correct,direction),b=getQuizAnswer(candidate,direction);
  let score=similarityScore(a,b)+quickScore(correct,candidate,direction);
  if(direction!=='jp_vi'){
    const diff=Math.abs(toChars(a).length-toChars(b).length);
    if(diff===0)score+=65;
    else if(diff>1)score-=35*diff;
    if(toChars(a).at(-1)===toChars(b).at(-1))score+=65;
    if(commonSuffix(a,b)>=2)score+=35;
    if(a.endsWith('ます') && b.endsWith('ます'))score+=10;
  }
  return score;
};
export const selectDistractorRecords = (correct,pool,direction,count=3) => {
  const list=[];
  for(const candidate of pool){
    if(String(candidate._id)===String(correct._id))continue;
    if(!compatible(correct,candidate,direction)||isAmbiguousAnswer(correct,candidate,direction))continue;
    list.push({candidate,quick:quickScore(correct,candidate,direction)});
  }
  list.sort((a,b)=>b.quick-a.quick);
  const ranked=list.slice(0,Math.max(200,count*30)).map(({candidate})=>({
    vocabId:String(candidate._id),answer:getQuizAnswer(candidate,direction),source:'database',
    score:scoreDistractor(correct,candidate,direction)
  })).filter(x=>Number.isFinite(x.score)).sort((a,b)=>b.score-a.score);
  const unique=new Map();
  for(const record of ranked){const key=normalizeKey(record.answer);if(!unique.has(key))unique.set(key,record);}
  return [...unique.values()].slice(0,count);
};
export const selectDistractors=(correct,pool,direction,count=3)=>selectDistractorRecords(correct,pool,direction,count).map(x=>x.answer);
