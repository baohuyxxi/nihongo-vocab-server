import Vocabulary from "../../models/Vocabulary.js";

export const getAllVocab = async () => {
    return Vocabulary.find().sort({
        lesson: 1,
        unit: 1,
        n3Order: 1,
        _id: 1,
    });
};

export const getVocabByLesson = async (lesson) => {
    return Vocabulary.find({ lesson });
};

export const getVocabByLessons = async (lessons) => {
    return Vocabulary.find({
        lesson: { $in: lessons },
    }).sort({ lesson: 1 });
};

export const getVocabByUnit = async (
    unit,
    n3Topic = ""
) => {
    const filter = { unit };
    if (n3Topic) {
        filter.n3Topic = n3Topic;
    }
    return Vocabulary.find(filter).sort({
        n3Order: 1,
        _id: 1,
    });
};

export const getVocabByTopic = async (topics) => {
    return Vocabulary.find({
        topic: { $in: topics },
    }).sort({ lesson: 1 });
};
