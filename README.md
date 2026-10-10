# Meeting Notes → Action Items

Teams take meeting notes but action items get buried in prose and never followed up on. This tool takes raw, unstructured meeting notes pasted in by a user, sends them to an LLM (Groq) to pull out a structured list of action items (task, owner, due date, and the exact quote it came from), saves them, and shows them in a simple UI where the team can check items off as they're done.

## How to Run

### Prerequisites

- Node.js 18+ 
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
