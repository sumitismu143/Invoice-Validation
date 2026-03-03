# Invoice-Validation

PO-Contract-Invoice validation demo with AI-assisted Q&A.

## What is supported now

- 3-way validation between Invoice, PO, and Contract
- Rule-based assistant (always available)
- AI assistant mode via OpenAI API
- ZIP ingestion endpoint to upload PO/Contract/Invoice bundles for AI context

## Run locally

1. Install dependencies:
	- `npm install`
2. Configure environment:
	- `cp .env.example .env`
	- Add your OpenAI key to `OPENAI_API_KEY`
3. Start server:
	- `npm start`
4. Open:
	- `http://localhost:3000`

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. In Vercel Project Settings → Environment Variables, add:
	- `OPENAI_API_KEY` (required for AI answers)
	- `OPENAI_MODEL` (optional, default: `gpt-4.1-mini`)
4. Deploy.

`vercel.json` is included and routes both API and frontend traffic through `server.js`.

## AI behavior

- If `OPENAI_API_KEY` is configured, chat uses AI answers grounded in your loaded data and uploaded ZIP metadata/text.
- If AI is unavailable, chat automatically falls back to the existing rule-based engine.

## Notes on ZIP ingestion

- ZIP ingestion currently extracts text from text-like files (`.txt`, `.csv`, `.json`, `.xml`, `.md`, etc.).
- Binary formats (such as scanned PDFs/images) are indexed by filename and type only.
- For scanned documents, add OCR/text extraction in a next step for deeper Q&A.
