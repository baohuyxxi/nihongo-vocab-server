export const textbooks = ["minna_1", "minna_2"];
export const sources = ["textbook", "custom"];
export const difficulties = ["easy", "medium", "hard"];
export const levels = ["N5", "N4", "N3"];
export const assessments = ["known", "retry"];
export const maxQuestions = 50;

export const positiveInteger = {
  type: Number,
  required: true,
  validate: { validator: (value) => Number.isSafeInteger(value) && value > 0 },
};

export const requiredText = (maxlength) => ({
  type: String, trim: true, required: true, maxlength,
});

export const optionalText = (maxlength) => ({
  type: String, trim: true, maxlength,
});

export const boundedArray = (type, min, max) => ({
  type, required: true,
  validate: { validator: (values) => values.length >= min && values.length <= max },
});

export const audioUrl = {
  ...optionalText(2048),
  default: null,
  validate: {
    validator(value) {
      if (value == null) return true;
      try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
      } catch {
        return false;
      }
    },
  },
};

export const uniqueField = (entries, key) =>
  new Set(entries.map((entry) => entry?.[key])).size === entries.length;

