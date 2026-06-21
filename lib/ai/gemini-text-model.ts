/**
 * Gemini model ids for `generateContent` (shorts script + long-form copy).
 * `gemini-1.5-flash` often returns 404 on current API versions.
 *
 * Default `gemini-3-flash` — override if your key lists a different id in AI Studio
 * or `GET https://generativelanguage.googleapis.com/v1beta/models?key=...`.
 *
 * @see https://ai.google.dev/gemini-api/docs/models
 */
export const DEFAULT_GEMINI_TEXT_MODEL = "gemini-3-flash";

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
