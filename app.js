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

  // nav items are queried globally within #app
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
  const panelDotClose = document.getElementById('panelDotClose');
  const panelDotMinimize = document.getElementById('panelDotMinimize');
  const panelDotFullscreen = document.getElementById('panelDotFullscreen');
  const mobileNavToggle = document.getElementById('mobileNavToggle');
  const views = Array.from(document.querySelectorAll('.view'));
  const glitchLogo = document.getElementById('glitchLogo');
  const spotlight = document.getElementById('spotlight');
  const mobileNavMQ = window.matchMedia('(max-width: 760px)');
  const termRoot = document.getElementById('contactTerminal');
  const termOutput = document.getElementById('termOutput');
  const termInput = document.getElementById('termInput');
  const termPrompt = document.getElementById('termPrompt');
  const infoTerminalRoots = Array.from(document.querySelectorAll('[data-info-terminal]'));
  const TERM_PROMPT = '/network/browser/grvbowski.com ~ %';

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

  function isMobileNavMode(){
    return mobileNavMQ.matches;
  }
  function setMobileNavExpanded(expanded){
    if (!mobileNavToggle) return;
    app.classList.toggle('mobile-nav-open', expanded);
    app.classList.toggle('mobile-nav-trigger-hidden', expanded);
    mobileNavToggle.setAttribute('aria-expanded', String(expanded));
  }
  function openMobileNavOnce(){
    if (!mobileNavToggle || !isMobileNavMode()) return;
    if (app.classList.contains('mobile-nav-open')) return;
    setMobileNavExpanded(true);
  }

  let panelFullscreen = false;
  let panelMinimized = false;
  function setPanelFullscreen(next){
    panelFullscreen = !!next;
    panel.classList.toggle('is-fullscreen', panelFullscreen);
  }
  function setPanelMinimized(next){
    panelMinimized = !!next;
    panel.classList.toggle('is-minimized', panelMinimized);
  }
  function togglePanelFullscreen(){
    if (panelMinimized) setPanelMinimized(false);
    setPanelFullscreen(!panelFullscreen);
  }
  function minimizePanel(){
    if (!panel.classList.contains('on')) return;
    const next = !panelMinimized;
    if (next) setPanelFullscreen(false);
    setPanelMinimized(next);
    impulse = clamp(impulse + 0.65, 0, 1.8);
  }

  // ---------- view typing ----------
  const typeLineEls = Array.from(document.querySelectorAll('.plain-copy p'));
  typeLineEls.forEach(el => {
    const source = (el.textContent || '').trim();
    el.dataset.full = source;
  });

  let typeToken = 0;
  let typeTimers = [];
  function clearTypeTimers(){
    typeTimers.forEach(t => clearTimeout(t));
    typeTimers = [];
  }
  function runViewTypewriter(path){
    clearTypeTimers();
    typeToken += 1;
    const token = typeToken;

    const view = views.find(v => v.getAttribute('data-view') === path);
    if (!view || path === '/contact') return;

    const lines = Array.from(view.querySelectorAll('.plain-copy p'));
    const delayed = Array.from(view.querySelectorAll('[data-type-delayed="true"]'));
    delayed.forEach(el => { el.hidden = true; });
    if (!lines.length){
      delayed.forEach(el => { el.hidden = false; });
      return;
    }

    lines.forEach(line => { line.textContent = ''; });
    let offset = 24;

    lines.forEach((line) => {
      const full = line.dataset.full || '';
      let t = offset;
      for (let i = 1; i <= full.length; i++){
        t += 8 + Math.floor(Math.random() * 15);
        const timer = setTimeout(() => {
          if (token !== typeToken) return;
          line.textContent = full.slice(0, i);
        }, t);
        typeTimers.push(timer);
      }
      offset = t + 78;
    });

    const revealTimer = setTimeout(() => {
      if (token !== typeToken) return;
      delayed.forEach(el => { el.hidden = false; });
    }, offset + 80);
    typeTimers.push(revealTimer);
  }

  // ---------- info terminals ----------
  const INFO_TERMINAL_CONFIG = {
    about: {
      intro: ['about_me loaded', 'choose command to inspect details'],
      commands: {
        scope: ['building digital products _ ecommerce # automation # integrations'],
        model: ['business logic ↔ tech execution'],
        flow: ['idea → validation → build → scale'],
        approach: ['hands-on approach', 'operational work across strategy, product and delivery']
      }
    },
    links: {
      intro: ['links loaded', 'selected work + working areas'],
      commands: {
        work: ['selected work $', 'projects _ notes _ tools _ references'],
        focus: ['current focus: things in progress'],
        resources: ['useful resources'],
        projects: ['projects: coming soon'],
        notes: ['notes: coming soon'],
        tools: ['tools: coming soon'],
        references: ['references: coming soon']
      }
    },
    calendar: {
      intro: ['calendar loaded', 'check fit before booking'],
      commands: {
        booking: ['book a slot if timing and topic align'],
        slots: ['available lengths: 15m / 30m'],
        topics: ['consultation _ idea review _ problem framing'],
        flow: ['short intro first', 'then we talk']
      }
    }
  };
  const infoTerminals = new Map();
  infoTerminalRoots.forEach(root => {
    const key = root.getAttribute('data-info-terminal');
    const output = root.querySelector('.term-output');
    const input = root.querySelector('.term-input');
    const prompt = root.querySelector('.term-prompt');
    if (!key || !output || !input || !prompt) return;
    infoTerminals.set(key, { output, input, prompt, token: 0, timers: [], booted: false });
  });

  function clearInfoTimers(session){
    session.timers.forEach(t => clearTimeout(t));
    session.timers = [];
  }
  function infoScroll(session){
    session.output.scrollTop = session.output.scrollHeight;
  }
  function infoLine(session, text, cls = 'sys'){
    const line = document.createElement('div');
    line.className = `term-line ${cls}`;
    line.textContent = text;
    session.output.appendChild(line);
    infoScroll(session);
  }
  function typeInfoLine(session, token, text, cls = 'sys', done){
    const line = document.createElement('div');
    line.className = `term-line ${cls}`;
    session.output.appendChild(line);

    let i = 0;
    const step = () => {
      if (token !== session.token) return;
      line.textContent = text.slice(0, i);
      infoScroll(session);
      i += 1;
      if (i <= text.length){
        session.timers.push(setTimeout(step, 7 + Math.floor(Math.random() * 12)));
      } else if (done) {
        done();
      }
    };
    step();
  }
  function typeInfoSequence(key, lines, done){
    const session = infoTerminals.get(key);
    if (!session) return;
    const token = session.token;
    let i = 0;
    const next = () => {
      if (token !== session.token) return;
      if (i >= lines.length){
        if (done) done();
        return;
      }
      const item = lines[i++];
      typeInfoLine(session, token, item.text, item.cls || 'sys', () => {
        session.timers.push(setTimeout(next, item.pause ?? 70));
      });
    };
    next();
  }
  function showInfoHelp(key){
    const cfg = INFO_TERMINAL_CONFIG[key];
    const session = infoTerminals.get(key);
    if (!cfg || !session) return;
    const names = Object.keys(cfg.commands).map(n => `/${n}`).join(' ');
    infoLine(session, `commands: ${names} /help /clear`, 'sys');
  }
  function initInfoTerminal(key, force = false){
    const session = infoTerminals.get(key);
    const cfg = INFO_TERMINAL_CONFIG[key];
    if (!session || !cfg) return;
    if (!force && session.booted){
      session.prompt.textContent = TERM_PROMPT;
      session.input.focus();
      return;
    }
    session.booted = true;
    session.token += 1;
    clearInfoTimers(session);
    session.output.innerHTML = '';
    session.input.value = '';
    session.prompt.textContent = TERM_PROMPT;

    const intro = [
      { text: '$ boot info terminal', cls: 'sys', pause: 65 },
      ...cfg.intro.map(text => ({ text, cls: 'sys', pause: 65 }))
    ];
    typeInfoSequence(key, intro, () => {
      showInfoHelp(key);
      session.input.focus();
    });
  }
  function processInfoInput(key, raw){
    const session = infoTerminals.get(key);
    const cfg = INFO_TERMINAL_CONFIG[key];
    if (!session || !cfg) return;
    const value = (raw || '').trim();
    if (!value) return;
    infoLine(session, `cmd > ${value}`, 'input');

    const cmd = value.startsWith('/') ? value.slice(1).trim().toLowerCase() : '';
    if (!cmd){
      infoLine(session, `Error: command not found: ${value}`, 'warn');
      infoLine(session, 'get some /help', 'sys');
      return;
    }
    if (cmd === 'help'){
      showInfoHelp(key);
      return;
    }
    if (cmd === 'clear'){
      initInfoTerminal(key, true);
      return;
    }
    const out = cfg.commands[cmd];
    if (!out){
      infoLine(session, `Error: command not found: ${value}`, 'warn');
      infoLine(session, 'get some /help', 'sys');
      return;
    }
    out.forEach(line => infoLine(session, line, 'ok'));
  }
  infoTerminals.forEach((session, key) => {
    session.input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const raw = session.input.value;
      session.input.value = '';
      processInfoInput(key, raw);
    });
  });

  // ---------- contact terminal ----------
  let termToken = 0;
  let termTimers = [];
  let contactBooted = false;
  const contactState = {
    order: ['email', 'subject', 'message'],
    values: { email: '', subject: '', message: '' },
    idx: 0
  };

  function clearTermTimers(){
    termTimers.forEach(t => clearTimeout(t));
    termTimers = [];
  }
  function termScroll(){
    if (!termOutput) return;
    termOutput.scrollTop = termOutput.scrollHeight;
  }
  function termLine(text, cls = 'sys'){
    if (!termOutput) return;
    const line = document.createElement('div');
    line.className = `term-line ${cls}`;
    line.textContent = text;
    termOutput.appendChild(line);
    termScroll();
  }
  function typeTermLine(session, text, cls = 'sys', done){
    if (!termOutput) return;
    const line = document.createElement('div');
    line.className = `term-line ${cls}`;
    termOutput.appendChild(line);

    let i = 0;
    const step = () => {
      if (session !== termToken) return;
      line.textContent = text.slice(0, i);
      termScroll();
      i += 1;
      if (i <= text.length){
        termTimers.push(setTimeout(step, 8 + Math.floor(Math.random() * 14)));
      } else if (done) {
        done();
      }
    };
    step();
  }
  function typeTermSequence(lines, done){
    const session = termToken;
    let i = 0;
    const next = () => {
      if (session !== termToken) return;
      if (i >= lines.length){
        if (done) done();
        return;
      }
      const item = lines[i++];
      typeTermLine(session, item.text, item.cls || 'sys', () => {
        termTimers.push(setTimeout(next, item.pause ?? 70));
      });
    };
    next();
  }
  function setContactPrompt(){
    if (!termPrompt || !termInput) return;
    termPrompt.textContent = TERM_PROMPT;
    const key = contactState.order[contactState.idx];
    if (key){
      termInput.placeholder = key === 'message' ? 'write message' : `enter ${key}`;
    } else {
      termInput.placeholder = '/submit /show /edit <field> /reset /help';
    }
    termInput.focus();
  }
  function validateEmail(email){
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }
  function firstMissingField(){
    return contactState.order.find(k => !contactState.values[k]);
  }
  function showContactValues(){
    contactState.order.forEach(k => {
      const value = contactState.values[k] || '[empty]';
      termLine(`${k}: ${value}`, 'sys');
    });
  }
  function openEditField(key){
    const idx = contactState.order.indexOf(key);
    if (idx === -1){
      termLine("Error: unknown field. use: email, subject, message", 'warn');
      return;
    }
    contactState.idx = idx;
    termLine(`editing ${key}`, 'sys');
    setContactPrompt();
  }
  function showContactHelp(){
    termLine('commands: /show /submit /reset /edit email|subject|message /help', 'sys');
  }
  function commandNotFound(raw){
    termLine(`Error: command not found: ${raw}`, 'warn');
    termLine('get some /help', 'sys');
  }
  function processContactInput(raw){
    const value = (raw || '').trim();
    if (!value) return;
    const activePrompt = termPrompt ? termPrompt.textContent : 'cmd >';
    termLine(`${activePrompt} ${value}`, 'input');

    const lowered = value.toLowerCase();
    if (value.startsWith('/')){
      const cmd = lowered.slice(1).trim();
      if (cmd === 'help'){
        showContactHelp();
        setContactPrompt();
        return;
      }
      if (cmd === 'show'){
        showContactValues();
        setContactPrompt();
        return;
      }
      if (cmd === 'reset'){
        initContactTerminal(true);
        return;
      }
      if (cmd.startsWith('edit ')){
        openEditField(cmd.replace(/^edit\s+/, '').trim());
        return;
      }
      if (cmd === 'submit'){
      const missing = firstMissingField();
      if (missing){
        termLine(`Error: missing ${missing} — complete all fields first`, 'warn');
        openEditField(missing);
        return;
      }
      if (!validateEmail(contactState.values.email)){
        termLine('Error: email format looks invalid — edit email', 'warn');
        openEditField('email');
        return;
      }
        termLine('payload accepted. i reply when there’s alignment.', 'ok');
        setContactPrompt();
        return;
      }
      commandNotFound(value);
      setContactPrompt();
      return;
    }

    const key = contactState.order[contactState.idx];
    if (!key){
      commandNotFound(value);
      setContactPrompt();
      return;
    }

    contactState.values[key] = value;
    termLine(`saved ${key}`, 'ok');
    contactState.idx += 1;

    if (contactState.idx >= contactState.order.length){
      termLine("all fields captured. use /submit or /edit <field>", 'sys');
    }
    setContactPrompt();
  }
  function initContactTerminal(force = false){
    if (!termRoot || !termOutput || !termInput || !termPrompt) return;
    if (!force && contactBooted){
      setContactPrompt();
      return;
    }
    contactBooted = true;
    termToken += 1;
    clearTermTimers();
    contactState.values = { email: '', subject: '', message: '' };
    contactState.idx = 0;
    termOutput.innerHTML = '';
    termInput.value = '';

    typeTermSequence([
      { text: '$ boot contact terminal', cls: 'sys', pause: 85 },
      { text: 'email is the primary channel', cls: 'sys', pause: 70 },
      { text: 'provide: email, subject, message', cls: 'sys', pause: 70 },
      { text: 'enter value + press return', cls: 'sys', pause: 55 },
      { text: 'need commands? run /help', cls: 'sys', pause: 55 }
    ], () => setContactPrompt());
  }

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
    const titles = {
      '/': 'home',
      '/about': 'about_me',
      '/links': 'links',
      '/calendar': 'calendar',
      '/contact': 'contact_me'
    };
    panelTitle.textContent = titles[path] || path.replace('/', '');

    const infoByRoute = {
      '/about': 'about',
      '/links': 'links',
      '/calendar': 'calendar'
    };
    const infoKey = infoByRoute[path];
    if (infoKey){
      clearTypeTimers();
      typeToken += 1;
      termToken += 1;
      clearTermTimers();
      initInfoTerminal(infoKey);
      return;
    }

    if (path === '/contact'){
      clearTypeTimers();
      typeToken += 1;
      initContactTerminal();
      return;
    }

    termToken += 1;
    clearTermTimers();
    runViewTypewriter(path);
  }

  function triggerOpenScatterFromPanel(){
    const r = panel.getBoundingClientRect();
    const count = 14 + Math.floor(Math.random() * 10);
    const rand = (a, b) => a + Math.random() * (b - a);
    const mixModes = ['difference', 'screen', 'plus-lighter'];
    for (let i = 0; i < count; i++){
      const c = panel.cloneNode(true);
      c.removeAttribute('id');
      c.classList.remove('motion', 'glitch-in', 'glitch-out', 'on');
      c.classList.add('open-scatter');

      const nx = clamp(r.left + rand(-420, 420), 0, Math.max(0, window.innerWidth - r.width));
      const ny = clamp(r.top + rand(-300, 300), 0, Math.max(0, window.innerHeight - r.height));

      c.style.left = `${nx}px`;
      c.style.top = `${ny}px`;
      c.style.width = `${r.width}px`;
      c.style.height = `${r.height}px`;
      const slice = rand(8, 34);
      const top = rand(0, 100 - slice);
      const bottom = 100 - top - slice;

      c.style.setProperty('--scX', `${rand(-78, 78).toFixed(1)}px`);
      c.style.setProperty('--scY', `${rand(-56, 56).toFixed(1)}px`);
      c.style.setProperty('--scSkew', `${rand(-8.5, 8.5).toFixed(2)}deg`);
      c.style.setProperty('--scScale', `${rand(0.94, 1.14).toFixed(3)}`);
      c.style.setProperty('--scOp', `${rand(0.45, 1.0).toFixed(2)}`);
      c.style.setProperty('--scTop', `${top.toFixed(2)}%`);
      c.style.setProperty('--scBot', `${bottom.toFixed(2)}%`);
      c.style.setProperty('--scHue', `${Math.floor(rand(-180, 180))}deg`);
      c.style.setProperty('--scSat', `${rand(1.1, 2.2).toFixed(2)}`);
      c.style.setProperty('--scCon', `${rand(1.1, 1.85).toFixed(2)}`);
      c.style.setProperty('--scBlur', `${rand(0.0, 1.35).toFixed(2)}px`);
      c.style.setProperty('--scMix', mixModes[Math.floor(rand(0, mixModes.length))]);
      c.style.setProperty('--scRgbX', `${rand(-14, 14).toFixed(1)}px`);
      c.style.setProperty('--scRgbY', `${rand(-7, 7).toFixed(1)}px`);
      c.style.setProperty('--scRgbA', `${rand(0.08, 0.32).toFixed(2)}`);
      c.style.animationDelay = `${Math.floor(rand(0, 22))}ms`;
      c.style.animationDuration = `${Math.floor(rand(90, 180))}ms`;

      document.body.appendChild(c);
      setTimeout(() => c.remove(), 320);
    }
  }

  function clearPanelBurstVars(){
    panel.style.removeProperty('--burstX');
    panel.style.removeProperty('--burstY');
    panel.style.removeProperty('--burstSkew');
    panel.style.removeProperty('--burstHue');
    panel.style.removeProperty('--burstSat');
    panel.style.removeProperty('--burstCon');
    panel.style.removeProperty('--burstSliceTop');
    panel.style.removeProperty('--burstSliceBot');
    panel.style.removeProperty('--burstRgbX');
    panel.style.removeProperty('--burstRgbY');
    panel.style.removeProperty('--burstRgbA');
  }

  let openBurstToken = 0;
  function triggerPanelOpenBurst(){
    const rand = (a, b) => a + Math.random() * (b - a);
    const token = ++openBurstToken;
    const steps = 5 + Math.floor(Math.random() * 4);
    let i = 0;
    panel.classList.add('glitch-burst');

    const step = () => {
      if (token !== openBurstToken) return;
      if (i >= steps){
        panel.classList.remove('glitch-burst');
        clearPanelBurstVars();
        return;
      }
      i += 1;
      const slice = rand(16, 58);
      const top = rand(0, 100 - slice);
      const bottom = 100 - top - slice;

      panel.style.setProperty('--burstX', `${rand(-18, 18).toFixed(1)}px`);
      panel.style.setProperty('--burstY', `${rand(-11, 11).toFixed(1)}px`);
      panel.style.setProperty('--burstSkew', `${rand(-3.6, 3.6).toFixed(2)}deg`);
      panel.style.setProperty('--burstHue', `${Math.floor(rand(-180, 180))}deg`);
      panel.style.setProperty('--burstSat', `${rand(1.0, 1.9).toFixed(2)}`);
      panel.style.setProperty('--burstCon', `${rand(1.0, 1.55).toFixed(2)}`);
      panel.style.setProperty('--burstSliceTop', `${top.toFixed(2)}%`);
      panel.style.setProperty('--burstSliceBot', `${bottom.toFixed(2)}%`);
      panel.style.setProperty('--burstRgbX', `${rand(-8, 8).toFixed(1)}px`);
      panel.style.setProperty('--burstRgbY', `${rand(-6, 6).toFixed(1)}px`);
      panel.style.setProperty('--burstRgbA', `${rand(0.14, 0.45).toFixed(2)}`);

      setTimeout(step, Math.floor(rand(22, 48)));
    };

    step();
    setTimeout(() => {
      if (token !== openBurstToken) return;
      panel.classList.remove('glitch-burst');
      clearPanelBurstVars();
    }, 360);
  }

  let openTimer = null;
  const OPEN_DELAY = 65;
  let lastClickX = window.innerWidth * 0.5;
  let lastClickY = window.innerHeight * 0.5;

  function go(path){
    const p = normalizeRoute(path);
    const targetHash = '#'+p;
    if (location.hash !== targetHash) location.hash = targetHash;

    setActiveNav(p);
    if (openTimer) { clearTimeout(openTimer); openTimer = null; }

    if (p === '/'){
      showView(p);
      setState('idle');
      setPanelMinimized(false);
      setPanelFullscreen(false);
      impulse = clamp(impulse + 1.0, 0, 1.8);
      return;
    }

    openTimer = setTimeout(() => {
      setPanelMinimized(false);
      showView(p);
      setState((p === '/calendar' || p === '/contact') ? 'deep' : 'focus');

      // Genie-like opening from pointer position
      const r = panel.getBoundingClientRect();
      const ox = clamp(((lastClickX - r.left) / r.width) * 100, 0, 100).toFixed(1);
      const oy = clamp(((lastClickY - r.top) / r.height) * 100, 0, 100).toFixed(1);
      panel.style.setProperty('--originX', `${ox}%`);
      panel.style.setProperty('--originY', `${oy}%`);
      panel.style.setProperty('--openSkew1', `${((Math.random() * 2.4) - 1.2).toFixed(2)}deg`);
      panel.style.setProperty('--openSkew2', `${((Math.random() * 1.8) - 0.9).toFixed(2)}deg`);
      panel.style.setProperty('--openJx', `${((Math.random() * 30) - 15).toFixed(1)}px`);
      panel.style.setProperty('--openJy', `${((Math.random() * 22) - 11).toFixed(1)}px`);
      panel.style.setProperty('--openHue', `${Math.floor((Math.random() * 280) - 140)}deg`);
      panel.style.setProperty('--openDur', `${280 + Math.floor(Math.random() * 140)}ms`);
      panel.style.setProperty('--sl1t', `${Math.floor(Math.random() * 18)}%`);
      panel.style.setProperty('--sl1b', `${65 + Math.floor(Math.random() * 26)}%`);
      panel.style.setProperty('--sl1x', `${-14 + Math.floor(Math.random() * 28)}px`);
      panel.style.setProperty('--sl2t', `${16 + Math.floor(Math.random() * 32)}%`);
      panel.style.setProperty('--sl2b', `${28 + Math.floor(Math.random() * 34)}%`);
      panel.style.setProperty('--sl2x', `${-18 + Math.floor(Math.random() * 36)}px`);
      panel.style.setProperty('--sl3t', `${42 + Math.floor(Math.random() * 26)}%`);
      panel.style.setProperty('--sl3b', `${10 + Math.floor(Math.random() * 28)}%`);
      panel.style.setProperty('--sl3x', `${-16 + Math.floor(Math.random() * 32)}px`);
      panel.style.setProperty('--sl4t', `${10 + Math.floor(Math.random() * 24)}%`);
      panel.style.setProperty('--sl4b', `${56 + Math.floor(Math.random() * 30)}%`);
      panel.style.setProperty('--sl4x', `${-12 + Math.floor(Math.random() * 24)}px`);

      panel.classList.remove('glitch-in');
      void panel.offsetWidth;
      panel.classList.add('glitch-in');
      triggerOpenScatterFromPanel();
      triggerPanelOpenBurst();
      setTimeout(() => panel.classList.remove('glitch-in'), 520);

      impulse = clamp(impulse + 1.0, 0, 1.8);
    }, OPEN_DELAY);
  }

  window.addEventListener('hashchange', () => go(readHashRoute()));

  app.addEventListener('pointerdown', (e) => {
    const a = e.target.closest('a[data-nav="true"]');
    if (!a) return;
    lastClickX = e.clientX;
    lastClickY = e.clientY;
  });

  app.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-nav="true"]');
    if (!a) return;
    if (window.matchMedia('(hover: none), (pointer: coarse)').matches) clearHover();
    e.preventDefault();
    go((a.getAttribute('href') || '#/').replace(/^#/, ''));
  });

  if (mobileNavToggle){
    mobileNavToggle.addEventListener('click', openMobileNavOnce);
    setMobileNavExpanded(false);
  }

  if (panelDotClose) panelDotClose.addEventListener('click', () => go('/'));
  if (panelDotMinimize) panelDotMinimize.addEventListener('click', minimizePanel);
  if (panelDotFullscreen) panelDotFullscreen.addEventListener('click', togglePanelFullscreen);

  if (termInput){
    termInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const raw = termInput.value;
      termInput.value = '';
      processContactInput(raw);
    });
  }

  // start = home (zamyka panel)
  // mark.addEventListener('click', () => go('/'));

  // logo should NOT be clickable, but can be hovered
  if (mark){
    mark.setAttribute('aria-disabled', 'true');
    mark.tabIndex = -1;
    mark.style.pointerEvents = 'auto';
    mark.style.cursor = 'default';
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

  function initLogoHoverGlitch(glitchRoot){
    if (!glitchRoot) return null;
    const layers = Array.from(glitchRoot.querySelectorAll('.layer.g'));
    if (!layers.length) return null;

    const rand = (min,max) => Math.random() * (max - min) + min;
    const choice = arr => arr[Math.floor(Math.random() * arr.length)];
    const colorFx = [
      "none",
      "invert(16%) sepia(98%) saturate(7476%) hue-rotate(358deg) brightness(108%) contrast(116%)",
      "invert(73%) sepia(78%) saturate(2966%) hue-rotate(77deg) brightness(101%) contrast(109%)",
      "invert(38%) sepia(99%) saturate(3514%) hue-rotate(207deg) brightness(105%) contrast(112%)"
    ];
    const clipFns = [
      () => { const y = rand(0, 90), h = rand(2, 10); return `polygon(0% ${y}%,100% ${y}%,100% ${y+h}%,0% ${y+h}%)`; },
      () => { const y = rand(0, 80), h = rand(10, 24); return `polygon(0% ${y}%,100% ${y}%,100% ${y+h}%,0% ${y+h}%)`; },
      () => { const x = rand(0, 84), w = rand(6, 18); return `polygon(${x}% 0%,${x+w}% 0%,${x+w}% 100%,${x}% 100%)`; },
      () => { const x = rand(0, 78), y = rand(0, 78), w = rand(10, 28), h = rand(8, 22), s = rand(-12, 12);
        return `polygon(${x}% ${y}%,${x+w}% ${y+s}%,${x+w}% ${y+h+s}%,${x}% ${y+h}%)`; }
    ];

    let hovering = false;
    let timer = null;
    let burstUntil = 0;
    let lastMoveX = 0;
    let lastMoveY = 0;
    let lastBurstAt = 0;

    function step(){
      layers.forEach((layer, idx) => {
        const img = layer.querySelector("img");
        const mul = (idx === 0) ? 1 : 0.64;
        layer.style.opacity = rand(0.2, 0.86).toFixed(2);
        layer.style.transform = `translate(${(rand(-12,12)*mul).toFixed(2)}px, ${(rand(-8,8)*mul).toFixed(2)}px)`;
        layer.style.clipPath = (Math.random() < 0.86) ? choice(clipFns)() : "none";
        layer.style.mixBlendMode = "screen";
        if (img) img.style.filter = choice(colorFx);
      });
    }

    function reset(){
      layers.forEach(layer => {
        const img = layer.querySelector("img");
        layer.style.opacity = "0";
        layer.style.transform = "";
        layer.style.clipPath = "none";
        if (img) img.style.filter = "none";
      });
    }

    function loop(){
      if (!hovering) return;
      if (performance.now() > burstUntil){
        reset();
        timer = null;
        return;
      }
      step();
      timer = setTimeout(loop, rand(50, 180));
    }

    function triggerBurst(duration = rand(140, 260)){
      burstUntil = performance.now() + duration;
      if (timer) clearTimeout(timer);
      loop();
    }

    return {
      enter(e){
        hovering = true;
        lastMoveX = e?.clientX ?? 0;
        lastMoveY = e?.clientY ?? 0;
        triggerBurst(rand(140, 240));
      },
      move(e){
        if (!hovering || !e) return;
        const dx = e.clientX - lastMoveX;
        const dy = e.clientY - lastMoveY;
        const moved = Math.hypot(dx, dy) > 4;
        const now = performance.now();
        if (moved && (now - lastBurstAt) > 90){
          lastMoveX = e.clientX;
          lastMoveY = e.clientY;
          lastBurstAt = now;
          triggerBurst(rand(120, 210));
        }
      },
      leave(){
        hovering = false;
        burstUntil = 0;
        if (timer) clearTimeout(timer);
        timer = null;
        reset();
      }
    };
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
  const SPOT_SIZE = 1100;
  let sx = mouseX, sy = mouseY;
  let targetSX = mouseX, targetSY = mouseY;
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)');
  let autoSpot = coarsePointer.matches;
  let autoSpotTimer = null;

  function seedAutoSpot(){
    targetSX = window.innerWidth  * (0.15 + 0.70 * rnd());
    targetSY = window.innerHeight * (0.15 + 0.70 * rnd());
  }
  function scheduleAutoSpot(){
    if (!autoSpot) return;
    seedAutoSpot();
    autoSpotTimer = setTimeout(scheduleAutoSpot, 2200 + Math.random() * 2400);
  }
  if (autoSpot) scheduleAutoSpot();
  coarsePointer.addEventListener('change', (e) => {
    autoSpot = e.matches;
    if (autoSpot){
      clearHover();
      if (autoSpotTimer) clearTimeout(autoSpotTimer);
      scheduleAutoSpot();
    } else {
      if (autoSpotTimer) clearTimeout(autoSpotTimer);
      autoSpotTimer = null;
    }
  });

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.classList.add('on');
    armMeta();
    if (spotlight && !autoSpot){
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
      el.classList.remove('is-glitch');
      el.style.removeProperty('--g1x');
      el.style.removeProperty('--g1y');
      el.style.removeProperty('--g2x');
      el.style.removeProperty('--g2y');
      el.style.removeProperty('--gclip1');
      el.style.removeProperty('--gclip2');
      el.style.removeProperty('--gopa1');
      el.style.removeProperty('--gopa2');
      el.style.removeProperty('--g1c');
      el.style.removeProperty('--g2c');
      if (el._glitchTimer) { clearTimeout(el._glitchTimer); el._glitchTimer = null; }
    });
    items.forEach(el => {
      const s = M.get(el);
      if (s) { s._hover = false; s.hoverJx = 0; s.hoverJy = 0; }
    });
    igniteAllNav();
  }

  let igniteTimer = null;
  function igniteAllNav(){
    app.classList.remove('nav-reignite');
    if (igniteTimer) clearTimeout(igniteTimer);
    app.classList.add('nav-reignite');
    igniteTimer = setTimeout(() => app.classList.remove('nav-reignite'), 120);
  }

  items.forEach(el => {
    const link = el.querySelector('a') || el;

    link.addEventListener('pointerenter', () => {
      if (coarsePointer.matches) return;
      app.classList.add('nav-hover');
      items.forEach(x => x.classList.toggle('is-hover', x === el));

      const s = M.get(el);
      if (s) s._hover = true;
      impulse = clamp(impulse + 0.35, 0, 1.8);

      // short burst: random direction + slight shake, distinct from logo
      if (el._glitchTimer) clearTimeout(el._glitchTimer);
      el.classList.add('is-glitch');
      const rand = (min,max) => Math.random()*(max-min)+min;
      const clipH = () => {
        const y = rand(0, 85);
        const h = rand(6, 18);
        return `inset(${y}% 0 ${100-(y+h)}% 0)`;
      };
      const tickGlitch = () => {
        el.style.setProperty('--g1x', `${rand(-2.8, 2.8).toFixed(2)}px`);
        el.style.setProperty('--g1y', `${rand(-2.0, 2.0).toFixed(2)}px`);
        el.style.setProperty('--g2x', `${rand(-2.3, 2.3).toFixed(2)}px`);
        el.style.setProperty('--g2y', `${rand(-1.8, 1.8).toFixed(2)}px`);
        el.style.setProperty('--gclip1', clipH());
        el.style.setProperty('--gclip2', clipH());
        el.style.setProperty('--gopa1', `${rand(0.35, 0.75).toFixed(2)}`);
        el.style.setProperty('--gopa2', `${rand(0.25, 0.55).toFixed(2)}`);
        if (Math.random() < 0.40){
          el.style.setProperty('--g1c', 'rgba(255,130,110,.95)');
          el.style.setProperty('--g2c', 'rgba(120,245,210,.90)');
        } else {
          el.style.setProperty('--g1c', 'inherit');
          el.style.setProperty('--g2c', 'inherit');
        }
      };

      tickGlitch();
      const burstStart = performance.now();
      const burstDur = 220 + Math.random() * 140;
      const schedule = () => {
        const hovering = el.matches(':hover') || (el.querySelector('a') && el.querySelector('a').matches(':hover'));
        const done = (performance.now() - burstStart) > burstDur;
        if (!hovering || done){
          el._glitchTimer = null;
          el.classList.remove('is-glitch');
          el.style.setProperty('--gopa1', '0');
          el.style.setProperty('--gopa2', '0');
          el.style.setProperty('--gclip1', 'inset(0 0 100% 0)');
          el.style.setProperty('--gclip2', 'inset(0 0 100% 0)');
          return;
        }
        tickGlitch();
        el._glitchTimer = setTimeout(schedule, 26 + Math.floor(Math.random() * 54));
      };
      schedule();
    });

    link.addEventListener('pointerleave', () => {
      if (coarsePointer.matches) return;
      const s = M.get(el);
      if (s) { s._hover = false; s.hoverJx = 0; s.hoverJy = 0; }
      impulse = clamp(impulse + 0.15, 0, 1.8);

      if (el._glitchTimer) { clearTimeout(el._glitchTimer); el._glitchTimer = null; }
      el.classList.remove('is-glitch');
      el.style.setProperty('--gopa1', '0');
      el.style.setProperty('--gopa2', '0');
      el.style.setProperty('--gclip1', 'inset(0 0 100% 0)');
      el.style.setProperty('--gclip2', 'inset(0 0 100% 0)');

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

    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate3d(-50%,-50%,0)`;

    if (spotlight){
      sx = lerp(sx, targetSX, autoSpot ? 0.02 : 0.05);
      sy = lerp(sy, targetSY, autoSpot ? 0.02 : 0.05);
      spotlight.style.transform = `translate3d(${sx - SPOT_SIZE * 0.5}px, ${sy - SPOT_SIZE * 0.5}px, 0)`;
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
      const maxOff = (s.type === 'nav') ? 0.85 : (s.type === 'mark' ? 0.35 : (s.type === 'meta' ? 4.5 : 4.0));
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

      // Do not move nav hit-areas: keep click targets stable.
      if (s.type === 'nav'){
        tx = 0;
        ty = 0;
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
  const logoHoverEngine = initLogoHoverGlitch(glitchLogo);

  (async () => {
    if (introEngine) await introEngine.play();
    app.classList.add('ready');
  })();

  if (mark && logoHoverEngine){
    mark.addEventListener('pointerenter', (e) => logoHoverEngine.enter(e));
    mark.addEventListener('pointermove', (e) => logoHoverEngine.move(e));
    mark.addEventListener('pointerleave', () => logoHoverEngine.leave());
  }

  requestAnimationFrame(tick);
})();
