import Vocabulary from "../../models/Vocabulary.js";
import { shuffle } from "../../utils/shuffle.js";
import { normalize, getJP } from "./review.helpers.js";
import { getQuizQuestion, getQuizAnswer } from "./quiz.helpers.js";
import { loadQuizCache, getCachedDistractors, buildAndCacheDistractors } from "./quiz.cache.service.js";

export const loadQuizDistractorPool = () => Vocabulary.find({})
  .select("_id kanji hiragana katakana defaultScript romaji meaning partOfSpeech topic n3Topic image").lean().exec();

export const buildQuizChoice = async (vocabs, directions) => {
  const questions = [];
  const context = await loadQuizCache(vocabs, directions);
  let poolPromise;
  const getPool = () => (poolPromise ||= loadQuizDistractorPool());

  for (const v of vocabs) {
    for (const direction of directions) {
      const question = getQuizQuestion(v, direction);
      const correct = getQuizAnswer(v, direction);
      if (!question || !correct) continue;
      if (["kanji", "jp_kanji"].includes(direction) && !normalize(v.kanji)) continue;

      let candidates = getCachedDistractors(v, direction, context);
      if (!candidates) {
        candidates = await buildAndCacheDistractors(v, direction, getPool);
      }
      if (candidates.length < 3) continue;
      const wrongAnswers = shuffle([...candidates].slice(0, 10)).slice(0, 3).map(item => item.answer);
      questions.push({
        id: v._id, direction, question, correct,
        choices: shuffle([correct, ...wrongAnswers]),
        partOfSpeech: v.partOfSpeech, topic: v.topic,
        kanji: v.kanji || null, hiragana: getJP(v),
        meaning: v.meaning, hanViet: v.hanViet || null,
      });
    }
  }
  return { mode: "quiz", total: questions.length, questions: shuffle(questions) };
};
