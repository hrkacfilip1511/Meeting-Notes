# Meeting Notes → Action Items

Teams take meeting notes but action items get buried in prose and never followed up on. This tool takes raw, unstructured meeting notes pasted in by a user, sends them to an LLM (Groq) to pull out a structured list of action items (task, owner, due date, and the exact quote it came from), saves them, and shows them in a simple UI where the team can check items off as they're done.

## How to Run

### Prerequisites

- Node.js 18+ (LTS recommended)
- A free Groq API key — sign up at [console.groq.com](https://console.groq.com) and create an API key. No payment method is required for the free tier.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `backend/.env` and fill in `GROQ_API_KEY` with a free key from [console.groq.com](https://console.groq.com) (leave `PORT` as-is unless you need a different port):

```
GROQ_API_KEY=your_key_here
PORT=3001
```

Then start the server:

```bash
npm start
```

The backend listens on `http://localhost:3001` by default (overridable via `PORT` in `.env`). It must be running before the frontend can successfully talk to it — CORS is locked to `http://localhost:5173` only.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend opens at `http://localhost:5173`. Start it after the backend is already running. (If you ever need to point it at a different backend URL, copy `frontend/.env.example` to `frontend/.env` and adjust `VITE_API_URL`; the default already matches the backend above, so this is optional.)

### 3. Try it

Paste one of the two sample meeting notes from the assignment into the text box and submit. You should see a loading state, then a new note appear in the list below with its extracted action items (task, owner, due date, and the source quote it was pulled from). Click the checkbox next to an action item to mark it done.

## What I'd Do Differently With a Full Week

If I had more time, the first thing I'd build is real authentication with roles — an admin vs. a regular user — and a dedicated `/admin` route in the frontend. It would reuse the same dashboard view as the main page, just with extra controls for deleting things, because right now there's no way to remove a bad note or a mistaken action item once it's been created. That means adding two backend endpoints: `DELETE /notes/:id`, which cascades to delete that note's action items, and `DELETE /action-items/:id`. The cascade needs a small schema change — SQLite doesn't enforce foreign keys by default, so I'd need to turn on `PRAGMA foreign_keys = ON` and add `ON DELETE CASCADE` to the `action_items.note_id` foreign key. While I'm in there, I'd also make "done" a toggle instead of one-directional — right now once you check an item there's no undo, which is annoying if you misclick. That's a cheap fix: flip `done` back to 0 and reset `done_at` to NULL, no schema change required.

After that, the bigger structural change I'd want is team-based scoping. Right now every note lands in one shared dashboard, which doesn't work once you have multiple teams in the same org who shouldn't see each other's notes. That would mean a `teams` table, notes linked to a team, and a dynamic route/URL param per team. I'd deliberately do this after the admin/auth work, since it's a much bigger change and auth needs to exist first for team scoping to mean anything.

Smaller things I'd also want: pagination on `GET /notes` once there's enough data for an unpaginated list to become a problem, and a simple client-side filter/search box over the already-loaded notes and action items (by task text, owner, or note content) — a backend full-text search endpoint would be overkill until there's enough data for client-side filtering to actually slow down.

## One Decision I'm Not Fully Confident About

Right now there's no delete endpoint at all — `action_items.note_id` is just a plain `REFERENCES notes(id)` with no `ON DELETE CASCADE`, and `db.js` never turns on `PRAGMA foreign_keys`, so SQLite isn't even enforcing the reference, let alone cascading. The admin hard-delete feature described above (`DELETE /notes/:id` / `DELETE /action-items/:id`) only feels safe to *plan* because `backend/logs/extractions.log` separately keeps a permanent, append-only copy of every note's full text and the model's full raw response — so a future hard `DELETE` from the SQL tables wouldn't actually destroy the record, just remove it from the operational view. I'm not fully sure that's the right long-term split of responsibility: an "audit record" that would live partly in a deletable SQL table and partly in an undeletable log file is a slightly awkward design, and it means recovering a "deleted" note means manually digging through a log file rather than a supported path. The alternative would be making the DB rows themselves the single source of truth — a `deleted_at` soft-delete flag instead of a real `DELETE`, or no delete at all and just a "hidden" flag — which keeps the audit trail in one place and queryable, at the cost of every future query needing to filter it out. If I build the delete feature, I'd lean toward soft-delete for that reason, even though relying on the existing log file would be the less work.

## One Thing I Deliberately Skipped, And Why

`backend/logs/extractions.log` has no rotation, no size cap, no retention policy, and no redaction of sensitive content. Every call to `POST /notes/extract` — success, validation failure, or Groq API failure — appends one JSON line with a `timestamp`, the full untruncated `note_text`, the full raw `raw_response` from the model, a `success` boolean, and an `error` field on failures. Real meeting notes (per the assignment's own sample notes) can contain customer names, internal deadlines, and other sensitive business/process commentary, and all of that ends up in this one ever-growing file. The spec explicitly asked for exactly this logging — full note text and full raw model response on every extraction attempt, for debugging — and I implemented that part exactly as asked. What I consciously didn't build is any lifecycle management around the resulting file: rotating it, capping its size, expiring old entries, or redacting anything before it's written. Given the time budget for this assignment, I prioritized meeting the explicit logging requirement over building retention/redaction tooling around it, and this is an internal tool for a small, trusted team rather than an external-facing product, which lowers — but doesn't eliminate — the immediate risk. It's the first thing I'd fix before trusting this log file in a less contained environment.
