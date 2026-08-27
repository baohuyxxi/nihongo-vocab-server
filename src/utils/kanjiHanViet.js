const KANJI_REGEX =
    /[\u3400-\u4DBF\u4E00-\u9FFF]/u

/**
 * Kiểm tra một ký tự có phải Kanji không
 */
export const isKanji = (char) => {
    return KANJI_REGEX.test(char)
}


/**
 * Lấy danh sách Kanji trong một từ.
 *
 * Ví dụ:
 * "日本" -> ["日", "本"]
 * "日本語" -> ["日", "本", "語"]
 * "２、３日" -> ["日"]
 */
export const extractKanjiChars = (text = "") => {
    return [...text].filter(isKanji)
}


/**
 * Chuẩn hóa Hán Việt để so sánh.
 *
 * "Nhật" -> "nhật"
 * "NHẬT" -> "nhật"
 * "Nhật," -> "nhật"
 */
export const normalizeHanViet = (text = "") => {
    return text
        .normalize("NFC")
        .trim()
        .toLowerCase()
        .replace(
            /^[^\p{L}\p{M}]+|[^\p{L}\p{M}]+$/gu,
            ""
        )
}


/**
 * Tách Hán Việt thành các âm.
 *
 * "Nhật Bản" -> ["Nhật", "Bản"]
 * "Tạc Nhật" -> ["Tạc", "Nhật"]
 * "Đản sinh nhật" -> ["Đản", "sinh", "nhật"]
 */
export const extractHanVietWords = (
    hanViet = ""
) => {
    return hanViet
        .trim()
        .split(/\s+/)
        .map(normalizeHanViet)
        .filter(Boolean)
}


/**
 * Suy ra Hán Việt của từng Kanji
 * dựa trên vị trí.
 *
 * Ví dụ:
 *
 * kanji = "昨日"
 * hanViet = "Tạc Nhật"
 *
 * =>
 *
 * [
 *   { kanji: "昨", hanViet: "Tạc", position: 0 },
 *   { kanji: "日", hanViet: "Nhật", position: 1 }
 * ]
 */
export const mapKanjiToHanViet = ({
    kanji = "",
    hanViet = "",
}) => {

    const kanjiChars =
        extractKanjiChars(kanji)

    const hanVietWords =
        extractHanVietWords(hanViet)


    if (
        !kanjiChars.length ||
        !hanVietWords.length
    ) {
        return []
    }


    /*
     * Chỉ mapping khi số lượng Kanji
     * và số âm Hán Việt bằng nhau.
     *
     * Ví dụ:
     *
     * 日本
     * Nhật Bản
     * => 2 = 2 => OK
     *
     * 昨日
     * Tạc Nhật
     * => 2 = 2 => OK
     *
     * 日本語
     * tiếng Nhật
     * => 3 != 2 => KHÔNG mapping
     */

    if (
        kanjiChars.length !==
        hanVietWords.length
    ) {
        return []
    }


    return kanjiChars.map(
        (char, index) => ({

            kanji:
                char,

            hanViet:
                hanVietWords[index],

            position:
                index,

        })
    )
}

/**
 * Tìm Hán Việt của một Kanji
 * dựa trên toàn bộ vocabulary.
 *
 * Chỉ chấp nhận kết quả khi
 * tỷ lệ cao nhất > 50%.
 */
export const resolveKanjiHanViet = ({
    kanji,
    words = [],
}) => {
    const candidates = new Map()

    let validCount = 0

    for (const word of words) {
        if (!word?.kanji) {
            continue
        }

        if (!word?.hanViet) {
            continue
        }

        const mappings =
            mapKanjiToHanViet({
                kanji: word.kanji,
                hanViet: word.hanViet,
            })

        const mapping =
            mappings.find(
                item =>
                    item.kanji === kanji
            )

        if (!mapping) {
            continue
        }

        const value =
            normalizeHanViet(
                mapping.hanViet
            )

        if (!value) {
            continue
        }

        validCount++

        if (!candidates.has(value)) {
            candidates.set(value, {
                value,
                count: 0,
                original: mapping.hanViet,
            })
        }

        candidates.get(value).count++
    }

    if (!validCount) {
        return {
            hanViet: "",
            confidence: 0,
            validCount: 0,
            candidates: [],
        }
    }

    const sorted =
        [...candidates.values()]
            .sort(
                (a, b) =>
                    b.count - a.count
            )

    const best =
        sorted[0]

    const confidence =
        best.count / validCount

    return {
        hanViet:
            confidence > 0.5
                ? best.original
                : "",

        confidence,

        validCount,

        candidates:
            sorted.map(item => ({
                hanViet: item.original,
                count: item.count,
                percentage:
                    (
                        item.count /
                        validCount *
                        100
                    ).toFixed(2),
            })),
    }
}