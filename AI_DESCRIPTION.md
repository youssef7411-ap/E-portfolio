# AI Description Enhancement

## What it does

In the admin Post Management modal, the Description field includes an AI button:
- If Description has text: AI rephrases/improves it while keeping meaning.
- If Description is empty: AI generates a new description based on the Title.

The UI shows a loading overlay during processing and then presents a suggestion with Accept/Reject.

## Backend setup

The backend exposes:
- `POST /api/ai/description` (admin auth required)

Environment variables:
- `OPENAI_API_KEY` (required to enable AI)
- `OPENAI_MODEL` (optional, default `gpt-4o-mini`)
- `OPENAI_BASE_URL` (optional, default `https://api.openai.com`)
- `AI_TIMEOUT_MS` (optional, default `12000`)

If `OPENAI_API_KEY` is missing, the endpoint returns `501`.

## Frontend behavior

- The AI button is disabled while processing.
- Requests are debounced to prevent rapid clicks.
- A suggestion preview is shown with Accept/Reject.
- The description editor is updated only after Accept.

## Files

- Backend: `backend/src/routes/ai.js`, `backend/src/app.js`
- Frontend: `frontend/src/admin/pages/PostManagement.js`, `frontend/src/styles/PostManagement.css`
- Tests: `frontend/src/admin/utils/aiText.test.js`
