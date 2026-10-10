export default function ActionItemRow({ item, onMarkDone }) {
  const isDone = Boolean(item.done);

  function handleChange() {
    if (isDone) return; // no undo path server-side - keep the UI consistent
    onMarkDone(item.id);
  }

  return (
    <li className={`action-item${isDone ? ' action-item--done' : ''}`}>
      <input
        type="checkbox"
        checked={isDone}
        disabled={isDone}
        onChange={handleChange}
        aria-label={`Mark "${item.task}" done`}
      />
      <div className="action-item__body">
        <div className="action-item__task">{item.task}</div>
        <div className="action-item__meta">
          <span className="action-item__owner">
            {item.owner ? item.owner : 'unassigned'}
          </span>
          {item.due && <span className="action-item__due">due {item.due}</span>}
        </div>
        {item.source_quote && (
          <blockquote className="action-item__quote">“{item.source_quote}”</blockquote>
        )}
      </div>
    </li>
  );
}
