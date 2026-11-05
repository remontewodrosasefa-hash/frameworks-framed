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
  required: ['what', 'detail', 'subject', 'type', 'weight', 'era', 'format', 'line', 'boxes'],
  properties: {
    what: { type: 'string', enum: ['photo', 'print', 'original', 'object'] },
    detail: { type: 'string', enum: ['people', 'pet', 'place', 'moment', 'exhibition', 'artprint', 'gig', 'map', 'painting', 'drawing', 'collage', 'textile', 'shirt', 'medal', 'letter', 'thing'] },
    subject: { type: 'string', description: 'What it shows, 2 to 7 words, lowercase, starting with "a", "an" or "the", e.g. "a woman and a crow"' },
    type: { type: 'string', description: 'One or two words, e.g. "Photograph", "Gig poster", "Oil painting"' },
    weight: { type: 'string', enum: ['Light', 'Medium', 'Heavy'], description: 'Visual weight: how much frame it can carry' },
    era: { type: 'string', enum: ['Contemporary', 'Vintage', 'Antique'] },
    format: { type: 'string', enum: ['Portrait', 'Landscape', 'Square'] },
    line: { type: 'string', description: 'One sentence, max 18 words, in Claire\'s voice: what the frame should do for this piece. No AI talk.' },
    boxes: {
      type: 'array',
      description: 'Two or three things a framer would notice, with rough positions in percent of the image (0 to 100)',
      items: {
        type: 'object', additionalProperties: false, required: ['label', 'x', 'y', 'w', 'h'],
        properties: { label: { type: 'string', description: 'One or two words' }, x: { type: 'number' }, y: { type: 'number' }, w: { type: 'number' }, h: { type: 'number' } },
      },
    },
  },
};

const PROMPT = `You are Claire, a picture framer in Berlin-Kreuzberg with years at the workbench. A customer shows you a photo of something they want framed.
Read it like a framer in the first ten seconds of a design consultation: what it is, its visual weight (how much frame it can carry), its era, its format, and two or three things in it worth noticing (a face, an animal, a title, a strong colour, a worn edge), each with a rough box in percent of the image.
If the photo shows an object rather than a flat picture, "what" is "object". Use "pet" for any animal photo. British English, warm and short, no mention of AI or of analysing.`;

async function look(req, res) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 12e6) return send(res, 413, { error: 'too big' }); }
  const { image, media_type } = JSON.parse(body || '{}');
  if (!image) return send(res, 400, { error: 'no image' });
  try {
    client ??= new Anthropic();   // reads ANTHROPIC_API_KEY
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
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
