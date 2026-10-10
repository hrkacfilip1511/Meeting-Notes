import { useState } from 'react';
import ActionItemRow from './ActionItemRow';

const TRUNCATE_LENGTH = 280;

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function NoteCard({ note, onMarkDone }) {
  const [expanded, setExpanded] = useState(false);

  const isLong = note.text.length > TRUNCATE_LENGTH;
  const displayedText =
    isLong && !expanded ? `${note.text.slice(0, TRUNCATE_LENGTH).trimEnd()}…` : note.text;

  const items = note.action_items || [];

  return (
    <article className="note-card">
      <header className="note-card__header">
        <time className="note-card__timestamp" dateTime={note.created_at}>
          {formatTimestamp(note.created_at)}
        </time>
        <span className="note-card__model">
          {note.model} · {note.prompt_version}
        </span>
      </header>

      <p className="note-card__text">{displayedText}</p>
      {isLong && (
        <button
          type="button"
          className="note-card__toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {items.length === 0 ? (
        <p className="note-card__empty">No action items found.</p>
      ) : (
        <ul className="action-item-list">
          {items.map((item) => (
            <ActionItemRow key={item.id} item={item} onMarkDone={onMarkDone} />
          ))}
        </ul>
      )}
    </article>
  );
}
