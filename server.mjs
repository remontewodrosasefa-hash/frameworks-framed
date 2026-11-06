// Local server for the demo: serves the site, and reads uploaded pieces with Claude for the design consultation
// (POST /api/look). The API key stays here (read from .env), never in the page. Run: npm start → http://localhost:3000
// Without a key (or on GitHub Pages, where this file doesn't run) the consultation falls back to reading only the colours.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
// the key lives in .env (git-ignored, never published): ANTHROPIC_API_KEY=sk-ant-...
try {
  for (const line of (await readFile(join(ROOT, '.env'), 'utf8')).split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}
const PORT = process.env.PORT || 3000;
let client;   // made on first use, after .env is read

// what a framer reads in the first ten seconds; the page uses exactly these fields
const LOOK = {
  type: 'object',
  additionalProperties: false,
  required: ['what', 'detail', 'subject', 'type', 'medium', 'weight', 'era', 'format', 'condition', 'details', 'line', 'notes', 'questions'],
  properties: {
    what: { type: 'string', enum: ['photo', 'print', 'original', 'object'] },
    detail: { type: 'string', enum: ['people', 'pet', 'place', 'moment', 'exhibition', 'artprint', 'gig', 'map', 'painting', 'drawing', 'collage', 'textile', 'shirt', 'medal', 'letter', 'thing'] },
    subject: { type: 'string', description: 'What it is, 2 to 8 words. If it is a known artwork or photograph, name it (e.g. "Tippi Hedren and a crow"); otherwise lowercase, starting with "a", "an" or "the"' },
    type: { type: 'string', description: 'One to four words, e.g. "Photograph", "Gig poster", "Oil painting", with the artist if known' },
    medium: { type: 'string', description: 'What it is physically, as far as a photo shows: e.g. "Photo print", "Poster", "Art print", "Watercolour on paper", "Oil on canvas", "Textile", "Object"' },
    weight: { type: 'string', enum: ['Light', 'Medium', 'Heavy'], description: 'Visual weight: how much frame it can carry' },
    era: { type: 'string', enum: ['Contemporary', 'Vintage', 'Antique'] },
    format: { type: 'string', enum: ['Portrait', 'Landscape', 'Square'] },
    condition: { type: 'string', description: 'Two to four words, e.g. "Crisp and clean", "Worn edges", "Slightly faded"' },
    details: { type: 'array', items: { type: 'string' }, description: 'Up to four short things that change how it is framed: e.g. "Signed", "Numbered edition", "White border", "Deckled edge", "Black and white", "Glossy". Empty if none' },
    line: { type: 'string', description: 'One sentence, max 22 words, in Claire\'s voice: what the frame should do for this piece. No AI talk.' },
    notes: {
      type: 'array',
      description: 'Three or four things a framer notices, each with what it means for the frame, and a rough box in percent of the image (0 to 100)',
      items: {
        type: 'object', additionalProperties: false, required: ['label', 'note', 'x', 'y', 'w', 'h'],
        properties: { label: { type: 'string', description: 'One to three words, e.g. "Signature", "Her face", "Torn edge", "That blue"' },
          note: { type: 'string', description: 'Max 14 words, in Claire\'s voice: what this means for the frame, mount or glass' },
          x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } },
      },
    },
    questions: {
      type: 'array',
      description: 'Exactly two short questions a framer would ask about THIS piece because a photo cannot tell (original or print? paper or canvas? should the signature or border show? how fragile?), each with two or three short answers',
      items: {
        type: 'object', additionalProperties: false, required: ['q', 'options'],
        properties: { q: { type: 'string', description: 'Max 12 words, ends with ?' }, options: { type: 'array', items: { type: 'string' }, description: 'Two or three answers, max 5 words each' } },
      },
    },
  },
};

const PROMPT = `You are Claire, a picture framer in Berlin-Kreuzberg with years at the workbench. A customer shows you a photo of something they want framed.
Read it the way you would in the first minute of a design consultation. Say what it is (name it if it is a known work or photograph), what it is physically, its visual weight, era and condition, and the details that change the framing (signature, edition number, border, deckled edge, gloss).
Then note three or four things you notice, each with what it means for the frame, mount or glass, with a rough box on the image.
Finally ask exactly two questions you cannot answer from a photo, about this piece specifically, each with two or three short answers.
If the photo shows an object rather than a flat picture, "what" is "object". Use "pet" for any animal photo. British English, warm, short sentences, no mention of AI or of analysing.`;

async function look(req, res) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 12e6) return send(res, 413, { error: 'too big' }); }
  const { image, media_type } = JSON.parse(body || '{}');
  if (!image) return send(res, 400, { error: 'no image' });
  try {
    client ??= new Anthropic();   // reads ANTHROPIC_API_KEY
    const response = await client.beta.messages.create({
      model: 'claude-sonnet-5-5',
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',   // a declined request is re-run on Anthropic's recommended fallback model
      output_config: { effort: 'low', format: { type: 'json_schema', schema: LOOK } },
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image } },
        { type: 'text', text: PROMPT },
      ] }],
    });
    if (response.stop_reason === 'refusal') return send(res, 422, { error: 'declined' });
    const text = response.content.find(b => b.type === 'text');
    if (!text) return send(res, 502, { error: 'no answer' });
    send(res, 200, JSON.parse(text.text));
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || /authentication/i.test(e.message)) return send(res, 401, { error: 'no API key: start with ANTHROPIC_API_KEY=... npm start' });
    if (e instanceof Anthropic.RateLimitError) return send(res, 429, { error: 'busy, try again' });
    if (e instanceof Anthropic.APIError) return send(res, 502, { error: e.message });
    send(res, 500, { error: String(e) });
  }
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  // the page may also run from VS Code's Live Server (port 5500): let local pages call the reading
  const origin = req.headers.origin || '';
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('access-control-allow-origin', origin); res.setHeader('access-control-allow-headers', 'content-type');
  }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (url.pathname === '/api/look' && req.method === 'POST') return look(req, res);
  let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  if (/(^|\/)(node_modules|\.git|\.env)/.test(p) || /\.(mjs|md)$/.test(p)) { res.writeHead(404); return res.end(); }
  try {
    const file = await readFile(join(ROOT, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(file);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(PORT, () => console.log(`Frameworks demo on http://localhost:${PORT}${process.env.ANTHROPIC_API_KEY ? '' : '  (no ANTHROPIC_API_KEY: uploads get the colour reading only)'}`));
