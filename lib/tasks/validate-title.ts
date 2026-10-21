/** Longest task title, in characters, after trimming. */
export const MAX_TITLE_LENGTH = 150;

/** Outcome of `validateTitle`: the trimmed title, or a message explaining why it was rejected. */
export type TitleValidation = { ok: true; title: string } | { ok: false; error: string };

/** Checks that `value` is a string that is non-empty and at most `MAX_TITLE_LENGTH` long once trimmed. */
export const validateTitle = (value: unknown): TitleValidation => {
  if (typeof value !== "string") {
    return { ok: false, error: "Title must be a string" };
  }
  const title = value.trim();
  if (title.length === 0) {
    return { ok: false, error: "Title must not be empty" };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { ok: false, error: `Title must be at most ${MAX_TITLE_LENGTH} characters` };
  }
  return { ok: true, title };
};
