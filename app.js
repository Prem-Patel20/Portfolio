// app.js
/**
 * Personal Portfolio Site Script
 *
 * Author: Prem Patel
 * Date: January 23, 2026
 * Description: Handles theme toggling, modal interactions,
 *              Salesforce Web-to-Lead form submission,
 *              certification filtering, typing animation,
 *              scroll reveal effects, and navigation behavior.
 */

// -----------------------------
// DOM helpers (safe bindings)
// -----------------------------
const $ = (id) => document.getElementById(id);
const on = (el, evt, handler, options) => {
  if (!el) return;
  el.addEventListener(evt, handler, options);
};


// -----------------------------
// Theme toggle
// -----------------------------

const themeToggle = $('themeToggle');
const themeIcon = $('themeIcon');

// --- Force correct scroll on load (prevents refresh/back restoring mid-scroll)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

window.addEventListener('load', () => {
  // Only force top if user didn't open with a hash like #about
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
});

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  } else {
    document.body.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  }
}

const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}

on(themeToggle, 'click', () => {
  const isDark = document.body.classList.toggle('dark');
  const next = isDark ? 'dark' : 'light';
  localStorage.setItem('theme', next);
  applyTheme(next);
});

// -----------------------------
// Modal helpers
// -----------------------------
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Close when clicking backdrop or close buttons
document.addEventListener('click', (e) => {
  const closeId = e.target?.closest?.('[data-close]')?.getAttribute('data-close');
  if (closeId) closeModal(closeId);

  const backdrop = e.target?.classList?.contains('modalBackdrop') ? e.target : null;
  if (backdrop?.id) closeModal(backdrop.id);
});

// Esc closes any open modal
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modalBackdrop.open').forEach((b) => closeModal(b.id));
});

// -----------------------------
// Salesforce Web-to-Lead (no redirect + glass success modal)
// -----------------------------
async function handleWebToLead(event) {
  event.preventDefault();

  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const fullNameEl = form.querySelector('#full_name');
  const emailEl = form.querySelector('#email');

  const fullName = (fullNameEl?.value || '').trim();
  const email = (emailEl?.value || '').trim();

  // Basic guard (required attrs should handle most cases)
  if (!fullName || !email) {
    alert('Please fill out your name and email.');
    return;
  }

  // Split "Full Name" into First + Last (Salesforce requires Last Name)
  const parts = fullName.split(/\s+/).filter(Boolean);
  const first = parts[0] || '';
  const last = parts.length > 1 ? parts.slice(1).join(' ') : 'Unknown';

  // Populate hidden SF fields
  const sfName = form.querySelector('#sf_name');
  const firstName = form.querySelector('#first_name');
  const lastName = form.querySelector('#last_name');
  const company = form.querySelector('#company');

  if (sfName) sfName.value = fullName;
  if (firstName) firstName.value = first;
  if (lastName) lastName.value = last;
  if (company) company.value = 'Portfolio';

  const submitBtn = form.querySelector('#contactSubmitBtn');
  const originalBtnText = submitBtn?.textContent || '';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
  }

  try {
    // Salesforce Web-to-Lead does not send CORS headers.
    // no-cors allows the request to be sent; we can't read the response.
    const body = new URLSearchParams(new FormData(form));
    await fetch(form.action, { method: 'POST', mode: 'no-cors', body });

    // UX: clear + show success modal
    form.reset();
    openModal('contactSuccessBackdrop');
  } catch (err) {
    console.error('Web-to-Lead submission failed:', err);
    alert('Sorry — something went wrong submitting the form. Please try again.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText || 'Send Message';
    }
  }
}

// -----------------------------
// Buttons to open modals
// -----------------------------
on($('trailheadBtn'), 'click', () => openModal('trailheadBackdrop'));
on($('certBtn'), 'click', () => openModal('certBackdrop'));
on($('openCertsFromAbout'), 'click', () => openModal('certBackdrop'));

// Mobile menu open
on($('mobileMenuBtn'), 'click', () => openModal('mobileMenuBackdrop'));

// -----------------------------
// Certifications data + filtering
// -----------------------------
const certs = [
   // ADMIN
  { name: 'SF Certified Platform Administrator', group: 'admin', img: 'assets/badges/admin.png', issued: 'December 2022' },
  { name: 'SF Certified Platform Administrator II', group: 'admin', img: 'assets/badges/admin2.png', issued: 'May 2025' },
  { name: 'SF Certified Platform App Builder', group: 'admin', img: 'assets/badges/appbuilder.png', issued: 'January 2023' },

  // CONSULTANT
  { name: 'SF Certified Sales Cloud Consultant', group: 'consultant', img: 'assets/badges/salescloud.png', issued: 'December 2023' },
  { name: 'SF Certified Service Cloud Consultant', group: 'consultant', img: 'assets/badges/servicecloud.png', issued: 'July 2023' },
  { name: 'SF Certified Field Service Consultant', group: 'consultant', img: 'assets/badges/fieldservice.png', issued: 'December 2023' },
  { name: 'SF Certified Experience Cloud Consultant', group: 'consultant', img: 'assets/badges/experiencecloud.png', issued: 'November 2024' },
  { name: 'SF Certified Data Cloud Consultant', group: 'consultant', img: 'assets/badges/datacloud.png', issued: 'February 2024' },
  { name: 'SF Certified Business Analyst', group: 'consultant', img: 'assets/badges/businessanalyst.png', issued: 'June 2025',colorOverride: 'admin'},

  // DEVELOPER
  { name: 'SF Certified Platform Developer', group: 'dev', img: 'assets/badges/pd1.png', issued: 'May 2023' },
  { name: 'SF Certified JavaScript Developer', group: 'dev', img: 'assets/badges/jsd1.png', issued: 'Feb 2026' },
  { name: 'SF Certified Agentforce Specialist', group: 'dev', img: 'assets/badges/agentforce.png', issued: 'September 2024' },

  // ASSOCIATE ✅
  { name: 'SF Certified AI Associate', group: 'associate', img: 'assets/badges/aiassociate.png', issued: 'September 2023' },
  { name: 'SF Certified Marketing Cloud Engagement Foundations', group: 'associate', img: 'assets/badges/marketingfoundations.png', issued: 'June 2024' },
  { name: 'SF Certified Sales Foundations', group: 'associate', img: 'assets/badges/salesfoundations.png', issued: 'November 2023' },
  { name: 'SF Certified Platform Foundations', group: 'associate', img: 'assets/badges/platformfoundations.png', issued: 'April 2023' },

  // COPADO (optional)
  { name: 'Copado Fundamentals I - Source Format Pipeline', group: 'copado', img: 'assets/badges/Copado1.png', issued: 'November 2025' },
  { name: 'Copado Fundamentals II - Source Format Pipeline', group: 'copado', img: 'assets/badges/Copado2.png', issued: 'November 2025' }
];

const badgeGrid = $('badgeGrid');
const chipButtons = document.querySelectorAll('.chip');

function renderCerts(filter) {
  if (!badgeGrid) return;
  // fade out first
  badgeGrid.classList.add('is-fading');

  // wait for the fade-out to complete, then swap content, then fade back in
  setTimeout(() => {
    badgeGrid.innerHTML = '';

    const list = certs.filter(c => (filter === 'all' ? true : c.group === filter));

    list.forEach((c) => {
      const div = document.createElement('div');
      const colorClass = c.colorOverride ? `cert-${c.colorOverride}` : `cert-${c.group}`;
      div.className = `badge card-hover ${colorClass}`;

      div.innerHTML = `
      <img class="badgeImg" src="${c.img}" alt="${c.name}">
      <div class="badgeOverlay">
        <div class="badgeTitle">${c.name}</div>
        <div class="badgeIssued">Issued ${c.issued}</div>
      </div>
    `;

      badgeGrid.appendChild(div);
    });

    // force reflow so the browser “sees” the new DOM before we fade back in
    badgeGrid.offsetHeight;

    // fade in
    badgeGrid.classList.remove('is-fading');
  }, 180); // match your CSS transition time (.18s)
}

chipButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    chipButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderCerts(btn.dataset.tab);
  });
});

// initial cert render
if (badgeGrid) renderCerts('all');

// -----------------------------
// Fake Trailhead stats (edit these)
// -----------------------------
/*document.getElementById('rankValue').textContent = 'All Star Ranger';
document.getElementById('pointsValue').textContent = '428,300';
document.getElementById('trailsValue').textContent = '72';
document.getElementById('certCountValue').textContent = '15'; //String(certs.length);*/

// -----------------------------
// Typing animation (Hero subtitle)
// -----------------------------
(() => {
  const typingEl = $('typingText');
  const prefixEl = $('typingPrefix');

  // If the hero typing elements aren't present on the page, skip this feature safely.
  if (!typingEl || !prefixEl) return;


const typingWords = [
  { word: 'Innovator.', prefix: "I’m an " },
  { word: 'Developer.', prefix: "I’m a " },
  { word: 'Administrator.', prefix: "I’m an " },
  { word: 'Consultant.', prefix: "I’m a " },
  { word: 'Engineer.', prefix: "I'm an "},
  { word: 'Analyst. ', prefix: "I'm an "},
  { word: 'Trailblazer.', prefix: "I'm a "},
   { word: 'Tech Enthusiast.', prefix: "I’m a " },
  { word: 'Collaborator.', prefix: "I’m a " },
  { word: 'Problem Solver.', prefix: "I’m a " },
  { word: 'Team Player.', prefix: "I’m a " }

];

const typeSpeed = 150;
const deleteSpeed = 45;
const holdAfterType = 950;
const holdAfterDelete = 250;

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function tickTyping() {
  const current = typingWords[wordIndex];
  prefixEl.textContent = current.prefix;

  const full = current.word;

  if (!isDeleting) {
    charIndex++;
    typingEl.textContent = full.substring(0, charIndex);

    if (charIndex === full.length) {
      isDeleting = true;
      setTimeout(tickTyping, holdAfterType);
      return;
    }
    setTimeout(tickTyping, typeSpeed);
  } else {
    charIndex--;
    typingEl.textContent = full.substring(0, charIndex);

    if (charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % typingWords.length;
      setTimeout(tickTyping, holdAfterDelete);
      return;
    }
    setTimeout(tickTyping, deleteSpeed);
  }
}
tickTyping();
})();

// -----------------------------
// Reveal on scroll
// -----------------------------
const revealEls = document.querySelectorAll('.reveal');

// Guard for older browsers/environments
if (revealEls.length && 'IntersectionObserver' in window) {
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('active');
  });
}, { threshold: 0.12 });

revealEls.forEach((el) => io.observe(el));
}



// NAV collapse/expand toggle (no forced scroll)
// NAV: click-toggle + auto collapse on scroll down + auto expand at top
// NAV: expanded on load + click toggle + auto collapse on scroll down + expand at top
// -----------------------------
(() => {
  const navPill = document.querySelector('.navPill');
  const logo = document.getElementById('navToggleLogo');
  if (!navPill || !logo) return;

  const COLLAPSE_AFTER_PX = 120;

  const isCollapsed = () => navPill.classList.contains('is-collapsed');
  const setCollapsed = (collapsed) => navPill.classList.toggle('is-collapsed', collapsed);

  // Pause auto-collapse while we do a programmatic smooth scroll
  let suspendAutoCollapseUntil = 0;
  const suspendAutoCollapse = (ms = 800) => {
    suspendAutoCollapseUntil = Date.now() + ms;
  };

  // Start expanded
  setCollapsed(false);

  // Click PP: toggle ONLY, never scroll to #home
  logo.addEventListener('click', (e) => {
    e.preventDefault();
    setCollapsed(!isCollapsed());
  });

  // Auto behavior on scroll (unless suspended)
  window.addEventListener(
    'scroll',
    () => {
      if (Date.now() < suspendAutoCollapseUntil) return;

      const y = window.scrollY;

      // Expand at very top
      if (y <= 2) {
        if (isCollapsed()) setCollapsed(false);
        return;
      }

      // Collapse after threshold
      if (y >= COLLAPSE_AFTER_PX) {
        if (!isCollapsed()) setCollapsed(true);
      }
    },
    { passive: true }
  );

  // ----- Smooth scroll with correct offset -----
  const offset = () => (navPill?.getBoundingClientRect().height || 60) + 24;

  const scrollToHash = (hash) => {
    const id = (hash || '#home').replace('#', '');
    const el = document.getElementById(id);
    if (!el) return;

    const y = el.getBoundingClientRect().top + window.pageYOffset - offset();
    window.scrollTo({ top: y, behavior: 'smooth' });
  };

  document.querySelectorAll('a.navLink, a.mobileNavLink').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;

      e.preventDefault();

      // ✅ keep nav OPEN when navigating
      setCollapsed(false);

      // ✅ prevent scroll listener from collapsing during smooth scroll
      suspendAutoCollapse(900);



      // ✅ close mobile menu after selecting a link
      if (a.classList.contains('mobileNavLink')) {
        closeModal('mobileMenuBackdrop');
      }
      history.pushState(null, '', href);
      scrollToHash(href);
    });
  });

  // If user loads page with #hash, scroll with correct offset (and don't collapse)


  // Keep mobile menu from getting "stuck" open when rotating / resizing
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) {
      closeModal('mobileMenuBackdrop');
    }
  });
  window.addEventListener('load', () => {
    if (window.location.hash) {
      setCollapsed(false);
      suspendAutoCollapse(900);
      scrollToHash(window.location.hash);
    }
  });
})();


// =============================
// Open to Work toggle
// =============================
// Single source of truth for your availability pill.
// Toggle this to control both styles + text in the HERO pill.
const OPEN_TO_WORK = true; // 🔁 set to false when not open

(() => {
  const pill = document.getElementById('workStatusPill');
  if (!pill) return;

  const text = pill.querySelector('.workStatusText');

  if (OPEN_TO_WORK) {
    // Default state
    pill.classList.remove('not-open');
    if (text) text.textContent = 'Open to Work';
  } else {
    // Inactive state
    pill.classList.add('not-open');
    if (text) text.textContent = 'Not Open to Work';
  }
})();
// -----------------------------
// Work pill click-collapse
// ----------------------------- 
/*
(() => {
  const pill = document.getElementById('workPill');
  if (!pill) return;

  pill.addEventListener('click', () => {
    pill.classList.toggle('is-collapsed');
  });
})();
*/

// -----------------------------
// Open to Work pill: click collapse + hover auto-pin
// -----------------------------
(() => {
  const pill = document.getElementById('workStatusPill');
  if (!pill) return;

  const COLLAPSED = 'is-collapsed';

  // Hover = expand + pin
  pill.addEventListener('mouseenter', () => {
    pill.classList.remove(COLLAPSED);
  });

  // Click toggles collapse
  pill.addEventListener('click', () => {
    pill.classList.toggle(COLLAPSED);
  });
})();
