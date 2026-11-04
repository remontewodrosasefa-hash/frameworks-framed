// Frame online (frame-online.html): a clickable prototype of the configurator. Nothing is saved or ordered.
// Steps: what → picture → size → frame → review → done. The step is on <body data-step> and in the URL hash,
// so the browser's back button walks back through them.
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const ORDER = ['what', 'picture', 'size', 'frame', 'review', 'done'];

  // the made-to-measure ladder from the homepage (priced by length + width)
  const TIERS = [[51, 'Mini', 56], [76, 'Small', 74], [100, 'Medium', 106], [126, 'Large', 124], [151, 'Extra large', 162], [170, 'Oversize', 190]];
  const tier = (w, h) => TIERS.find(t => w + h <= t[0]) || [Infinity, 'Oversize', null];
  const SIZES = [
    { id: 'a5', name: 'A5', w: 14.8, h: 21, line: 'Postcards, small photos' },
    { id: 'a4', name: 'A4', w: 21, h: 29.7, line: 'The print-shop standard' },
    { id: '3040', name: '30 × 40 cm', w: 30, h: 40, line: 'Most chosen for photos' },
    { id: 'a3', name: 'A3', w: 29.7, h: 42, line: 'Posters and art prints' },
    { id: '4050', name: '40 × 50 cm', w: 40, h: 50, line: 'A statement on the wall' },
    { id: '5070', name: '50 × 70 cm', w: 50, h: 70, line: 'Big posters' },
  ];
  // k = moulding width in cm. Frame descriptions to confirm with Frameworks
  const FRAMES = [
    { id: 'chipped', kicker: 'Upcycled wood', name: 'Chipped white', line: 'Old Berlin doors, the paint left as it was. No two alike.', k: 3.2, tag: 'Only at Frameworks' },
    { id: 'oak', kicker: 'Solid wood', name: 'Oak, natural', line: 'FSC oak, waxed. Warm and light.', k: 2.2 },
    { id: 'walnut', kicker: 'Solid wood', name: 'Walnut', line: 'Dark and calm, oiled by hand.', k: 2.2 },
    { id: 'black', kicker: 'Painted wood', name: 'Black, slim', line: 'The quiet gallery classic.', k: 1.5 },
    { id: 'white', kicker: 'Painted wood', name: 'White, slim', line: 'Lets the picture do the talking.', k: 1.5 },
    { id: 'steel', kicker: 'Steel', name: 'Raw steel', line: 'Welded and waxed, every mark left in.', k: 1.2 },
    { id: 'gold', kicker: 'Gilded wood', name: 'Gold leaf', line: 'Laid by hand, leaf by leaf.', k: 2.6 },
    { id: 'box', kicker: 'Shadow box', name: 'Black shadow box', line: 'Deep, for objects and layered work.', k: 3.4 },
  ];
  const MOUNTS = { white: ['#fbfaf7', 'white mount'], cream: ['#efe8d8', 'cream mount'], black: ['#1e1e1e', 'black mount'], none: [null, 'no mount'] };
  const GLASS = { clear: [0, .1, 'clear glass'], anti: [18, .03, 'non-reflective glass'], museum: [42, 0, 'museum glass'] }; // extra prices are placeholders
  const KINDS = {
    photo: { label: 'Photo print', pic: 'assets/landing/art-halsman-print.jpg' },
    print: { label: 'Print', pic: 'assets/landing/art-horst-janssen.jpg' },
    art: { label: 'Original art', pic: 'assets/landing/art-lilika-blue-bubble.jpg' },
    object: { label: 'Object', pic: 'assets/landing/art-christo-mosca.jpg' },
  };

  const S = { kind: 'photo', pic: null, ratio: .76, size: null, frame: null, mount: 'white', mw: 5, glass: 'clear', reached: 0 };
  const fmt = n => String(Math.round(n * 10) / 10).replace('.', ',');
  const euro = n => n == null ? 'on request' : '€' + n;
  const landscape = () => S.ratio > 1;

  // ---- steps ----
  function go(step, push = true) {
    if (step !== 'what' && step !== 'picture' && !S.pic) setPic(KINDS[S.kind].pic);
    if (['frame', 'review', 'done'].includes(step) && !S.size) pickSize(SIZES[2]);
    if ((step === 'review' || step === 'done') && !S.frame) S.frame = 'chipped';
    document.body.dataset.step = step;
    S.reached = Math.max(S.reached, ORDER.indexOf(step));
    $$('.cf-steps button').forEach(b => {
      const i = ORDER.indexOf(b.dataset.go);
      b.classList.toggle('done', i <= S.reached && i !== ORDER.indexOf(step));
      b.toggleAttribute('aria-current', b.dataset.go === step);
    });
    if (step === 'frame') buildFrames();
    if (step === 'review') review();
    if (step === 'done') done();
    if (push && location.hash.slice(1) !== step) history.pushState(null, '', '#' + step);
    window.scrollTo(0, 0);
  }
  addEventListener('popstate', () => go(ORDER.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'what', false));
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]');
    if (b && (b.classList.contains('done') || !b.closest('.cf-steps'))) go(b.dataset.go);
  });

  // ---- 1 · what ----
  $$('.kind').forEach(b => b.addEventListener('click', () => {
    S.kind = b.dataset.kind; S.pic = null;
    const photo = S.kind === 'photo';
    $('.pic-up').hidden = !photo; $('.pic-loading').hidden = true; $('.pic-bring').hidden = photo;
    $('.drop').hidden = !photo; $('.drop-full').hidden = photo;
    $('.moment').hidden = !photo;
    if (!photo) setPic(KINDS[S.kind].pic);
    go('picture');
  }));

  // ---- 2 · picture ----
  function setPic(src) {
    S.pic = src;
    $$('img.pic').forEach(i => i.src = src);
    const probe = new Image();
    probe.onload = () => { S.ratio = probe.naturalWidth / probe.naturalHeight; if (S.size) pickSize(S.size, true); renderSizes(); };
    probe.src = src;
  }
  function upload(src) {
    setPic(src);
    $('.pic-up').hidden = true; $('.pic-loading').hidden = false;
    $('.drop').hidden = true; $('.drop-full').hidden = false; $('.moment').hidden = false;
    const pct = $('.pct'), t0 = performance.now(), T = 1500;
    (function tick(t) {
      const p = Math.min(1, (t - t0) / T);
      pct.textContent = Math.round(100 * (1 - Math.pow(1 - p, 2)));
      if (p < 1) requestAnimationFrame(tick); else setTimeout(() => go('size'), 450);
    })(t0);
  }
  $('#file').addEventListener('change', e => { const f = e.target.files[0]; if (f) upload(URL.createObjectURL(f)); });
  $('[data-example]').addEventListener('click', () => upload(KINDS.photo.pic));
  const drop = $('[data-drop]');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, () => drop.classList.remove('over')));
  drop.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) upload(URL.createObjectURL(f)); });
  drop.addEventListener('click', () => $('#file').click());
  $$('[data-bring]').forEach(b => b.addEventListener('click', () => { S.bring = b.dataset.bring; go('size'); }));

  // ---- 3 · size ----
  const oriented = s => landscape() ? { ...s, w: s.h, h: s.w } : s;
  function renderSizes() {
    const box = $('.sizes');
    box.innerHTML = SIZES.map(s0 => {
      const s = oriented(s0), t = tier(s.w, s.h), r = s.w / s.h;
      const iw = r < 1 ? 28 * r : 28, ih = r < 1 ? 28 : 28 / r;
      return `<button class="size" type="button" role="radio" aria-checked="${S.size && S.size.id === s.id}" data-size="${s.id}">
        <span class="size-ico"><i style="width:${iw}px;height:${ih}px"></i></span>
        <span><b>${s.name}${/^A\d/.test(s.name) ? ` <small style="display:inline">${fmt(s.w)} × ${fmt(s.h)} cm</small>` : ''}</b><small>${s0.line}</small></span>
        <span class="price">€${t[2]}</span></button>`;
    }).join('');
    $$('.size', box).forEach(b => b.addEventListener('click', () => { $('.custom').setAttribute('aria-checked', 'false'); pickSize(SIZES.find(s => s.id === b.dataset.size)); }));
  }
  function pickSize(s0, quiet) {
    const s = s0.custom ? s0 : oriented(s0);
    S.size = { ...s, id: s0.id };
    $$('.size').forEach(b => b.setAttribute('aria-checked', b.dataset.size === s0.id));
    $('[data-next="frame"]').disabled = false;
    // the paper in the measure box: longest side 70% of the box
    const m = Math.max(s.w, s.h), pw = 70 * s.w / m, ph = 70 * s.h / m;
    const ms = $('.measure').style; ms.setProperty('--pw', pw + '%'); ms.setProperty('--ph', ph + '%');
    $('.dim-w b').textContent = fmt(s.w) + ' cm'; $('.dim-h b').textContent = fmt(s.h) + ' cm';
    const fw = s.w + 2 * 5 + 2 * 2.5, fh = s.h + 2 * 5 + 2 * 2.5;
    $('.framed-size').innerHTML = `Framed about <b>${fmt(fw)} × ${fmt(fh)} cm</b> with a 5 cm mount<br>(the mount can change or go later)`;
  }
  const cw = $('[data-cw]'), ch = $('[data-ch]');
  [cw, ch].forEach(i => i.addEventListener('input', () => {
    const w = parseFloat(cw.value), h = parseFloat(ch.value);
    if (!(w >= 5 && h >= 5)) { $('.custom-price').textContent = 'from €56'; return; }
    const t = tier(w, h);
    $('.custom-price').textContent = t[2] ? `${t[1]} · €${t[2]}` : 'Price on request';
    $('.custom').setAttribute('aria-checked', 'true');
    pickSize({ id: 'custom', custom: true, name: `${fmt(w)} × ${fmt(h)} cm`, w, h });
  }));
  $('[data-next="frame"]').addEventListener('click', () => go('frame'));
  $('[data-wall]').addEventListener('click', () => { setView('wall'); go('review'); });

  // ---- frames, drawn to scale: fits picture + mount + moulding into a box of bw × bh px ----
  function frameEl(o, bw, bh) {
    const f = FRAMES.find(x => x.id === o.frame), s = S.size;
    const mw = o.mount === 'none' ? 0 : o.mw;
    const W = s.w + 2 * (mw + f.k), H = s.h + 2 * (mw + f.k);
    const px = Math.min(bw / W, bh / H);
    const el = document.createElement('div');
    el.className = 'fr'; el.dataset.fr = f.id; el.dataset.mount = o.mount;
    const st = el.style;
    st.setProperty('--k', Math.max(3, f.k * px) + 'px');
    st.setProperty('--mw', mw * px + 'px');
    st.setProperty('--aw', s.w * px + 'px'); st.setProperty('--ah', s.h * px + 'px');
    st.setProperty('--mc', MOUNTS[o.mount][0] || 'transparent');
    st.setProperty('--glare', GLASS[o.glass][1]);
    el.innerHTML = `<i class="s t"></i><i class="s r"></i><i class="s b"></i><i class="s l"></i><div class="mount"><div class="art"><img src="${S.pic}" alt=""></div></div>`;
    return el;
  }
  const opts = () => ({ frame: S.frame, mount: S.mount, mw: S.mw, glass: S.glass });

  // ---- 4 · frame ----
  function buildFrames() {
    const box = $('.frames'), t = tier(S.size.w, S.size.h);
    box.innerHTML = FRAMES.map((f, i) => `<button class="fcard" type="button" style="--i:${i}" data-frame="${f.id}" aria-pressed="${S.frame === f.id}">
      <span class="fcard-stage"></span>${f.tag ? `<span class="fcard-tag">${f.tag}</span>` : ''}
      <span class="fcard-text"><span class="kicker">${f.kicker} · any size · any mount</span><span class="fcard-name">${f.name}</span>
      <span class="fcard-line">${f.line}</span><span class="fcard-price">${t[2] ? 'from €' + t[2] : 'Price on request'}</span></span></button>`).join('');
    const sec = $('.st-frame'); sec.classList.remove('in');
    requestAnimationFrame(() => {
      $$('.fcard', box).forEach(c => {
        const stg = $('.fcard-stage', c), r = stg.getBoundingClientRect();
        stg.append(frameEl({ frame: c.dataset.frame, mount: 'white', mw: 5, glass: 'clear' }, r.width * .76, r.height * .76));
        c.addEventListener('click', () => { S.frame = c.dataset.frame; go('review'); });
      });
      requestAnimationFrame(() => sec.classList.add('in'));
    });
  }

  // ---- 5 · review ----
  function price() { const t = tier(S.size.w, S.size.h); return t[2] == null ? null : t[2] + GLASS[S.glass][0]; }
  function drawReview() {
    const f = FRAMES.find(x => x.id === S.frame), mw = S.mount === 'none' ? 0 : S.mw;
    if (!$('.rev-close').hidden) {
      const area = $('.rev-close').getBoundingClientRect();
      $('[data-host="review"]').replaceChildren(frameEl(opts(), area.width * .82, Math.max(area.height, 360) * .86));
    } else {
      // on a wall, to scale: the wall photo is about 207 cm across (the sideboard is ~80 cm)
      const pxcm = $('.rev-wall img').getBoundingClientRect().width / 207;
      $('[data-host="wall"]').replaceChildren(frameEl(opts(), (S.size.w + 2 * (mw + f.k)) * pxcm, 9999));
    }
  }
  function review() {
    const f = FRAMES.find(x => x.id === S.frame), mw = S.mount === 'none' ? 0 : S.mw;
    $('[data-sum="picture"]').textContent = `${KINDS[S.kind].label} · ${S.size.name}`;
    $('[data-sum="frame"]').textContent = `${f.kicker}, ${f.name.toLowerCase()}`;
    $$('[data-sum="price"]').forEach(e => e.textContent = euro(price()));
    $('[data-sum="dims"]').textContent = `Picture ${fmt(S.size.w)} × ${fmt(S.size.h)} cm. Framed about ${fmt(S.size.w + 2 * (mw + f.k))} × ${fmt(S.size.h + 2 * (mw + f.k))} cm, with a ${fmt(f.k)} cm moulding.`;
    $('[data-row="mw"]').classList.toggle('off', S.mount === 'none');
    $$('.opts').forEach(g => $$('button', g).forEach(b => b.setAttribute('aria-pressed', String(S[g.dataset.opt]) === b.dataset.v)));
    requestAnimationFrame(drawReview);
  }
  $$('.opts').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const k = g.dataset.opt; S[k] = k === 'mw' ? +b.dataset.v : b.dataset.v;
    review();
  }));
  function setView(v) {
    $$('.rev-views button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === v));
    $('.rev-close').hidden = v !== 'close'; $('.rev-wall').hidden = v !== 'wall';
    if (document.body.dataset.step === 'review') requestAnimationFrame(drawReview);
  }
  $$('.rev-views button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  $('[data-cart]').addEventListener('click', () => go('done'));

  // ---- 6 · done ----
  function done() {
    const f = FRAMES.find(x => x.id === S.frame);
    $('[data-sum="done"]').textContent = `${KINDS[S.kind].label}, ${S.size.name}. ${f.name}, ${MOUNTS[S.mount][1]}, ${GLASS[S.glass][2]}. Handmade in Kreuzberg, ready in about a week.`;
    $$('[data-sum="price"]').forEach(e => e.textContent = euro(price()));
    requestAnimationFrame(() => {
      const r = $('.done-pic').getBoundingClientRect();
      $('[data-host="done"]').replaceChildren(frameEl(opts(), r.width * .7, r.height * .75));
    });
  }
  $('[data-restart]').addEventListener('click', () => {
    Object.assign(S, { pic: null, size: null, frame: null, mount: 'white', mw: 5, glass: 'clear', reached: 0 });
    $('#file').value = ''; cw.value = ch.value = ''; $('.custom').setAttribute('aria-checked', 'false');
    $('[data-next="frame"]').disabled = true; $('.pic-up').hidden = false; $('.pic-loading').hidden = true;
    go('what');
  });

  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => {
    const st = document.body.dataset.step;
    if (st === 'frame') buildFrames(); if (st === 'review') drawReview(); if (st === 'done') done();
  }, 150); });

  renderSizes();
  const start = location.hash.slice(1);
  go(ORDER.includes(start) ? start : 'what', false);
})();
