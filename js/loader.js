// Loader: first visit per session only. The logo on black, a hairline draws a frame around it (css),
// the line at the bottom counts the loading. At 100% (page loaded + hero video ready, at least MIN, at most MAX)
// the loader fades away and the page is simply there. Runs right after its markup, before the rest of the page.
(function(){
  var root = document.documentElement, el = document.getElementById('loader');
  if (!el) return;
  if (root.classList.contains('seen')) { el.parentNode.removeChild(el); return; }
  root.classList.add('loading');

  var bar = el.querySelector('.loader-bar'), pct = el.querySelector('.lb-pct');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var MIN = reduce ? 400 : 1350, MAX = 3200;  // ms: long enough for the frame to finish drawing, never longer than MAX
  var t0 = Date.now(), shown = 0, loaded = false, timer;
  addEventListener('load', function(){ loaded = true; });

  function videoReady(){ var v = document.getElementById('vid'); return !v || v.readyState >= 2 || !!v.error; }
  // the real load can't be known exactly: count what can be counted (eager images, the hero video, the document)
  function measure(){
    var imgs = [].filter.call(document.images, function(i){ return i.loading !== 'lazy'; });
    var v = document.getElementById('vid');
    var done = imgs.filter(function(i){ return i.complete; }).length + (v && videoReady() ? 1 : 0)
      + (document.readyState === 'complete' ? 1 : document.readyState === 'interactive' ? .5 : 0);
    return done / (imgs.length + (v ? 1 : 0) + 1);
  }
  function tick(){
    var t = Date.now() - t0, all = (loaded && videoReady()) || t >= MAX;
    // a slow creep so the line never stands still; holds under 95% until everything is in; never goes back
    var target = all ? 1 : Math.min(.95, Math.max(.5 * (1 - Math.exp(-t / 1200)), measure() * .95));
    shown = Math.max(shown, shown + (target - shown) * (t >= MAX ? .35 : .16));
    if (all && 1 - shown < .006) shown = 1;
    var n = Math.round(shown * 100);
    pct.textContent = n + '%'; bar.style.setProperty('--p', shown); bar.setAttribute('aria-valuenow', n);
    if (shown === 1 && t >= MIN) finish();
  }
  function finish(){
    clearInterval(timer);
    try { sessionStorage.setItem('fw-seen', '1'); } catch (e) {}
    el.classList.add('done'); root.classList.remove('loading');
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 700);
  }
  timer = setInterval(tick, 50);
})();
