require('dotenv').config();

const express = require('express');
const multer = require('multer');
const path = require('path');
const AdmZip = require('adm-zip');
const OpenAI = require('openai');

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

const PORT = process.env.PORT || 3000;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const FALLBACK_MODELS = ['gpt-4o-mini', 'gpt-4.1-mini'];

app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

function isTextFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const textExts = new Set([
    '.txt', '.md', '.csv', '.json', '.xml', '.html', '.htm',
    '.js', '.ts', '.log', '.yml', '.yaml'
  ]);
  return textExts.has(ext);
}

function extractZipDocuments(buffer) {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const documents = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    if (documents.length >= 250) break;

    const fileName = entry.entryName;
    const size = entry.header.size;
    const textFile = isTextFile(fileName);

    let excerpt = '';
    let type = 'binary';

    if (textFile) {
      const raw = entry.getData().toString('utf8');
      excerpt = raw.replace(/\s+/g, ' ').trim().slice(0, 3000);
      type = 'text';
    } else {
      const ext = path.extname(fileName).toLowerCase() || 'unknown';
      excerpt = `Binary document (${ext}) uploaded. Content extraction not enabled for this format.`;
    }

    documents.push({
      fileName,
      size,
      type,
      excerpt
    });
  }

  return documents;
}

app.post('/api/ingest-zip', upload.single('zipFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file uploaded. Use form field name zipFile.' });
    }

    const documents = extractZipDocuments(req.file.buffer);
    return res.json({
      fileName: req.file.originalname,
      documents,
      count: documents.length
    });
  } catch (error) {
    return res.status(400).json({ error: `Failed to parse ZIP: ${error.message}` });
  }
});

app.post('/api/ask', async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        error: 'OPENAI_API_KEY is not configured on the server.'
      });
    }

    const { question, history = [], knowledgeContext = '' } = req.body || {};

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required.' });
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const compactHistory = history
      .slice(-8)
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n');

    const uniqueModels = Array.from(new Set([OPENAI_MODEL, ...FALLBACK_MODELS].filter(Boolean)));
    const promptInput = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: `You are a helpful AI assistant for an invoice validation product.\nIf the user asks about invoices/POs/contracts, use the provided context first.\nIf the question is general and not related to invoice data, answer normally using your own knowledge.\nWhen context is missing for invoice-specific requests, clearly state what exact document or field is needed.\nBe concise and use bullet points when helpful.`
          }
        ]
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Context:\n${knowledgeContext || 'No context provided.'}\n\nRecent conversation:\n${compactHistory || 'No prior history.'}\n\nQuestion:\n${question}`
          }
        ]
      }
    ];

    let answer = '';
    let modelUsed = OPENAI_MODEL;
    let lastError = null;

    for (const candidateModel of uniqueModels) {
      try {
        const response = await client.responses.create({
          model: candidateModel,
          temperature: 0.2,
          max_output_tokens: 700,
          input: promptInput
        });

        answer = (response.output_text || '').trim();
        if (!answer && Array.isArray(response.output)) {
          answer = response.output
            .flatMap(item => (Array.isArray(item.content) ? item.content : []))
            .filter(item => item.type === 'output_text' && item.text)
            .map(item => item.text)
            .join('\n')
            .trim();
        }

        if (answer) {
          modelUsed = candidateModel;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!answer) {
      if (lastError) {
        throw lastError;
      }
      return res.status(502).json({ error: 'AI returned an empty response.' });
    }

    return res.json({ answer, model: modelUsed });
  } catch (error) {
    return res.status(500).json({ error: `AI request failed: ${error.message}` });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`InvoiceAI server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
