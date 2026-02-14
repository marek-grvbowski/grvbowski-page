(() => {
  // ---------- utilities ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp  = (a, b, t) => a + (b - a) * t;

  function mulberry32(seed){
    let t = seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      let x = t;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    }
  }
  function hashSeed(str){
    let h = 2166136261;
    for (let i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  // ---------- elements ----------
  const app = document.getElementById('app') || document.querySelector('.stage') || document.body;
  if (!app) throw new Error('App root not found. Expected #app.');

  // nav items are direct children of #app in this project
  const items = Array.from(app.querySelectorAll('.nav-item'));
  if (!items.length) throw new Error('No .nav-item found under #app.');

  // for CSS text-glitch clones (uses attr(data-text) in ::before/::after)
  items.forEach(el => {
    const a = el.querySelector('a');
    if (a) a.setAttribute('data-text', a.textContent.trim());
  });

  const panel = document.getElementById('panel');
  if (!panel) throw new Error('Panel root not found. Expected #panel.');

  const meta  = document.getElementById('meta');
  const dot   = document.getElementById('cursorDot');
  if (!dot) throw new Error('Cursor dot not found. Expected #cursorDot.');
  const mark  = document.getElementById('mark');
  const panelTitle = document.getElementById('panelTitle');
  const panelClose = document.getElementById('panelClose');
  const views = Array.from(document.querySelectorAll('.view'));
  const glitchLogo = document.getElementById('glitchLogo');
  const spotlight = document.getElementById('spotlight');

  // ---------- routes ----------
  const ROUTES = new Set(['/', '/about', '/links', '/calendar', '/contact']);

  function readHashRoute(){
    const h = (location.hash || '#/').replace(/^#/, '');
    const p = h.startsWith('/') ? h : '/' + h;
    return normalizeRoute(p);
  }
  function normalizeRoute(p){
    if (!p) return '/';
    p = p.split('?')[0].split('#')[0];
    if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
    return ROUTES.has(p) ? p : '/';
  }

  let state = 'idle'; // idle | focus | deep

  function setState(next){
    state = next;
    app.classList.toggle('is-idle',  next === 'idle');
    app.classList.toggle('is-focus', next === 'focus');
    app.classList.toggle('is-deep',  next === 'deep');

    const focusOn = next !== 'idle';
    panel.classList.toggle('on', focusOn);
    panel.setAttribute('aria-hidden', String(!focusOn));
  }

  function setActiveNav(path){
    items.forEach(el => {
      const isActive = el.getAttribute('data-route') === path;
      el.dataset.active = isActive ? "true" : "false";
    });
  }

  function showView(path){
    views.forEach(v => v.hidden = (v.getAttribute('data-view') !== path));
    panelTitle.textContent = (path === '/') ? 'home' : path.replace('/', '');
  }

  function go(path){
    const p = normalizeRoute(path);
    const targetHash = '#'+p;
    if (location.hash !== targetHash) location.hash = targetHash;

    setActiveNav(p);
    showView(p);

    if (p === '/') setState('idle');
    else setState((p === '/calendar' || p === '/contact') ? 'deep' : 'focus');

    impulse = clamp(impulse + 1.0, 0, 1.8);
  }

  window.addEventListener('hashchange', () => go(readHashRoute()));

  app.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav="true"]');
    if (!a) return;
    e.preventDefault();
    go((a.getAttribute('href') || '#/').replace(/^#/, ''));
  });

  // start = home (zamyka panel)
  // mark.addEventListener('click', () => go('/'));

// logo should NOT be clickable
if (mark){
  mark.setAttribute('aria-disabled', 'true');
  mark.tabIndex = -1;
  mark.style.pointerEvents = 'none';
  mark.style.cursor = 'default';
}

  panelClose.addEventListener('click', () => go('/'));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') go('/'); });

  const contactForm = document.getElementById('contactForm');
  if (contactForm){
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      impulse = clamp(impulse + 1.2, 0, 1.8);
    });
  }

  // ---------- seed / rng ----------
  const seed = hashSeed(
    navigator.userAgent + '|' +
    screen.width + 'x' + screen.height + '|' +
    String(Date.now())
  );
  const rnd = mulberry32(seed);

  function setRevealDelays(){
    items.forEach((el, i) => {
      const d = 220 + i * 90 + Math.floor(rnd() * 80);
      el.style.setProperty('--revealDelay', `${d}ms`);
    });
  }

  // ---------- intro glitch (B/W, cuts, no RGB) ----------
  function initIntroGlitchBW(glitchRoot){
    if (!glitchRoot) return null;
    const $  = (sel, root=glitchRoot) => root.querySelector(sel);
    const $$ = (sel, root=glitchRoot) => Array.from(root.querySelectorAll(sel));

    const src = glitchRoot.getAttribute("data-src");
    if (!src) return null;

    const baseImg = $(".base img");
    const layers = $$(".g");

    baseImg.src = src;
    layers.forEach(layer => {
      const img = layer.querySelector("img");
      img.src = src;
      img.style.filter = "none";
    });

    const rand = (min,max) => Math.random() * (max - min) + min;
    const choice = arr => arr[Math.floor(Math.random()*arr.length)];

    const clipFns = [
      () => { const y = rand(0, 92), h = rand(3, 12);
        return `polygon(0% ${y}%, 100% ${y}%, 100% ${y+h}%, 0% ${y+h}%)`; },
      () => { const y = rand(0, 80), h = rand(10, 24);
        return `polygon(0% ${y}%, 100% ${y}%, 100% ${y+h}%, 0% ${y+h}%)`; },
      () => { const x = rand(0, 85), w = rand(6, 18);
        return `polygon(${x}% 0%, ${x+w}% 0%, ${x+w}% 100%, ${x}% 100%)`; },
      () => { const x = rand(0, 80), y = rand(0, 80), w = rand(14, 32), h = rand(10, 22), s = rand(-10, 10);
        return `polygon(${x}% ${y}%, ${x+w}% ${y+s}%, ${x+w}% ${y+h+s}%, ${x}% ${y+h}%)`; }
    ];

    async function play(){
      glitchRoot.classList.add("intro");
      const steps = 7;
      const clipProb = 0.92;
      const shiftX = 18;
      const shiftY = 10;

      for (let i=0; i<steps; i++){
        for (let li=0; li<layers.length; li++){
          const d = layers[li];
          const dx = (Math.random()*2-1) * shiftX * (li === 0 ? 1.0 : li === 1 ? 0.75 : 0.55);
          const dy = (Math.random()*2-1) * shiftY * (li === 0 ? 0.9 : li === 1 ? 0.7 : 0.5);

          d.style.opacity = "1";
          d.style.mixBlendMode = "normal";
          d.style.filter = "none";
          d.style.transform = `translate(${dx}px, ${dy}px)`;
          d.style.clipPath = (Math.random() < clipProb) ? choice(clipFns)() : "none";
          d.style.zIndex = "9";
        }
        await new Promise(r => setTimeout(r, rand(40, 85)));
      }

      layers.forEach(d => {
        d.style.clipPath = "none";
        d.style.transform = "";
        d.style.zIndex = "";
        d.style.opacity = "0.18";
      });

      glitchRoot.classList.remove("intro");

      setTimeout(() => {
        layers.forEach(d => { d.style.opacity = "0"; });
      }, 420);
    }

    return { play };
  }

  // ---------- motion ----------
  const motionEls = Array.from(document.querySelectorAll('.motion'));
  const M = new Map();

  // lock motion while clicking/tapping (improves clickability)
  let pointerDown = false;
  window.addEventListener('pointerdown', () => { pointerDown = true; }, {passive:true});
  window.addEventListener('pointerup',   () => { pointerDown = false; }, {passive:true});
  window.addEventListener('pointercancel', () => { pointerDown = false; }, {passive:true});

  function initMotion(){
    motionEls.forEach(el => {
      const type = el.getAttribute('data-type') || 'generic';

      const drift = {
        mark:   lerp(0.6, 1.5, rnd()),
        panel:  lerp(0.0, 0.5, rnd()),
        meta:   lerp(0.3, 0.9, rnd()),
        nav:    lerp(0.8, 2.6, rnd()),
        generic:lerp(0.6, 2.1, rnd()),
      }[type] ?? lerp(0.6, 2.2, rnd());

      const phase = rnd() * Math.PI * 2;
      const speed = lerp(0.45, 1.15, rnd());
      const kick  = lerp(0.35, 1.00, rnd());

      M.set(el, {
        type, drift, phase, speed, kick,
        hoverJx: 0,
        hoverJy: 0,
        _hover: false
      });
    });
  }

// ---------- cursor ----------
let mouseX = window.innerWidth * 0.5;
let mouseY = window.innerHeight * 0.5;

// spotlight smoothing
let sx = mouseX, sy = mouseY;
let targetSX = mouseX, targetSY = mouseY;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  dot.classList.add('on');
  armMeta();
  if (spotlight){
    targetSX = mouseX;
    targetSY = mouseY;
  }
}, {passive:true});

window.addEventListener('mouseleave', () => dot.classList.remove('on'));

  // ---------- meta reveal ----------
  let metaArmed = false;
  function armMeta(){
    if (metaArmed) return;
    metaArmed = true;
    if (meta) setTimeout(() => meta.classList.add('on'), 650);
  }
  setTimeout(armMeta, 1600);

  // ---------- nav hover: jitter + dim others + random glitch vars ----------
  function clearHover(){
    app.classList.remove('nav-hover');
    items.forEach(el => {
      el.classList.remove('is-hover');
      el.style.removeProperty('--g1x');
      el.style.removeProperty('--g1y');
      el.style.removeProperty('--g2x');
      el.style.removeProperty('--g2y');
      el.style.removeProperty('--gclip1');
      el.style.removeProperty('--gclip2');
      el.style.removeProperty('--gopa1');
      el.style.removeProperty('--gopa2');
      if (el._glitchTimer) { clearTimeout(el._glitchTimer); el._glitchTimer = null; }
    });
    items.forEach(el => {
      const s = M.get(el);
      if (s) { s._hover = false; s.hoverJx = 0; s.hoverJy = 0; }
    });
  }

  items.forEach(el => {
    const link = el.querySelector('a') || el;

    link.addEventListener('pointerenter', () => {
      app.classList.add('nav-hover');
      items.forEach(x => x.classList.toggle('is-hover', x === el));

      const s = M.get(el);
      if (s) s._hover = true;
      impulse = clamp(impulse + 0.35, 0, 1.8);

      // start truly random text-glitch (CSS vars)
      if (el._glitchTimer) clearTimeout(el._glitchTimer);
      const rand = (min,max) => Math.random()*(max-min)+min;
      const clipH = () => {
        const y = rand(0, 85);
        const h = rand(6, 22);
        return `inset(${y}% 0 ${100-(y+h)}% 0)`;
      };
      const tickGlitch = () => {
        el.style.setProperty('--g1x', `${rand(-3.5, 3.5).toFixed(2)}px`);
        el.style.setProperty('--g1y', `${rand(-2.0, 2.0).toFixed(2)}px`);
        el.style.setProperty('--g2x', `${rand(-2.5, 2.5).toFixed(2)}px`);
        el.style.setProperty('--g2y', `${rand(-1.5, 1.5).toFixed(2)}px`);
        el.style.setProperty('--gclip1', clipH());
        el.style.setProperty('--gclip2', clipH());
        el.style.setProperty('--gopa1', `${rand(0.18, 0.55).toFixed(2)}`);
        el.style.setProperty('--gopa2', `${rand(0.12, 0.40).toFixed(2)}`);
      };
      
      tickGlitch();

  const schedule = () => {
  const pause = Math.random() < 0.18;
  const delay = pause
    ? (220 + Math.floor(Math.random()*420))
    : (45 + Math.floor(Math.random()*210));

  el._glitchTimer = setTimeout(() => {
    const hovering = el.matches(':hover') || (el.querySelector('a') && el.querySelector('a').matches(':hover'));
    if (!hovering){
      el._glitchTimer = null;
      return;
    }

    if (Math.random() < 0.16) {
      el.style.setProperty('--gopa1', '0');
      el.style.setProperty('--gopa2', '0');
    } else {
      tickGlitch();
    }

    schedule();
  }, delay);
};

schedule();
    });

    link.addEventListener('pointerleave', () => {
      const s = M.get(el);
      if (s) { s._hover = false; s.hoverJx = 0; s.hoverJy = 0; }
      impulse = clamp(impulse + 0.15, 0, 1.8);

      if (el._glitchTimer) { clearTimeout(el._glitchTimer); el._glitchTimer = null; }
      el.style.setProperty('--gopa1', '0');
      el.style.setProperty('--gopa2', '0');

      requestAnimationFrame(() => {
        const anyHover = items.some(x => x.matches(':hover') || (x.querySelector('a') && x.querySelector('a').matches(':hover')));
        if (!anyHover) clearHover();
      });
    });
  });

  // ---------- animation loop ----------
  let impulse = 0;
  let t0 = performance.now();

  function tick(t){
    t0 = t;

    const calm = (state === 'deep') ? 0.55 : (state === 'focus' ? 0.75 : 1.0);
    impulse = lerp(impulse, 0, 0.06);

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;

    if (spotlight){
  const tt = t * 0.001;

  const driftX = Math.sin(tt * .22) * 120 + Math.sin(tt * .11 + 2.4) * 60;
  const driftY = Math.cos(tt * .18) * 90  + Math.cos(tt * .07 + 1.6) * 40;

  sx = lerp(sx, window.innerWidth * .5 + driftX, 0.02);
  sy = lerp(sy, window.innerHeight * .45 + driftY, 0.02);

  spotlight.style.transform = `translate3d(${sx - 160}px, ${sy - 160}px, 0)`;
}

    motionEls.forEach(el => {
      const s = M.get(el);
      if (!s) return;

      const r = el.getBoundingClientRect();
      const cx = r.left + r.width * 0.5;
      const cy = r.top  + r.height * 0.5;

      const dx = cx - mouseX;
      const dy = cy - mouseY;
      const dist = Math.hypot(dx, dy);

      const radius = (s.type === 'nav') ? 140 : (s.type === 'mark' ? 260 : (s.type === 'meta' ? 220 : 210));
      const maxOff = (s.type === 'nav') ? 0.45 : (s.type === 'mark' ? 0.35 : (s.type === 'meta' ? 4.5 : 4.0));
      const k = clamp(1 - (dist / radius), 0, 1);

      let ux = 0, uy = 0;
      if (dist > 0.001){ ux = dx / dist; uy = dy / dist; }

      let tx = ux * (maxOff * k) * calm;
      let ty = uy * (maxOff * k) * calm;

      // keep nav stable while hovered / clicked / directly hovered (click reliability)
      if (s.type === 'nav' && (s._hover || pointerDown || el.matches(':hover'))){
        tx = 0;
        ty = 0;
      }
      // if cursor is very close, stop repulsion entirely (prevents chasing)
      if (s.type === 'nav' && dist < 70){
        tx = 0;
        ty = 0;
      }

      const tt = t * 0.001;
      tx += Math.sin(tt * (0.7 + s.speed * 0.35) + s.phase) * s.drift * 0.35 * calm;
      ty += Math.cos(tt * (0.65 + s.speed * 0.35) + s.phase) * s.drift * 0.35 * calm;

      tx += (rnd() - 0.5) * impulse * 4.0 * s.kick * calm;
      ty += (rnd() - 0.5) * impulse * 3.0 * s.kick * calm;

      if (s.type === 'nav' && s._hover){
        const j = 2.2 * calm;
        s.hoverJx = lerp(s.hoverJx, (rnd() - 0.5) * j, 0.30);
        s.hoverJy = lerp(s.hoverJy, (rnd() - 0.5) * j, 0.30);
      } else {
        s.hoverJx = lerp(s.hoverJx, 0, 0.18);
        s.hoverJy = lerp(s.hoverJy, 0, 0.18);
      }
      tx += s.hoverJx || 0;
      ty += s.hoverJy || 0;

      if (s.type === 'panel'){
        tx = Math.sin(tt * 0.55 + s.phase) * 0.6 * calm;
        ty = Math.cos(tt * 0.50 + s.phase) * 0.5 * calm;
        if (state !== 'idle'){ tx *= 0.25; ty *= 0.25; }
      }

      if (s.type === 'mark'){
        tx *= 0.00;
        ty *= 0.00;
      }

      el.style.setProperty('--tx', `${tx.toFixed(2)}px`);
      el.style.setProperty('--ty', `${ty.toFixed(2)}px`);
    });

    requestAnimationFrame(tick);
  }

  // ---------- resize ----------
  window.addEventListener('resize', () => {
    impulse = clamp(impulse + 0.7, 0, 1.8);
  });

  // ---------- init ----------
  setRevealDelays();
  initMotion();

  // initial route
  const initial = readHashRoute();
  setActiveNav(initial);
  showView(initial);
  if (initial === '/') setState('idle');
  else setState((initial === '/calendar' || initial === '/contact') ? 'deep' : 'focus');

  // intro glitch + menu reveal
  app.classList.remove('ready');
  const introEngine = initIntroGlitchBW(glitchLogo);

  (async () => {
    if (introEngine) await introEngine.play();
    app.classList.add('ready');
  })();

  requestAnimationFrame(tick);
})();