import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
export const model = 'gemma-4-26b-a4b-it';

export function validateRequest(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.notes)) return 'Add at least one observation first.';
  if (value.notes.length < 1 || value.notes.length > 12) return 'Use between 1 and 12 observations.';
  if (value.notes.some((note, i) => !note || note.id !== `N${i + 1}` || typeof note.text !== 'string' || !note.text.trim() || note.text.length > 600)) return 'Each observation needs a short note (up to 600 characters).';
  if (value.place != null && (typeof value.place !== 'string' || value.place.length > 100)) return 'Place name must be under 100 characters.';
  return null;
}

export function parseReport(raw, notes) {
  const text = String(raw ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const data = JSON.parse(text);
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const summary = typeof data.summary === 'string' ? data.summary.trim() : '';
  const items = Array.isArray(data.items) ? data.items : [];
  const unknowns = Array.isArray(data.unknowns) ? data.unknowns.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0, 6) : [];
  if (!title || !summary || title.length > 120 || summary.length > 700 || items.length > 12 || [title, summary, ...unknowns].some(v => v.length > 500)) throw new Error('Gemma returned an incomplete field note. Try again.');
  const byId = new Map(notes.map(note => [note.id, note.text]));
  const checked = [];
  for (const item of items) {
    if (!item || typeof item.noteId !== 'string' || !byId.has(item.noteId) || typeof item.quote !== 'string' || !item.quote.trim() || !byId.get(item.noteId).includes(item.quote)) throw new Error('Gemma returned a source that does not match your notes. Please retry; no report was created.');
    const observation = typeof item.observation === 'string' ? item.observation.trim() : '';
    if (!observation || observation.length > 280) throw new Error('Gemma returned an incomplete observation. Please retry.');
    checked.push({ noteId: item.noteId, quote: item.quote, observation });
  }
  if (!checked.length) throw new Error('Gemma did not connect any findings to your notes. Try again.');
  return { title, summary, items: checked, unknowns };
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 12000) throw new Error('Request is too large.'); }
  return JSON.parse(body);
}

async function organize({ notes, place = '' }) {
  const noteBlock = notes.map(note => `${note.id}: ${JSON.stringify(note.text)}`).join('\n');
  const prompt = `Organize field notes about one familiar urban block into a concise draft, not a verified audit. Return ONLY JSON with fields title (string), summary (string), items (array of objects with noteId, quote, observation strings), unknowns (array of strings). Use only note IDs and exact short quotes present in the input. Every item must cite one note. Do not infer location facts, causes, measurements, safety, accessibility, ownership, or whether an issue is fixed. Never claim a route is safe or accessible. Put any details that need a visit/check into unknowns; if there are no unknowns, say what was not checked. Keep language neutral and useful for the author to edit. This report is not sent to anyone. Manually entered place label (unverified): ${JSON.stringify(place || 'not provided')}. Notes:\n${noteBlock}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 1000 } })
    });
    if (!response.ok) {
      if ([401, 403].includes(response.status)) throw new Error('Gemma could not authenticate. Check the server API key and model access.');
      if (response.status === 429) throw new Error('Gemma is busy or the API quota is reached. Wait a little and try again.');
      throw new Error(`Gemma request failed (${response.status}). Please try again.`);
    }
    const result = await response.json();
    const output = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (!output) throw new Error('Gemma returned no report. Please try again.');
    return parseReport(output, notes);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('Gemma took too long to respond. Please try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = createServer(async (req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('content-security-policy', "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'");
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ready: Boolean(process.env.GEMINI_API_KEY), model })); return;
  }
  if (req.url === '/api/receipt' && req.method === 'POST') {
    try {
      const input = await readJson(req), issue = validateRequest(input);
      if (issue) { res.writeHead(400, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: issue })); return; }
      if (!process.env.GEMINI_API_KEY) { res.writeHead(503, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Live Gemma is not configured. Add GEMINI_API_KEY to the server environment, then restart it.' })); return; }
      const report = await organize(input);
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ report, model, provider: 'Google Gemini API (hosted Gemma)' }));
    } catch (error) {
      const status = error.message === 'Request is too large.' ? 413 : error instanceof SyntaxError ? 400 : 502;
      res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message || 'Could not organize notes.' }));
    }
    return;
  }
  if (req.method !== 'GET') { res.writeHead(405); res.end('Method not allowed'); return; }
  let pathname;
  try { pathname = req.url === '/' ? '/index.html' : decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); res.end('Bad path'); return; }
  const file = normalize(join(root, pathname));
  if (!file.startsWith(root) || !types[extname(file)]) { res.writeHead(404); res.end('Not found'); return; }
  try { const content = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] }); res.end(content); }
  catch { res.writeHead(404); res.end('Not found'); }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(port, '127.0.0.1', () => console.log(`Footpath Receipt listening at http://localhost:${port}`));
export { server };
