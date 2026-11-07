import Kanji from "../models/Kanji.js";
import { analyzeJapaneseWord } from "./japaneseAnalyzer.service.js";

export const syncKanjiFromWord = async (word, session = null) => {
  const analysis = await analyzeJapaneseWord(word);

  const kanjiIds = [];

  for (const character of analysis.kanji) {
    let query = Kanji.findOne({ kanji: character });

    if (session) {
      query = query.session(session);
    }

    let existingKanji = await query;

    if (!existingKanji) {
      const [createdKanji] = await Kanji.create(
        [{ kanji: character }],
        session ? { session } : {}
      );

      existingKanji = createdKanji;
    }

    kanjiIds.push(existingKanji._id);
  }

  return {
    kanjiIds,
    analysis,
  };
};