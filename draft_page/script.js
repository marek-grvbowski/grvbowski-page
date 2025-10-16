// ---------- Helpers ----------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ---------- Progress + scroll‑tied light sweep ----------
const progress = $("#progress");
const bg = $(".bg");
function onScroll() {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
  if (progress) progress.style.width = (scrolled * 100).toFixed(2) + "%";

  // Light sweep: map scroll to angle/position
  const sweep = scrolled * 360; // 0..360deg across the whole page
  const sx = 35 + Math.sin(scrolled * Math.PI * 2) * 20; // 15% amplitude
  const sy = 35 + Math.cos(scrolled * Math.PI * 2) * 20;
  document.documentElement.style.setProperty("--sweep", sweep + "deg");
  document.documentElement.style.setProperty("--sx", sx.toFixed(1) + "%");
  document.documentElement.style.setProperty("--sy", sy.toFixed(1) + "%");
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Reveal + tone + header visibility ----------
const sections = $$("main > section");
const navLinks = $$("nav a[data-nav]");
const header = $("#siteHeader");
const burgerFab = $("#burgerFab");
const intro = $("#intro");
const hero = $("#hero");
let enableIntroInteractions = () => {};
let disableIntroInteractions = () => {};

function setHeaderVisible(visible) {
  if (!header) return;
  header.classList.toggle("header--visible", visible);
  header.classList.toggle("header--hidden", !visible);
  header.setAttribute("aria-hidden", String(!visible));
  // handle burger appearance animation
  if (burgerFab) {
    if (visible) {
      burgerFab.classList.remove("appear");
    } else {
      burgerFab.classList.add("appear");
    }
  }
}

const bodyEl = document.body;
const obs = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const id = entry.target.id;
    // nav highlight
    const nav = navLinks.find(a => a.getAttribute("href") === `#${id}`);
    navLinks.forEach(a => a.classList.remove("active"));
    nav?.classList.add("active");
    // tone
    const tone = entry.target.dataset.tone;
    if (tone) bodyEl.setAttribute("data-tone", tone);
    // header only on HERO
    const onHero = id === "hero";
    setHeaderVisible(onHero);

    const onIntroSection = id === "intro";
    if (burgerFab) {
      burgerFab.classList.toggle("is-arrow", !onIntroSection);
      burgerFab.setAttribute(
        "aria-label",
        onIntroSection ? "Menu / przejdź do sekcji startowej" : "Wróć do sekcji intro"
      );
      burgerFab.setAttribute("aria-expanded", String(!onIntroSection));
    }

    if (onIntroSection) {
      enableIntroInteractions();
    } else {
      disableIntroInteractions();
    }
  });
}, { rootMargin: "-55% 0% -35% 0%" });
sections.forEach(s => obs.observe(s));

// reveal in-view
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$("[data-animate]").forEach(el => revealObserver.observe(el));

// Smooth anchor scroll
$$('a[href^="#"]').forEach(a => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  });
});

// ---------- Burger interactions ----------
function goHero() { hero?.scrollIntoView({ behavior: "smooth", block: "start" }); }
function goIntro() { intro?.scrollIntoView({ behavior: "smooth", block: "start" }); }

burgerFab?.addEventListener("click", () => {
  // departure animation (lines go up with stagger + slight pull)
  burgerFab.classList.remove("appear");
  if (burgerFab.classList.contains("is-arrow")) {
    goIntro();
  } else {
    burgerFab.classList.add("depart");
    goHero();
    setTimeout(() => burgerFab.classList.remove("depart"), 500);
  }
});

// On intro: minimal wheel / space / PageDown jumps to HERO
(() => {
  if (!intro || !hero) return;
  const onIntro = () => {
    const rect = intro.getBoundingClientRect();
    return rect.top >= -1 && rect.bottom > window.innerHeight/2;
  };
  const wheelOpts = { passive: false };
  const keyOpts = { passive: false };
  const pointerOpts = { passive: true };
  let armed = false;

  const leaveIntro = () => {
    if (!armed) return;
    disableIntroInteractions();
    burgerFab?.classList.add("depart");
    goHero();
    setHeaderVisible(true);
    setTimeout(() => burgerFab?.classList.remove("depart"), 500);
  };

  const wheelHandler = (e) => {
    if (!armed) return;
    if (!onIntro()) {
      disableIntroInteractions();
      return;
    }
    if (e.deltaY > 0) {
      e.preventDefault();
      leaveIntro();
    }
  };

  const keyHandler = (e) => {
    if (!armed) return;
    if (!onIntro()) {
      disableIntroInteractions();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    leaveIntro();
  };

  const pointerHandler = (e) => {
    if (!armed) return;
    if (!onIntro()) {
      disableIntroInteractions();
      return;
    }
    if (burgerFab && e.target instanceof Element && burgerFab.contains(e.target)) {
      return;
    }
    leaveIntro();
  };

  const enable = () => {
    if (armed) return;
    armed = true;
    window.addEventListener("wheel", wheelHandler, wheelOpts);
    window.addEventListener("keydown", keyHandler, keyOpts);
    window.addEventListener("pointerdown", pointerHandler, pointerOpts);
  };

  const disable = () => {
    if (!armed) return;
    armed = false;
    window.removeEventListener("wheel", wheelHandler, wheelOpts);
    window.removeEventListener("keydown", keyHandler, keyOpts);
    window.removeEventListener("pointerdown", pointerHandler, pointerOpts);
  };

  enableIntroInteractions = enable;
  disableIntroInteractions = disable;

  enable();
})();

// ---------- Ripple inside glyphs (track mouse position) ----------
const navHoverLinks = $$(".nav a");

const NAV_INFLUENCE_EXTRA = 70;
const NAV_MAX_SHIFT = 9; // px, translation cap to avoid layout jumps

const navStates = new Map();
let navPointerX = null;
let navPointerY = null;
let navRaf = 0;

function applyNavTranslation(link, x, y) {
  link.style.setProperty("--tx", `${x.toFixed(2)}px`);
  link.style.setProperty("--ty", `${y.toFixed(2)}px`);
}

function clearNavStickiness(state) {
  if (!state) return;
  state.stickyTimeouts.forEach(clearTimeout);
  state.stickyTimeouts.length = 0;
  state.stickyRunning = false;
}

function startNavStickiness(state, { force = false } = {}) {
  if (!state || state.stickyRunning) return;

  const baseX = state.lastX;
  const baseY = state.lastY;
  const magnitude = Math.hypot(baseX, baseY);
  if (!force && magnitude < 0.08) {
    applyNavTranslation(state.link, 0, 0);
    state.lastX = 0;
    state.lastY = 0;
    return;
  }

  clearNavStickiness(state);
  state.stickyRunning = true;

  const steps = [
    { factor: 1.18, delay: 0 },
    { factor: 0.62, delay: 100 },
    { factor: 0.32, delay: 210 },
    { factor: 0, delay: 360 }
  ];

  steps.forEach(({ factor, delay }) => {
    const timeout = setTimeout(() => {
      const nextX = baseX * factor;
      const nextY = baseY * factor;
      applyNavTranslation(state.link, nextX, nextY);
      if (factor === 0) {
        state.lastX = 0;
        state.lastY = 0;
        state.stickyRunning = false;
        state.stickyTimeouts.length = 0;
      }
    }, delay);
    state.stickyTimeouts.push(timeout);
  });
}

function scheduleNavUpdate() {
  if (navRaf) return;
  navRaf = requestAnimationFrame(() => {
    navRaf = 0;
    updateNavTranslations();
  });
}

function updateNavTranslations() {
  if (navPointerX === null || navPointerY === null) return;

  const now = performance.now();
  const shiftLimit = window.innerWidth <= 600 ? NAV_MAX_SHIFT * 0.75 : NAV_MAX_SHIFT;

  navHoverLinks.forEach((link) => {
    const state = navStates.get(link);
    if (!state) return;

    const rect = link.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = navPointerX - cx;
    const dy = navPointerY - cy;
    const dist = Math.hypot(dx, dy);
    const influenceRadius = Math.max(rect.width, rect.height) * 0.5 + NAV_INFLUENCE_EXTRA;
    const within = dist <= influenceRadius;
    const insideRect = navPointerX >= rect.left && navPointerX <= rect.right && navPointerY >= rect.top && navPointerY <= rect.bottom;
    const canRespond = state.active || insideRect || now >= state.cooldownUntil;
    if (!canRespond) return;

    if (within) {
      const safeDist = dist || 0.01;
      const falloffPower = insideRect ? 1.45 : 2.2;
      const scale = insideRect ? 1 : 0.55;
      const intensity = Math.pow(1 - Math.min(dist / influenceRadius, 1), falloffPower) * scale;
      const unitX = dx / safeDist;
      const unitY = dy / safeDist;
      const tx = -unitX * intensity * shiftLimit;
      const ty = -unitY * intensity * shiftLimit;
      clearNavStickiness(state);
      state.active = true;
      state.lastX = tx;
      state.lastY = ty;
      applyNavTranslation(link, tx, ty);
    } else if (state.active) {
      state.active = false;
      startNavStickiness(state);
    }
  });
}

navHoverLinks.forEach((link) => {
  const state = {
    link,
    active: false,
    lastX: 0,
    lastY: 0,
    stickyTimeouts: [],
    stickyRunning: false,
    cooldownUntil: 0
  };
  navStates.set(link, state);

  link.addEventListener("pointerenter", (e) => {
    navPointerX = e.clientX;
    navPointerY = e.clientY;
    state.cooldownUntil = 0;
    clearNavStickiness(state);
    scheduleNavUpdate();
  }, { passive: true });

  link.addEventListener("mousemove", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mx", x + "%");
    e.currentTarget.style.setProperty("--my", y + "%");

    navPointerX = e.clientX;
    navPointerY = e.clientY;
    scheduleNavUpdate();
  });

  link.addEventListener("mouseleave", (e) => {
    e.currentTarget.style.removeProperty("--mx");
    e.currentTarget.style.removeProperty("--my");
    navPointerX = e.clientX;
    navPointerY = e.clientY;
    state.active = false;
    state.cooldownUntil = performance.now() + 220;
    startNavStickiness(state, { force: true });
    scheduleNavUpdate();
  });
});

addEventListener("pointermove", (e) => {
  navPointerX = e.clientX;
  navPointerY = e.clientY;
  scheduleNavUpdate();
}, { passive: true });

addEventListener("scroll", () => {
  if (navPointerX === null || navPointerY === null) return;
  scheduleNavUpdate();
}, { passive: true });

addEventListener("resize", () => {
  if (navPointerX === null || navPointerY === null) return;
  scheduleNavUpdate();
});

addEventListener("pointerout", (e) => {
  if (e.relatedTarget) return;
  navPointerX = null;
  navPointerY = null;
  navStates.forEach((state) => {
    if (state.active) {
      state.active = false;
      startNavStickiness(state, { force: true });
    } else if (!state.stickyRunning) {
      applyNavTranslation(state.link, 0, 0);
      state.lastX = 0;
      state.lastY = 0;
    }
  });
});

// ---------- Request CV (mailto) ----------
const cvForm = $("#cvForm");
cvForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const fd = new FormData(cvForm);
  const name = String(fd.get("name") || "").trim();
  const email = String(fd.get("email") || "").trim();
  const reason = String(fd.get("reason") || "");
  const message = String(fd.get("message") || "");
  const withRefs = fd.get("with_refs") ? "Tak" : "Nie";

  const subject = `Request my CV — ${name}`;
  const body = [
    `Imię i nazwisko: ${name}`,
    `Email: ${email}`,
    `Powód: ${reason}`,
    `Dołączyć referencje: ${withRefs}`,
    message ? `\\nWiadomość:\\n${message}` : ""
  ].join("\\n");

  const mailto = `mailto:marek@grvbowski.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
});

// Year
$("#year").textContent = String(new Date().getFullYear());
