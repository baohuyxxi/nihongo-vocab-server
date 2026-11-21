import Vocabulary from "../../models/Vocabulary.js";

export const createVocab = async (data) => {
    return Vocabulary.create(data);
};

export const updateVocab = async (id, data) => {
    return Vocabulary.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true,
    });
};

export const deleteVocab = async (id) => {
    return Vocabulary.findByIdAndDelete(id);
};

export const createManyVocab = async (vocabs) => {
    return Vocabulary.insertMany(vocabs);
};

export const bulkUpdateVocab = async (vocabs) => {
    if (!Array.isArray(vocabs)) {
        throw new Error("Dữ liệu phải là mảng từ vựng");
    }
    const allowedFields = [
        "lesson",
        "topic",
        "unit",
        "n3Topic",
        "n3Order",
        "kanji",
        "hiragana",
        "katakana",
        "defaultScript",
        "romaji",
        "meaning",
        "hanViet",
        "partOfSpeech",
        "example",
        "audio",
        "phoneticVi",
        "english",
        "image",
        "video",
    ];
    const ops = vocabs.map((v) => {
        if (!v._id) {
            throw new Error("Thiếu _id của từ vựng");
        }
        const update = {};
        for (const field of allowedFields) {
            if (
                Object.prototype.hasOwnProperty.call(v, field)
            ) {
                update[field] = v[field];
            }
        }
        return {
            updateOne: {
                filter: { _id: v._id },
                update: { $set: update },
            },
        };
    });
    if (!ops.length) return null;
    return Vocabulary.bulkWrite(ops);
};
