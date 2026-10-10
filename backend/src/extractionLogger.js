import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logsDir = path.resolve(__dirname, "..", "logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logPath = path.join(logsDir, "extractions.log");

/**
 * Appends one JSON line recording a single /notes/extract call, regardless of
 * outcome (success, validation rejection, timeout, or API error).
 *
 * @param {object} entry
 * @param {string} entry.noteText - full raw input text, not truncated
 * @param {string|null} entry.rawResponse - full raw model response text, or null if the HTTP call itself failed
 * @param {boolean} entry.success - whether the submission was accepted and persisted
 * @param {string} [entry.errorMessage] - present when the HTTP call itself failed
 */
export function logExtraction({ noteText, rawResponse, success, errorMessage }) {
  const line = {
    timestamp: new Date().toISOString(),
    note_text: noteText,
    raw_response: rawResponse,
    success: Boolean(success),
  };

  if (rawResponse === null && errorMessage) {
    line.error = errorMessage;
  }

  fs.appendFileSync(logPath, JSON.stringify(line) + "\n", "utf8");
}
