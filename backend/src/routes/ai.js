import express from 'express';
import authenticate from '../middleware/authenticate.js';
 
const router = express.Router();
 
const asString = (value) => String(value ?? '').trim();
 
const withTimeout = async (promiseFactory, ms) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await promiseFactory(controller.signal);
  } finally {
    clearTimeout(t);
  }
};
 
const normalizeText = (value, maxLen) => asString(value).replace(/\s+/g, ' ').slice(0, maxLen);
 
const buildPrompt = ({ mode, title, description }) => {
  if (mode === 'generate') {
    return [
      'Write a concise, helpful description for a school e-portfolio post.',
      'Keep it clear and relevant to the title.',
      'Return plain text only (no markdown).',
      '',
      `Title: ${title}`,
    ].join('\n');
  }
 
  return [
    'Improve and rephrase this description while preserving meaning and key details.',
    'Keep the same tone and context.',
    'Return plain text only (no markdown).',
    '',
    `Title: ${title}`,
    '',
    `Description: ${description}`,
  ].join('\n');
};
 
const callOpenAi = async ({ prompt, timeoutMs }) => {
  const apiKey = asString(process.env.OPENAI_API_KEY);
  if (!apiKey) {
    const err = new Error('AI is not configured.');
    err.code = 'AI_NOT_CONFIGURED';
    throw err;
  }
 
  const model = asString(process.env.OPENAI_MODEL) || 'gpt-4o-mini';
  const baseUrl = asString(process.env.OPENAI_BASE_URL) || 'https://api.openai.com';
 
  const payload = {
    model,
    messages: [
      { role: 'system', content: 'You are a helpful writing assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.5,
    max_tokens: 240,
  };
 
  const res = await withTimeout(
    (signal) => fetch(`${baseUrl.replace(/\/+$/, '')}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal,
    }),
    timeoutMs
  );
 
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = asString(data?.error?.message) || `AI request failed (${res.status})`;
    const err = new Error(msg);
    err.code = 'AI_REQUEST_FAILED';
    err.status = res.status;
    throw err;
  }
 
  const text = asString(data?.choices?.[0]?.message?.content);
  if (!text) {
    const err = new Error('AI returned an empty response.');
    err.code = 'AI_INVALID_RESPONSE';
    throw err;
  }
  return text;
};
 
router.post('/description', authenticate, async (req, res) => {
  try {
    const mode = asString(req.body?.mode).toLowerCase();
    if (mode !== 'improve' && mode !== 'generate') {
      return res.status(400).json({ message: 'Invalid mode' });
    }
 
    const title = normalizeText(req.body?.title, 140);
    const description = normalizeText(req.body?.description, 1200);
 
    if (mode === 'generate' && !title) {
      return res.status(400).json({ message: 'Title is required to generate a description.' });
    }
    if (mode === 'improve' && !description) {
      return res.status(400).json({ message: 'Description is required to improve text.' });
    }
 
    const prompt = buildPrompt({ mode, title, description });
    const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 12_000);
    const text = await callOpenAi({ prompt, timeoutMs });
 
    res.json({ text });
  } catch (error) {
    if (error?.name === 'AbortError') {
      return res.status(408).json({ message: 'AI request timed out.' });
    }
    if (error?.code === 'AI_NOT_CONFIGURED') {
      return res.status(501).json({ message: error.message });
    }
    res.status(500).json({ message: 'AI request failed.' });
  }
});
 
export default router;
