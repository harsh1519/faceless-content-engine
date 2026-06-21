/**
 * Gemini model ids for `generateContent` (shorts script + long-form copy).
 * Older ids like `gemini-1.5-flash` or guessed names like `gemini-3-flash` often 404.
 *
 * Default `gemini-3.5-flash` — override with `GEMINI_SCRIPT_MODEL` if your key lists
 * a different id (see AI Studio or `GET .../v1beta/models?key=...`).
 *
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3.5-flash";

export function getGeminiScriptModel(): string {
  return (
    process.env.GEMINI_SCRIPT_MODEL?.trim() || DEFAULT_GEMINI_TEXT_MODEL
  );
}

export function getGeminiLongFormModel(): string {
  return (
    process.env.GEMINI_LONG_FORM_MODEL?.trim() ||
    process.env.GEMINI_SCRIPT_MODEL?.trim() ||
    DEFAULT_GEMINI_TEXT_MODEL
  );
}
