// Cloudflare Worker: reads an uploaded piece with Claude for the design consultation (POST /look).
// The key is a Worker secret (npx wrangler secret put ANTHROPIC_API_KEY), never in the site or the repo.
// Only the live site and localhost may call it, at most 10 readings a minute (the LIMITER binding).
import Anthropic from '@anthropic-ai/sdk';

const ALLOWED = /^(https:\/\/remontewodrosasefa-hash\.github\.io|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/;

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
