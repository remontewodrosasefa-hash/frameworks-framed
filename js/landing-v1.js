(function(){
  // menu on small screens
  var nav = document.querySelector('.nav'), burger = document.getElementById('burger');
  function setMenu(open){
    nav.classList.toggle('open', open);
    document.documentElement.classList.toggle('menu-open', open);
    if (open) nav.scrollTop = 0;
    // data-menu="colour": the menu opens with framing already open
    if (open && document.documentElement.dataset.menu === 'colour' && !document.querySelector('.col.open')){
      var first = document.querySelector('.col');
      slide(first, true); nav.dataset.sec = 'framing';
    }
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  burger.addEventListener('click', function(){ setMenu(!nav.classList.contains('open')); });
  addEventListener('keydown', function(e){ if (e.key === 'Escape' && nav.classList.contains('open')){ setMenu(false); burger.focus(); } });
  var small = matchMedia('(max-width: 1100px)');
  // back on desktop: close the menu and drop the heights set below (the desktop columns size themselves)
  small.addEventListener('change', function(){
    if (small.matches) return;
    setMenu(false);
    [].forEach.call(document.querySelectorAll('.col'), function(c){
      c.classList.remove('open'); c.querySelector('.title').setAttribute('aria-expanded', 'false'); c.querySelector('.drop').style.height = '';
    });
  });
  // inside the menu (no hover on touch), tapping a link slides its picture + sub-links open: the height animates from where it is
  // (also mid-way) to the content's height, then is let go ('auto') so nothing gets cut off
  function slide(col, open){
    var drop = col.querySelector('.drop');
    drop.style.height = drop.offsetHeight + 'px';
    col.classList.toggle('open', open);
    col.querySelector('.title').setAttribute('aria-expanded', open ? 'true' : 'false');
    drop.offsetHeight; // start the transition from the height just set
    drop.style.height = (open ? drop.scrollHeight : 0) + 'px';
  }
  [].forEach.call(document.querySelectorAll('.col > .title'), function(t){
    var col = t.parentNode, drop = col.querySelector('.drop');
    t.addEventListener('click', function(e){
      if (!small.matches) return;
      e.preventDefault();
      var open = !col.classList.contains('open');
      slide(col, open);
      // data-menu="colour": the menu takes the open section's colour (grey while none is open)
      if (open) nav.dataset.sec = SECS[[].indexOf.call(col.parentNode.children, col)];
      else if (!document.querySelector('.col.open')) delete nav.dataset.sec;
      // one open at a time: opening this one closes the others
      if (open) [].forEach.call(document.querySelectorAll('.col.open'), function(c){ if (c !== col) slide(c, false); });
    });
    drop.addEventListener('transitionend', function(e){
      if (e.target === drop && e.propertyName === 'height' && col.classList.contains('open')) drop.style.height = 'auto';
    });
  });

  // desktop: hovering (or tabbing into) a link opens the whole menu; the column under that link is highlighted.
  // Small delays make it forgiving: it doesn't flash open when the pointer just crosses the bar,
  // and doesn't snap shut when the pointer slips off for a moment.
  var mega = document.getElementById('mega'), cols = [].slice.call(document.querySelectorAll('.col')), openT, closeT;
  function activate(c){
    cols.forEach(function(x){ x.classList.toggle('active', x === c); });
    if (!c || colour !== true) return;
    // data-menu="colour": the panel takes the section's colour; the photo spot moves to the side of the column with more room
    nav.classList.toggle('switching', nav.classList.contains('mega-open'));
    nav.dataset.sec = SECS[cols.indexOf(c)];
    var nr = nav.getBoundingClientRect(), cr = c.getBoundingClientRect(), d = c.querySelector('.drop');
    var pad = parseFloat(getComputedStyle(nav).paddingLeft), gap = nr.width * .04;
    var leftRoom = cr.left - nr.left - pad, rightStart = cr.left - nr.left + d.scrollWidth;
    var rightRoom = nr.width - pad - rightStart;
    if (rightRoom >= leftRoom){ nav.style.setProperty('--ph-l', (rightStart + gap) + 'px'); nav.style.setProperty('--ph-w', (rightRoom - gap) + 'px'); wallSide = 'start'; }
    else { nav.style.setProperty('--ph-l', pad + 'px'); nav.style.setProperty('--ph-w', (leftRoom - gap) + 'px'); wallSide = 'end'; }
    buildWall(c);
  }
  var SECS = ['framing', 'shop', 'studio', 'biz', 'about'], colour = document.documentElement.dataset.menu === 'colour';
  // gallery wall: the open section's photos hang together like a salon wall: a few columns, pictures stacked with one even gap,
  // every column centred on the same middle line, one anchor piece and smaller ones around it. Each picture keeps its own
  // aspect ratio (whole, never cropped); its size is set by a weight (area), so squares and portraits feel equal.
  // WALL[n] = columns of [picture index, weight]; WALL.about has a bigger anchor; WALL.shop uses real frame sizes (40x50, 30x40, small square, photo strip)
  var L = 1, M = .62, S = .38;
  var WALL = {
    4: [[[1,S],[2,S]], [[0,L]], [[3,M]]],
    5: [[[1,S],[2,S]], [[0,L]], [[3,M],[4,S]]],
    6: [[[1,S],[2,S]], [[0,L]], [[3,S],[4,S],[5,S]]],
    shop: [[[1,.8]], [[0,1]], [[2,.5],[3,.5]], [[4,.55]]],
    // about: Our story (the shopfront, landscape) is the big anchor; the tall right column sets the wall's height, so this makes it bigger
    about: [[[1,S],[2,S]], [[0,1.5]], [[3,S],[4,S],[5,S]]]
  };
  var wall = document.querySelector('.mega-photo'), wallCol = null, wallSide = 'start';
  function buildWall(c){
    if (c === wallCol) return;
    wallCol = c;
    wall.textContent = ''; wall.classList.remove('hovering');
    // every wall but the shop starts with one picture (the first link's); hovering a link brings its picture in, and it stays
    wall.classList.toggle('wall-reveal', SECS[cols.indexOf(c)] !== 'shop');
    var srcs = [].map.call(c.querySelectorAll('a[data-pic]'), function(a){ return a.dataset.pic; });
    var spec = WALL[SECS[cols.indexOf(c)]] || WALL[Math.min(6, Math.max(4, srcs.length))];
    // photos with their own background get the stamp teeth (.perf); pictures cut to the frame's edge (frame product shots, the shadow box) don't
    var imgs = srcs.map(function(src){ var im = new Image(); im.alt = ''; im.src = src; if (!/frame-|start-framing|best-/.test(src)) im.className = 'perf'; return im; });
    Promise.all(imgs.map(function(im){ return im.decode().catch(function(){}); })).then(function(){
      if (c !== wallCol) return;
      var K = 100, gap = 5, W = wall.clientWidth, H = wall.clientHeight, cs = [], totW = gap * (spec.length - 1), totH = 0;
      spec.forEach(function(col){
        var items = col.filter(function(it){ return imgs[it[0]]; }).map(function(it){
          var im = imgs[it[0]], asp = (im.naturalWidth / im.naturalHeight) || 1, h = K * Math.sqrt(it[1] / asp);
          return { im: im, i: it[0], w: h * asp, h: h };
        });
        var cw = Math.max.apply(null, items.map(function(x){ return x.w; })), ch = items.reduce(function(t, x){ return t + x.h; }, gap * (items.length - 1));
        cs.push({ items: items, w: cw, h: ch }); totW += cw; totH = Math.max(totH, ch);
      });
      var k = Math.min(W / totW, H / totH), x = wallSide === 'end' ? W - totW * k : 0;
      cs.forEach(function(col){
        var y = (H - col.h * k) / 2;
        col.items.forEach(function(it){
          var el = document.createElement('span');
          el.className = 'mw'; el.dataset.pic = srcs[it.i];
          el.style.cssText = '--i:' + it.i + ';--l:' + (x + (col.w - it.w) / 2 * k) + 'px;--t:' + y + 'px;--w:' + it.w * k + 'px;--h:' + it.h * k + 'px';
          if (it.i === 0) el.classList.add('shown');
          el.appendChild(it.im); wall.appendChild(el);
          y += (it.h + gap) * k;
        });
        x += (col.w + gap) * k;
      });
    });
  }
  function hotPic(src){
    wall.classList.toggle('hovering', !!src);
    [].forEach.call(wall.children, function(el){
      var hot = el.dataset.pic === src, was = el.classList.contains('hot');
      el.classList.toggle('hot', hot);
      if (hot){ clearTimeout(el._hide); el.classList.add('shown'); }
      // a picture brought in by hovering goes again 2.5s after its link is left (the first one stays), so the wall never fills up
      else if (was && el.style.getPropertyValue('--i') !== '0') el._hide = setTimeout(function(){ el.classList.remove('shown'); }, 2500);
    });
  }
  // back to the one picture each time the menu opens
  function resetWall(){ [].forEach.call(wall.children, function(el, i){ el.classList.toggle('shown', el.style.getPropertyValue('--i') === '0'); }); }
  [].forEach.call(document.querySelectorAll('.mega a[data-pic]'), function(a){
    // an overview link (data-wall="all", e.g. Shop all) keeps the whole wall lit
    var pic = a.dataset.wall === 'all' ? null : a.dataset.pic;
    a.addEventListener('mouseenter', function(){ if (colour) hotPic(pic); });
    a.addEventListener('focus', function(){ if (colour) hotPic(pic); });
    a.addEventListener('mouseleave', function(){ if (colour) hotPic(null); });
    a.addEventListener('blur', function(){ if (colour) hotPic(null); });
  });
  // preload the photos the first time the pointer comes to the bar, so they appear without a wait
  nav.addEventListener('pointerenter', function(){
    if (colour) [].forEach.call(document.querySelectorAll('.mega a[data-pic]'), function(a){ new Image().src = a.dataset.pic; });
  }, { once: true });
  function setMega(open){
    if (small.matches) return;
    clearTimeout(openT); clearTimeout(closeT);
    if (open){ openT = setTimeout(function(){ if (!nav.classList.contains('mega-open')) resetWall(); nav.classList.add('mega-open'); }, nav.classList.contains('mega-open') ? 0 : 80); }
    else { closeT = setTimeout(function(){ nav.classList.remove('mega-open'); activate(null); }, 250); }
  }
  cols.forEach(function(c){
    c.addEventListener('mouseenter', function(){ activate(c); setMega(true); });
    c.addEventListener('focusin', function(){ activate(c); setMega(true); });
  });
  nav.addEventListener('mouseenter', function(){ if (nav.classList.contains('mega-open')) clearTimeout(closeT); });
  nav.addEventListener('mouseleave', function(){ setMega(false); });
  nav.addEventListener('focusout', function(e){ if (!nav.contains(e.relatedTarget)) setMega(false); });

  // the open panel lines up across the five columns: every picture + promise + main links block is as tall as the tallest one,
  // so the secondary links all start on the panel's hairline. Measured again when the width, the fonts or the language change
  var drops = [].slice.call(document.querySelectorAll('.drop'));
  function sizeMenu(){
    nav.style.removeProperty('--main-h'); nav.style.removeProperty('--more-h'); nav.style.removeProperty('--drop-h');
    if (small.matches) return;
    // each title may use the room from its link to the right edge of the bar; it wraps (two even lines) when that's not enough
    var nr = nav.getBoundingClientRect(), pad = parseFloat(getComputedStyle(nav).paddingRight);
    drops.forEach(function(d){ d.style.setProperty('--title-w', (nr.right - pad - d.parentNode.getBoundingClientRect().left) + 'px'); });
    var main = 0, more = 0;
    drops.forEach(function(d){
      main = Math.max(main, d.querySelector('.drop-main').offsetHeight);
      more = Math.max(more, d.querySelector('.drop-more').offsetHeight);
    });
    nav.style.setProperty('--main-h', main + 'px'); nav.style.setProperty('--more-h', more + 'px');
    // data-menu="colour": one column at a time, as tall as the tallest one (links, secondary links, title at the bottom)
    var dh = 0;
    drops.forEach(function(d){ dh = Math.max(dh, d.offsetHeight - parseFloat(getComputedStyle(d).paddingTop)); });
    nav.style.setProperty('--drop-h', dh + 'px');
  }
  sizeMenu();
  if (document.fonts) document.fonts.ready.then(sizeMenu);
  var sizeT; addEventListener('resize', function(){ wallCol = null; clearTimeout(sizeT); sizeT = setTimeout(sizeMenu, 100); });

  // the bar slides away while scrolling down and comes back when scrolling up, when the pointer goes to the top
  // of the screen, or when something in it has focus. It stays while a menu is open or the pointer is on it.
  var lastY = scrollY, navT = 0, overNav = false;
  function showNav(show){ nav.classList.toggle('away', !show); }
  function navHeld(){ return overNav || nav.classList.contains('open') || nav.classList.contains('mega-open') || nav.contains(document.activeElement); }
  addEventListener('scroll', function(){
    if (navT) return;
    navT = requestAnimationFrame(function(){
      navT = 0;
      var y = scrollY, d = y - lastY;
      if (Math.abs(d) < 6) return;
      if (y <= nav.offsetHeight) showNav(true);
      else if (!navHeld()) showNav(d < 0);
      lastY = y;
    });
  }, { passive: true });
  nav.addEventListener('mouseenter', function(){ overNav = true; });
  nav.addEventListener('mouseleave', function(){ overNav = false; });
  nav.addEventListener('focusin', function(){ showNav(true); });
  document.addEventListener('mousemove', function(e){
    if (nav.classList.contains('away') && e.clientY <= nav.getBoundingClientRect().bottom + nav.offsetHeight) showNav(true);
  }, { passive: true });
  // German copy. The English is the text in index.html; every element with data-i18n="key" is swapped by the DE / EN links.
  // Keys missing here (e.g. the nav sub-links) stay English.
  var DE = {
    'nav.framing': 'rahmung', 'nav.shop': 'shop', 'nav.studio': 'open studio', 'nav.biz': 'für unternehmen', 'nav.about': 'über uns',
    'nav.cta': 'Online rahmen', 'nav.ask': 'Fragen?', 'nav.mail': 'Schreib uns',
    'nav.p1': 'Online oder im Laden', 'nav.p2': 'Fertig zum Aufhängen', 'nav.p3': 'Selbst rahmen', 'nav.p4': 'Für eure Räume', 'nav.p5': 'Seit 2014',
    'nav.online': 'Online rahmen', 'nav.consult': 'Termin buchen', 'nav.materials': 'Materialien', 'nav.prices': 'Preise & Ablauf',
    'nav.all': 'Alle Produkte', 'nav.framedArt': 'Gerahmte Kunst', 'nav.coll': 'Kollektionen', 'nav.frames': 'Bilderrahmen', 'nav.gift': 'Gutscheine',
    'nav.desk': 'Arbeitsplatz buchen', 'nav.courses': 'Kurse', 'nav.events': 'Events', 'nav.aboutStudio': 'Über das Studio',
    'nav.interiors': 'Interiors', 'nav.projects': 'Projekte', 'nav.enquiry': 'Angebot anfragen', 'nav.collab': 'Kooperationen',
    'nav.story': 'Unsere Geschichte', 'nav.team': 'Team', 'nav.places': 'Standorte', 'nav.sust': 'Nachhaltigkeit', 'nav.mag': 'Magazin', 'nav.faq': 'FAQ & Kontakt',
    'foot.shipping': 'Versand & Rückgabe', 'foot.jobs': 'Jobs',
    'hero.title': 'Die Kunst des nachhaltigen Bilderrahmens.',
    'hero.sub': 'Handgemachte Rahmen aus unserem Berliner Atelier. Bestell online in deiner Größe oder komm vorbei.',
    'hero.online': 'Online rahmen', 'hero.visit': 'Termin buchen',
    'hero.rating': '4,9 aus 208 Google-Bewertungen',
    'c1.title': 'Rahmen', 'c1.line': 'Online oder in unserem Laden',
    'c2.title': 'Räume', 'c2.line': 'Maßanfertigung für Unternehmen',
    'c3.title': 'Kurse', 'c3.line': 'Rahmenbau in 4 Stunden',
    'about.w1': 'Deine', 'about.w2': 'Wände', 'about.w3': 'sind nicht', 'about.w4': 'leer.', 'about.w5': 'Sie', 'about.w6': 'warten.', 'about.more': 'Über uns',
    'proj.title': 'Projekte', 'proj.all': 'Galerien · Interiors · Gastronomie', 'proj.1.name': 'Restaurant BRLO',
    'proj.1.line': 'Rahmen für das neue Restaurant der BRLO-Brauerei in Charlottenburg, zusammen mit dem Künstlerduo »MMachine«.',
    'proj.2.line': 'Ausstellung im Direktorenhaus, Museum für Kunst, Handwerk und Design in Berlin.',
    'proj.3.line': 'Wandgestaltung mit einer Berliner Handsiebdruckerei: Siebdrucke auf Leinwand in Schattenfugenrahmen, für ein Resort auf Kreta.', 'proj.trust': 'Vertrauen uns', 'proj.more': '[+ Galerien & Künstler:innen]',
    'sust.label': 'Nachhaltigkeit & Handwerk', 'sust.title': 'Von der Tür zum Rahmen.',
    'sust.more': 'Die ganze Geschichte',
    'rev.head': 'Echtes Feedback.', 'rev.all': '4,9 aus 208 Google-Bewertungen',
    'how.label': 'So funktioniert’s', 'how.title': 'Von deinem Bild an deine Wand.', 'how.cta': 'Online rahmen',
        'how.s1': 'Hochladen oder vorbeibringen', 'how.t1': 'Lade ein Foto hoch oder gib die Maße ein, oder bring es in den Laden in Kreuzberg.',
    'how.s2': 'Mit Beratung wählen', 'how.t2': 'Wähle Rahmen, Passepartout und Glas online oder mit einem Rahmenbauer an der Theke.',
    'how.s3': 'Handgemacht in Berlin', 'how.t3': 'In unserer Werkstatt in Kreuzberg von Hand zugeschnitten, verbunden und eingepasst.',
    'how.s4': 'Fertig zum Aufhängen', 'how.t4': 'Zu dir nach Hause geschickt oder in Kreuzberg abgeholt. Meist in etwa einer Woche.',
    'price.label': 'Was es kostet', 'price.title': 'Maßgefertigt, ab 56 €.', 'price.text': 'Der Preis richtet sich nach Länge plus Breite deines Bildes. Die Tiefe zählt nicht.',
    'price.from': 'ab', 'price.upto': 'L + B bis', 'price.n1': 'Mini', 'price.n2': 'Klein', 'price.n3': 'Mittel', 'price.n4': 'Groß', 'price.n5': 'Sehr groß', 'price.n6': 'Übergroß',
    'how.note': 'Ein Original, ein Textil oder etwas Wertvolles? Setz dich mit einem Rahmenbauer in unserem Atelier in Kreuzberg zusammen.',
    'about.text': 'Ein Bilderrahmen-Atelier im Herzen Berlins. Wir bauen jeden Rahmen von Hand aus nachhaltigem und recyceltem Holz – als Unikat oder in Serie.',
    'frame.enter': 'Rahmen-Modus testen',
    'trace.about': 'Über uns', 'trace.entries': 'Los geht’s', 'trace.sust': 'Nachhaltigkeit', 'trace.how': 'So geht’s', 'trace.styles': 'Rahmenstile',
    'trace.shop': 'Fertig zum Aufhängen', 'trace.reviews': 'Bewertungen', 'trace.projects': 'Projekte', 'trace.library': 'Materialien',
    'toc.open': 'Auf dieser Seite', 'toc.t1': 'Inhalt', 'toc.t2': 'dieser Seite', 'toc.close': 'Schließen',
    'toc.intro': 'Alles auf dieser Seite, der Reihe nach von oben nach unten. Wähl einen Teil, um direkt dorthin zu gehen.',
    'toc.ch1': 'Willkommen', 'toc.ch2': 'So arbeiten wir', 'toc.ch3': 'Rahmen & Shop', 'toc.ch4': 'Unsere Arbeit', 'toc.ch5': 'Materialien', 'toc.ch6': 'Besuch & Hilfe',
    'toc.here': 'Du bist hier',
    'trace.studio': 'Kaffee', 'trace.faq': 'FAQs', 'trace.closing': 'Deine Wände',
    'shop.title': 'Fertig zum Aufhängen', 'shop.tab1': 'Bestseller', 'shop.tab2': 'Gerahmte Kunst', 'shop.tab3': 'Kollektionen',
    'tag.best': 'Bestseller',
    'best.kicker': 'Nachhaltigkeitskollektion', 'best.title': 'Unsere Lieblingsrahmen', 'best.text': 'Unikate, von Hand in Berlin aus Altholz gefertigt.', 'best.cta': 'Zur Kollektion',
    'best.l.nkPhoto': 'Neukölln · Fotoautomat', 'best.l.kbPhoto': 'Kreuzberg · Fotoautomat', 'best.l.workshop': 'Frameworks Werkstatt', 'best.l.walnut': 'Grünewald · Massiver Nussbaum',
    'best.s.strip': 'Für Fotostreifen', 'best.s.choose': 'Holz und Größe nach Wahl', 'best.s.mat': 'Mit Passepartout',
    'best.p.35': '35 €', 'best.p.40': '40 €', 'best.p.49': 'ab 49 €', 'best.p.55': 'ab 55 €',
    'art.kicker': 'Gerahmte Kunstwerke', 'art.title': 'Unsere Auswahl stammt von Künstlern, die wir kennen. Authentisch und vielfältig.', 'art.text': 'Das Kunstwerk steht im Mittelpunkt, wir unterstreichen es mit maßgefertigten Rahmen.', 'art.cta': 'Gerahmte Kunst ansehen',
    'tag.curated': 'Kuratiert', 'art.go': 'Werk ansehen', 'art.photo': 'Fotografie',
    'coll.title': 'Was möchtest du rahmen?', 'coll.text': 'Du bringst das Stück, wir finden den Rahmen.', 'coll.cta': 'Alle Kollektionen', 'coll.go': 'Rahmen ansehen',
    'coll.1.name': 'Poster', 'coll.1.line': 'Gängige Formate, von Hand gerahmt.', 'coll.2.name': 'Schallplatten', 'coll.2.line': 'Deine Lieblingsplatte, an der Wand.',
    'coll.3.name': 'Trikots & T-Shirts', 'coll.3.line': 'Tiefe Rahmen für Dinge mit Tiefe.', 'coll.4.name': 'Hochzeitsfotos', 'coll.4.line': 'Ein Rahmen, so beständig wie der Tag.',
    'styles.title': 'Acht Arten zu rahmen.', 'styles.text': 'Jedes Stück braucht etwas anderes. Hier fängst du an.',
    'styles.1.name': 'Passe\u00ADpartout', 'styles.1.line': 'Ein Rand um das Bild: klassisch für Fotos, und kleine Werke wirken größer.',
    'styles.2.name': 'Objektrahmen', 'styles.2.line': 'Lässt Objekte, Aquarelle und Collagen schweben – die Kanten bleiben sichtbar.',
    'styles.3.name': 'Posterrahmen', 'styles.3.line': 'Ohne Passepartout: Das Bild füllt den ganzen Rahmen.',
    'styles.4.name': 'Wechselrahmen', 'styles.4.line': 'Am schnellsten: Das Bild tauschst du zu Hause, wann du willst.',
    'styles.5.name': 'Antikrahmen', 'styles.5.line': 'Für besondere Stücke, die erst in einem alten Rahmen zur Geltung kommen.',
    'styles.6.name': 'Keilrahmen', 'styles.6.line': 'Für Gemälde auf Leinwand, groß oder klein, die gespannt werden müssen.',
    'styles.7.name': 'Schattenfuge', 'styles.7.line': 'Eine schwebende Fuge, kein Glas: für Gemälde und kaschierte Fotos.',
    'styles.8.name': 'Spiegel', 'styles.8.line': 'Wenn das eigene Spiegelbild das schönste Kunstwerk ist.',
    'sust.s1a': '12 Jahre.', 'sust.s1b': '20.000', 'sust.s1c': 'Rahmen.', 'sust.s1t': 'Alle von Hand in Berlin gebaut – angefangen 2013 in einem geliehenen Raum in einem alten Schwimmbad.',
    'sust.s2a': '10.000 davon', 'sust.s2b': 'waren Türen', 'sust.s2c': 'und', 'sust.s2d': 'Dielen.', 'sust.s2t': 'Altes Holz aus Berlin und Brandenburg, zu Rahmen geschnitten statt Bäume.',
    'sust.s3a': 'Manche waren', 'sust.s3b': 'Fischer-', 'sust.s3c': 'boote.', 'sust.s3t': 'Wir kaufen alte Boote auf Bali von einem Freund der Familie und bauen daraus Rahmen.',
    'sust.s4a': 'Aus Reststücken', 'sust.s4b': 'werden', 'sust.s4c': 'kleine Rahmen.', 'sust.s4t': 'Nichts Brauchbares wird weggeworfen. Neues Holz ist FSC-zertifiziertes Hartholz.',
    'sust.s5a': 'Nichts wird', 'sust.s5b': 'gebaut, bevor', 'sust.s5c': 'du bestellst.', 'sust.s5t': 'Auf Bestellung gefertigt, also kein Überbestand – und so verbunden, dass man ihn reparieren kann.',
    'lib.label': 'Die Materialbibliothek', 'lib.title': 'Woraus ein Rahmen besteht.',
    'lib.intro': 'Vier Schichten, zehn Materialien. Wähl eins und sieh es im Rahmen.',
    'lib.c1.name': 'Die Leiste', 'lib.c1.line': 'Der Rahmen selbst. Fünf Arten, von alten Berliner Türen bis zu Rohstahl.',
    'lib.c2.name': 'Die Oberfläche', 'lib.c2.line': 'Was aufs Holz kommt: Farbe, Blattmetall oder einfach Wachs und Öl.',
    'lib.c3.name': 'Das Passepartout', 'lib.c3.line': 'Der Kartonrand zwischen Rahmen und Werk. Weiß, schwarz, farbig oder gar keiner.',
    'lib.c4.name': 'Das Glas', 'lib.c4.line': 'Die letzte Schicht. Sie hält Staub und Licht vom Werk fern.',
    'lib.art': 'Dein Werk', 'lib.end.title': 'Für genau dieses Bild gemacht.',
    'lib.end.line': 'Jedes Material kannst du im Atelier anfassen. Für dein eigenes Stück: online starten.',
    'lib.m1.cap': 'Weißes Passepartout', 'lib.m2.cap': 'Schwarzes Passepartout', 'lib.m3.cap': 'Farbiges Passepartout', 'lib.m4.cap': 'Ohne Passepartout',
    'lib.1.name': 'Upcycling', 'lib.1.line': 'Alte Türen, Dielen und Boote: Holz mit Vergangenheit, zu Unikaten gemacht.',
    'lib.2.name': 'Massivholz', 'lib.2.line': 'FSC-zertifizierte Eiche, Esche und Nussbaum, für höchste Qualität.',
    'lib.3.name': 'Standard', 'lib.3.line': 'Fertig beschichtete Leisten, von Hand zugeschnitten und verbunden: die günstige Wahl.',
    'lib.4.name': 'Antik', 'lib.4.line': 'Originale alte Rahmen mit Patina und Geschichte, für dein Stück aufbereitet.',
    'lib.5.name': 'Stahl', 'lib.5.line': 'Rohstahl, gealtert oder poliert, mit markanter Maserung.',
    'lib.6.name': 'Farben', 'lib.6.line': 'Matte Farben und leuchtende Lasuren, abgestimmt auf das Werk.',
    'lib.7.name': 'Gold & Silber', 'lib.7.line': 'Echte Blattvergoldung, von Hand aufgelegt.',
    'lib.8.name': 'Wachs & Öl', 'lib.8.line': 'Natürliche Oberflächen, die die Maserung zeigen.',
    'lib.m1.name': 'Weiß', 'lib.m1.line': 'Säurefreier Museumskarton, der Klassiker: Er gibt dem Werk Raum und hält es vom Glas fern.',
    'lib.m2.name': 'Schwarz', 'lib.m2.line': 'Tiefschwarzer Karton, für Fotografien und kräftige Grafik.',
    'lib.m3.name': 'Farbig', 'lib.m3.line': 'Farbige Kartons, passend zu einer Farbe im Werk.',
    'lib.m4.name': 'Ohne Passepartout', 'lib.m4.line': 'Kein Kartonrand: Das Werk liegt direkt auf der Rückwand.',
    'lib.10.name': 'Glas', 'lib.10.line': 'Floatglas oder entspiegeltes Museumsglas mit UV-Schutz.',
    'coffee.label': 'Jetzt im Laden · bis Dezember', 'coffee.title': 'Komm für einen Rahmen. Bleib für den Filterkaffee.',
    'coffee.c1': 'Mitten in unserem Laden steht eine Espressobar. Bis Dezember steht Hoa von Antibarist dahinter, mittwochs bis samstags ab 8 Uhr.',
    'coffee.c2': 'Hoa spricht über Bohnen, Röstung und Wasser so wie wir über Holz, Glas und Passepartouts. Auch ohne Rahmen – komm einfach vorbei.',
    'coffee.note': 'Warum es bei Frameworks ab August Espresso gibt.', 'coffee.more': 'Zur Geschichte', 'coffee.close': 'Schließen',
    'coffee.best': 'Der beste Filterkaffee der Stadt', 'coffee.sticker': 'Bis Dezember',
    'coffee.r.days': 'Mi–Sa', 'coffee.r.from': 'ab 8:00', 'coffee.r.until': 'Bis', 'coffee.r.dec': 'Dez 2026', 'coffee.r.frame': 'Rahmen', 'coffee.r.opt': 'optional',
    'coffee.r.thanks': 'Danke, bis bald',
    'mag.label': 'Magazin', 'mag.all': 'Alle Geschichten', 'mag.title': 'Geschichten aus dem Laden.',
    'mag.1.kicker': 'Rede', 'mag.1.title': '12 Jahre Frameworks', 'mag.1.line': 'Claire d’Orsay über 20.000 Rahmen, ein Schwimmbad und warum Kunst gerahmt besser aussieht',
    'mag.2.kicker': 'Geschichte', 'mag.2.title': 'Warum es bei Frameworks Espresso gibt', 'mag.2.line': 'Es fing in einem Schwimmbad an. Also haben wir eine Bar gebaut.',
    'mag.3.kicker': 'Kunstmesse', 'mag.3.title': 'Paper Positions 2026', 'mag.3.line': 'Die Messe, die Community, die Mission',
    'mag.4.kicker': 'Interview', 'mag.4.title': 'Handgemacht in Kreuzberg', 'mag.4.line': 'Über Handwerk und Kreuzberg, für die Funke Mediengruppe',
    'mag.5.kicker': 'Essay', 'mag.5.title': 'Nachhaltiges Handwerk', 'mag.5.line': 'Handwerk, unsere Branche und die Wirtschaft',
    'insta.line': 'Neue Rahmen, neue Kunst und das Leben im Laden, auf Instagram.',
    'faq.ask': 'Noch unsicher? Komm vorbei, ruf an oder schreib uns – wir beraten lieber, als zu raten.',
    'close.frame': 'Oder sieh dir diese Seite im Rahmen an',
    'faq.title': 'FAQs', 'faq.kick': 'Gut zu wissen', 'faq.all': 'Alle Fragen',
    'faq.q6': 'Was kostet eine Rahmung?', 'faq.a6': 'Maßrahmen gibt es ab 56 €, der Preis richtet sich nach Länge plus Breite deines Bildes.', 'faq.a6link': 'Die sechs Größen',
    'faq.q1': 'Wie lange dauert es?', 'faq.a1': 'Fertige Rahmen verschicken wir in 2–3 Werktagen. Maßanfertigungen dauern etwa eine Woche, je nach Lieferanten bis zu zwei. November und Dezember dauern länger – wenn du einen Termin hast, sag uns vorher Bescheid.',
    'faq.q2': 'Wie messe ich mein Bild aus?', 'faq.a2': 'Breite und Höhe in mm, den Rest rechnen wir. Der Rahmen überlappt das Werk um etwa 5 mm, ein Passepartout um etwa 4 mm. Hat dein Print einen weißen Rand, miss das ganze Blatt, wenn er sichtbar bleiben soll, sonst nur das Motiv.',
    'faq.q3': 'Kann ich ein Original, ein Textil oder ein Objekt rahmen lassen?', 'faq.a3': 'Ja, im Atelier. Komm vorbei oder buch einen Termin, dann wählen wir Rahmen, Passepartout und Glas gemeinsam.',
    'faq.q4': 'Was kostet der Versand?', 'faq.a4': 'Ab 150 € versandkostenfrei, und abholen kannst du immer in Kreuzberg. Wir liefern in ganz Deutschland, Europa und weltweit; für wertvolle Stücke organisieren wir versicherten Kunsttransport.',
    'faq.q5': 'Kann ich einen Rahmen zurückgeben?', 'faq.a5': 'Ja, innerhalb von 14 Tagen und unbeschädigt. Kommt etwas kaputt an, schick uns sofort Fotos per E-Mail – wir reparieren oder erstatten.',
    'close.title': 'Deine Wände warten.', 'close.text': 'Bestell online in deiner Größe oder bring dein Stück in unser Atelier in Kreuzberg.',
    'foot.studio': 'Atelier & Laden', 'foot.imprint': 'Impressum', 'foot.privacy': 'Datenschutz', 'foot.terms': 'AGB',
    'coll.5.name': 'Kinderzeichnungen', 'coll.5.line': 'Vom Kühlschrank an die Wand.'
  };
  var EN = { 'frame.exit': 'Exit frame mode' }, lang = 'en';
  var i18nEls = [].slice.call(document.querySelectorAll('[data-i18n]'));
  i18nEls.forEach(function(el){ EN[el.dataset.i18n] = el.textContent; });
  function t(key){ return (lang === 'de' && DE[key]) || EN[key]; }
  function setLang(l){
    lang = l; document.documentElement.lang = l;
    i18nEls.forEach(function(el){ el.textContent = t(el.dataset.i18n); });
    sizeMenu();
    if (root.classList.contains('framed')) ft.querySelector('span').textContent = t('frame.exit');
    [].forEach.call(document.querySelectorAll('[data-lang]'), function(a){
      if (a.dataset.lang === l) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  [].forEach.call(document.querySelectorAll('[data-lang]'), function(a){
    a.addEventListener('click', function(e){ e.preventDefault(); setLang(a.dataset.lang); });
  });

  // frame mode: the page shrinks into a real Frameworks frame (js/frame.js builds it); the same button exits again
  var root = document.documentElement, ft = document.getElementById('frame-toggle'), ftT;
  function setFramed(on){
    root.classList.toggle('framed', on);
    ft.querySelector('span').textContent = t(on ? 'frame.exit' : 'frame.enter');
    clearTimeout(ftT);
    if (on && window.frameRebuild) ftT = setTimeout(window.frameRebuild, 720); // rebuild the chipped moulding at its final size
  }
  ft.addEventListener('click', function(){ setFramed(!root.classList.contains('framed')); });

  // Esc closes the menu first, then leaves frame mode
  document.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (root.classList.contains('toc-open')){ tocClose(); return; }
    if (nav.classList.contains('mega-open')){ clearTimeout(openT); nav.classList.remove('mega-open'); activate(null); }
    else if (root.classList.contains('framed')) setFramed(false);
  });

  // about: the poster line lights up in reading order as it scrolls up the screen (words grey → ink, pieces fade in).
  // Starts when its top is 85% down the screen, done when its bottom reaches 60%
  var aboutLine = document.querySelector('.about-line'), aboutBits = [].slice.call(aboutLine.children), alT = 0;
  function lightAbout(){
    var r = aboutLine.getBoundingClientRect(), vh = innerHeight;
    var p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (vh * .25 + r.height)));
    var n = Math.round(p * aboutBits.length);
    aboutBits.forEach(function(b, i){ b.classList.toggle('on', i < n); });
  }
  addEventListener('scroll', function(){ if (!alT) alT = requestAnimationFrame(function(){ alT = 0; lightAbout(); }); }, { passive: true });
  addEventListener('resize', lightAbout);
  lightAbout();

  // stamps (how it works + frame styles) appear one by one as you scroll, not all at once: a stamp rises in once its top passes
  // 92% of the screen height, minus 16% for every stamp before it in the same visual row (offsetTop ignores the rise transform).
  // So a row of four fills in over about half a screen of scrolling. Scrolling back up takes them away again in reverse order
  var seq = [].slice.call(document.querySelectorAll('.how-row .stamp, .cost-step, .styles-row .sx')), seqT = 0;
  function seqCheck(){
    seq.forEach(function(el){
      var k = 0, p = el.previousElementSibling;
      while (p && Math.abs(p.offsetTop - el.offsetTop) < 8){ k++; p = p.previousElementSibling; }
      el.classList.toggle('in', el.getBoundingClientRect().top < innerHeight * (.92 - k * (el.classList.contains('cost-step') ? .05 : .16))); // the six price frames follow each other closer
    });
  }
  addEventListener('scroll', function(){ if (!seqT) seqT = requestAnimationFrame(function(){ seqT = 0; seqCheck(); }); }, { passive: true });
  addEventListener('resize', seqCheck);
  seqCheck();

  // short about text, the three cards, shop + review notes: rise in when scrolled into view
  var io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: .1 });
  [].forEach.call(document.querySelectorAll('.reveal, .shop, .entries, .rev-board'), function(el){ io.observe(el); });



  // coffee spread: "Read the story" opens the full article right in the note, one page at a time. The text is set in columns as tall
  // as the box (css), so a page is one column: the count comes from the text's width and stays right at any size or font
  var cfCoffee = document.querySelector('.coffee'), cfRead = document.getElementById('cf-read');
  if (cfCoffee && cfRead){
    var cfText = cfRead.firstElementChild, cfMore = cfCoffee.querySelector('.coffee-more'), cfPager = cfCoffee.querySelector('.cf-pager'),
        cfCount = cfPager.querySelector('.cf-count'), cfTurns = cfPager.querySelectorAll('.cf-turn'), cfPg = 0, cfN = 1, cfT = 0,
        cfStill = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var two = function(n){ return (n < 10 ? '0' : '') + n; };
    function cfShow(){
      var w = cfRead.clientWidth, g = parseFloat(getComputedStyle(cfText).columnGap) || 0;
      cfN = Math.max(1, Math.round((cfText.scrollWidth + g) / (w + g)));
      cfPg = Math.min(cfPg, cfN - 1);
      cfText.style.setProperty('--pg', cfPg);
      cfCount.textContent = two(cfPg + 1) + ' / ' + two(cfN);
      cfTurns[0].disabled = cfPg === 0; cfTurns[1].disabled = cfPg >= cfN - 1;
      if (document.activeElement && document.activeElement.disabled) (cfTurns[0].disabled ? cfTurns[1] : cfTurns[0]).focus();
    }
    function cfGo(d){
      var to = Math.max(0, Math.min(cfN - 1, cfPg + d));
      if (to === cfPg) return;
      cfText.classList.add('turn'); clearTimeout(cfT);
      cfT = setTimeout(function(){ cfPg = to; cfShow(); cfText.classList.remove('turn'); }, cfStill ? 0 : 200);
    }
    function cfOpen(on){
      cfCoffee.classList.toggle('reading', on);
      cfRead.hidden = cfPager.hidden = !on; cfMore.hidden = on;
      cfMore.setAttribute('aria-expanded', on);
      if (on){ cfPg = 0; cfShow(); (cfTurns[1].disabled ? cfPager.querySelector('.cf-close') : cfTurns[1]).focus({ preventScroll: true }); }
      else cfMore.focus({ preventScroll: true });
    }
    cfMore.addEventListener('click', function(e){ e.preventDefault(); cfOpen(true); });
    cfPager.querySelector('.cf-close').addEventListener('click', function(){ cfOpen(false); });
    [].forEach.call(cfTurns, function(b){ b.addEventListener('click', function(){ cfGo(+b.dataset.dir); }); });
    cfCoffee.addEventListener('keydown', function(e){
      if (!cfCoffee.classList.contains('reading')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft'){ e.preventDefault(); cfGo(e.key === 'ArrowRight' ? 1 : -1); }
      else if (e.key === 'Escape'){ e.stopPropagation(); cfOpen(false); }
    });
    if (window.ResizeObserver) new ResizeObserver(function(){ if (!cfRead.hidden) cfShow(); }).observe(cfRead);
  }

  // magazine tabs above the spread: each opens its story's spread (arrow keys / Home / End move between them, like the shop tabs)
  var magTabs = [].slice.call(document.querySelectorAll('.mag-tab'));
  function openStory(tab, focus){
    magTabs.forEach(function(x){
      var on = x === tab, panel = document.getElementById(x.getAttribute('aria-controls'));
      x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      if (on && panel.hidden){ panel.hidden = false; panel.classList.remove('show'); void panel.offsetWidth; panel.classList.add('show', 'in'); }
      else if (!on) panel.hidden = true;
    });
    var row = tab.parentNode; // phones: the row swipes, so bring the open tab into it
    if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: tab.offsetLeft - 20, behavior: 'smooth' });
    if (focus) tab.focus({ preventScroll: true });
  }
  magTabs.forEach(function(tab, i){
    tab.addEventListener('click', function(){ openStory(tab); });
    tab.addEventListener('keydown', function(e){
      var n = magTabs.length, to = { ArrowRight: i + 1, ArrowLeft: i - 1 + n, Home: 0, End: n - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault(); openStory(magTabs[to % n], true);
    });
  });

  // shop row: three tabs (arrow keys move between them), and arrows that scroll the open row one card at a time
  var tabs = [].slice.call(document.querySelectorAll('.shop-tab')), arrows = [].slice.call(document.querySelectorAll('.shop .shop-arrow'));
  function openRow(){ return document.querySelector('.shop-panel:not([hidden]) .shop-row'); }
  function updateArrows(){
    var r = openRow(); if (!r) return;
    arrows[0].disabled = r.scrollLeft <= 2;
    arrows[1].disabled = r.scrollLeft >= r.scrollWidth - r.clientWidth - 2;
  }
  function selectTab(tab){
    tabs.forEach(function(x){
      var on = x === tab;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on; // showing a panel replays the cards' rise
    });
    openRow().scrollLeft = 0;
    updateArrows();
  }
  tabs.forEach(function(tab, i){
    tab.addEventListener('click', function(){ selectTab(tab); });
    tab.addEventListener('keydown', function(e){
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      var next = tabs[(i + d + tabs.length) % tabs.length];
      selectTab(next); next.focus();
    });
  });
  arrows.forEach(function(a){
    a.addEventListener('click', function(){
      var r = openRow(), card = r.children[1] || r.children[0];
      r.scrollBy({ left: a.dataset.dir * (card.offsetWidth + parseFloat(getComputedStyle(r).columnGap)) });
    });
  });
  [].forEach.call(document.querySelectorAll('.shop-row'), function(r){
    r.addEventListener('scroll', updateArrows, { passive: true });
    new ResizeObserver(updateArrows).observe(r);
  });

  // rows that scroll sideways (projects, reviews); the arrows move them one item at a time, disabled at the ends, hidden while nothing overflows
  function sideRow(list, arrows){
    if (!list || arrows.length < 2) return;
    var update = function(){
      arrows[0].parentNode.hidden = list.scrollWidth <= list.clientWidth + 2; // nothing to scroll: no arrows
      arrows[0].disabled = list.scrollLeft <= 2;
      arrows[1].disabled = list.scrollLeft >= list.scrollWidth - list.clientWidth - 2;
    };
    arrows.forEach(function(a){
      a.addEventListener('click', function(){
        var x = list.scrollLeft, items = [].slice.call(list.children),
            pad = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0, to;
        // snap to the start of the next / previous item (they are not all the same width)
        if (a.dataset.dir > 0) to = items.map(function(el){ return el.offsetLeft - pad; }).filter(function(l){ return l > x + 2; })[0];
        else to = items.map(function(el){ return el.offsetLeft - pad; }).filter(function(l){ return l < x - 2; }).pop();
        list.scrollTo({ left: to === undefined ? (a.dataset.dir > 0 ? list.scrollWidth : 0) : to });
      });
    });
    list.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(list);
  }
  sideRow(document.querySelector('.proj-list'), [].slice.call(document.querySelectorAll('.proj-arrows .shop-arrow')));
  sideRow(document.querySelector('.rev-board'), [].slice.call(document.querySelectorAll('.rev-arrows .shop-arrow')));

  // sustainability: one statement is .on at a time and shows its picture (desktop: also on the blurred backdrop + in the badge).
  // Desktop, data-mode="flow" (default): the statements scroll like the rest of the page next to the pinned photo; the one crossing the
  // middle of the screen picks the photo. Phones: the statement in view picks it (lower than the middle, the pinned picture covers the top).
  // The earlier pinned scroll track is kept to compare: ?sust=pinned (3 screens) or ?sust=long (3.6 screens)
  var sustQ = (location.search.match(/[?&]sust=(pinned|long)\b/) || [])[1];
  if (sustQ) document.querySelector('.sust').setAttribute('data-mode', 'pinned');
  if (sustQ === 'long') document.querySelector('.sust').setAttribute('data-track', 'long');
  var sust = document.querySelector('.sust'), steps = [].slice.call(document.querySelectorAll('.sust-step')),
      sustPics = [].slice.call(document.querySelectorAll('.sust-pic')), sustMedia = document.querySelector('.sust-media'),
      sustNo = document.querySelector('.sust-no'), sustWide = matchMedia('(min-width: 1101px)'), sustN = -1;
  // one blurred backdrop per photo (they cross-fade)
  var sustBlurs = sustPics.map(function(pc){
    var b = document.createElement('div'); b.className = 'sust-blur';
    b.style.backgroundImage = 'url(' + pc.getAttribute('src') + ')';
    sustMedia.insertBefore(b, sustMedia.firstChild); return b;
  });
  function sustSet(n){
    if (n === sustN) return; sustN = n;
    [steps, sustPics, sustBlurs].forEach(function(list){
      list.forEach(function(el, i){ el.classList.toggle('on', i === n); el.classList.toggle('past', i < n); });
    });
    sustNo.textContent = '0' + (n + 1);
  }
  // desktop: the track scrolls one beat per statement. The page is never moved for you (a glide to each statement was tried: it fought
  // trackpad momentum and counted one swipe twice). A statement changes only once you are 65% of the way into the next one's beat,
  // so small scrolls and jitter at the boundary never flip it back and forth
  var sustLast = steps.length - 1;
  var sustFlow = sust.getAttribute('data-mode') === 'flow';
  function sustScroll(){
    if (!sustWide.matches) return;
    if (sustFlow){ // the last statement whose top has passed the middle of the screen (works for any scroll speed or jump)
      var mid = innerHeight / 2, k = 0;
      steps.forEach(function(st, i){ if (st.getBoundingClientRect().top < mid) k = i; });
      sustSet(k); return;
    }
    var r = sust.getBoundingClientRect(), p = -r.top / (Math.max(1, r.height - innerHeight) / sustLast),
        n = sustN < 0 ? Math.round(p) : sustN;
    while (p > n + .65 && n < sustLast) n++;
    while (p < n - .65 && n > 0) n--;
    sustSet(Math.max(0, Math.min(sustLast, n)));
  }
  addEventListener('scroll', sustScroll, { passive: true });
  addEventListener('resize', sustScroll);
  sustSet(0); sustN = -1; sustScroll();
  var stepIO = new IntersectionObserver(function(es){
    if (sustWide.matches) return;
    es.forEach(function(e){ if (e.isIntersecting) sustSet(steps.indexOf(e.target)); });
  }, { rootMargin: '-68% 0px -22% 0px' });
  // each statement rises in line by line the first time it scrolls into view (desktop flow; stays after)
  var seenIO = new IntersectionObserver(function(es){
    es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add('seen'); seenIO.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -18% 0px' });
  steps.forEach(function(st){ stepIO.observe(st); seenIO.observe(st); });

  // material library: the chapter (or the closing "Made for this picture.") in the middle of the screen sets data-part on the section, which
  // lights its layer of the drawing; the closing closes the layers up and turns the frame to face you. Clicking / tapping a material
  // picks it (aria-pressed, named in the museum label at the end); hovering one only previews it in the drawing and lets go when the pointer leaves.
  // A wood lays a strip of its own photo (data-tex: x y w h of plain surface in the 1000×750 photo) along each side of the moulding,
  // a finish tints the wood (data-fin, css), a mount sets its board (data-mount: white / black / colour / none), the glass switches
  // on. A chapter with nothing picked yet picks its first material when it comes up (the finish chapter only makes sure there is
  // wood: a bare frame is a real choice), so the frame builds itself even if you only scroll
  var lib = document.querySelector('.library');
  if (lib) {
    if (/[?&]lib=photos\b/.test(location.search)) lib.removeAttribute('data-layout'); // the earlier two-column photo grid, to compare
    var libParts = [].slice.call(lib.querySelectorAll('.lib-ch, .lib-end')), libSws = [].slice.call(lib.querySelectorAll('.lib-sw'));
    var libPick = {}, libWood = null;
    var libLy = function(part){ return lib.querySelector('.ly[data-part="' + part + '"]'); };
    var firstOf = function(part){ return lib.querySelector('.lib-sw[data-part="' + part + '"]'); };
    // the museum label under "Made for this picture.": what the frame is made of, in the order of the stack (no finish = left out)
    var libSpec = function(){
      lib.querySelector('.lib-cap-mat').textContent = ['mould', 'finish', 'glass', 'mount'].map(function(part){
        var sw = libPick[part];
        return sw && (sw.querySelector('.lib-cap-name') || sw.querySelector('.lib-name')).textContent;
      }).filter(Boolean).join(' · ');
    };
    // the strip is scaled so its width fills the 400-wide tile (longer than any side), the tile is as tall as the strip
    var layWood = function(sw){
      if (libWood === sw) return;
      libWood = sw;
      var c = sw.dataset.tex.split(' ').map(Number), k = 400 / c[2], src = sw.querySelector('img').getAttribute('src');
      ['lp-t', 'lp-b', 'lp-l', 'lp-r'].forEach(function(id){
        var pat = document.getElementById(id), img = pat.firstElementChild;
        pat.setAttribute('height', c[3] * k);
        img.setAttribute('href', src);
        img.setAttribute('x', -c[0] * k); img.setAttribute('y', -c[1] * k);
        img.setAttribute('width', 1000 * k); img.setAttribute('height', 750 * k);
      });
    };
    // draws a set of picks ({ mould, finish, mount, glass }: swatches or nothing)
    var drawFrame = function(st){
      var mould = libLy('mould'), mount = libLy('mount');
      if (st.mould) layWood(st.mould);
      mould.classList.toggle('filled', !!st.mould);
      if (st.finish) mould.setAttribute('data-fin', st.finish.dataset.fin); else mould.removeAttribute('data-fin');
      if (st.mount) mount.setAttribute('data-mount', st.mount.dataset.mount); else mount.removeAttribute('data-mount');
      libLy('glass').classList.toggle('filled', !!st.glass);
    };
    // the picks with one swatch swapped in (a new wood comes bare; a finish needs wood under it)
    var withSw = function(sw){
      var st = { mould: libPick.mould, finish: libPick.finish, mount: libPick.mount, glass: libPick.glass };
      st[sw.dataset.part] = sw;
      if (sw.dataset.part === 'mould') st.finish = null;
      if (!st.mould) st.mould = firstOf('mould');
      return st;
    };
    var pickMat = function(sw){
      libPick = withSw(sw);
      libSws.forEach(function(o){ o.setAttribute('aria-pressed', String(libPick[o.dataset.part] === o)); });
      drawFrame(libPick);
      libSpec();
    };
    libSws.forEach(function(sw){
      sw.addEventListener('click', function(){ pickMat(sw); });
      sw.addEventListener('pointerenter', function(e){ if (e.pointerType === 'mouse') drawFrame(withSw(sw)); });
      sw.addEventListener('pointerleave', function(e){ if (e.pointerType === 'mouse') drawFrame(libPick); });
    });
    var libIO = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if (!e.isIntersecting) return;
        var part = e.target.dataset.part;
        lib.dataset.part = part;
        libParts.forEach(function(c){ c.classList.toggle('on', c === e.target); });
        // a layer scrolled past too fast to pick anything gets its first material, at the latest when the frame closes up
        (part === 'built' ? ['mould', 'mount', 'glass'] : part === 'finish' ? ['mould'] : [part]).forEach(function(pt){
          if (!libPick[pt]) pickMat(firstOf(pt));
        });
      });
    }, { rootMargin: matchMedia('(max-width: 1100px)').matches ? '-62% 0px -30% 0px' : '-45% 0px -45% 0px' });
    libParts.forEach(function(c){ libIO.observe(c); });
    // the names in the label are copied from the swatches, so copy them again after a language switch
    [].forEach.call(document.querySelectorAll('[data-lang]'), function(a){ a.addEventListener('click', libSpec); });
  }

  // closing: the empty room fills up. As the room comes up the screen (its top from 85% of the screen to 15%), the pieces go up
  // one after another in markup order; scrolling back up takes them down again, last one first. Reduced motion: css shows them all
  var closing = document.querySelector('.closing'), hangs = closing.querySelectorAll('.hang'), clT = 0,
    still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fillWall(){
    var r = closing.getBoundingClientRect(), phone = innerWidth < 1100;
    if (r.bottom < -innerHeight || r.top > 2 * innerHeight) return;
    var shown = [].filter.call(hangs, function(h){ return getComputedStyle(h).display !== 'none'; }); // phones show four
    var p = Math.max(0, Math.min(1, (innerHeight * .85 - r.top) / (innerHeight * (phone ? .45 : .7))));
    var n = Math.ceil(p * shown.length);
    shown.forEach(function(h, i){ h.classList.toggle('on', i < n); });
    // ...and the hung pieces drift a little, each at its own --s (the one on the sideboard stands still); none with reduced motion
    if (!still) closing.style.setProperty('--p', Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / (innerHeight / 2 + r.height / 2))).toFixed(3));
  }
  addEventListener('scroll', function(){ if (!clT) clT = requestAnimationFrame(function(){ clT = 0; fillWall(); }); }, { passive: true });
  addEventListener('resize', fillWall);
  fillWall();
  // ...and its last link puts the page in a frame
  document.querySelector('.closing-frame').addEventListener('click', function(){ setFramed(true); });

  // hero video
  var v = document.getElementById('vid');

  // the scroll cue fades away once the page has been scrolled (back at the very top it returns),
  // the frame mode button rises in at the bottom centre after half a screen
  var cue = document.querySelector('.scroll-cue'), fbar = document.querySelector('.frame-bar');
  function barCheck(){ cue.classList.toggle('gone', scrollY > 40); fbar.classList.toggle('shown', scrollY > innerHeight / 2); }
  addEventListener('scroll', barCheck, { passive: true }); barCheck();

  // page progress: the hairline frame around the screen draws itself clockwise as you scroll and closes at the closing.
  // One dot per section on the track, where its top reaches the middle of the screen; only two show: the section you are in (filled)
  // and the one coming next (a ring). Pointing at a dot names the section, clicking it goes there. Nothing shows until half a screen is scrolled
  var trace = document.querySelector('.trace'), tLine = trace.querySelector('.tr-line'), tTip = trace.querySelector('.tr-tip'),
      tDots = trace.querySelector('.tr-dots'), tLabel = document.querySelector('.trace-label'),
      closing = document.querySelector('.closing'), darkSecs = document.querySelectorAll('.hero, .how, .styles, .library, .foot'),
      trT, trEnd = 1, tw = 0, th = 0, tg = 0, tt = 0, trP = 0;
  // the sections it counts and their short names (DE in the DE table, trace.*)
  var TR = [['about', 'About'], ['entries', 'Start here'], ['sust', 'Sustainability'], ['how', 'How it works'], ['styles', 'Frame styles'],
            ['shop', 'Ready to hang'], ['reviews', 'Reviews'], ['projects', 'Projects'], ['library', 'Materials'], ['studio', 'Coffee'],
            ['faq', 'FAQs'], ['closing', 'Your walls']];
  var trSecs = TR.map(function(d){
    var el = document.querySelector('section.' + d[0]); if (!el) return null;
    EN['trace.' + d[0]] = d[1];
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'tr-dot');
    g.innerHTML = '<circle class="tr-hit" r="10"/><circle class="tr-d" r="2.5"/>';
    tDots.appendChild(g);
    var s = { el: el, key: 'trace.' + d[0], g: g, p: 0, x: 0, y: 0, edge: 0 };
    g.addEventListener('mouseenter', function(){ traceLabel(s); });
    g.addEventListener('mouseleave', function(){ tLabel.classList.remove('on'); });
    g.addEventListener('click', function(){
      tLabel.classList.remove('on');
      scrollTo({ top: el.getBoundingClientRect().top + scrollY, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    return s;
  }).filter(Boolean);
  // a point on the track at progress p: along the top, down the right, back along the bottom, up the left (edge 0–3).
  // The top edge runs at tt: right under the nav while it shows, else along the top of the screen
  function tracePoint(p){
    var W = tw - 2 * tg, H = th - tt - tg, d = p * 2 * (W + H);
    if (d < W) return [tg + d, tt, 0];
    if (d < W + H) return [tg + W, tt + d - W, 1];
    if (d < 2 * W + H) return [tg + W - (d - W - H), tt + H, 2];
    return [tg, Math.max(tt, tt + H - (d - 2 * W - H)), 3];
  }
  function traceLabel(s){
    tLabel.textContent = t(s.key);
    tLabel.dataset.edge = s.edge;
    tLabel.style.left = s.x + 'px'; tLabel.style.top = s.y + 'px';
    tLabel.classList.add('on');
  }
  // where things are on the page: when the frame closes and where each section's dot goes (on load, resize, page height change)
  function traceSize(){
    tw = trace.clientWidth; th = trace.clientHeight; tg = tw < 600 ? 5.5 : 8.5; // inset (half pixel: crisp 1px)
    trace.setAttribute('viewBox', '0 0 ' + tw + ' ' + th);
    // closed when the closing's middle reaches the middle of the screen (or the page can't scroll that far)
    var max = document.documentElement.scrollHeight - innerHeight;
    trEnd = Math.max(1, Math.min(max, closing.getBoundingClientRect().top + scrollY + closing.offsetHeight / 2 - innerHeight / 2));
    trSecs.forEach(function(s){ s.p = s.el === closing ? 1 : Math.min(1, Math.max(0, (s.el.getBoundingClientRect().top + scrollY - innerHeight / 2) / trEnd)); });
    tt = -1; traceDraw();
  }
  // the frame's shape: redrawn when its top edge moves (the nav sliding in or out)
  function traceDraw(){
    // flush with the nav's bottom edge (or the top of the screen while it's away): no gap above the line for the page
    // to scroll through, so text and hairlines never slide under a stray rule
    var nb = nav.classList.contains('away') ? 0 : Math.max(0, nav.getBoundingClientRect().bottom),
        top = Math.round(nb) + .5; // on the half pixel: a crisp 1px
    if (top === tt) return traceScroll();
    tt = top;
    var w = tw, h = th, g = tg, c = w < 600 ? 10 : 16; // corner tick
    var box = 'M' + g + ' ' + tt + 'H' + (w - g) + 'V' + (h - g) + 'H' + g + 'Z';
    trace.querySelector('.tr-track').setAttribute('d', box);
    tLine.setAttribute('d', box);
    trace.querySelector('.tr-corners').setAttribute('d',
      'M' + g + ' ' + (tt + c) + 'V' + tt + 'H' + (g + c) + 'M' + (w - g - c) + ' ' + tt + 'H' + (w - g) + 'V' + (tt + c) +
      'M' + (w - g) + ' ' + (h - g - c) + 'V' + (h - g) + 'H' + (w - g - c) + 'M' + (g + c) + ' ' + (h - g) + 'H' + g + 'V' + (h - g - c));
    trace.style.setProperty('--len', 2 * (w - 2 * g) + 2 * (h - tt - g)); // its length in px, for the dash
    trSecs.forEach(function(s){
      var pt = tracePoint(s.p); s.x = pt[0]; s.y = pt[1]; s.edge = pt[2];
      s.y = Math.max(s.y, 3.5); // whole, not cut by the screen's edge
      s.g.setAttribute('transform', 'translate(' + pt[0] + ' ' + s.y + ')');
    });
    traceScroll();
  }
  // follow the nav frame by frame while it slides
  var trSlide = 0;
  function traceFollow(){ traceDraw(); if (trSlide) requestAnimationFrame(traceFollow); }
  nav.addEventListener('transitionrun', function(e){ if (e.target === nav && e.propertyName === 'transform' && !trSlide){ trSlide = 1; traceFollow(); } });
  nav.addEventListener('transitionend', function(e){ if (e.target === nav && e.propertyName === 'transform'){ trSlide = 0; traceDraw(); } });
  nav.addEventListener('transitioncancel', function(e){ if (e.target === nav && e.propertyName === 'transform'){ trSlide = 0; traceDraw(); } });
  function traceScroll(){
    var p = trP = Math.min(1, Math.max(0, scrollY / trEnd)), mid = innerHeight / 2, dark = false, cur = null;
    trace.style.setProperty('--p', p.toFixed(4));
    trace.classList.toggle('done', p >= 1);
    trace.classList.toggle('start', p <= 0);
    var pt = tracePoint(p); tTip.setAttribute('cx', pt[0]); tTip.setAttribute('cy', Math.max(pt[1], 3));
    var next = null;
    trSecs.forEach(function(s){ var on = p >= s.p - .0005; s.g.classList.remove('cur', 'next'); if (on) cur = s; else if (!next) next = s; });
    if (cur) cur.g.classList.add('cur');
    if (next) next.g.classList.add('next');
    trace.classList.toggle('hide', scrollY < innerHeight / 2);
    if (trace.classList.contains('hide')) tLabel.classList.remove('on');
    for (var i = 0; i < darkSecs.length; i++){ var r = darkSecs[i].getBoundingClientRect(); if (r.top <= mid && r.bottom > mid){ dark = true; break; } }
    trace.classList.toggle('dark', dark);
  }
  addEventListener('scroll', function(){ if (!trT) trT = requestAnimationFrame(function(){ trT = 0; traceDraw(); }); }, { passive: true });
  addEventListener('resize', traceSize); addEventListener('load', traceSize); traceSize();
  if (window.ResizeObserver) new ResizeObserver(function(){ traceSize(); }).observe(document.body); // images, fonts, language change


  // contents of this page ("On this page" in the frame bar): a magazine's table of contents. The entry for the part in the middle of the
  // screen is marked (the deepest one: "The finish" rather than "Materials"). Picking an entry jumps there behind it, which then fades away;
  // a shop entry also opens its tab. Esc / Close leave it
  var toc = document.getElementById('toc'), tocBtn = document.querySelector('.toc-toggle'),
      tocItems = [].slice.call(toc.querySelectorAll('.toc-item')), tocPicsLoaded = false, tocLast = null;
  function tocEl(it){ return document.querySelector(it.dataset.go); }
  function tocOpen(){
    if (!tocPicsLoaded){ tocPicsLoaded = true; [].forEach.call(toc.querySelectorAll('.toc-pic'), function(img){ img.src = img.dataset.src; }); }
    var mid = innerHeight / 2, cur = null;
    tocItems.forEach(function(it, i){
      var el = tocEl(it), r = el && el.getBoundingClientRect(), tab = it.dataset.tab;
      if (r && r.top <= mid && r.bottom > mid && !tab) cur = it; // the shop's tabs share its section: "Ready to hang" stands for them
      it.style.setProperty('--i', i);
    });
    tocItems.forEach(function(it){
      it.classList.toggle('cur', it === cur);
      if (it === cur) it.setAttribute('aria-current', 'location'); else it.removeAttribute('aria-current');
    });
    tocLast = document.activeElement;
    toc.inert = false; root.classList.add('toc-open'); tocBtn.setAttribute('aria-expanded', 'true');
    toc.scrollTop = 0;
    (cur || tocItems[0]).focus({ preventScroll: true });
  }
  function tocClose(){
    root.classList.remove('toc-open'); toc.inert = true; tocBtn.setAttribute('aria-expanded', 'false');
    if (tocLast && tocLast.focus) tocLast.focus({ preventScroll: true });
  }
  tocBtn.addEventListener('click', tocOpen);
  toc.querySelector('.toc-close').addEventListener('click', tocClose);
  tocItems.forEach(function(it){
    it.addEventListener('click', function(e){
      e.preventDefault();
      var el = tocEl(it); if (!el) return;
      if (it.dataset.tab) document.getElementById(it.dataset.tab).click();
      function place(){
        var r = el.getBoundingClientRect(), y;
        if (el.tagName === 'SECTION') y = r.top + scrollY;                                         // a section: its top
        else if (r.height < innerHeight * .8) y = r.top + scrollY + r.height / 2 - innerHeight / 2; // a part of one: in the middle
        else y = r.top + scrollY - nav.offsetHeight;
        y = Math.max(0, Math.round(y));
        if (Math.abs(y - scrollY) > 1) scrollTo(0, y);
      }
      place(); // jumps while the contents still cover the page
      // pictures above it that load now would push it down: keep it in place for a moment, unless the reader scrolls
      var t0 = performance.now(), held = true;
      function let_go(){ held = false; }
      addEventListener('wheel', let_go, { once: true, passive: true }); addEventListener('touchstart', let_go, { once: true, passive: true });
      (function hold(now){ if (!held || now - t0 > 1200) return; place(); requestAnimationFrame(hold); })(t0);
      tocLast = null; tocClose();
    });
  });
  // keep Tab inside while it is open
  toc.addEventListener('keydown', function(e){
    if (e.key !== 'Tab') return;
    var f = [toc.querySelector('.toc-close')].concat(tocItems), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  });

  // respect reduced motion: show a still frame
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){ v.removeAttribute('autoplay'); v.pause(); }
  else { var p = v.play(); if (p && p.catch) p.catch(function(){}); }
})();
