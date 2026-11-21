import Vocabulary from "../../models/Vocabulary.js";

export const getAllVerbs = async () => {
    return Vocabulary.find({
        hiragana: { $regex: "ます$" },
    }).sort({
        lesson: 1,
        hiragana: 1,
    });
};

export const getVocabByPartOfSpeech = async (pos) => {
    return Vocabulary.find({ partOfSpeech: pos });
};

export const countVocabByPartOfSpeech = async (pos) => {
    return Vocabulary.countDocuments({
        partOfSpeech: pos,
    });
};

export const getTest = async () => {
    const validPartOfSpeech = [
        "noun",
        "verb_g_1",
        "verb_g_2",
        "verb_g_3",
        "adj_i",
        "adj_na",
        "adverb",
        "conjunction",
        "pronoun",
        "interjection",
        "expression",
        "counter",
        "prefix",
        "suffix",
    ];
    return Vocabulary.aggregate([
        {
            $match: {
                partOfSpeech: {
                    $nin: validPartOfSpeech,
                },
            },
        },
        {
            $project: {
                _id: 1,
                kanji: 1,
                meaning: 1,
                partOfSpeech: 1,
                hiragana: {
                    $cond: {
                        if: {
                            $eq: ["$defaultScript", "katakana"],
                        },
                        then: "$katakana",
                        else: "$hiragana",
                    },
                },
            },
        },
        {
            $sort: {
                lesson: 1,
                _id: 1,
            },
        },
        { $limit: 50 },
    ]);
};

export const getVocabWithoutImage = async () => {
    const filter = {
        partOfSpeech: "noun",
        $or: [
            { image: { $exists: false } },
            { image: null },
            { image: "" },
        ],
    };
    const [result] = await Vocabulary.aggregate([
        { $match: filter },
        { $sample: { size: 1 } },
    ]);
    const remaining =
        await Vocabulary.countDocuments(filter);
    return {
        result: result || null,
        remaining,
    };
};
