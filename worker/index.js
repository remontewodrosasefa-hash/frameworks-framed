// Cloudflare Worker: reads an uploaded piece with Claude for the design consultation (POST /look).
// The key is a Worker secret (npx wrangler secret put ANTHROPIC_API_KEY), never in the site or the repo.
// Only the live site and localhost may call it, at most 10 readings a minute (the LIMITER binding).
import Anthropic from '@anthropic-ai/sdk';

const ALLOWED = /^(https:\/\/remontewodrosasefa-hash\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

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

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const cors = ALLOWED.test(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'content-type', vary: 'origin' } : {};
    const send = (code, obj) => new Response(JSON.stringify(obj), { status: code, headers: { 'content-type': 'application/json', ...cors } });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (!ALLOWED.test(origin)) return send(403, { error: 'not allowed' });
    if (req.method !== 'POST' || new URL(req.url).pathname !== '/look') return send(404, { error: 'not found' });
    if (env.LIMITER) { const { success } = await env.LIMITER.limit({ key: 'look' }); if (!success) return send(429, { error: 'busy, try again in a minute' }); }
    const body = await req.text(); if (body.length > 12e6) return send(413, { error: 'too big' });
    const { image, media_type } = JSON.parse(body || '{}');
    if (!image) return send(400, { error: 'no image' });
    try {
      const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
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
      if (response.stop_reason === 'refusal') return send(422, { error: 'declined' });
      const text = response.content.find(b => b.type === 'text');
      if (!text) return send(502, { error: 'no answer' });
      return send(200, JSON.parse(text.text));
    } catch (e) {
      if (e instanceof Anthropic.RateLimitError) return send(429, { error: 'busy, try again' });
      if (e instanceof Anthropic.APIError) return send(502, { error: e.message });
      return send(500, { error: String(e) });
    }
  },
};
