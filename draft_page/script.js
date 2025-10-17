// ---------- Helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const docEl = document.documentElement;
const bodyEl = document.body;
const progress = $("#progress");
const header = $("#siteHeader");
const navLinks = $$("#siteHeader .nav a");
const ctrlFab = $("#ctrlFab");
const intro = $("#intro");
const hero = $("#hero");
const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let prefersReducedMotion = reduceMotionQuery.matches;

if (reduceMotionQuery.addEventListener) {
  reduceMotionQuery.addEventListener("change", (event) => {
    prefersReducedMotion = event.matches;
  });
}

// ---------- Scroll driven background & progress ----------
let scrollScheduled = false;
function updateScrollEffects() {
  scrollScheduled = false;
  const max = docEl.scrollHeight - docEl.clientHeight;
  const scrolled = max > 0 ? docEl.scrollTop / max : 0;
  if (progress) progress.style.width = (scrolled * 100).toFixed(2) + "%";

  const phase = scrolled * Math.PI * 2;
  const sx = 45 + Math.sin(phase) * 14;
  const sy = 45 + Math.cos(phase) * 14;
  docEl.style.setProperty("--sx", `${sx.toFixed(2)}%`);
  docEl.style.setProperty("--sy", `${sy.toFixed(2)}%`);
}
function requestScrollEffects() {
  if (scrollScheduled) return;
  scrollScheduled = true;
  requestAnimationFrame(updateScrollEffects);
}
window.addEventListener("scroll", requestScrollEffects, { passive: true });
updateScrollEffects();

// ---------- Navigation hover ripple & follow ----------
navLinks.forEach((link) => {
  link.dataset.text = link.textContent?.trim() || "";
});
const navStates = new WeakMap();
function ensureNavState(link) {
  if (!navStates.has(link)) {
    navStates.set(link, { tx: 0, ty: 0, targetTx: 0, targetTy: 0, rafId: null });
  }
  return navStates.get(link);
}
function animateLink(link) {
  const state = ensureNavState(link);
  const ease = prefersReducedMotion ? 1 : 0.18;
  state.tx += (state.targetTx - state.tx) * ease;
  state.ty += (state.targetTy - state.ty) * ease;
  link.style.setProperty("--tx", `${state.tx.toFixed(2)}px`);
  link.style.setProperty("--ty", `${state.ty.toFixed(2)}px`);
  const stillAnimating = !prefersReducedMotion && (Math.abs(state.targetTx - state.tx) > 0.1 || Math.abs(state.targetTy - state.ty) > 0.1);
  if (stillAnimating) {
    state.rafId = requestAnimationFrame(() => animateLink(link));
  } else {
    state.rafId = null;
    if (prefersReducedMotion) {
      link.style.setProperty("--tx", "0px");
      link.style.setProperty("--ty", "0px");
    }
  }
}
navLinks.forEach((link) => {
  link.addEventListener("mousemove", (event) => {
    const rect = link.getBoundingClientRect();
    const mx = ((event.clientX - rect.left) / rect.width) * 100;
    const my = ((event.clientY - rect.top) / rect.height) * 100;
    link.style.setProperty("--mx", `${mx}%`);
    link.style.setProperty("--my", `${my}%`);

    const state = ensureNavState(link);
    if (prefersReducedMotion) {
      state.targetTx = 0;
      state.targetTy = 0;
    } else {
      state.targetTx = ((mx - 50) / 50) * 6;
      state.targetTy = ((my - 50) / 50) * 6;
    }
    if (!state.rafId) state.rafId = requestAnimationFrame(() => animateLink(link));
  });
  link.addEventListener("mouseleave", () => {
    link.style.removeProperty("--mx");
    link.style.removeProperty("--my");
    const state = ensureNavState(link);
    state.targetTx = 0;
    state.targetTy = 0;
    if (!state.rafId && !prefersReducedMotion) {
      state.rafId = requestAnimationFrame(() => animateLink(link));
    } else if (prefersReducedMotion) {
      link.style.setProperty("--tx", "0px");
      link.style.setProperty("--ty", "0px");
    }
  });
});

// ---------- Smooth anchor scroll ----------
$$('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (event) => {
    const id = anchor.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  });
});

// ---------- Section tone / nav highlight / header visibility ----------
let currentTone = bodyEl.dataset.tone || "deep";
let currentEffect = bodyEl.dataset.effect || "none";
let ctrlState = "burger";
let revertTimer;
const supportsScrollEnd = "onscrollend" in window;
let leftIntroOnce = false;

setHeaderVisible(false);

function setHeaderVisible(visible) {
  if (!header) return;
  header.classList.toggle("header--visible", visible);
  header.classList.toggle("header--hidden", !visible);
  header.setAttribute("aria-hidden", String(!visible));
  header.toggleAttribute("inert", !visible);
}
function setTone(tone) {
  if (!tone || tone === currentTone) return;
  currentTone = tone;
  bodyEl.setAttribute("data-tone", tone);
}
function setEffect(effect) {
  const desired = effect || "none";
  if (desired === currentEffect) return;
  currentEffect = desired;
  bodyEl.setAttribute("data-effect", desired);
}
function setCtrlState(state) {
  if (!ctrlFab) return;
  if (ctrlState === state) return;
  ctrlState = state;
  ctrlFab.classList.toggle("is-burger", state === "burger");
  ctrlFab.classList.toggle("is-arrow", state === "arrow");
  ctrlFab.setAttribute("aria-expanded", String(state === "arrow"));
  ctrlFab.setAttribute("aria-label", state === "arrow" ? "Wróć do sekcji intro" : "Przejdź do sekcji głównej");
}
function clearRevertTimer() {
  if (revertTimer) {
    clearTimeout(revertTimer);
    revertTimer = undefined;
  }
}
function scheduleBurgerReset() {
  clearRevertTimer();
  if (supportsScrollEnd) {
    const onEnd = () => {
      setCtrlState("burger");
      window.removeEventListener("scrollend", onEnd);
    };
    window.addEventListener("scrollend", onEnd, { once: true });
  } else {
    revertTimer = window.setTimeout(() => {
      setCtrlState("burger");
      revertTimer = undefined;
    }, 460);
  }
}

const sections = $$("main > section");
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) {
      if (entry.target === hero) {
        setHeaderVisible(false);
        if (!atIntro()) setCtrlState("burger");
      }
      return;
    }
    const target = entry.target;
    const id = target.id;

    const nav = navLinks.find((link) => link.getAttribute("href") === `#${id}`);
    if (nav) {
      navLinks.forEach((link) => link.classList.remove("active"));
      nav.classList.add("active");
    }

    setTone(target.dataset.tone);
    setEffect(target.dataset.effect);

    if (target === hero) {
      leftIntroOnce = true;
      setHeaderVisible(true);
      setCtrlState("arrow");
    }
    if (target === intro) {
      setCtrlState("burger");
    }
  });
}, { rootMargin: "-55% 0% -35% 0%" });
sections.forEach((section) => sectionObserver.observe(section));

// Reveal animations
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$("[data-animate]").forEach((el) => revealObserver.observe(el));

// ---------- Intro & HERO flow control ----------
function atIntro() {
  if (!intro) return false;
  const rect = intro.getBoundingClientRect();
  return rect.top >= -1 && rect.bottom > window.innerHeight / 2;
}
function atHeroTop() {
  if (!hero) return false;
  const top = hero.getBoundingClientRect().top;
  return top > -2 && top < 2;
}
function goIntro() {
  intro?.scrollIntoView({ behavior: "smooth", block: "start" });
}
function goHero() {
  hero?.scrollIntoView({ behavior: "smooth", block: "start" });
}
let introJumping = false;
function jumpToHero() {
  if (introJumping) return;
  introJumping = true;
  setCtrlState("arrow");
  goHero();
  window.setTimeout(() => { introJumping = false; }, prefersReducedMotion ? 200 : 520);
}

const wheelOptions = { passive: false };
window.addEventListener("wheel", (event) => {
  if (leftIntroOnce && atHeroTop() && event.deltaY < 0) {
    event.preventDefault();
    return;
  }
  if (event.deltaY > 0 && atIntro()) {
    event.preventDefault();
    jumpToHero();
  }
}, wheelOptions);

const pointerOptions = { passive: false };
window.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || !event.isPrimary) return;
  if (!atIntro()) return;
  if (ctrlFab && event.target instanceof Element && ctrlFab.contains(event.target)) return;
  event.preventDefault();
  jumpToHero();
}, pointerOptions);

window.addEventListener("keydown", (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key;
  if (leftIntroOnce && atHeroTop() && (key === "ArrowUp" || key === "PageUp" || key === "Home")) {
    event.preventDefault();
    return;
  }
  const triggerKeys = [" ", "Spacebar", "Space", "Enter", "ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "PageDown"];
  if (atIntro() && triggerKeys.includes(key)) {
    event.preventDefault();
    jumpToHero();
  }
});

// ---------- Control FAB ----------
ctrlFab?.addEventListener("click", (event) => {
  event.preventDefault();
  if (ctrlState === "burger") {
    setCtrlState("arrow");
    jumpToHero();
  } else {
    goIntro();
    scheduleBurgerReset();
  }
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
cvForm?.addEventListener("submit", (event) => {
  event.preventDefault();
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
    message ? `\nWiadomość:\n${message}` : ""
  ].join("\n");

  const mailto = `mailto:marek@grvbowski.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;
});

// ---------- Year ----------
const yearEl = $("#year");
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// ---------- Utility exposure (for debugging) ----------
window.__grv = {
  goIntro,
  goHero,
  atIntro,
  atHeroTop
};
