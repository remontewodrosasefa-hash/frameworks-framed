(function(){
  var ATLAS = 'assets/frames/chipped-atlas.jpg';
  var T = 86, O = 70;                         // frame thickness in photo pixels, seam overlap
  var SIDES = ['top','bottom','left','right'];
  var GAIN = { top:1, bottom:1.037, left:0.994, right:1.036 }; // light differences between the photo's sides
  // pieces borrowed from the other sides of the real frame, as [side, from, to, mirrored]
  var POOL = {
    top:    [['left',.08,.48],['bottom',.12,.55,1],['right',.30,.72],['top',.25,.70,1],['left',.52,.92,1],['bottom',.58,.96],['right',.05,.40,1]],
    bottom: [['right',.10,.50],['top',.15,.58,1],['left',.30,.72],['bottom',.25,.70,1],['right',.55,.95,1],['top',.60,.95],['left',.06,.42,1]],
    left:   [['right',.15,.55,1],['top',.10,.60],['bottom',.20,.70,1],['left',.25,.75,1],['right',.55,.92],['top',.55,.95,1]],
    right:  [['left',.15,.55,1],['bottom',.10,.60],['top',.20,.70,1],['right',.25,.75,1],['left',.55,.92],['bottom',.55,.95,1]]
  };
  var strips = {}, corners = [], ready = false, cacheKey = '', cacheUrl = '';
  var root = document.documentElement, frameEl = document.getElementById('frame');

  function crop(src, a, b, mirror, gain){
    a = Math.max(0, Math.round(a)); b = Math.min(src.w, Math.round(b));
    var w = b - a, d = new Uint8ClampedArray(w * T * 4), g = gain || 1;
    for (var y = 0; y < T; y++) for (var x = 0; x < w; x++){
      var sx = mirror ? (b - 1 - x) : (a + x), si = (y * src.w + sx) * 4, di = (y * w + x) * 4;
      d[di] = src.d[si] * g; d[di+1] = src.d[si+1] * g; d[di+2] = src.d[si+2] * g; d[di+3] = 255;
    }
    return { w:w, d:d };
  }
  // join two strips along the seam where they look most alike (image quilting)
  function join(A, B){
    var o = Math.min(O, A.w, B.w), E = new Float32Array(o * T), C = new Float32Array(o * T);
    for (var y = 0; y < T; y++) for (var x = 0; x < o; x++){
      var ai = (y * A.w + A.w - o + x) * 4, bi = (y * B.w + x) * 4;
      var dr = A.d[ai]-B.d[bi], dg = A.d[ai+1]-B.d[bi+1], db = A.d[ai+2]-B.d[bi+2];
      E[y*o+x] = dr*dr + dg*dg + db*db;
    }
    for (x = 0; x < o; x++) C[x] = E[x];
    for (y = 1; y < T; y++) for (x = 0; x < o; x++){
      var m = C[(y-1)*o+x]; if (x > 0) m = Math.min(m, C[(y-1)*o+x-1]); if (x < o-1) m = Math.min(m, C[(y-1)*o+x+1]);
      C[y*o+x] = E[y*o+x] + m;
    }
    var path = new Int32Array(T), best = 0;
    for (x = 1; x < o; x++) if (C[(T-1)*o+x] < C[(T-1)*o+best]) best = x;
    path[T-1] = best;
    for (y = T-2; y >= 0; y--){
      var px = path[y+1], bx = px;
      for (var dx = -1; dx <= 1; dx++){ var nx = px + dx; if (nx >= 0 && nx < o && C[y*o+nx] < C[y*o+bx]) bx = nx; }
      path[y] = bx;
    }
    var w = A.w + B.w - o, d = new Uint8ClampedArray(w * T * 4);
    for (y = 0; y < T; y++){
      d.set(A.d.subarray(y*A.w*4, (y*A.w + A.w - o)*4), y*w*4);
      for (x = 0; x < o; x++){
        var t = Math.min(1, Math.max(0, (x - path[y] + 1.5) / 3));
        ai = (y * A.w + A.w - o + x) * 4; bi = (y * B.w + x) * 4; var di = (y * w + A.w - o + x) * 4;
        d[di] = A.d[ai]*(1-t) + B.d[bi]*t; d[di+1] = A.d[ai+1]*(1-t) + B.d[bi+1]*t; d[di+2] = A.d[ai+2]*(1-t) + B.d[bi+2]*t; d[di+3] = 255;
      }
      d.set(B.d.subarray((y*B.w + o)*4, (y*B.w + B.w)*4), (y*w + A.w)*4);
    }
    return { w:w, d:d };
  }
  // one side of the frame, exactly N photo-pixels long; both ends are the real ends next to the real corners
  function buildSide(side, N){
    var own = strips[side], L = own.w;
    if (N <= L){
      var a = Math.floor((N + O) / 2);
      return join(crop(own, 0, a), crop(own, L - (N + O - a), L));
    }
    var A = crop(own, 0, Math.ceil(L/2)), Z = crop(own, Math.floor(L/2), L);
    var rem = N - (A.w + Z.w - O), acc = A, i = 0, pool = POOL[side];
    while (rem > 0){
      var p = pool[i % pool.length], src = strips[p[0]], cycle = Math.floor(i / pool.length);
      var a0 = p[1] * src.w, b0 = p[2] * src.w, shift = (cycle * 0.17 % 0.3) * src.w;
      a0 = Math.max(0, a0 - shift); b0 = Math.max(a0 + O + 10, b0 - shift);
      var f = Math.round(b0 - a0);
      if (f - O >= rem) { b0 = a0 + rem + O; }
      var piece = crop(src, a0, b0, !!p[3], GAIN[p[0]] / GAIN[side]);
      rem -= (piece.w - O);
      acc = join(acc, piece); i++;
    }
    return join(acc, Z);
  }
  function toCanvas(s){ var c = document.createElement('canvas'); c.width = s.w; c.height = T; c.getContext('2d').putImageData(new ImageData(s.d, s.w, T), 0, 0); return c; }

  function buildChipped(){
    if (!ready) return;
    var fw = parseFloat(getComputedStyle(frameEl).borderTopWidth) || 40;
    var s = fw / T, Nh = Math.max(200, Math.round((innerWidth - 2*fw) / s)), Nv = Math.max(200, Math.round((innerHeight - 2*fw) / s));
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var CW = Nh + 2*T, CH = Nv + 2*T;
    var r = Math.min(1, fw * dpr / T); r = Math.min(r, Math.sqrt(12e6 / (CW * CH)));
    var key = Nh + 'x' + Nv + '@' + r.toFixed(3);
    if (key === cacheKey){ apply(cacheUrl, T * r); return; }
    var c = document.createElement('canvas'); c.width = Math.round(CW * r); c.height = Math.round(CH * r);
    var ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.scale(r, r);
    var top = toCanvas(buildSide('top', Nh)), bottom = toCanvas(buildSide('bottom', Nh)), left = toCanvas(buildSide('left', Nv)), right = toCanvas(buildSide('right', Nv));
    ctx.drawImage(top, T, 0);
    ctx.save(); ctx.translate(T + Nh, CH); ctx.rotate(Math.PI); ctx.drawImage(bottom, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(0, T + Nv); ctx.rotate(-Math.PI/2); ctx.drawImage(left, 0, 0); ctx.restore();
    ctx.save(); ctx.translate(CW, T); ctx.rotate(Math.PI/2); ctx.drawImage(right, 0, 0); ctx.restore();
    var pos = [[0,0],[CW-T,0],[CW-T,CH-T],[0,CH-T]];
    corners.forEach(function(cv, k){ ctx.drawImage(cv, pos[k][0], pos[k][1]); });
    cacheKey = key; cacheUrl = c.toDataURL('image/jpeg', 0.9);
    apply(cacheUrl, T * r);
  }
  function apply(url, slice){
    if (root.getAttribute('data-frame') !== 'chipped') return;
    root.style.setProperty('--img', 'url(' + url + ')');
    root.style.setProperty('--slice', slice.toFixed(2));
    root.classList.remove('building');
  }

  // load the atlas: 4 straightened sides + 4 real corners from the photo
  root.classList.add('building');
  var img = new Image();
  img.onload = function(){
    var c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    var ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
    var lens = { top:699, bottom:699, left:959, right:959 };
    SIDES.forEach(function(sd, i){ strips[sd] = { w:lens[sd], d: ctx.getImageData(0, i*T, lens[sd], T).data }; });
    for (var k = 0; k < 4; k++){
      var cc = document.createElement('canvas'); cc.width = T; cc.height = T;
      cc.getContext('2d').drawImage(c, k*T, 4*T, T, T, 0, 0, T, T); corners.push(cc);
    }
    ready = true; buildChipped();
  };
  img.src = ATLAS;

  // switcher
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var btns = [].slice.call(document.querySelectorAll('.sw'));
  function show(key){
    root.setAttribute('data-frame', key);
    if (key === 'chipped'){ buildChipped(); }
    else { root.style.removeProperty('--img'); root.style.removeProperty('--slice'); }
  }
  function set(key){
    if (root.getAttribute('data-frame') === key) return;
    btns.forEach(function(b){ var on = b.dataset.sw === key; b.setAttribute('aria-pressed', on ? 'true' : 'false');
      if (on){ document.getElementById('name').textContent = b.title; document.getElementById('sub').textContent = b.dataset.sub; } });
    if (reduce){ show(key); return; }
    clearTimeout(set.t1); clearTimeout(set.t2);
    root.classList.add('swapping');
    set.t1 = setTimeout(function(){
      show(key);
      set.t2 = setTimeout(function(){
        if (key === 'chipped') buildChipped();   // rebuild at the final size
        root.classList.remove('swapping');
      }, 720);
    }, 280);
  }
  btns.forEach(function(b){ b.addEventListener('click', function(){ set(b.dataset.sw); }); });
  window.frameRebuild = buildChipped;          // landing.js calls this once frame mode has grown to full size
  var rt; addEventListener('resize', function(){ clearTimeout(rt); rt = setTimeout(function(){ if (root.getAttribute('data-frame') === 'chipped') buildChipped(); }, 160); });
  root.setAttribute('data-frame', 'chipped');
})();
