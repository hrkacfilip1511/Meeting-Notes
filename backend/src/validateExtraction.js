/**
 * Strict validation of the model's extraction output.
 *
 * Contract: the model's message content, once JSON.parse'd, must be:
 *   { "action_items": [ { task: string, owner: string|null, due: string|null, source_quote: string }, ... ] }
 *
 * Rules:
 *  - Parsing failure -> unusable.
 *  - Not an object, or `action_items` not an array -> unusable.
 *  - Each item must be an object with:
 *      - task: non-empty string (after trim)
 *      - source_quote: non-empty string (after trim)
 *      - owner: string or null (missing -> coerced to null; any other type -> unusable)
 *      - due: string or null (missing -> coerced to null; any other type -> unusable)
 *  - An empty action_items array is VALID.
 *
 * Returns { ok: true, action_items: [...] } with owner/due coerced to null when absent,
 * or { ok: false, reason: "<short human reason>" }.
 */
export function validateExtraction(rawContent) {
  if (typeof rawContent !== "string") {
    return { ok: false, reason: "Model returned no text content." };
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return { ok: false, reason: "Model response was not valid JSON." };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "Model response was not a JSON object." };
  }

  if (!Array.isArray(parsed.action_items)) {
    return { ok: false, reason: "Model response missing an 'action_items' array." };
  }

  const items = [];

  for (let i = 0; i < parsed.action_items.length; i++) {
    const item = parsed.action_items[i];

    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, reason: `Action item at index ${i} was not an object.` };
    }

    const { task, owner, due, source_quote } = item;

    if (typeof task !== "string" || task.trim().length === 0) {
      return { ok: false, reason: `Action item at index ${i} is missing a valid 'task'.` };
    }

    if (typeof source_quote !== "string" || source_quote.trim().length === 0) {
      return { ok: false, reason: `Action item at index ${i} is missing a valid 'source_quote'.` };
    }

    let normalizedOwner = null;
    if (owner !== undefined && owner !== null) {
      if (typeof owner !== "string") {
        return { ok: false, reason: `Action item at index ${i} has an invalid 'owner' type.` };
      }
      normalizedOwner = owner.trim().length === 0 ? null : owner;
    }

    let normalizedDue = null;
    if (due !== undefined && due !== null) {
      if (typeof due !== "string") {
        return { ok: false, reason: `Action item at index ${i} has an invalid 'due' type.` };
      }
      normalizedDue = due.trim().length === 0 ? null : due;
    }

    items.push({
      task,
      owner: normalizedOwner,
      due: normalizedDue,
      source_quote,
    });
  }

  return { ok: true, action_items: items };
}
