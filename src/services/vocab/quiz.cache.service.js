import Vocabulary from '../../models/Vocabulary.js';
import QuizDistractorCache from '../../models/QuizDistractorCache.js';
import { getQuizAnswer } from './quiz.helpers.js';
import { isAmbiguousAnswer, selectDistractorRecords } from './quiz.distractors.js';
import { generateKanaDistractors } from './quiz.generated.js';
import { normalizeKey } from './review.helpers.js';
const VERSION=3, MAX=10;
const FIELDS='_id kanji hiragana katakana defaultScript romaji meaning partOfSpeech topic n3Topic image';
const signature=(v,d)=>JSON.stringify([d,v.kanji,v.hiragana,v.katakana,v.defaultScript,v.romaji,v.meaning,v.partOfSpeech,v.topic,v.n3Topic,v.image]);
export const loadQuizCache=async(vocabs,directions)=>{
  const docs=await QuizDistractorCache.find({vocabId:{$in:vocabs.map(v=>v._id)},direction:{$in:directions}}).lean();
  const cache=new Map(docs.map(d=>[`${d.vocabId}:${d.direction}`,d]));
  const ids=[...new Set(docs.flatMap(d=>(d.candidates||[]).filter(c=>c.source==='database'&&c.vocabId).map(c=>String(c.vocabId))))];
  const items=ids.length?await Vocabulary.find({_id:{$in:ids}}).select(FIELDS).lean():[];
  return {cache,candidateMap:new Map(items.map(v=>[String(v._id),v]))};
};
const check=(v,d,records,context)=>{
  const seen=new Set([normalizeKey(getQuizAnswer(v,d))]);
  const valid=[];
  for(const item of records){
    let answer=item.answer;
    if(item.source==='database'){
      const candidate=context.candidateMap.get(String(item.vocabId));
      if(!candidate||String(candidate._id)===String(v._id)||isAmbiguousAnswer(v,candidate,d))continue;
      answer=getQuizAnswer(candidate,d);
      if(answer!==item.answer)continue;
    }else if(item.source==='generated'){
      if(!['vi_jp','kanji','image'].includes(d)||!generateKanaDistractors(v,d,[],100).some(c=>c.answer===answer))continue;
    }else continue;
    const key=normalizeKey(answer);
    if(!key||seen.has(key))continue;
    seen.add(key);valid.push({...item,answer});
  }
  return valid;
};
export const getCachedDistractors=(v,d,context)=>{
  const doc=context.cache.get(`${v._id}:${d}`);
  if(!doc||doc.version!==VERSION||doc.signature!==signature(v,d))return null;
  const valid=check(v,d,doc.candidates||[],context);
  return valid.length>=3?valid:null;
};
export const buildAndCacheDistractors=async(v,d,getPool)=>{
  const pool=await getPool();
  const records=selectDistractorRecords(v,pool,d,MAX);
  const selected=[];
  const used=new Set([normalizeKey(getQuizAnswer(v,d))]);
  // Prefer real words, but require close suffix/length for Kana directions.
  const answer=getQuizAnswer(v,d);
  const suffix=Array.from(answer).at(-1);
  const realGood=records.filter(r=>{
    if(d==='jp_vi'||d==='jp_kanji')return true;
    const a=Array.from(r.answer),b=Array.from(answer);
    return a.at(-1)===suffix && Math.abs(a.length-b.length)<=1;
  });
  for(const r of realGood){const key=normalizeKey(r.answer);if(!used.has(key)){used.add(key);selected.push(r);}}
  if(selected.length<3 && ['vi_jp','kanji','image'].includes(d)){
    const forbidden=pool.map(x=>getQuizAnswer(x,d)).filter(Boolean);
    const generated=generateKanaDistractors(v,d,forbidden,MAX);
    for(const r of generated){const key=normalizeKey(r.answer);if(!used.has(key)){used.add(key);selected.push(r);}if(selected.length>=MAX)break;}
  }
  for(const r of records){if(selected.length>=MAX)break;const key=normalizeKey(r.answer);if(!used.has(key)){used.add(key);selected.push(r);}}
  if(selected.length>=3){
    await QuizDistractorCache.updateOne({vocabId:v._id,direction:d},{$set:{signature:signature(v,d),version:VERSION,candidates:selected.slice(0,MAX)}},{upsert:true,runValidators:true});
  }
  return selected;
};
