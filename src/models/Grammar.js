import mongoose from "mongoose";

/* =======================
 * MODIFIER
 * ======================= */

const modifierSchema = new mongoose.Schema(
    {
        action: {
            type: String,
            enum: ["remove", "add", "replace"],
            required: true,
        },

        from: {
            type: String,
            trim: true,
        },

        to: {
            type: String,
            trim: true,
        },
    },
    { _id: false }
);

/* =======================
 * NODE
 * ======================= */

const grammarNodeSchema = new mongoose.Schema(
    {
        id: {
            type: Number,
            required: true,
        },

        type: {
            type: String,
            enum: [
                "custom",
                "noun",
                "adj_i",
                "adj_na",
                "verb",
                "keyword",
            ],
            required: true,
        },

        label: {
            type: String,
            trim: true,
        },

        verbForm: {
            type: String,
            enum: [
                "dictionary",
                "masu",
                "te",
                "ta",
                "nai",
                "potential",
                "volitional",
                "imperative",
                "prohibitive",
                "ba",
                "tara",
                "passive",
                "causative",
                "causative_passive",
            ],
        },

        hiragana: {
            type: String,
            trim: true,
        },

        kanji: {
            type: String,
            trim: true,
        },

        modifiers: {
            type: [modifierSchema],
            default: [],
        },

        /* =======================
         * POSITION (layout)
         * ======================= */
        position: {
            row: {
                type: Number,
                required: true,
                min: 0,
            },
            col: {
                type: Number,
                required: true,
                min: 0,
            },
        },

        /* =======================
         * EDGE (chỉ node này trỏ đi đâu)
         * ======================= */
        links: {
            type: [Number],
            default: []
        },
    },
    { _id: false }
);

/* =======================
 * EXAMPLE
 * ======================= */

const exampleSchema = new mongoose.Schema(
    {
        jp: { type: String, trim: true },
        hiragana: { type: String, trim: true },
        vi: { type: String, trim: true },
    },
    { _id: false }
);

/* =======================
 * SPECIAL CASE
 * ======================= */

const specialCaseSchema = new mongoose.Schema(
    {
        original: { type: String, trim: true },
        result: { type: String, trim: true },
        note: { type: String, trim: true },
    },
    { _id: false }
);

/* =======================
 * GRAMMAR
 * ======================= */

const grammarSchema = new mongoose.Schema(
    {
        lesson: {
            type: Number,
            required: true,
            min: 1,
        },

        order: {
            type: Number,
            required: true,
            min: 1,
        },

        level: {
            type: String,
            enum: ["N5", "N4", "N3", "N2", "N1"],
        },

        key: {
            type: String,
            required: true,
            trim: true,
        },

        meaning: {
            type: String,
            required: true,
            trim: true,
        },

        explanation: {
            type: String,
            trim: true,
        },

        /* =======================
         * STRUCTURE = LIST NODE
         * ======================= */
        structure: {
            type: [grammarNodeSchema],
            default: [],
        },

        examples: {
            type: [exampleSchema],
            default: [],
        },

        specialCases: {
            type: [specialCaseSchema],
            default: [],
        },

        notes: {
            type: [String],
            default: [],
        },
    },
    {
        timestamps: true,
    }
);

/* =======================
 * INDEX
 * ======================= */

grammarSchema.index({ lesson: 1, order: 1 }, { unique: true });
grammarSchema.index({ key: 1 });
grammarSchema.index({ level: 1 });
grammarSchema.index({ lesson: 1 });

export default mongoose.model("Grammar", grammarSchema);