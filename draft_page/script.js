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
$$(".nav a").forEach((link) => {
  link.addEventListener("mousemove", (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mx", x + "%");
    e.currentTarget.style.setProperty("--my", y + "%");
  });
  link.addEventListener("mouseleave", (e) => {
    e.currentTarget.style.removeProperty("--mx");
    e.currentTarget.style.removeProperty("--my");
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
