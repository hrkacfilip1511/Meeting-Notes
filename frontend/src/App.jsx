import { useEffect, useState } from 'react';
import { extractNotes, listNotes, markDone } from './api';
import NoteCard from './components/NoteCard';
import './App.css';

function App() {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [notesError, setNotesError] = useState('');

  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      try {
        const data = await listNotes();
        if (!cancelled) setNotes(data);
      } catch (err) {
        if (!cancelled) setNotesError(err.message);
      } finally {
        if (!cancelled) setNotesLoading(false);
      }
    }

    loadNotes();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = noteText.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const newNote = await extractNotes(trimmed);
      setNotes((prev) => [newNote, ...prev]);
      setNoteText('');
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMarkDone(itemId) {
    try {
      const updated = await markDone(itemId);
      setNotes((prev) =>
        prev.map((note) => ({
          ...note,
          action_items: note.action_items.map((item) =>
            item.id === itemId ? updated : item
          ),
        }))
      );
    } catch (err) {
      // Surface a transient alert rather than silently failing; the item
      // simply stays unchecked and the user can retry.
      window.alert(`Couldn't mark item done: ${err.message}`);
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Meeting Notes → Action Items</h1>
        <p className="app__subtitle">
          Paste raw meeting notes and extract clear, trackable action items.
        </p>
      </header>

      <form className="note-form" onSubmit={handleSubmit}>
        <textarea
          className="note-form__textarea"
          placeholder="Paste raw meeting notes here..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={8}
          disabled={submitting}
        />
        <div className="note-form__actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={submitting || !noteText.trim()}
          >
            {submitting ? 'Extracting…' : 'Extract action items'}
          </button>
          {submitting && <span className="note-form__loading">Working on it…</span>}
        </div>
        {submitError && (
          <p className="note-form__error" role="alert">
            Couldn't extract action items: {submitError}
          </p>
        )}
      </form>

      <section className="notes-section">
        <h2>Notes</h2>
        {notesLoading && <p className="notes-section__status">Loading notes…</p>}
        {notesError && (
          <p className="notes-section__status notes-section__status--error">
            Couldn't load notes: {notesError}
          </p>
        )}
        {!notesLoading && !notesError && notes.length === 0 && (
          <p className="notes-section__status">
            No notes yet. Paste some meeting notes above to get started.
          </p>
        )}
        <div className="notes-list">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onMarkDone={handleMarkDone} />
          ))}
        </div>
      </section>
    </div>
  );
}

export default App;
