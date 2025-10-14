// ---------- Small helpers ----------
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

// ---------- Progress & parallax ----------
const progress = $("#progress");
const bg = $(".bg");

function onScroll() {
  const h = document.documentElement;
  const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
  if (progress) progress.style.width = (scrolled * 100).toFixed(2) + "%";

  // subtle parallax
  if (bg) bg.style.transform = `translate3d(0, ${window.scrollY * -0.08}px, 0)`;

  // sticky header state
  const header = $("#siteHeader");
  if (header) header.classList.toggle("scrolled", window.scrollY > 10);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// ---------- Intersection: reveal + nav highlight + tone ----------
const sections = $$("main > section");
const navLinks = $$("nav a[data-nav]");

const bodyEl = document.body;
const toneObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const id = entry.target.id || "home";
    const nav = navLinks.find(a => a.getAttribute("href") === `#${id}`);
    if (entry.isIntersecting) {
      navLinks.forEach(a => a.classList.remove("active"));
      nav?.classList.add("active");

      // set tone (dark greys shift) based on section attribute
      const tone = entry.target.dataset.tone;
      if (tone) {
        bodyEl.setAttribute("data-tone", tone);
      }
    }
  });
}, { rootMargin: "-55% 0% -35% 0%" });
sections.forEach(s => toneObserver.observe(s));

// reveal
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$("[data-animate]").forEach(el => revealObserver.observe(el));

// smooth scroll for in-page anchors
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

// back to top
$("#backToTop")?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

// ---------- Request CV form (mailto) ----------
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
    message ? `\nWiadomość:\n${message}` : ""
  ].join("\n");

  const mailto = `mailto:marek@grvbowski.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailto;

  // small toast
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = "Dziękuję! Otworzy się wiadomość e‑mail z podsumowaniem.";
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => toast.classList.remove("show"), 2600);
  setTimeout(() => toast.remove(), 3000);
});

// set year
$("#year").textContent = String(new Date().getFullYear());
