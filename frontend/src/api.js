const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Parses a fetch Response, throwing a readable Error for non-2xx responses.
 * The backend returns `{ error: string }` bodies on failure; we surface
 * that message when present, falling back to the status text otherwise.
 */
async function handleResponse(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    // No JSON body (e.g. empty response) - that's fine for successes.
  }

  if (!res.ok) {
    const message = body && body.error ? body.error : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return body;
}

/**
 * Submits raw meeting notes for extraction.
 * Resolves with the created note (including its action_items) on success.
 * Throws an Error with a user-facing message on failure.
 */
export async function extractNotes(text) {
  const res = await fetch(`${API_URL}/notes/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  return handleResponse(res);
}

/**
 * Fetches all notes (with their action items), newest first.
 */
export async function listNotes() {
  const res = await fetch(`${API_URL}/notes`);
  return handleResponse(res);
}

/**
 * Marks a single action item done. Resolves with the updated action item.
 */
export async function markDone(id) {
  const res = await fetch(`${API_URL}/action-items/${id}/done`, {
    method: 'PATCH',
  });
  return handleResponse(res);
}
