import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db.js";
import { extractActionItems, MODEL_NAME } from "./groqClient.js";
import { validateExtraction } from "./validateExtraction.js";
import { logExtraction } from "./extractionLogger.js";

const PROMPT_VERSION = "v2";
const PORT = process.env.PORT || 3001;

const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// --- POST /notes/extract ---------------------------------------------------
app.post("/notes/extract", async (req, res) => {
  const { text } = req.body ?? {};

  if (typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Field 'text' must be a non-empty string." });
  }

  const noteText = text.trim();

  const result = await extractActionItems(noteText);

  if (!result.ok) {
    logExtraction({
      noteText,
      rawResponse: null,
      success: false,
      errorMessage: result.error,
    });
    return res.status(502).json({ error: `Extraction failed: ${result.error}` });
  }

  const validation = validateExtraction(result.rawContent);

  if (!validation.ok) {
    logExtraction({
      noteText,
      rawResponse: result.rawContent,
      success: false,
    });
    return res.status(422).json({ error: validation.reason });
  }

  // Valid -> persist note + action items in one transaction.
  const insertNote = db.prepare(
    `INSERT INTO notes (text, model, prompt_version, raw_response) VALUES (?, ?, ?, ?)`
  );
  const insertItem = db.prepare(
    `INSERT INTO action_items (note_id, task, owner, due, source_quote) VALUES (?, ?, ?, ?, ?)`
  );

  const persist = db.transaction(() => {
    const noteInfo = insertNote.run(noteText, MODEL_NAME, PROMPT_VERSION, result.rawContent);
    const noteId = noteInfo.lastInsertRowid;

    const actionItems = validation.action_items.map((item) => {
      const itemInfo = insertItem.run(noteId, item.task, item.owner, item.due, item.source_quote);
      return {
        id: itemInfo.lastInsertRowid,
        note_id: noteId,
        task: item.task,
        owner: item.owner,
        due: item.due,
        source_quote: item.source_quote,
        done: 0,
        done_at: null,
      };
    });

    const note = db.prepare(`SELECT * FROM notes WHERE id = ?`).get(noteId);
    return { note, actionItems };
  });

  const { note, actionItems } = persist();

  logExtraction({
    noteText,
    rawResponse: result.rawContent,
    success: true,
  });

  return res.status(201).json({
    id: note.id,
    text: note.text,
    model: note.model,
    prompt_version: note.prompt_version,
    created_at: note.created_at,
    action_items: actionItems,
  });
});

// --- GET /notes --------------------------------------------------------------
app.get("/notes", (req, res) => {
  const notes = db.prepare(`SELECT * FROM notes ORDER BY id DESC`).all();

  const itemsByNote = db.prepare(`SELECT * FROM action_items WHERE note_id = ?`);

  const result = notes.map((note) => ({
    id: note.id,
    text: note.text,
    model: note.model,
    prompt_version: note.prompt_version,
    created_at: note.created_at,
    action_items: itemsByNote.all(note.id).map((item) => ({
      id: item.id,
      task: item.task,
      owner: item.owner,
      due: item.due,
      source_quote: item.source_quote,
      done: item.done,
      done_at: item.done_at,
    })),
  }));

  res.json(result);
});

// --- PATCH /action-items/:id/done --------------------------------------------
app.patch("/action-items/:id/done", (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Action item not found." });
  }

  const existing = db.prepare(`SELECT * FROM action_items WHERE id = ?`).get(id);

  if (!existing) {
    return res.status(404).json({ error: "Action item not found." });
  }

  db.prepare(
    `UPDATE action_items SET done = 1, done_at = datetime('now') WHERE id = ?`
  ).run(id);

  const updated = db.prepare(`SELECT * FROM action_items WHERE id = ?`).get(id);

  res.json({
    id: updated.id,
    task: updated.task,
    owner: updated.owner,
    due: updated.due,
    source_quote: updated.source_quote,
    done: updated.done,
    done_at: updated.done_at,
  });
});

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
