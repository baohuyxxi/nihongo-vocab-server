import readline from 'node:readline/promises';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../config/db.js';
import KanjiCurriculumEntry from '../models/KanjiCurriculumEntry.js';
import KanjiVocabulary from '../models/KanjiVocabulary.js';
import KanjiReviewHistory from '../models/KanjiReviewHistory.js';
import Kanji from '../models/Kanji.js';

dotenv.config();

const CURRICULUM = 'sou-matome-n3-kanji';
const WEEK = 1;
const DAY = 1;
const EXECUTION_CONFIRMATION = 'DELETE sou-matome-n3-kanji week=1 day=1';

const args = new Set(process.argv.slice(2));
const shouldExecute = args.has('--execute');
const isDryRun = !shouldExecute;

const normalizeId = (value) => {
  if (!value) return null;
  try {
    return String(value);
  } catch {
    return null;
  }
};

const toIdSet = (ids = []) => [...new Set((ids || []).filter(Boolean).map(String))];

const analyzeScope = async () => {
  const targetEntries = await KanjiCurriculumEntry.find({
    curriculum: CURRICULUM,
    week: WEEK,
    day: DAY,
  })
    .sort({ order: 1 })
    .lean();

  const targetEntryIds = targetEntries.map((entry) => String(entry._id));
  const targetKanjiIds = toIdSet(targetEntries.map((entry) => entry.kanjiId));
  const targetVocabularyIds = toIdSet(targetEntries.flatMap((entry) => entry.vocabularyIds || []));

  const allEntries = await KanjiCurriculumEntry.find({ curriculum: CURRICULUM })
    .select('week day order kanjiId vocabularyIds')
    .lean();

  const kanjiRefs = new Map();
  const vocabRefs = new Map();

  for (const entry of allEntries) {
    const entryWeek = Number(entry.week);
    const entryDay = Number(entry.day);

    if (entry.kanjiId) {
      const key = String(entry.kanjiId);
      const refList = kanjiRefs.get(key) || [];
      refList.push({ week: entryWeek, day: entryDay, order: entry.order, entryId: String(entry._id) });
      kanjiRefs.set(key, refList);
    }

    for (const vocabId of entry.vocabularyIds || []) {
      const key = String(vocabId);
      const refList = vocabRefs.get(key) || [];
      refList.push({ week: entryWeek, day: entryDay, order: entry.order, entryId: String(entry._id) });
      vocabRefs.set(key, refList);
    }
  }

  const referencedKanjiOutsideScope = {};
  for (const kanjiId of targetKanjiIds) {
    const refs = kanjiRefs.get(kanjiId) || [];
    referencedKanjiOutsideScope[kanjiId] = refs.filter((ref) => !(ref.week === WEEK && ref.day === DAY));
  }

  const referencedVocabularyOutsideScope = {};
  for (const vocabId of targetVocabularyIds) {
    const refs = vocabRefs.get(vocabId) || [];
    referencedVocabularyOutsideScope[vocabId] = refs.filter((ref) => !(ref.week === WEEK && ref.day === DAY));
  }

  const uniqueVocabIds = [...new Set(targetVocabularyIds)];
  const candidateVocabularyIds = uniqueVocabIds.filter(
    (vocabId) => (referencedVocabularyOutsideScope[vocabId] || []).length === 0
  );

  const candidateManualKanjiIds = targetKanjiIds.filter(
    (kanjiId) => (referencedKanjiOutsideScope[kanjiId] || []).length === 0
  );

  const vocabDocs = candidateVocabularyIds.length
    ? await KanjiVocabulary.find({ _id: { $in: candidateVocabularyIds } })
        .select('_id word hiragana meaning hanViet kanjiIds')
        .lean()
    : [];

  const kanjiDocs = candidateManualKanjiIds.length
    ? await Kanji.find({ _id: { $in: candidateManualKanjiIds } })
        .select('_id kanji onyomi kunyomi hanViet meanings')
        .lean()
    : [];

  const reviewHistoryCandidates = await KanjiReviewHistory.find({
    curriculum: CURRICULUM,
    weeks: WEEK,
    days: DAY,
  }).sort({ createdAt: -1 }).lean();

  const deleteHistoryIds = reviewHistoryCandidates
    .filter((entry) => {
      const weeks = Array.isArray(entry.weeks) ? entry.weeks.map(Number) : [];
      const days = Array.isArray(entry.days) ? entry.days.map(Number) : [];
      return weeks.length === 1 && weeks[0] === WEEK && days.length === 1 && days[0] === DAY;
    })
    .map((entry) => String(entry._id));

  return {
    targetEntries,
    targetEntryIds,
    targetKanjiIds,
    targetVocabularyIds,
    uniqueVocabIds,
    candidateVocabularyIds,
    candidateManualKanjiIds,
    vocabDocs,
    kanjiDocs,
    deleteHistoryIds,
    referencedKanjiOutsideScope,
    referencedVocabularyOutsideScope,
    allEntryCount: allEntries.length,
    historyCandidates: reviewHistoryCandidates,
  };
};

const printSummary = (analysis) => {
  const entriesToDelete = analysis.targetEntries.length;
  const uniqueVocabularyToDelete = analysis.candidateVocabularyIds.length;
  const kanjiManualReviewCount = analysis.candidateManualKanjiIds.length;
  const historyToManage = analysis.deleteHistoryIds.length;

  console.log('\n[Scope]');
  console.log(JSON.stringify({
    curriculum: CURRICULUM,
    week: WEEK,
    day: DAY,
    targetEntries: entriesToDelete,
    targetKanjiIds: analysis.targetKanjiIds,
    targetVocabularyIds: analysis.targetVocabularyIds,
  }, null, 2));

  console.log('\n[Entry references]');
  console.log(JSON.stringify({
    entryIds: analysis.targetEntryIds,
    candidateVocabularyIds: analysis.candidateVocabularyIds,
    candidateManualKanjiIds: analysis.candidateManualKanjiIds,
  }, null, 2));

  console.log('\n[Delete plan]');
  console.log(JSON.stringify({
    KanjiCurriculumEntry: entriesToDelete,
    KanjiVocabulary: uniqueVocabularyToDelete,
    KanjiReviewHistory: historyToManage,
    Kanji: {
      automaticDelete: 0,
      manualReviewRequired: kanjiManualReviewCount,
      manualReviewIds: analysis.candidateManualKanjiIds,
    },
  }, null, 2));

  if (analysis.vocabDocs.length) {
    console.log('\n[Vocabulary docs that match safe delete criteria]');
    console.log(JSON.stringify(
      analysis.vocabDocs.map((doc) => ({
        _id: String(doc._id),
        word: doc.word,
        hiragana: doc.hiragana,
        meaning: doc.meaning,
        hanViet: doc.hanViet,
      })),
      null,
      2
    ));
  }

  if (analysis.kanjiDocs.length) {
    console.log('\n[Kanji docs flagged for manual review before any delete]');
    console.log(JSON.stringify(
      analysis.kanjiDocs.map((doc) => ({
        _id: String(doc._id),
        kanji: doc.kanji,
        onyomi: (doc.onyomi || []).map((item) => item.reading),
        kunyomi: (doc.kunyomi || []).map((item) => item.reading),
      })),
      null,
      2
    ));
  }

  if (analysis.historyCandidates.length) {
    console.log('\n[Review history matches]');
    console.log(JSON.stringify(
      analysis.historyCandidates.map((entry) => ({
        _id: String(entry._id),
        sessionKey: entry.sessionKey,
        status: entry.status,
        weeks: entry.weeks,
        days: entry.days,
      })),
      null,
      2
    ));
  }

  const blockedVocabulary = analysis.uniqueVocabIds.filter(
    (vocabId) => !analysis.candidateVocabularyIds.includes(vocabId)
  );
  const blockedKanji = analysis.targetKanjiIds.filter(
    (kanjiId) => !analysis.candidateManualKanjiIds.includes(kanjiId)
  );

  if (blockedVocabulary.length || blockedKanji.length) {
    console.log('\n[Kept for safety]');
    console.log(JSON.stringify({
      blockedVocabularyIds: blockedVocabulary,
      blockedKanjiIds: blockedKanji,
      reason: 'Referenced elsewhere in curriculum or not proven to be import-only. Kept for safety.',
    }, null, 2));
  }
};

const performExecution = async () => {
  const analysis = await analyzeScope();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('\nThis is a destructive operation scoped to curriculum: sou-matome-n3-kanji, week 1, day 1.');
  console.log('It will delete 8 curriculum entries and candidate vocabulary documents only after confirmation.');
  console.log('It will NOT delete Kanji documents automatically; those are kept for manual review.');
  console.log(`Type exactly: ${EXECUTION_CONFIRMATION}`);

  const answer = (await rl.question('Confirmation> ')).trim();
  rl.close();

  if (answer !== EXECUTION_CONFIRMATION) {
    console.log('Confirmation did not match. Aborted without deleting data.');
    return;
  }

  const deleteEntryResult = await KanjiCurriculumEntry.deleteMany({
    _id: { $in: analysis.targetEntryIds },
  });

  const uniqueDeleteVocabIds = analysis.candidateVocabularyIds;
  const vocabDeleteResult = uniqueDeleteVocabIds.length
    ? await KanjiVocabulary.deleteMany({ _id: { $in: uniqueDeleteVocabIds } })
    : { deletedCount: 0 };

  const historyUpdateResult = analysis.deleteHistoryIds.length
    ? await KanjiReviewHistory.updateMany(
        { _id: { $in: analysis.deleteHistoryIds } },
        { $set: { status: 'expired', expiresAt: new Date() } }
      )
    : { matchedCount: 0, modifiedCount: 0 };

  console.log('\n[Execution result]');
  console.log(JSON.stringify({
    deletedEntries: deleteEntryResult.deletedCount,
    deletedVocabularyDocs: vocabDeleteResult.deletedCount,
    expiredReviewHistory: historyUpdateResult.modifiedCount,
    keptKanjiDocs: analysis.targetKanjiIds.length,
    keptForManualReview: analysis.candidateManualKanjiIds,
  }, null, 2));
};

const main = async () => {
  try {
    await connectDB();

    if (shouldExecute) {
      await performExecution();
    } else {
      const analysis = await analyzeScope();
      printSummary(analysis);
      console.log('\nDry run only. No data was deleted. To execute for real, run:');
      console.log('node src/scripts/cleanupSouMatomeN3Week1Day1.js --execute');
    }
  } catch (error) {
    console.error('Cleanup script failed:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

await main();
