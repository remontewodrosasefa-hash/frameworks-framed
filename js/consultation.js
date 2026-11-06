// The design consultation (consultation.html): a clickable prototype of choosing a frame with Claire, the way it goes in the shop.
// Steps on <body data-step> + the URL hash: piece → look → q (one screen at a time) → think → result → done.
// Order follows a real consultation: read the piece (weight, era, what's in it) → the piece's facts (printed? size, meaning)
// → taste: what to avoid, corners laid on the piece, step back, profile, mount → the room second → three picks.
// The reading: the four samples are written by hand; an upload is sent to Claude through server.mjs (/api/look) and,
// if that isn't running (GitHub Pages), only its colours are read here. Uploads are always marked "Rough guess".
// Picks come from points (SCORES): the piece and the corners kept count most, the room only nudges. Claire's lines are placeholders.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  const cap = t => t ? t[0].toUpperCase() + t.slice(1) : t;
  const low = t => /^[A-Z][A-Z]/.test(t) ? t : t[0].toLowerCase() + t.slice(1);   // keeps "FSC"
  const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');

  // ---- the frames (as in the configurator; k = moulding width in cm, d = depth in cm).
  //      profile = the shape of the moulding: placeholders to confirm with Claire ----
  const FRAMES = [
    { id: 'chipped', extra: 25, kicker: 'Upcycled wood', name: 'Chipped white', line: 'Old Berlin doors, the paint left as it was. No two alike.', k: 3.2, d: 2.4, profile: 'slope', wide: true },
    { id: 'oak', extra: 0, kicker: 'Solid wood', name: 'Oak, natural', line: 'FSC oak, waxed. Warm and light. My most-chosen frame.', k: 2.2, d: 2.2, profile: 'flat' },
    { id: 'walnut', extra: 20, kicker: 'Solid wood', name: 'Walnut', line: 'Dark and calm, oiled by hand. It gives a piece weight.', k: 2.2, d: 2.4, profile: 'scoop' },
    { id: 'black', extra: 0, kicker: 'Painted wood', name: 'Black, slim', line: 'The quiet gallery classic. A thin line, the picture talks.', k: 1.5, d: 2.2, profile: 'flat', slim: true },
    { id: 'white', extra: 0, kicker: 'Painted wood', name: 'White, slim', line: 'Lets the picture do the talking.', k: 1.5, d: 2.2, profile: 'flat', slim: true },
    { id: 'steel', extra: 30, kicker: 'Steel', name: 'Raw steel', line: 'Welded and waxed, every mark left in.', k: 1.2, d: 3, profile: 'box', slim: true },
    { id: 'gold', extra: 40, kicker: 'Gilded wood', name: 'Gold leaf', line: 'Laid by hand, leaf by leaf. It owns the wall.', k: 2.6, d: 3, profile: 'scoop', wide: true },
    { id: 'box', extra: 30, kicker: 'Shadow box', name: 'Black shadow box', line: 'Deep, for objects and layered work.', k: 3.4, d: 5, profile: 'box', wide: true },
    // variants: same material in another width or finish (mat = how it's drawn, like = whose points it borrows)
    { id: 'oak-wide', extra: 15, mat: 'oak', like: 'oak', kicker: 'Solid wood', name: 'Oak, wide', line: 'The same oak, twice the width. Calm, with presence.', k: 4, d: 2.4, profile: 'flat', wide: true },
    { id: 'walnut-slim', extra: 15, mat: 'walnut', like: 'walnut', kicker: 'Solid wood', name: 'Walnut, slim', line: 'A thin dark line of walnut. Warm, but quiet.', k: 1.4, d: 2.2, profile: 'flat', slim: true },
    { id: 'black-wide', extra: 10, mat: 'black', like: 'black', kicker: 'Painted wood', name: 'Black, wide', line: 'A bold black border. Graphic, for strong pieces.', k: 3.6, d: 2.4, profile: 'flat', wide: true },
    { id: 'white-wide', extra: 10, mat: 'white', like: 'white', kicker: 'Painted wood', name: 'White, wide', line: 'Wide and white, like old Berlin plaster.', k: 3.6, d: 2.6, profile: 'slope', wide: true },
    { id: 'ash', extra: 5, mat: 'ash', like: 'oak', kicker: 'Solid wood', name: 'Natural ash', line: 'Pale, almost white wood. Light and Nordic.', k: 2, d: 2.2, profile: 'flat' },
    { id: 'grey', extra: 5, mat: 'grey', like: 'white', kicker: 'Washed wood', name: 'Grey wash', line: 'Oak washed in grey: the grain shows through.', k: 2.4, d: 2.2, profile: 'flat' },
    { id: 'silver', extra: 35, mat: 'silver', like: 'gold', kicker: 'Gilded wood', name: 'Silver leaf', line: 'Cool, soft shine. Gold’s quieter sister.', k: 2.2, d: 2.8, profile: 'scoop' },
  ];
  const matOf = id => F(id).mat || id;
  const F = id => FRAMES.find(f => f.id === id);
  const MOUNTS = { white: ['#fbfaf7', 'white mount'], cream: ['#efe8d8', 'cream mount'], black: ['#1e1e1e', 'black mount'], none: [null, 'no mount'] };
  const GLASS = { clear: [0, .1, 'clear glass'], anti: [18, .03, 'non-reflective glass'], museum: [42, 0, 'museum glass'] }; // extras are placeholders
  const TIERS = [[51, 56], [76, 74], [100, 106], [126, 124], [151, 162], [170, 190]];   // the homepage ladder, by length + width
  const priceFor = (w, h) => { const t = TIERS.find(t => w + h <= t[0]); return t ? t[1] : null; };
  const SIZES = [['A5', 14.8, 21], ['A4', 21, 29.7], ['30 × 40', 30, 40], ['A3', 29.7, 42], ['40 × 50', 40, 50], ['A2', 42, 59.4], ['50 × 70', 50, 70], ['A1', 59.4, 84]];
  const WALLS = [
    { id: 'white', name: 'off-white', c: '#f1efea' }, { id: 'grey', name: 'warm grey', c: '#c9c4bb' }, { id: 'sage', name: 'sage', c: '#b4c0aa' },
    { id: 'blue', name: 'dusty blue', c: '#a7b6c5' }, { id: 'terracotta', name: 'terracotta', c: '#c48a6c' }, { id: 'charcoal', name: 'charcoal', c: '#3a3d40' },
  ];
  const STUDIO_WALL = 'assets/landing/closing-wall.jpg';
  // the photo reading: a Cloudflare Worker (worker/index.js) that holds the API key; server.mjs serves the same at /api/look locally
  const LOOK_URL = location.port === '3000' ? 'api/look' : 'https://frameworks-look.frameworks-framed.workers.dev/look';

  // ---- samples: art cut out of Frameworks' own photos, each read by hand. boxes = [x, y, w, h, label] in % ----
  // (as phone files they count as 12 MP photos, for the print-size advice)
  const SAMPLES = [
    { id: 'crow', name: 'Philip Halsman', src: 'assets/choice/sample-crow.jpg',
      look: { what: 'photo', detail: 'people', subject: 'Tippi Hedren and a crow', type: 'Photograph · Philip Halsman', weight: 'Light', era: 'Vintage', format: 'Portrait',
        medium: 'Photo print', condition: 'Good, slight tone', details: ['Black and white', 'No border'],
        line: 'Philip Halsman’s Tippi Hedren, from the Birds years. All soft greys: it wants a clean, quiet line round it.',
        notes: [{ label: 'Her profile', note: 'The light sits on her face. A white mount gives it air.', x: 56, y: 16, w: 36, h: 33 },
          { label: 'The crow', note: 'The darkest shape: a black frame would echo it, wood would warm it.', x: 0, y: 39, w: 42, h: 32 },
          { label: 'Soft grey tone', note: 'No hard blacks or whites, so nothing loud round it.', x: 6, y: 4, w: 40, h: 22 }],
        questions: [{ q: 'Is this an original print, or a reproduction?', options: ['An original print', 'A reproduction', 'Not sure'] },
          { q: 'Should the whole photo show, edge to edge?', options: ['Yes, all of it', 'A little can hide under the mount'] }] } },
  ];

  // ---- the consultation: one screen at a time; `when` makes it adapt ----
  const DETAIL = {
    photo: { t: 'What’s in the photo?', o: [['people', 'People'], ['pet', 'A pet or animal'], ['place', 'A place'], ['moment', 'A big day']] },
    print: { t: 'What kind of print?', o: [['exhibition', 'Exhibition poster'], ['artprint', 'Art print'], ['gig', 'Gig or film poster'], ['map', 'Map or graphic']] },
    original: { t: 'What kind of artwork?', o: [['painting', 'Painting'], ['drawing', 'Drawing'], ['collage', 'Collage'], ['textile', 'Textile art']] },
    object: { t: 'What is it?', o: [['shirt', 'A shirt or fabric'], ['medal', 'Medal or badge'], ['letter', 'Letter or document'], ['thing', 'Something 3D']] },
  };
  const Q = [
    // your piece: first what the reading couldn't tell from a photo
    { id: 'ask0', ch: 'piece', kind: 'ask', when: () => !!(S.look && S.look.questions && S.look.questions[0]), t: () => S.look.questions[0].q },
    { id: 'ask1', ch: 'piece', kind: 'ask', when: () => !!(S.look && S.look.questions && S.look.questions[1]), t: () => S.look.questions[1].q },
    { id: 'what', ch: 'piece', when: () => !S.pre, t: 'What are you framing?', o: [['photo', 'A photo'], ['print', 'A print or poster'], ['original', 'An original artwork'], ['object', 'A keepsake or object']] },
    { id: 'detail', ch: 'piece', when: a => a.what && !S.pre, t: a => DETAIL[a.what].t, o: a => DETAIL[a.what].o },
    { id: 'depth', ch: 'piece', when: a => a.what === 'object', t: 'How thick is it?', o: [['flat', 'Flat, like paper'], ['some', 'A little depth', 'up to 3 cm'], ['deep', 'Deep', 'over 3 cm']] },
    { id: 'printed', ch: 'piece', when: a => (a.what === 'photo' || a.what === 'print') && !S.known.has('printed'), t: 'Is it printed yet?', o: [['paper', 'Yes, it’s on paper'], ['file', 'No, it’s a file', 'we print it for you, on archival paper']] },
    { id: 'size', ch: 'piece', kind: 'size', t: a => a.printed === 'file' ? 'How big shall we print it?' : 'How big is it?' },
    { id: 'meaning', ch: 'piece', t: 'What is it to you?', o: [['memory', 'A memory'], ['joy', 'I just love it'], ['statement', 'A statement'], ['gift', 'A gift']] },
    { id: 'for', ch: 'piece', when: a => a.meaning === 'gift', t: 'Who is it for?', o: [['partner', 'My partner'], ['parents', 'My parents'], ['friend', 'A friend'], ['colleague', 'A colleague']] },
    { id: 'age', ch: 'piece', when: a => a.what === 'photo' && a.printed === 'paper' && !S.known.has('age'), t: 'How old is the print?', o: [['new', 'New', 'printed recently'], ['old', 'Old', 'it has a few years on it']] },
    { id: 'unique', ch: 'piece', when: a => a.what === 'original' || (a.what === 'print' && a.printed === 'paper') || a.detail === 'letter', t: 'Could you replace it?', o: [['one', 'No, it’s one of a kind'], ['copy', 'Yes, it’s a copy']] },
    { id: 'n-first', ch: 'piece', kind: 'note', t: 'I frame the piece first. The room comes second.' },
    // your taste: the shop ritual
    { id: 'avoid', ch: 'taste', kind: 'avoid', t: 'Anything you’d rather avoid?', o: [['gold', 'Gold or shiny', 'gold'], ['black', 'Black', 'black'], ['darkwood', 'Dark wood', 'walnut'], ['white', 'White', 'white'], ['wide', 'Wide, chunky frames', 'chipped'], ['ornate', 'Old-fashioned', 'gold']] },
    { id: 'corners', ch: 'taste', kind: 'corners', t: 'Keep the ones you like.' },
    { id: 'stepback', ch: 'taste', kind: 'stepback', t: 'Now step back.' },
    { id: 'thisthat', ch: 'taste', kind: 'thisthat', t: 'This or that?' },
    { id: 'profile', ch: 'taste', kind: 'profile', when: a => a.depth !== 'deep', t: 'Which shape feels right?' },
    { id: 'matpref', ch: 'taste', kind: 'duel', when: a => a.what !== 'object', t: 'With a mount, or edge to edge?', duel: [['yes', 'With a mount', 'white'], ['no', 'Edge to edge', 'none']] },
    { id: 'persona', ch: 'taste', kind: 'persona', t: 'Here’s your framing style.' },
    // your room: second
    { id: 'wallphoto', ch: 'room', kind: 'wall', when: () => false,   // off for now (6 Nov): everyone gets the studio wall
      t: a => a.meaning === 'gift' ? 'Do you know where it will hang?' : 'Where will it hang?' },
    { id: 'room', ch: 'room', t: a => a.meaning === 'gift' ? 'Which room, roughly?' : 'Which room?', o: [['living', 'Living room'], ['bedroom', 'Bedroom'], ['hall', 'Hallway'], ['work', 'Workspace'], ['wet', 'Kitchen or bathroom']] },
    { id: 'wall', ch: 'room', when: a => !S.wallPhoto && a.meaning !== 'gift', t: 'What colour is the wall?', swatch: true, o: WALLS.map(w => [w.id, cap(w.name), w.c]) },
    { id: 'light', ch: 'room', when: a => a.meaning !== 'gift', t: 'Does the wall get sun?', o: [['sun', 'Yes, direct sun'], ['some', 'Some daylight'], ['dark', 'Not much', 'mostly lamps']] },
    { id: 'report', ch: 'room', kind: 'report', when: a => a.meaning !== 'gift', t: 'Here’s what your wall is up against.' },
    { id: 'layout', ch: 'room', t: 'Will it hang alone?', o: [['alone', 'Yes, on its own'], ['gallery', 'With other frames'], ['shelf', 'Leaning on a shelf']] },
    // your frame: the budget, with real numbers for their size
    { id: 'budget', ch: 'frame', t: 'Your budget?', o: () => { const b = priceFor(S.size.pw, S.size.ph) ?? 190;
      return [['simple', 'Keep it simple', `up to about €${b + 20}`], ['mid', 'Somewhere in between', `up to about €${b + 60}`], ['open', 'Whatever suits it best', `€${b + 60} and up is fine`], ['either', 'Show me the best, I’ll decide', 'no limit for now']]; } },
  ];

  // points per "question:answer" for each frame. The piece counts fully; the room (ROOM) at half
  const SCORES = {
    'what:photo': { oak: 2, black: 2, white: 1 }, 'what:print': { black: 2, white: 1, steel: 1, oak: 1 }, 'what:original': { walnut: 2, gold: 2, chipped: 1, oak: 1 }, 'what:object': { box: 6 },
    'detail:pet': { oak: 2, walnut: 1, chipped: 1 }, 'detail:moment': { walnut: 2, gold: 1, white: 1 }, 'detail:exhibition': { black: 2, white: 1 }, 'detail:artprint': { oak: 2, white: 1 },
    'detail:gig': { black: 2, steel: 2 }, 'detail:map': { oak: 1, steel: 1, white: 2 }, 'detail:painting': { gold: 2, walnut: 2, chipped: 1 }, 'detail:drawing': { oak: 1, white: 2 },
    'detail:collage': { box: 2, chipped: 1 }, 'detail:textile': { box: 2, oak: 1 }, 'detail:shirt': { box: 5 }, 'detail:medal': { box: 4, gold: 1 }, 'detail:letter': { walnut: 2, gold: 1 }, 'detail:thing': { box: 5 },
    'depth:some': { box: 4, chipped: -3, oak: -3, walnut: -3, black: -3, white: -3, steel: -3, gold: -3 }, 'depth:deep': { box: 9, chipped: -8, oak: -8, walnut: -8, black: -8, white: -8, steel: -8, gold: -8 },
    'weight:Light': { black: 2, white: 2, steel: 2, oak: 1 }, 'weight:Heavy': { chipped: 2, gold: 2, walnut: 2, box: 1 },
    'era:Antique': { gold: 3, walnut: 2, chipped: 1 }, 'era:Vintage': { walnut: 2, gold: 1, oak: 1, black: 1 }, 'era:Contemporary': { black: 1, white: 1, steel: 1, oak: 1 },
    'meaning:memory': { walnut: 2, oak: 1, gold: 1 }, 'meaning:joy': { oak: 1, chipped: 1, white: 1 }, 'meaning:statement': { gold: 2, steel: 2, black: 1 }, 'meaning:gift': { oak: 1, walnut: 1, white: 1 },
    'for:parents': { walnut: 2, gold: 1 }, 'for:colleague': { black: 2, white: 1 },
    'age:old': { walnut: 2, gold: 2, chipped: 1 }, 'unique:one': { walnut: 1, gold: 1 },
        'room:bedroom': { oak: 1, white: 1 }, 'room:hall': { black: 1, steel: 1 }, 'room:work': { black: 1, steel: 1 }, 'room:wet': { steel: 2, white: 1, black: 1 },
    'wall:white': { black: 1, oak: 1 }, 'wall:grey': { oak: 2, walnut: 1 }, 'wall:sage': { oak: 2, chipped: 1 }, 'wall:blue': { white: 2, gold: 1 }, 'wall:terracotta': { walnut: 2, gold: 1 }, 'wall:charcoal': { gold: 2, white: 2 },
    'layout:alone': { gold: 1, walnut: 1, chipped: 1 }, 'layout:gallery': { black: 2, oak: 2 }, 'layout:shelf': { box: 2, oak: 1 },
  };
  const ROOM = new Set(['room', 'wall', 'layout']);
  const TAG = {
    weight: { Light: 'is slim enough for a light piece', Heavy: 'can carry a heavy piece' },
    era: { Antique: 'suits its age', Vintage: 'suits an older piece', Contemporary: 'keeps a modern piece modern' },
    meaning: { memory: 'gives a memory some weight', statement: 'has real presence', gift: 'is easy to give', joy: 'is easy to live with' },
    what: { object: 'is deep enough for objects', original: 'is made for originals' },
    detail: { pet: 'is warm, like a pet photo wants', gig: 'has a bit of attitude', map: 'keeps all those fine lines clear', painting: 'is made for paintings' },
    age: { old: 'is gentle on an old print' },
    profile: { flat: 'has the flat profile you liked', box: 'has the deep box profile you liked', scoop: 'curves in towards the picture, like you liked', slope: 'pushes the piece forward, like you liked' },
    layout: { gallery: 'mixes well on a gallery wall', shelf: 'stands well on a shelf', alone: 'is strong enough on its own' },
  };
  const AVOID = { gold: f => ['gold', 'silver'].includes(matOf(f.id)), black: f => ['black', 'box'].includes(matOf(f.id)), darkwood: f => matOf(f.id) === 'walnut',
    white: f => ['white', 'chipped', 'grey'].includes(matOf(f.id)), wide: f => !!f.wide, ornate: f => ['gold', 'silver'].includes(matOf(f.id)) };
  const avoided = f => (S.a.avoid || []).some(x => AVOID[x] && AVOID[x](f));
  const PROFILES = [
    ['flat', 'Flat', 'Quiet. It steps back.', 'M4 26h52v-14H4z'],
    ['box', 'Box', 'Thin front, deep side. Modern.', 'M4 26h8V6h44v6H18v14z'],
    ['scoop', 'Scoop', 'Curves in. Draws the eye to the picture.', 'M4 26h52V10C40 10 30 22 4 22z'],
    ['slope', 'Sloped', 'Leans out. Pushes the piece forward.', 'M4 26h52L56 8L4 18z'],
  ];

  // ---- Claire's lines (placeholders for her own words) ----
  const REACT = {
    'what:photo': 'A photo. Let’s see what’s in it.', 'what:print': 'Prints are fun. Tell me a bit more.', 'what:original': 'An original. We’ll take good care of it.', 'what:object': 'Objects are my favourite. They need depth.',
    'detail:people': 'People photos like a calm frame.', 'detail:pet': 'Pets are the ones people cry about in my shop.', 'detail:place': 'A place. We want the view to open up.', 'detail:moment': 'A big day deserves something special.',
    'detail:exhibition': 'Exhibition posters like a clean edge.', 'detail:artprint': 'Art prints can take a wider frame.', 'detail:gig': 'Gig posters want a bit of attitude.', 'detail:map': 'Maps look great in natural wood.',
    'detail:painting': 'Paintings often look best without a mount.', 'detail:drawing': 'Drawings love a mount and some space.', 'detail:collage': 'Collage needs depth for the layers.', 'detail:textile': 'Textiles get mounted, never pressed.',
    'detail:shirt': 'Shirts go in a deep box.', 'detail:medal': 'Medals need a box so they can stand out.', 'detail:letter': 'Paper like that needs good glass.', 'detail:thing': 'Something 3D. A box frame it is.',
    'depth:flat': 'Flat is easy. Any frame works.', 'depth:some': 'Then it needs a little extra depth.', 'depth:deep': 'Deep. A shadow box, for sure.',
    'printed:paper': 'Good. Then I’ll frame the print you have.', 'printed:file': 'Then we print it for you, on archival paper.',
    'size:any': 'Good size. I’ll keep that in mind for the mount.',
    'meaning:memory': 'Then we take extra care with it.', 'meaning:joy': 'Simple and happy. Good.', 'meaning:statement': 'Then we can go bolder.', 'meaning:gift': 'Lovely. Who’s the lucky one?',
    'for:partner': 'Something they’ll see every day.', 'for:parents': 'Parents tend to like warm, classic frames.', 'for:friend': 'Let’s keep it easy to fit any home.', 'for:colleague': 'Clean and safe. Good thinking.',
    'age:new': 'A fresh print, easy.', 'age:old': 'Old prints need gentle care and good glass.',
    'unique:one': 'One of a kind. We’ll protect it properly.', 'unique:copy': 'Good to know. We can keep it simpler.',
    'avoid:any': 'Noted. Those stay in the drawer.', 'avoid:none': 'Open to anything. I like that.',
    'stepback:right': 'Good. Then the weight is right.', 'stepback:heavy': 'Too heavy from over there. I’ll go slimmer.', 'stepback:thin': 'It disappears a bit. I’ll give it more frame.',
    'profile:flat': 'Flat. Quiet and clean.', 'profile:box': 'A box. Modern, with some depth.', 'profile:scoop': 'A scoop. It pulls you into the picture.', 'profile:slope': 'Sloped. The piece steps forward.', 'profile:either': 'Fine, I’ll choose the shape.',
    'matpref:yes': 'A mount it is.', 'matpref:no': 'Edge to edge. Modern.', 'matpref:either': 'I’ll decide that.',
    'wallphoto:yes': 'Thanks. That helps more than any question.', 'wallphoto:skip': 'No problem, I’ll use my wall.',
    'room:living': 'The living room. Everyone will see it.', 'room:bedroom': 'The bedroom. Calm is good there.', 'room:hall': 'The hallway. The first thing guests see.', 'room:work': 'Something to look up to while you work.', 'room:wet': 'Kitchen or bathroom. Then steam matters.',
    'wall:white': 'Off-white goes with almost anything.', 'wall:grey': 'Warm grey makes wood glow.', 'wall:sage': 'Sage and natural wood, my favourite pair.', 'wall:blue': 'Dusty blue loves white and gold.', 'wall:terracotta': 'Terracotta is brave. Walnut looks great on it.', 'wall:charcoal': 'A dark wall. Light frames will glow.',
    'budget:simple': 'Good frames don’t have to cost a lot. I’ll keep it simple.', 'budget:mid': 'Room to play. Good.', 'budget:open': 'Then I’ll choose on looks alone.', 'budget:either': 'Fine. I’ll show you the best, you decide.',
    'light:sun': 'Direct sun fades prints. I’ll keep that in mind.', 'light:some': 'Daylight is perfect.', 'light:dark': 'Then we watch out for glare from lamps.',
  };
  const WALL_SAY = { white: 'Off-white. That goes with nearly everything.', grey: 'Warm grey. Wood will glow on it.', sage: 'Sage! Natural wood loves it.', blue: 'Dusty blue. White and gold both work.', terracotta: 'Terracotta. Warm and brave.', charcoal: 'A dark wall. Light frames will glow.' };
  const MAT_SAY = { none: 'Edge to edge. Clean and modern.', white: 'A white mount gives it room to breathe.', cream: 'Cream is softer. Lovely with older photos.', black: 'A black mount. Dramatic, I like it.' };
  const GLASS_SAY = { clear: 'Clear glass is fine for most things.', anti: 'Non-reflective: you see the picture, not the lamp.', museum: 'Museum glass: almost no reflections, and it blocks UV. Worth it.' };

  // ---- state ----
  const S = { known: new Set(), pic: null, ratio: .76, filePx: null, upload: false, sample: null, look: null, pre: null, img: null,
    wallPhoto: null, wall: null, a: {}, qi: 0, last: null, kept: [], dropped: [], picks: [], why: {},
    frame: null, mount: 'white', mw: 5, lip: null, glass: 'clear', size: null, view: 0 };

  const wide = () => matchMedia('(min-width: 1101px)').matches;

  // ---- Claire's line types out on the screen's [data-say] ----
  let sayT;
  function say(t, el = $(`.step[data-step="${document.body.dataset.step}"] [data-say]`)) {
    if (!el) return; clearInterval(sayT);
    if (reduce) { el.textContent = t; return; }
    let i = 0; el.textContent = '';
    sayT = setInterval(() => { i += 2; el.textContent = t.slice(0, i); if (i >= t.length) clearInterval(sayT); }, 16);
  }

  // ---- steps ----
  const CH = { piece: 'piece', look: 'piece', think: 'frame', result: 'frame', done: 'frame' };
  function go(step, push = true) {
    document.body.dataset.step = step;
    $('.cf-back').hidden = step === 'piece';
    if (push) history.pushState({ step, qi: S.qi }, '', '#' + step);
    window.scrollTo(0, 0);
    const ch = step === 'q' ? activeQs()[S.qi].ch : CH[step], order = ['piece', 'taste', 'room', 'frame'], i = order.indexOf(ch);
    $$('.cc-chapters li').forEach((li, j) => { li.classList.toggle('done', j < i); li.toggleAttribute('aria-current', j === i); });
    const qs = activeQs().length;
    const p = step === 'piece' ? .03 : step === 'look' ? .1 : step === 'q' ? .12 + .8 * (S.qi + 1) / qs : step === 'think' ? .95 : 1;
    $('.cf-bar').style.setProperty('--p', p);
    $('.cc-step').textContent = step === 'q' ? `${String(S.qi + 1).padStart(2, '0')} / ${qs}` : step === 'piece' ? 'start' : step === 'look' ? 'reading' : step === 'think' ? 'picking' : 'done';
    $('.cf-bar').classList.toggle('early', p < .2);
  }
  addEventListener('popstate', e => {
    const s = e.state || { step: 'piece' };
    if (s.step === 'q' && S.pic) { S.qi = s.qi || 0; renderQ(false); }
    else if (s.step === 'result' && S.picks.length) { go('result', false); drawResult(); }
    else if (s.step === 'look' && S.look) go('look', false);
    else go('piece', false);
  });

  // ---- image tools ----
  const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  function analyse(img, region = [0, 0, 1, 1]) {
    const N = 60, c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
    const [sx, sy, sw, sh] = region;
    x.drawImage(img, img.naturalWidth * sx, img.naturalHeight * sy, img.naturalWidth * sw, img.naturalHeight * sh, 0, 0, N, N);
    const d = x.getImageData(0, 0, N, N).data; let r = 0, g = 0, b = 0, sat = 0, n = 0; const buckets = {}, lum = [], sats = [];
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2]; r += R; g += G; b += B; n++;
      const mx = Math.max(R, G, B), mn = Math.min(R, G, B), s = mx ? (mx - mn) / mx : 0; sat += s;
      lum.push(R * .3 + G * .59 + B * .11); sats.push(s);
      const k = (R >> 5) + ',' + (G >> 5) + ',' + (B >> 5); buckets[k] = (buckets[k] || 0) + 1;
    }
    r /= n; g /= n; b /= n;
    const palette = Object.entries(buckets).sort((p, q) => q[1] - p[1]).slice(0, 5).map(([k]) => { const [R, G, B] = k.split(',').map(v => v * 32 + 16); return `rgb(${R},${G},${B})`; });
    // rough marks for an upload read here: the busiest 3 × 3 cell (most contrast) and the most colourful one
    const cell = (f) => { let best = 0, bi = 0; for (let cy = 0; cy < 3; cy++) for (let cx = 0; cx < 3; cx++) {
      let v = 0; for (let y = cy * 20; y < cy * 20 + 20; y++) for (let x2 = cx * 20 + 1; x2 < cx * 20 + 20; x2++) v += f(y * N + x2); if (v > best) { best = v; bi = cy * 3 + cx; } } return bi; };
    const busy = cell(i => Math.abs(lum[i] - lum[i - 1])), bright = cell(i => sats[i]);
    const contrast = Math.sqrt(lum.reduce((s, l) => s + (l - (r * .3 + g * .59 + b * .11)) ** 2, 0) / n);
    return { r, g, b, warmth: r - b, bright: r * .3 + g * .59 + b * .11, sat: sat / n, contrast, palette, busy, colourCell: bright };
  }
  function nearestWall(a) {
    let best = WALLS[0], bd = 1e9;
    WALLS.forEach(w => { const [R, G, B] = [1, 3, 5].map(i => parseInt(w.c.substr(i, 2), 16)); const dd = (R - a.r) ** 2 + (G - a.g) ** 2 + (B - a.b) ** 2; if (dd < bd) { bd = dd; best = w; } });
    return best.id;
  }
  function imageRules(a) {
    if (!a) return [];
    const rules = [];
    if (a.sat < .12) rules.push({ tag: 'draws a clean line around black and white', s: { black: 2, white: 2, steel: 1 } });
    else if (a.warmth > 18) rules.push({ tag: 'picks up the warm tones in your piece', s: { oak: 2, walnut: 2, gold: 1 } });
    else if (a.warmth < -6) rules.push({ tag: 'suits the cool tones in your piece', s: { white: 2, black: 1, steel: 1 } });
    if (a.sat > .38) rules.push({ tag: 'gives a colourful piece a calm edge', s: { white: 2, oak: 1, black: 1 } });
    return rules;
  }
  // a smaller JPEG of the upload, for Claude (base64 without the data: prefix)
  function shrink(img, max = 1100) {
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', .85).split(',')[1];
  }

  // the picture fitted inside the paper size at its own ratio (pw × ph = the paper, for the price and the summary)
  function fitArt(name, pw, ph) {
    const r = S.ratio, fit = pw / ph > r ? { w: ph * r, h: ph } : { w: pw, h: pw / r };
    return { name, w: fit.w, h: fit.h, pw, ph };
  }

  // ---- drawing: frames to scale, and corner samples ----
  function frameEl(o, bw, bh) {
    const f = F(o.frame), s = o.size || S.size, mw = o.mount === 'none' ? 0 : (o.mw ?? S.mw);
    const W = s.w + 2 * (mw + f.k), H = s.h + 2 * (mw + f.k), px = Math.min(bw / W, bh / H);
    const el = document.createElement('div');
    el.className = 'fr'; el.dataset.fr = matOf(f.id); el.dataset.mount = o.mount;
    const st = el.style;
    st.setProperty('--k', Math.max(3, f.k * px) + 'px'); st.setProperty('--mw', mw * px + 'px');
    st.setProperty('--aw', s.w * px + 'px'); st.setProperty('--ah', s.h * px + 'px'); st.setProperty('--d', f.d * px + 'px');
    st.setProperty('--mc', MOUNTS[o.mount][0] || 'transparent'); st.setProperty('--glare', GLASS[o.glass || 'clear'][1]);
    if (o.lip && o.mount !== 'none') { el.dataset.lip = ''; st.setProperty('--lip', o.lip); st.setProperty('--lipw', Math.max(2, .5 * px) + 'px'); }
    el.innerHTML = `<i class="s t"></i><i class="s r"></i><i class="s b"></i><i class="s l"></i><i class="dp dp-l"></i><i class="dp dp-r"></i><div class="mount"><div class="art"><img src="${S.pic}" alt=""></div></div>`;
    return el;
  }
  function cornerEl(id, kPx, len, cls = '') {
    const c = document.createElement('i'); c.className = 'cn ' + cls; c.dataset.fr = matOf(id);
    c.style.setProperty('--k', kPx + 'px'); c.style.setProperty('--len', len + 'px');
    c.innerHTML = '<i class="h"></i><i class="v"></i>'; return c;
  }
  const cornerIcon = id => `<span class="cc-ico">${cornerEl(id, 9, 34).outerHTML}</span>`;

  // ---- 1 · the piece ----
  $$('[data-sample]').forEach(b => b.addEventListener('click', () => { const s = SAMPLES.find(x => x.id === b.dataset.sample); setPiece(s.src, s); }));
  $('#cc-file').addEventListener('change', e => { const f = e.target.files[0]; if (f) setPiece(URL.createObjectURL(f), null); });
  const drop = $('[data-drop]');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('click', () => $('#cc-file').click());
  drop.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) setPiece(URL.createObjectURL(f), null); });


  let imgEl = null;
  async function setPiece(src, sample) {
    const img = await loadImg(src); if (!img) return;
    imgEl = img;
    const r = img.naturalWidth / img.naturalHeight;
    Object.assign(S, { asked: {}, pic: src, sample, upload: !sample, ratio: r, img: analyse(img), pre: null, look: null, a: {}, kept: [], dropped: [], tt: [], size: null, lip: null,
      filePx: sample ? (r >= 1 ? [4032, Math.round(4032 / r)] : [Math.round(4032 * r), 4032]) : [img.naturalWidth, img.naturalHeight] });
    look();
  }

  // ---- 2 · the reading ----
  let lookRun = 0;
  async function look() {
    const run = ++lookRun, sec = $('.st-look');
    go('look');
    sec.classList.remove('read'); sec.classList.add('scanning');
    $('.cc-scan-img').src = S.pic; $('.cc-boxes').innerHTML = ''; $('.cc-chips').innerHTML = '';
    $('#look-title').textContent = 'Let me have a look…'; $('[data-say]', sec).textContent = ''; $('.cc-notes').innerHTML = '';
    $('.cc-look-actions').hidden = true; $('.cc-rough').hidden = !S.upload;
    $('.cc-scan-note').textContent = 'Looking at your piece…';
    const a = S.img, fmtName = S.ratio > 1.05 ? 'Landscape' : S.ratio < .95 ? 'Portrait' : 'Square';
    let L;
    if (S.sample) { await wait(1700); L = S.sample.look; }
    else {
      // an upload: ask Claude (server.mjs); without it, read the colours here
      const [res] = await Promise.all([
        fetch(LOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: shrink(imgEl), media_type: 'image/jpeg' }) })
          .then(r => r.ok ? r.json() : null).catch(() => null),
        wait(1700),
      ]);
      if (res && res.subject) L = { ...res, read: true };
      else {
        const tone = a.sat < .12 ? 'mostly black and white' : a.sat > .38 ? 'full of colour' : a.warmth > 18 ? 'in warm colours' : a.warmth < -6 ? 'in cool colours' : 'in soft, mixed colours';
        const box = i => [(i % 3) * 33.3 + 2, Math.floor(i / 3) * 33.3 + 2, 29, 29], xywh = ([x, y, w, h]) => ({ x, y, w, h });
        L = { subject: 'Lovely. Tell me what it is', tone, type: '—', format: fmtName,
          weight: a.contrast > 60 || a.sat > .4 || a.bright < 85 ? 'Heavy' : a.contrast < 35 ? 'Light' : 'Medium',
          era: a.sat < .25 && a.warmth > 12 ? 'Vintage' : 'Contemporary',
          line: `I can see it’s ${tone}. A few questions and I’ll know the rest.`,
          notes: [{ label: 'Focal point', note: 'Where the eye goes first. The mount should give it room.', ...xywh(box(a.busy)) },
            ...(a.colourCell !== a.busy ? [{ label: 'Strongest colour', note: 'A frame can echo this colour, or stay calm against it.', ...xywh(box(a.colourCell)) }] : [])] };
      }
    }
    if (run !== lookRun) return;
    S.look = L;
    sec.classList.remove('scanning');
    const notes = (L.notes || []).slice(0, 4);
    $('.cc-boxes').innerHTML = notes.map((n, i) => `<span class="cc-box" style="--x:${n.x}%;--y:${n.y}%;--w:${n.w}%;--h:${n.h}%;--i:${i}"><b>${i + 1} · ${n.label}</b></span>`).join('');
    $('.cc-scan-note').textContent = `${notes.length} things I noticed${S.upload ? ' · rough guess' : ''}`;
    await wait(250 + 300 * notes.length); if (run !== lookRun) return;
    sec.classList.add('read');
    $('#look-title').textContent = cap(L.subject) + '.';
    const chip = (k, v) => v && v !== '—' ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '';
    $('.cc-notes').innerHTML = notes.map((n, i) => `<li style="--i:${i}"><span class="cc-note-n">${i + 1}</span><span><b>${n.label}</b>${n.note}</span></li>`).join('');
    $('.cc-chips').innerHTML = chip('Medium', L.medium || L.type) + chip('Visual weight', L.weight) + chip('Era', L.era) + chip('Condition', L.condition)
      + ((L.details || []).length ? `<div class="cc-pal"><dt>Details</dt><dd class="cc-tags">${L.details.map(d => `<span>${d}</span>`).join('')}</dd></div>` : '')
      + `<div class="cc-pal"><dt>Colours in it</dt><dd>${a.palette.map(c => `<i style="background:${c}"></i>`).join('')}</dd></div>`;
    say(L.line);
    const known = !!L.what;
    $('[data-look="yes"]').textContent = known ? 'Yes, that’s it' : 'Continue';
    $('[data-look="no"]').hidden = !known;
    $('.cc-look-actions').hidden = false;
  }
  $('[data-look="yes"]').addEventListener('click', () => {
    const L = S.look;
    S.pre = L.what ? { what: L.what, detail: L.detail, subject: L.subject } : null;
    S.a = { weight: L.weight, era: L.era, ...(S.pre ? { what: L.what, detail: L.detail } : {}), ...(L.extra || {}) };
    S.known = new Set(Object.keys(L.extra || {}));   // answered by the reading, so not asked
    startQs();
  });
  $('[data-look="no"]').addEventListener('click', () => { S.pre = null; S.known = new Set(); S.a = { weight: S.look.weight, era: S.look.era }; startQs(); });
  $$('[data-back="piece"]').forEach(b => b.addEventListener('click', () => { lookRun++; go('piece'); }));

  // ---- 3 · the consultation ----
  const activeQs = () => Q.filter(q => !q.when || q.when(S.a));
  function startQs() { S.qi = 0; S.last = S.pre ? '__look' : null; renderQ(); }
  function next() { setTimeout(() => { if (S.qi < activeQs().length - 1) { S.qi++; renderQ(); } else think(); }, reduce ? 0 : 200); }
  function answer(q, v) { S.a[q.id] = v; S.last = q.id + ':' + v; next(); }
  $('[data-q-back]').addEventListener('click', () => { if (S.qi > 0) { S.qi--; S.last = null; renderQ(); } else go('look'); });

  function renderQ(push = true) {
    const qs = activeQs(); S.qi = Math.min(S.qi, qs.length - 1);
    const q = qs[S.qi], a = S.a, sec = $('.st-q');
    go('q', push);
    sec.dataset.kind = q.kind || (q.swatch ? 'swatch' : 'choice');
    const n = qs.slice(0, S.qi + 1).filter(x => x.kind !== 'note' && x.kind !== 'report').length;
    $('.cc-q-no').textContent = q.kind === 'note' ? 'Design consultation' : `${String(n).padStart(2, '0')} · Your ${q.ch}`;
    $('#q-title').textContent = typeof q.t === 'function' ? q.t(a) : q.t;
    // her line: a reaction to the last answer
    const react = S.last === '__look' ? `Now I know it’s ${S.pre.subject}. A few questions, then we lay some frames.` : REACT[S.last] || (S.last && S.last.startsWith('size:') ? REACT['size:any'] : '');
    say(react, $('.cc-react'));
    const body = $('.cc-body'); body.className = 'cc-body'; body.innerHTML = '';
    ({ size: renderSize, note: renderNote, avoid: renderAvoid, corners: renderCorners, stepback: renderStepback, profile: renderProfile,
      duel: renderDuel, wall: renderWall, ask: renderAsk, report: renderReport, persona: renderPersona, thisthat: renderThisThat }[q.kind] || renderChoice)(q, body);
  }

  function renderChoice(q, body) {
    const opts = typeof q.o === 'function' ? q.o(S.a) : q.o;
    body.classList.add('cc-opts'); body.classList.toggle('swatches', !!q.swatch);
    body.innerHTML = opts.map(([v, l, x]) => `<button class="choice${S.a[q.id] === v ? ' on' : ''}" type="button" data-v="${v}">${q.swatch ? `<i style="background:${x}"></i>` : ''}<b>${l}</b>${x && !q.swatch ? `<span>${x}</span>` : ''}</button>`).join('');
    $$('.choice', body).forEach(b => b.addEventListener('click', () => {
      b.classList.add('on');
      if (q.id === 'what' && S.a.what !== b.dataset.v) { delete S.a.detail; delete S.a.printed; }
      if (q.id === 'meaning' && b.dataset.v !== 'gift') delete S.a.for;
      answer(q, b.dataset.v);
    }));
  }
  function renderAsk(q, body) {
    const k = +q.id.slice(3), Qd = S.look.questions[k];
    body.classList.add('cc-opts');
    body.innerHTML = Qd.options.slice(0, 3).map(o => `<button class="choice${S.a[q.id] === o ? ' on' : ''}" type="button" data-v="${o.replace(/"/g, '&quot;')}"><b>${o}</b></button>`).join('');
    if (k === 0) say('One thing I can’t tell from a photo.', $('.cc-react'));
    $$('.choice', body).forEach(b => b.addEventListener('click', () => {
      b.classList.add('on'); S.a[q.id] = b.dataset.v; S.asked = S.asked || {}; S.asked[q.id] = [Qd.q, b.dataset.v]; S.last = null; next();
    }));
  }
  function renderNote(q, body) { body.innerHTML = `<button class="btn btn-ink" type="button">Next</button>`; $('button', body).addEventListener('click', next); }

  // size: the paper sizes, always (with cm and price); for a file not yet printed, how big it prints sharply and one recommended
  function renderSize(q, body) {
    const land = S.ratio > 1.05, file = S.a.printed === 'file';
    const sizes = SIZES.map(([name, w, h]) => land ? [name, h, w] : [name, w, h]);
    let sharp = null, rec = null;
    if (file) {
      const [pw, ph] = S.filePx, cm = px => px / 200 * 2.54;   // 200 dpi: sharp at arm's length
      sharp = [cm(pw), cm(ph)];
      const ok = sizes.filter(([, w, h]) => w <= sharp[0] * 1.02 && h <= sharp[1] * 1.02);
      rec = ok.length ? ok[ok.length - 1][0] : sizes[0][0];
    }
    body.classList.add('cc-sizes');
    body.innerHTML = (file ? `<p class="cc-sharp">Your photo is ${S.filePx[0]} × ${S.filePx[1]} pixels: sharp up to about <b>${fmt(sharp[0])} × ${fmt(sharp[1])} cm</b>.</p>` : '')
      + `<div class="cc-size-grid">${sizes.map(([name, w, h]) => {
        const soft = file && !(w <= sharp[0] * 1.02 && h <= sharp[1] * 1.02), r = w / h, iw = r < 1 ? 26 * r : 26, ih = r < 1 ? 26 : 26 / r;
        return `<button class="cc-size${S.size && S.size.name === name ? ' on' : ''}" type="button" data-size="${name}">
          <span class="cc-size-ico"><i style="width:${iw}px;height:${ih}px"></i></span>
          <span class="cc-size-t">${/×/.test(name) ? `<b>${name} cm</b><small>photo size</small>` : `<b>${name}</b><small>${fmt(w)} × ${fmt(h)} cm</small>`}</span>
          <span class="cc-size-p">from €${priceFor(w, h) ?? '—'}</span>
          ${name === rec ? '<em class="cc-tag">Recommended</em>' : soft ? '<em class="cc-tag soft">May look soft</em>' : ''}</button>`; }).join('')}
        <div class="cc-size cc-own"><span class="cc-size-t"><b>My own size</b></span>
          <label><span class="sr">Width</span><input type="number" inputmode="decimal" min="5" max="150" placeholder="W" data-cw></label><span class="x">×</span>
          <label><span class="sr">Height</span><input type="number" inputmode="decimal" min="5" max="150" placeholder="H" data-ch></label><span class="unit">cm</span>
          <button class="btn btn-ink" type="button" data-own disabled>Use</button></div></div>`;
    $$('[data-size]', body).forEach(b => b.addEventListener('click', () => {
      const [name, w, h] = sizes.find(x => x[0] === b.dataset.size);
      S.size = fitArt(name, w, h); b.classList.add('on'); S.a.size = name; S.last = 'size:' + name; next();
    }));
    const cw = $('[data-cw]', body), chh = $('[data-ch]', body), use = $('[data-own]', body);
    [cw, chh].forEach(i => i.addEventListener('input', () => { use.disabled = !(+cw.value >= 5 && +chh.value >= 5); }));
    use.addEventListener('click', () => { const w = +cw.value, h = +chh.value; S.size = fitArt(`${fmt(w)} × ${fmt(h)} cm`, w, h); S.a.size = 'own'; S.last = 'size:own'; next(); });
  }

  // avoid: each option with a real corner, so they see what they're ruling out
  function renderAvoid(q, body) {
    const cur = new Set(S.a.avoid || []);
    body.classList.add('cc-opts', 'multi');
    body.innerHTML = q.o.map(([v, l, fr]) => `<button class="choice cc-avoid" type="button" data-v="${v}" aria-pressed="${cur.has(v)}">${cornerIcon(fr)}<b>${l}</b></button>`).join('')
      + `<div class="cc-multi-go"><button class="btn btn-ink" type="button">${cur.size ? 'Continue' : 'No, I’m open to anything'}</button></div>`;
    $$('.choice', body).forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.v; cur.has(v) ? cur.delete(v) : cur.add(v); S.a.avoid = [...cur];
      b.setAttribute('aria-pressed', cur.has(v)); $('.cc-multi-go .btn', body).textContent = cur.size ? 'Continue' : 'No, I’m open to anything';
    }));
    $('.cc-multi-go .btn', body).addEventListener('click', () => { S.a.avoid = [...cur]; S.last = cur.size ? 'avoid:any' : 'avoid:none'; next(); });
  }

  // the corner round: the piece on the bench, corners laid on it one after another; keep or not
  function cornerOrder() {
    const deep = S.a.depth === 'deep' || S.a.depth === 'some';
    const sc = score(true);
    const list = FRAMES.filter(f => deep || !avoided(f)).sort((x, y) => sc[y.id] - sc[x.id]).slice(0, 10);
    // mix slim and wide so proportion gets tested
    return [...list.filter((_, i) => i % 2 === 0), ...list.filter((_, i) => i % 2 === 1)].map(f => f.id);
  }
  function bench(host, size = Math.min(innerHeight * (innerWidth < 600 ? .3 : .46), 440)) {
    host.innerHTML = `<span class="cc-bench-piece"><img src="${S.pic}" alt=""></span>`;
    const piece = $('.cc-bench-piece', host), s = S.size || fitArt('', S.ratio > 1 ? 40 : 30, S.ratio > 1 ? 30 : 40);
    const h = s.h >= s.w ? size : size * s.h / s.w, w = h * s.w / s.h;
    piece.style.width = w + 'px'; piece.style.height = h + 'px';
    return { piece, pxcm: w / s.w };
  }
  function lay(piece, pxcm, id, i = 0) {
    const f = F(id), k = Math.max(6, f.k * pxcm), len = Math.max(56, Math.min(piece.offsetWidth, piece.offsetHeight) * .46), o = Math.max(2, .4 * pxcm);
    const tl = cornerEl(id, k, len, 'in'), br = cornerEl(id, k, len, 'br in');
    tl.style.left = tl.style.top = (o - k) + 'px'; br.style.right = br.style.bottom = (o - k) + 'px';
    tl.style.setProperty('--i', i); br.style.setProperty('--i', i);
    piece.append(tl, br);
  }
  function renderCorners(q, body) {
    const order = cornerOrder(); let i = 0;
    S.kept = []; S.dropped = [];
    body.classList.add('cc-corners');
    body.innerHTML = `<div class="cc-bench"></div>
      <div class="cc-corner-side"><p class="kicker cc-count"></p><p class="cc-corner-name"></p><p class="cc-corner-line"></p>
        <div class="cc-corner-btns"><button class="btn btn-line" type="button" data-c="drop">Not for me</button><button class="btn btn-ink" type="button" data-c="keep">Keep</button></div>
        <p class="cc-swipe">Or swipe the piece: right to keep, left to skip.</p>
        <p class="kicker cc-kept-k">Kept</p><div class="cc-kept"></div></div>`;
    const { piece, pxcm } = bench($('.cc-bench', body));
    const show = () => {
      const id = order[i], f = F(id);
      $$('.cn', piece).forEach(c => c.remove()); lay(piece, pxcm, id);
      $('.cc-count', body).textContent = `Corner ${i + 1} of ${order.length}`;
      $('.cc-corner-name', body).textContent = f.name; $('.cc-corner-line', body).textContent = `${f.kicker} · ${fmt(f.k)} cm wide. ${f.line}`;
    };
    const pick = keep => {
      const id = order[i]; (keep ? S.kept : S.dropped).push(id);
      if (keep) $('.cc-kept', body).insertAdjacentHTML('beforeend', `<span title="${F(id).name}">${cornerIcon(id)}</span>`);
      if (++i < order.length) show();
      else { if (!S.kept.length) S.kept = [order[0]]; S.last = null; next(); }
    };
    // swipe the piece: right keeps, left skips (touch or mouse)
    const b = $('.cc-bench', body); let x0 = null;
    b.addEventListener('pointerdown', e => { x0 = e.clientX; b.setPointerCapture(e.pointerId); });
    b.addEventListener('pointermove', e => { if (x0 == null) return; const dx = e.clientX - x0; piece.style.transform = `translateX(${dx * .5}px) rotate(${dx * .02}deg)`; b.dataset.lean = dx > 30 ? 'keep' : dx < -30 ? 'drop' : ''; });
    const end = e => { if (x0 == null) return; const dx = e.clientX - x0; x0 = null; piece.style.transform = ''; b.dataset.lean = ''; if (Math.abs(dx) > 70) pick(dx > 0); };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    $('[data-c="keep"]', body).addEventListener('click', () => pick(true));
    $('[data-c="drop"]', body).addEventListener('click', () => pick(false));
    say('In the shop I lay corners right on the piece. Here they come, one at a time.', $('.cc-react'));
    show();
  }

  // step back: the best kept frame on the wall, close up first, then from across the room
  // step back: up close, the frame fills the view on the wall colour; "Step back" pulls the camera out and the frame
  // glides (FLIP) to its real size and place in the room, which fades in round it. Nothing is cropped or overlaps.
  function renderStepback(q, body) {
    const id = bestKept(), o = { frame: id, mount: S.a.matpref === 'no' ? 'none' : 'white', mw: S.mw, glass: 'clear' };
    body.classList.add('cc-stepback');
    body.innerHTML = `<div class="sb-box"><div class="sb-far"><img src="${S.wallPhoto || STUDIO_WALL}" alt=""><div class="sb-hang"></div></div>
        <div class="sb-near"><div class="sb-near-fr"></div></div><p class="sb-dist"><span>0.5</span> m away</p></div>
      <div class="cc-sb-side"><button class="btn btn-ink" type="button" data-sb>Step back</button>
      <div class="cc-sb-ask" hidden><p class="kicker">From across the room, it feels…</p><div class="cc-opts">
        <button class="choice" type="button" data-v="right"><b>Just right</b></button>
        <button class="choice" type="button" data-v="heavy"><b>Too heavy</b></button>
        <button class="choice" type="button" data-v="thin"><b>Too thin</b></button></div><button class="ul ul-btn sb-again" type="button">Look again</button></div></div>`;
    say(`${F(id).name}, the one you kept. A frame that looks right up close can vanish, or shout, from across the room.`, $('.cc-react'));
    const box = $('.sb-box', body), img = $('.sb-far img', body), nearFr = $('.sb-near-fr', body);
    let flip = '';
    const place = () => {
      if (!box.isConnected) return;
      const r = img.getBoundingClientRect(), wall = getComputedStyle(box).getPropertyValue('--wall');
      // far: to scale in the room
      const hang = $('.sb-hang', body), far = frameEl(o, (S.size.w + 2 * (5 + F(id).k)) * r.width / (S.wallPhoto ? 250 : 207), r.height * .9);
      hang.replaceChildren(far); placeHang(hang, r, far);
      // near: the same frame, big
      const near = frameEl(o, r.width * .62, r.height * .72); nearFr.replaceChildren(near);
      const a = near.getBoundingClientRect(), b = far.getBoundingClientRect(), k = b.width / a.width;
      flip = `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${k})`;
      if (box.classList.contains('back')) nearFr.style.transform = flip;
    };
    img.complete ? requestAnimationFrame(place) : img.addEventListener('load', place);
    const dist = $('.sb-dist span', body);
    const go = back => {
      box.classList.toggle('back', back); nearFr.style.transform = back ? flip : '';
      $('[data-sb]', body).hidden = back; $('.cc-sb-ask', body).hidden = !back;
      const t0 = performance.now(), from = back ? .5 : 3, to = back ? 3 : .5;
      (function tick(t) { const p = Math.min(1, (t - t0) / 1600), e = p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        dist.textContent = (from + (to - from) * e).toFixed(1); if (p < 1) requestAnimationFrame(tick); })(t0);
      if (back) say('That’s how your guests will see it. How does it feel?', $('.cc-react'));
    };
    $('[data-sb]', body).addEventListener('click', () => go(true));
    $('.sb-again', body).addEventListener('click', () => go(false));
    $$('.cc-sb-ask .choice', body).forEach(b => b.addEventListener('click', () => { b.classList.add('on'); answer(q, b.dataset.v); }));
  }
  // this or that: their piece in two frames side by side, six quick pairs, each one a single difference
  const PAIRS = [['oak', 'black', 'Wood or black?'], ['oak', 'oak-wide', 'Slim or wide?'], ['white', 'ash', 'Painted or natural?'],
    ['chipped', 'white-wide', 'Weathered or clean?'], ['walnut', 'grey', 'Dark or pale?'], ['gold', 'silver', 'Gold or silver?'], ['black', 'box', 'Flat or deep?']];
  function renderThisThat(q, body) {
    const pairs = PAIRS.filter(([x, y]) => !avoided(F(x)) && !avoided(F(y))).slice(0, 6);
    if (!pairs.length) { next(); return; }
    S.tt = []; let i = 0;
    body.classList.add('cc-tt');
    body.innerHTML = `<p class="kicker cc-tt-count"></p><div class="cc-opts duel"></div><button class="ul ul-btn cc-duel-skip" type="button" data-tt-skip>Can’t decide, next</button>`;
    say('Quick, don’t think. Your piece in two frames: tap the one that feels like you.', $('.cc-react'));
    const mount = S.a.matpref === 'no' ? 'none' : 'white';
    const show = () => {
      const [x, y, label] = pairs[i], box = $('.duel', body);
      $('#q-title').textContent = label; $('.cc-tt-count', body).textContent = `Pair ${i + 1} of ${pairs.length}`;
      box.innerHTML = [x, y].map(id => `<button class="cc-duel" type="button" data-f="${id}"><span class="cc-duel-stage"></span><b>${F(id).name}</b><span class="cc-duel-sub">${F(id).kicker} · ${fmt(F(id).k)} cm</span></button>`).join('');
      const stages = $$('.cc-duel-stage', box);
      requestAnimationFrame(() => [x, y].forEach((id, j) => {
        if (!stages[j].isConnected) return; const r = stages[j].getBoundingClientRect();
        stages[j].append(frameEl({ frame: id, mount, mw: 5, glass: 'clear' }, r.width * .7, r.height * .8));
      }));
      $$('.cc-duel', box).forEach(b => b.addEventListener('click', () => {
        b.classList.add('on'); S.tt.push([b.dataset.f, b.dataset.f === x ? y : x]); step();
      }));
    };
    const step = () => setTimeout(() => { if (++i < pairs.length) show(); else { S.last = null; next(); } }, reduce ? 0 : 220);
    $('[data-tt-skip]', body).addEventListener('click', step);
    show();
  }

  function renderProfile(q, body) {
    body.classList.add('cc-opts', 'profiles');
    body.innerHTML = PROFILES.map(([v, l, line, d]) => `<button class="choice cc-prof" type="button" data-v="${v}"><svg viewBox="0 0 60 30" aria-hidden="true"><path d="${d}"/><path class="art" d="M56 26h4"/></svg><b>${l}</b><span>${line}</span></button>`).join('')
      + `<button class="ul ul-btn cc-duel-skip" type="button" data-v="either">You choose</button>`;
    say('This is the shape of the moulding, seen from the side. It changes how light falls on the piece.', $('.cc-react'));
    $$('[data-v]', body).forEach(b => b.addEventListener('click', () => { b.classList.add('on'); answer(q, b.dataset.v); }));
  }
  // this or that: the piece in the best kept frame, with and without a mount
  function renderDuel(q, body) {
    body.classList.add('cc-opts', 'duel');
    body.innerHTML = q.duel.map(([v, l]) => `<button class="cc-duel" type="button" data-v="${v}"><span class="cc-duel-stage"></span><b>${l}</b></button>`).join('')
      + `<button class="ul ul-btn cc-duel-skip" type="button" data-v="either">Can’t decide, you choose</button>`;
    const stages = $$('.cc-duel-stage', body), id = bestKept();
    requestAnimationFrame(() => q.duel.forEach(([, , mount], i) => {
      const stg = stages[i]; if (!stg.isConnected) return; const r = stg.getBoundingClientRect();
      stg.append(frameEl({ frame: id, mount, mw: 5, glass: 'clear' }, r.width * .7, r.height * .8));
    }));
    $$('[data-v]', body).forEach(b => b.addEventListener('click', () => { const v = b.dataset.v; if (v === 'either') delete S.a[q.id]; b.classList.add('on'); S.a[q.id] = v === 'either' ? undefined : v; S.last = q.id + ':' + v; next(); }));
  }
  // the wall: a photo of it (its colour is read), or Claire's studio wall
  function renderWall(q, body) {
    body.classList.add('cc-wallq');
    body.innerHTML = `<div class="cc-wall-l"><p class="line">A photo of the wall lets me read its colour and show you the frame to scale.</p>
        <label class="btn btn-ink" for="cc-wall-file">${S.wallPhoto ? 'Try another photo' : 'Upload a photo of the wall'}</label><input id="cc-wall-file" class="sr" type="file" accept="image/*">
        <p class="cc-wall-read"${S.wallPhoto ? '' : ' hidden'}></p>
        <button class="btn btn-ink" type="button" data-wall-go${S.wallPhoto ? '' : ' hidden'}>Continue</button>
        <button class="ul ul-btn skip" type="button" data-wall-skip>Skip, show it on your studio wall</button></div>
      <figure class="portrait"><img class="cc-wall-img" src="${S.wallPhoto || STUDIO_WALL}" alt="" width="2400" height="1600"><figcaption>${S.wallPhoto ? 'Your wall' : 'My wall in the studio, about 2 m across'}</figcaption></figure>`;
    $('[data-wall-skip]', body).textContent = 'Skip, use the studio wall';
    const readOut = () => { const w = WALLS.find(x => x.id === S.wall); $('.cc-wall-read', body).innerHTML = `<i style="background:${S.wallC}"></i>Your wall reads as <b>${w.name}</b>`; };
    if (S.wallPhoto) readOut();
    body.setWall = async src => {
      const img = await loadImg(src); if (!img) return;
      const a = analyse(img, [.3, .08, .4, .3]);
      S.wallPhoto = src; S.wall = nearestWall(a); S.wallC = `rgb(${a.r | 0},${a.g | 0},${a.b | 0})`;
      $('.cc-wall-img', body).src = src; $('figcaption', body).textContent = 'Your wall';
      readOut(); $('.cc-wall-read', body).hidden = false; $('[data-wall-go]', body).hidden = false;
      $('label[for="cc-wall-file"]', body).className = 'btn btn-line'; $('label[for="cc-wall-file"]', body).textContent = 'Try another photo';
      say(WALL_SAY[S.wall], $('.cc-react'));
    };
    $('#cc-wall-file', body).addEventListener('change', e => { const f = e.target.files[0]; if (f) body.setWall(URL.createObjectURL(f)); });
    $('[data-wall-go]', body).addEventListener('click', () => { S.last = 'wallphoto:yes'; next(); });
    $('[data-wall-skip]', body).addEventListener('click', () => { S.wallPhoto = null; S.wall = null; S.last = 'wallphoto:skip'; next(); });
  }
  // what the wall does to a frame: marked on the wall itself, with what Claire does about each
  function report() {
    const a = S.a, light = a.light || 'some';
    return [
      ['Sunlight', { sun: 85, some: 45, dark: 15 }[light], light === 'sun' ? 'Direct sun fades a print. Museum glass: it blocks UV.' : 'Not much fading to worry about.', [12, 14]],
      ['Lamp glare', { sun: 20, some: 35, dark: 70 }[light], light === 'dark' ? 'Lamps shine in clear glass. Non-reflective keeps it out.' : 'A little glare, nothing serious.', [64, 34]],
      ['Damp', a.room === 'wet' ? 70 : 15, a.room === 'wet' ? 'Steam gets behind glass. We seal the back and keep the wood off the wall.' : 'Dry air. Any wood is happy.', [30, 78]],
    ];
  }
  function renderReport(q, body) {
    body.classList.add('cc-report');
    const R = report();
    body.innerHTML = `<div class="cc-rep-room"><img src="${S.wallPhoto || STUDIO_WALL}" alt="">
        ${R.map(([k, v, , [x, y]], i) => `<span class="cc-pin${v >= 60 ? ' hot' : ''}" style="--x:${x}%;--y:${y}%;--i:${i}"><b>${k}</b></span>`).join('')}</div>
      <div class="cc-rep-side"><div class="cc-bars">${R.map(([k, v, line], i) => `<div class="cc-bar" style="--v:${v};--i:${i}">
        <p class="kicker">${k} <span>${v}/100</span></p><span class="cc-track"><i></i></span><p class="cc-bar-line">${line}</p></div>`).join('')}</div>
        <button class="btn btn-ink" type="button">Next</button></div>`;
    say('Every wall is different. This is what yours does to a frame.', $('.cc-react'));
    $('.cc-rep-side .btn', body).addEventListener('click', next);
    requestAnimationFrame(() => requestAnimationFrame(() => body.classList.add('in')));
  }

  // the framing persona: what the corners kept, the shape and the step-back say about their taste, and a shortlist of real mouldings
  const FAMILY = { oak: 'wood', walnut: 'wood', chipped: 'reclaimed', black: 'dark', box: 'dark', steel: 'dark', white: 'pale', ash: 'pale', grey: 'pale', gold: 'gilded', silver: 'gilded' };
  const ADJ = { wood: 'Warm', reclaimed: 'Reclaimed', dark: 'Industrial', pale: 'Nordic', gilded: 'Gilded' };
  const NOUN = {
    Minimalist: 'You like a frame that steps back: a thin line, and the picture does the talking.',
    Maximalist: 'You like a frame with presence. It belongs to the piece, and it wants to be seen.',
    Classicist: 'You like frames with a history: depth, curves, a little gold or dark wood.',
    Modernist: 'You like clean shapes and honest materials, nothing fussy.',
  };
  function persona() {
    const kept = [...(S.kept.length ? S.kept : [bestKept()]), ...(S.tt || []).map(x => x[0])], fam = {};
    kept.forEach(id => { const k = FAMILY[matOf(id)]; fam[k] = (fam[k] || 0) + 1; });
    const top = Object.entries(fam).sort((x, y) => y[1] - x[1])[0][0];
    const slim = kept.filter(id => F(id).slim).length, wide = kept.filter(id => F(id).wide).length, a = S.a;
    const noun = a.era === 'Antique' || a.profile === 'scoop' || top === 'gilded' ? 'Classicist'
      : a.stepback === 'heavy' || slim > wide ? 'Minimalist' : a.stepback === 'thin' || wide > slim ? 'Maximalist' : 'Modernist';
    const sc = score(true), list = [...new Set([...kept, ...FRAMES.map(f => f.id).sort((x, y) => sc[y] - sc[x])])].filter(id => !S.dropped.includes(id) && !avoided(F(id))).slice(0, 5);
    return { name: `${ADJ[top]} ${noun}`, line: NOUN[noun], list };
  }
  function renderPersona(q, body) {
    const p = persona(); S.persona = p.name;
    body.classList.add('cc-persona');
    body.innerHTML = `<div class="cc-pers-card fw-grain"><p class="kicker">Your framing style</p><p class="cc-pers-name">${p.name}</p><p class="cc-pers-line">${p.line}</p>
      <p class="kicker cc-pers-k">Your shortlist · real mouldings from my wall</p>
      <ul class="cc-pers-list">${p.list.map(id => `<li>${cornerIcon(id)}<span><b>${F(id).name}</b><small>${F(id).kicker} · ${fmt(F(id).k)} cm</small></span></li>`).join('')}</ul></div>
      <button class="btn btn-ink" type="button">Now the room</button>`;
    say('From what you kept and how it felt from across the room, I know your taste a bit better.', $('.cc-react'));
    $('.btn', body).addEventListener('click', () => { S.last = null; next(); });
  }

  // ---- scoring: the piece and the corners first, the room at half ----
  function score(partial) {
    const a = S.a, out = {}, tags = {}, rules = imageRules(S.img);
    FRAMES.forEach(f => {
      let sc = 0; const t = [];
      rules.forEach(r => { if (r.s[f.id]) { sc += r.s[f.id]; t.push([r.s[f.id] + .5, r.tag]); } });
      Object.entries(a).forEach(([k, v]) => {
        if (v == null || Array.isArray(v)) return;
        const row = SCORES[k + ':' + v] || {};
        let p = row[f.id] ?? (f.like ? (row[f.like] || 0) * .8 : 0); if (ROOM.has(k)) p /= 2; sc += p;
        if (p >= 2) {
          if (k === 'wall') t.push([p, `works on your ${WALLS.find(w => w.id === v).name} wall`]);
          else if (TAG[k] && TAG[k][v]) t.push([p, TAG[k][v]]);
        }
      });
      if (avoided(f)) sc -= 20;
      const ex = f.extra || 0;
      if (a.budget === 'simple') sc += ex > 20 ? -6 : ex > 10 ? -2 : 1;
      if (a.budget === 'mid' && ex > 30) sc -= 2;
      if (a.budget === 'open' && ex >= 20) sc += 1;
      if (a.stepback === 'heavy') sc += f.slim ? 3 : f.wide ? -3 : 0;
      if (a.stepback === 'thin') sc += f.wide ? 3 : f.slim ? -3 : 0;
      if (a.profile && a.profile !== 'either' && f.profile === a.profile) { sc += 3; t.push([3, TAG.profile[a.profile]]); }
      (S.tt || []).forEach(([won, lost]) => { if (won === f.id) { sc += 4; t.push([6, 'was your pick side by side']); } if (lost === f.id) sc -= 2; });
      if (!partial) {
        if (S.kept.includes(f.id)) { sc += 8; t.push([20, 'was one you kept it on the bench']); }
        if (S.dropped.includes(f.id)) sc -= 8;
      }
      out[f.id] = sc; tags[f.id] = t.sort((x, y) => y[0] - x[0]).map(x => x[1]);
    });
    if (partial) return out;
    return { out, tags };
  }
  function bestKept() { const sc = score(true); return [...(S.kept.length ? S.kept : FRAMES.map(f => f.id))].sort((x, y) => sc[y] - sc[x])[0]; }

  // ---- 4 · picking ----
  async function think() {
    go('think', false);   // not in the history: Back from the result returns to the last question
    const host = $('.cc-think-bench'), { piece, pxcm } = bench(host, Math.min(innerHeight * .42, 400));
    const lines = ['Reading the colours in your piece…', S.wallPhoto ? 'Looking at your wall…' : 'Thinking about where it will hang…', 'Comparing with frames I’ve chosen for pieces like yours…', 'Choosing three…'];
    const ids = S.kept.length ? S.kept : ['oak', 'black', 'walnut'];
    for (let i = 0; i < 4; i++) {
      $$('.cn', piece).forEach(c => c.remove()); lay(piece, pxcm, ids[i % ids.length]);
      $('.cc-think-line').textContent = lines[i];
      await wait(700);
    }
    recommend(); go('result'); drawResult(true);
  }
  function recommend() {
    const a = S.a; if (S.wall && !a.wall) a.wall = S.wall;
    const { out, tags } = score(false);
    const ranked = FRAMES.map(f => f.id).sort((x, y) => out[y] - out[x]);
    if (S.pre) tags[ranked[0]].unshift(`is right for ${S.pre.subject}`);
    // three different materials where possible (not walnut and walnut, slim)
    const picks = [];
    ranked.forEach(id => { if (picks.length < 3 && !picks.some(x => matOf(x) === matOf(id))) picks.push(id); });
    ranked.forEach(id => { if (picks.length < 3 && !picks.includes(id)) picks.push(id); });
    S.picks = picks; S.why = {}; S.picks.forEach(id => S.why[id] = [...new Set(tags[id])].slice(0, 3));
    S.frame = S.picks[0];
    const dark = a.wall === 'charcoal', tone = dark || a.age === 'old' || a.era === 'Antique' ? 'cream' : 'white';
    if (a.matpref === 'yes') S.mount = tone;
    else if (a.matpref === 'no' || a.what === 'object' || a.detail === 'painting') S.mount = 'none';
    else S.mount = (a.meaning === 'memory' || S.size.pw + S.size.ph < 52 || a.what === 'photo' || a.what === 'original') ? tone : 'none';
    S.mw = S.size.pw + S.size.ph < 52 ? 8 : S.size.pw + S.size.ph > 120 ? 8 : 5;
    S.recMount = S.mount; S.lip = null;
    S.mountWhy = a.matpref === 'yes' ? 'A mount, like you wanted. It gives the piece room to breathe.'
      : a.matpref === 'no' ? 'No mount, like you wanted. Edge to edge is clean and modern.'
      : S.mount === 'none' ? (a.what === 'object' ? 'No mount, so your piece can sit deep in the box.' : 'No mount. It keeps it simple and lets the frame do the work.')
      : S.mount === 'cream' ? 'Cream, not white. It’s kinder to an older piece.' : S.mw === 8 ? 'A wide white mount, so the piece has room around it.' : 'A white mount. It gives the piece room to breathe.';
    S.glass = (a.light === 'sun' || a.unique === 'one' || a.age === 'old' || a.era === 'Antique' || a.detail === 'letter') ? 'museum' : a.light === 'dark' && a.budget !== 'simple' ? 'anti' : 'clear';
    S.recGlass = S.glass;
    S.glassWhy = a.light === 'sun' ? 'Museum glass, because your wall gets direct sun. It blocks UV, so the colours won’t fade.'
      : (a.age === 'old' || a.era === 'Antique') ? 'Museum glass, to protect an old print.' : a.unique === 'one' ? 'Museum glass, because it’s one of a kind.'
      : a.light === 'dark' ? 'Non-reflective, because lamps would shine in clear glass.' : 'Clear glass is enough here. No need to spend more.';
  }

  // ---- 5 · the result ----
  // the size ladder + the moulding's extra (placeholders, to confirm with Claire) + glass
  const priceOf = id => { const p = priceFor(S.size.pw, S.size.ph); return p == null ? null : p + (F(id).extra || 0) + GLASS[S.glass][0]; };
  const price = () => priceOf(S.frame);
  const euro = n => n == null ? 'on request' : '€' + n;
  const opts = () => ({ frame: S.frame, mount: S.mount, mw: S.mw, glass: S.glass, lip: S.lip });
  function drawResult(first) {
    const a = S.a, f = F(S.frame);
    $('.cc-picks').innerHTML = S.picks.map((id, i) => { const x = F(id); return `<button class="cc-pick" type="button" role="radio" aria-checked="${id === S.frame}" data-f="${id}">
      <span class="cc-pick-pic"></span><span class="cc-pick-text"><span class="kicker">${['Best match', 'Also good', 'A braver choice'][i]}</span><b>${x.name}</b><span>${x.kicker}${S.kept.includes(id) ? ' · you kept it' : ''}</span></span><span class="cc-pick-price">${euro(priceOf(id))}</span></button>`; }).join('');
    $$('.cc-pick').forEach(b => {
      $('.cc-pick-pic', b).append(frameEl({ ...opts(), frame: b.dataset.f }, 64, 64));
      b.addEventListener('click', () => { S.frame = b.dataset.f; drawResult(); const x = F(S.frame); say(`${x.name}. ${x.line}`, $('.res-a [data-say]')); });
    });
    const t = S.why[S.frame] || [];
    // her verdict, then one plain line each for frame, mount, glass and size (no lists of tags, no "you told me")
    const piece = S.pre ? S.pre.subject : 'your piece';
    $('[data-why="quote"]').textContent = `For ${piece}, I’d choose ${f.name.toLowerCase()}. ${f.line}`;
    const r = t.filter(x => !/^is right for/.test(x)).slice(0, 2);
    const frameWhy = r.length ? `It ${r[0]}${r[1] ? `, and it ${r[1]}` : ''}.` : 'It’s a frame I trust for pieces like this.';
    const mountWhy = S.mount === S.recMount ? S.mountWhy : 'You changed this. Good, trust your eye.';
    const glassWhy = S.glass === S.recGlass ? S.glassWhy : 'You changed this. Fine by me.';
    const sizeWhy = `${/×/.test(S.size.name) ? `${fmt(S.size.pw)} × ${fmt(S.size.ph)} cm` : `${S.size.name}, ${fmt(S.size.pw)} × ${fmt(S.size.ph)} cm`}${a.printed === 'file' ? ', printed by us on archival paper' : ''}. A framer measures again before we cut.`;
    $('[data-why="list"]').innerHTML = [['Frame', f.name, frameWhy], ['Mount', S.mount === 'none' ? 'No mount' : cap(MOUNTS[S.mount][1]) + (S.lip ? ', accent edge' : ''), mountWhy],
      ['Glass', cap(GLASS[S.glass][2]), glassWhy], ['Size', '', sizeWhy]]
      .map(([k, v, w]) => { if (v && w.toLowerCase().startsWith(v.toLowerCase().split(',')[0])) { v = cap(w.split(/[,.]/)[0]); w = cap(w.slice(v.length).replace(/^[,.]\s*/, '')); }
        return `<li><span class="why-n">${k}</span><span class="why-t">${v ? `<b>${v}.</b> ` : ''}${w}</span></li>`; }).join('');
    // accent edge: none, or one of the piece's own colours
    const lips = [null, ...S.img.palette.filter(c => { const [r, g, b] = c.match(/\d+/g).map(Number); return Math.max(r, g, b) - Math.min(r, g, b) > 30; }).slice(0, 3)];
    $('[data-opt="lip"]').innerHTML = lips.map((c, i) => `<button type="button" data-v="${c || ''}"${c ? ` aria-label="Colour ${i} from the piece"` : ''}>${c ? `<i style="--c:${c}"></i>` : 'None'}</button>`).join('');
    $('[data-row="lip"]').hidden = S.mount === 'none' || lips.length < 2;
    $$('.res-panel .opts').forEach(g => $$('button', g).forEach(b => b.setAttribute('aria-pressed', String(S[g.dataset.opt] ?? '') === b.dataset.v)));
    $$('[data-sum="price"]').forEach(e => e.textContent = euro(price()));
    if (first) say(`${f.name} first: ${low(f.line)}`, $('.res-a [data-say]'));
    drawStage(); drawReady();
  }
  $('.res-panel').addEventListener('click', e => {
    const b = e.target.closest('.opts button'); if (!b) return;
    const k = b.closest('.opts').dataset.opt; S[k] = b.dataset.v || null; drawResult();
    say(k === 'mount' ? MAT_SAY[S.mount] : k === 'glass' ? GLASS_SAY[S.glass] : S.lip ? 'A thin line of its own colour. It ties the frame to the picture.' : 'Just the one mount, then.', $('.res-a [data-say]'));
  });

  // the stage: the piece hangs to scale; scrolling through part one takes it from the wall → close up → turned
  // where a framer would hang it, in fractions of the wall photo. Studio wall (closing-wall.jpg): sideboard 35–74% across, its top 28% up;
  // the plant on it 43–53% across, up to 58%. ~13% of the photo's height ≈ 18 cm, the usual gap above furniture
  function placeHang(hang, r, el, maxRight = .96) {
    const fb = el.getBoundingClientRect(), fw = fb.width / r.width, fh = fb.height / r.height;
    let cx, bottom;
    if (!S.wallPhoto) {
      const top = .93;                                                               // keep a little wall above it
      const A = { cx: Math.max(.64, .55 + fw / 2), bottom: .41 };                    // over the sideboard, right of the plant
      const L = { cx: Math.min(.3, .41 - fw / 2), bottom: .46 };                     // left of the plant, above the chair (when a card covers the right)
      const B = { cx: Math.min(.5, maxRight - .02 - fw / 2), bottom: .61 };          // above the plant
      const fits = o => o.cx - fw / 2 >= .03 && o.cx + fw / 2 <= maxRight - .02 && o.bottom + fh <= top;
      ({ cx, bottom } = fits(A) ? A : maxRight < .9 && fits(L) ? L : B);
      if (bottom + fh > top) bottom = Math.max(.03, top - fh);                       // too tall: as high as it goes
    } else { cx = Math.min(.5, maxRight - .02 - fw / 2); bottom = Math.max(.03, Math.min(.36, .97 - fh)); }
    hang.style.left = Math.max(fw / 2 + .02, cx) * 100 + '%'; hang.style.bottom = bottom * r.height + 'px';
  }
  function hangOn(img, host, cm, maxRight) {
    const f = F(S.frame), mw = S.mount === 'none' ? 0 : S.mw, r = img.getBoundingClientRect(), pxcm = r.width / cm;
    host.replaceChildren(frameEl(opts(), (S.size.w + 2 * (mw + f.k)) * pxcm, r.height * .94));
    placeHang(host.parentElement, r, host.firstChild, maxRight);
  }
  function drawStage() {
    const img = $('.res-wall'), src = S.wallPhoto || STUDIO_WALL;
    if (img.getAttribute('src') !== src) { img.src = src; img.onload = drawStage; return; }
    hangOn(img, $('[data-host="res"]'), S.wallPhoto ? 250 : 207);
    view();
  }
  function drawReady() {
    const img = $('.res-b-wall'), src = S.wallPhoto || STUDIO_WALL;
    if (img.getAttribute('src') !== src) { img.src = src; img.onload = drawReady; return; }
    requestAnimationFrame(() => hangOn(img, $('[data-host="ready"]'), S.wallPhoto ? 250 : 207, wide() ? .64 : .96));   // desktop: keep left of the card
    const f = F(S.frame);
    $('.res-b-sum').innerHTML = [['Your piece', S.pre ? cap(S.pre.subject) : 'Your piece'], ['Size', `${fmt(S.size.pw)} × ${fmt(S.size.ph)} cm${S.a.printed === 'file' ? ', printed by us' : ''}`],
      ['Frame', `${f.name} · ${f.kicker.toLowerCase()}`], ['Mount', cap(MOUNTS[S.mount][1]) + (S.lip ? ', with an accent edge' : '')], ['Glass', cap(GLASS[S.glass][2])]]
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  }
  // view: 0 on the wall, 1 close up, 2 turned. Desktop: follows the scroll through part one; buttons jump there
  let viewP = 0;
  function view(p = viewP) {
    viewP = p;
    const room = $('.res-room'), fr = $('[data-host="res"] .fr'); if (!fr) return;
    // measure flat (no zoom, no turn), then apply
    const z0 = room.style.transform, f0 = fr.style.transform; room.style.transform = 'none'; fr.style.transform = 'none';
    const rr = room.getBoundingClientRect(), fb = fr.getBoundingClientRect(); room.style.transform = z0; fr.style.transform = f0;
    const cx = (fb.left + fb.width / 2 - rr.left) / rr.width * 100, cy = (fb.top + fb.height / 2 - rr.top) / rr.height * 100;
    const zMax = Math.max(1, Math.min(rr.height * .7 / fb.height, rr.width * .55 / fb.width, 4));
    const zoom = 1 + (zMax - 1) * Math.min(1, Math.max(0, (p - .25) / .4));
    const turn = Math.min(1, Math.max(0, (p - .68) / .3));
    const t = (zoom - 1) / Math.max(.001, zMax - 1);   // 0 → 1 as it zooms: also slide the frame to the middle
    room.style.transformOrigin = `${cx}% ${cy}%`;
    room.style.transform = `translate(${(50 - cx) * t}%, ${(50 - cy) * t}%) scale(${zoom})`;
    fr.style.transform = `perspective(${fb.width * 5}px) rotateY(${-30 * turn}deg)`;
    $$('.res-views button').forEach((b, i) => b.setAttribute('aria-selected', String(i === (p < .3 ? 0 : p < .7 ? 1 : 2))));
    $('.res-hint').classList.toggle('gone', p > .06);
  }
  addEventListener('scroll', () => {
    if (document.body.dataset.step !== 'result' || !wide()) return;
    const r = $('.res-a').getBoundingClientRect(), span = r.height - innerHeight;
    view(Math.min(1, Math.max(0, -r.top / span)));
  }, { passive: true });
  $$('.res-views button').forEach((b, i) => b.addEventListener('click', () => {
    const target = [0, .55, 1][i];
    if (wide()) { const r = $('.res-a'), span = r.offsetHeight - innerHeight; scrollTo({ top: r.offsetTop + span * target, behavior: reduce ? 'auto' : 'smooth' }); }
    else { $('.res-room').classList.add('ease'); view(target); }
  }));
  $('[data-to-ready]').addEventListener('click', e => { e.preventDefault(); $('#ready').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); });

  $('[data-cart]').addEventListener('click', () => {
    const f = F(S.frame);
    go('done');
    $('[data-sum="done"]').textContent = `${S.pre ? cap(S.pre.subject) : 'Your piece'}, ${fmt(S.size.pw)} × ${fmt(S.size.ph)} cm. ${f.name}, ${MOUNTS[S.mount][1]}${S.lip ? ' with an accent edge' : ''}, ${GLASS[S.glass][2]}. Chosen with Claire, handmade in Kreuzberg, ready in about a week.`;
    $$('[data-sum="price"]').forEach(e => e.textContent = euro(price()));
    requestAnimationFrame(() => { const r = $('.done-pic').getBoundingClientRect(); $('[data-host="done"]').replaceChildren(frameEl(opts(), r.width * .7, r.height * .75)); });
  });
  $$('[data-restart]').forEach(b => b.addEventListener('click', () => {
    Object.assign(S, { pic: null, sample: null, look: null, pre: null, wallPhoto: null, wall: null, a: {}, qi: 0, picks: [], kept: [], dropped: [], tt: [], size: null, lip: null });
    $('#cc-file').value = ''; go('piece');
  }));

  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (document.body.dataset.step === 'result') { drawStage(); drawReady(); } }, 150); });

  $('.cf-back').addEventListener('click', () => history.back());
  history.replaceState({ step: 'piece' }, '', '#piece');
  go('piece', false);
})();
