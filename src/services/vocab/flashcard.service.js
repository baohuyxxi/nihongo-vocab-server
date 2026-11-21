import { shuffle } from "../../utils/shuffle.js";
import { getJP, getJPDisplay, containsKanji, hasImage } from "./review.helpers.js";

export const buildFlashcards = (vocabs, directions) => {
    const cards = [];
    vocabs.forEach((v) => {
        directions.forEach((dir) => {
            const jp = getJP(v);
            if (dir === "jp_vi" && jp) {
                const display = getJPDisplay(v);
                const hasKanji = containsKanji(display);
                cards.push({
                    id: v._id,
                    front: display,
                    back: v.meaning,
                    direction: dir,
                    kanji: hasKanji ? display : null,
                    hiragana: jp,
                    hanViet: hasKanji ? v.hanViet || null : null,
                });
            }
            if (dir === "vi_jp" && jp) {
                cards.push({
                    id: v._id,
                    front: v.meaning,
                    back: jp,
                    direction: dir,
                });
            }
            if (dir === "kanji" && v.kanji && jp) {
                cards.push({
                    id: v._id,
                    front: v.kanji,
                    back: {
                        jp,
                        meaning: v.meaning,
                        hanViet: v.hanViet || null,
                    },
                    direction: dir,
                });
            }
            if (dir === "jp_kanji" && v.kanji && jp) {
                cards.push({
                    id: v._id,
                    front: jp,
                    back: {
                        jp: v.kanji,
                        meaning: v.meaning,
                        hanViet: v.hanViet || null,
                    },
                    direction: dir,
                });
            }
            if (dir === "image" && hasImage(v)) {
                cards.push({
                    id: v._id,
                    front: {
                        type: "image",
                        value: v.image,
                    },
                    back: {
                        jp,
                        meaning: v.meaning,
                        kanji: v.kanji || null,
                        hiragana: v.hiragana || null,
                    },
                    direction: dir,
                });
            }
        });
    });
    return {
        mode: "flashcard",
        total: cards.length,
        cards: shuffle(cards),
    };
};
