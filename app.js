// app.js
/**
 * Personal Portfolio Site Script
 *
 * Author: Prem Patel
 * Last Updated: May 2026
 * Description: Handles theme toggling, animated sidebar collapse,
 *              modal interactions, Salesforce Web-to-Lead form submission,
 *              certification filtering with fade animation, typing animation,
 *              scroll reveal effects, active nav highlighting, and
 *              mobile bottom navigation behavior.
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
  } else {
    document.body.classList.remove('dark');
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

  // Spin the icon
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.classList.remove('theme-spinning');
    void icon.offsetWidth; // force reflow to restart animation
    icon.classList.add('theme-spinning');
    icon.addEventListener('animationend', () => icon.classList.remove('theme-spinning'), { once: true });
  }
});

// -----------------------------
// Modal helpers
// -----------------------------
// Remember what had focus before a modal opened, so we can restore it on close
let lastFocusedEl = null;

function getFocusable(el) {
  return [...el.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )].filter(n => {
    // skip elements explicitly hidden
    if (n.hasAttribute('hidden')) return false;
    const style = (typeof window !== 'undefined' && window.getComputedStyle) ? window.getComputedStyle(n) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    return true;
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  lastFocusedEl = document.activeElement;
  el.classList.add('open');
  el.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // Move focus into the modal (first focusable element, or the modal itself)
  const focusables = getFocusable(el);
  if (focusables[0]) {
    focusables[0].focus();
  } else {
    el.setAttribute('tabindex', '-1');
    el.focus();
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // Restore focus to whatever opened the modal
  if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
    lastFocusedEl.focus();
    lastFocusedEl = null;
  }
}

// Close when clicking backdrop or close buttons
document.addEventListener('click', (e) => {
  const closeId = e.target?.closest?.('[data-close]')?.getAttribute('data-close');
  if (closeId) closeModal(closeId);

  const backdrop = e.target?.classList?.contains('modalBackdrop') ? e.target : null;
  if (backdrop?.id) closeModal(backdrop.id);
});

// Keyboard: Esc closes any open modal; Tab is trapped inside it
document.addEventListener('keydown', (e) => {
  const openBackdrop = document.querySelector('.modalBackdrop.open');

  if (e.key === 'Escape' && openBackdrop) {
    closeModal(openBackdrop.id);
    return;
  }

  if (e.key === 'Tab' && openBackdrop) {
    const focusables = getFocusable(openBackdrop);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
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

  // Reject overly long input
  if (fullName.length > 120 || email.length > 254) {
    alert('Please shorten your name or email and try again.');
    return;
  }

  // Check email format (Salesforce still validates server-side)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
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
  { name: 'SF Certified Javascript Developer', group: 'dev', img: 'assets/badges/jsd1.png', issued: 'February 2026' },
  { name: 'SF Certified Agentforce Specialist', group: 'dev', img: 'assets/badges/agentforce.png', issued: 'September 2024' },

  // ASSOCIATE
  { name: 'SF Certified AI Associate (Retired)', group: 'associate', img: 'assets/badges/aiassociate.png', issued: 'September 2023' },
  { name: 'SF Certified Marketing Cloud Engagement Foundations', group: 'associate', img: 'assets/badges/marketingfoundations.png', issued: 'June 2024' },
  { name: 'SF Certified Sales Foundations', group: 'associate', img: 'assets/badges/salesfoundations.png', issued: 'November 2023' },
  { name: 'SF Certified Platform Foundations', group: 'associate', img: 'assets/badges/platformfoundations.png', issued: 'April 2023' },

  // COPADO (optional)
  { name: 'Copado Fundamentals I - Source Format Pipeline', group: 'copado', img: 'assets/badges/Copado1.png', issued: 'November 2025' },
  { name: 'Copado Fundamentals II - Source Format Pipeline', group: 'copado', img: 'assets/badges/Copado2.png', issued: 'November 2025' },
  { name: 'Copado AI', group: 'copado', img: 'assets/badges/CopadoAI.png', issued: 'March 2026' }
];

const badgeGrid = $('badgeGrid');
const chipButtons = document.querySelectorAll('.chip');

function renderCerts(filter) {
  if (!badgeGrid) return;
  // fade out first
  badgeGrid.classList.add('is-fading');

  // wait for the fade-out to complete, then swap content, then fade back in
  setTimeout(() => {
    // clear old badges
    badgeGrid.replaceChildren();

    const list = certs.filter(c => (filter === 'all' ? true : c.group === filter));

    list.forEach((c) => {
      const div = document.createElement('div');
      const colorClass = c.colorOverride ? `cert-${c.colorOverride}` : `cert-${c.group}`;
      div.className = `badge card-hover ${colorClass}`;

      // build with textContent so values render as text, not HTML
      const img = document.createElement('img');
      img.className = 'badgeImg';
      img.setAttribute('src', c.img);
      img.setAttribute('alt', c.name);

      const overlay = document.createElement('div');
      overlay.className = 'badgeOverlay';

      const title = document.createElement('div');
      title.className = 'badgeTitle';
      title.textContent = c.name;

      const issued = document.createElement('div');
      issued.className = 'badgeIssued';
      issued.textContent = `Issued ${c.issued}`;

      overlay.appendChild(title);
      overlay.appendChild(issued);
      div.appendChild(img);
      div.appendChild(overlay);
      badgeGrid.appendChild(div);
    });

    // force reflow so the browser sees the new DOM before we fade back in
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
  { word: 'Analyst.', prefix: "I'm an "},
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






// =============================
// Open to Work toggle
// =============================
// Single source of truth for your availability pill.
// Toggle this to control both styles + text in the HERO pill.
const OPEN_TO_WORK = true; // set to false when not open

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


// -----------------------------
// Open to Work pill: starts as dot, hover pins, click collapses
// -----------------------------
(() => {
  const wrap = document.getElementById('workStatusWrap');
  const pill = document.getElementById('workStatusPill');
  if (!wrap || !pill) return;

  const EXPANDED = 'is-expanded';

  // Hover = expand and stay
  wrap.addEventListener('mouseenter', () => {
    pill.classList.add(EXPANDED);
  });

  // Click = collapse back to dot
  pill.addEventListener('click', () => {
    pill.classList.remove(EXPANDED);
  });
})();

// ─── Sidebar: active link highlight on scroll ───
(() => {
  const links = document.querySelectorAll('.sideLink');
  if (!links.length) return;

  const sections = [...links].map(l => {
    const id = (l.getAttribute('href') || '').replace('#', '');
    return document.getElementById(id);
  }).filter(Boolean);

  const onScroll = () => {
    // Find the section whose top is closest to (but still above) 40% of viewport height
    const threshold = window.innerHeight * 0.4;
    let current = sections[0]?.id || '';
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= threshold) current = sec.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ─── Sidebar: smooth scroll with section offset ───
(() => {
  document.querySelectorAll('a.sideLink').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      e.preventDefault();
      const el = document.getElementById(href.replace('#', ''));
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset - 24, behavior: 'smooth' });
      history.pushState(null, '', href);
    });
  });
})();


// ─── Animated Sidebar Collapse ───
(() => {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('sideCollapseBtn');
  const mainContent = document.querySelector('.mainContent');
  if (!sidebar || !btn) return;

  const STORAGE_KEY = 'sidebarCollapsed';
  const COLLAPSED = 'collapsed';

  const setCollapsed = (collapsed) => {
    sidebar.classList.toggle(COLLAPSED, collapsed);
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    btn.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  };

  // Restore saved state
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === '1') setCollapsed(true);

  btn.addEventListener('click', () => {
    setCollapsed(!sidebar.classList.contains(COLLAPSED));
  });
})();


// ─── Bottom Nav: active highlight + smooth scroll ───
(() => {
  const bottomItems = document.querySelectorAll('.bottomNavItem[data-section]');
  if (!bottomItems.length) return;

  const sections = [...bottomItems].map(b => document.getElementById(b.dataset.section)).filter(Boolean);

  // Smooth scroll on tap
  bottomItems.forEach(item => {
    item.addEventListener('click', e => {
      const href = item.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      const target = document.getElementById(href.replace('#', ''));
      if (!target) return;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 72, behavior: 'smooth' });
      history.pushState(null, '', href);
    });
  });

  // Active state on scroll
  const onScroll = () => {
    const threshold = window.innerHeight * 0.4;
    let current = sections[0]?.id || '';
    sections.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= threshold) current = sec.id;
    });
    bottomItems.forEach(item => {
      item.classList.toggle('active', item.dataset.section === current);
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

// ─── Full-page scroll snap: card visibility transitions ───
(() => {
  const main = document.getElementById('mainContent');
  const sections = document.querySelectorAll('.section');
  if (!main || !sections.length) return;

  // Use IntersectionObserver on mainContent as root
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('snap-visible');
      }
    });
  }, {
    root: main,
    threshold: 0.15
  });

  sections.forEach(s => io.observe(s));

  // Re-wire sidebar nav clicks to scroll mainContent instead of window
  document.querySelectorAll('a.sideLink').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
      e.preventDefault();
      e.stopImmediatePropagation(); // override the earlier listener
      const target = document.getElementById(href.replace('#', ''));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth' });
      history.pushState(null, '', href);
    });
  });

  // Re-wire mobile bottom nav clicks to scroll mainContent
  document.querySelectorAll('.bottomNavItem[data-section]').forEach(item => {
    item.addEventListener('click', e => {
      const href = item.getAttribute('href');
      if (!href || !href.startsWith('#')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const target = document.getElementById(href.replace('#', ''));
      if (!target) return;
      target.scrollIntoView({ behavior: 'smooth' });
      history.pushState(null, '', href);
    });
  });

  // Re-wire sidebar active highlight to use mainContent scroll
  const links = document.querySelectorAll('.sideLink');
  const sectionList = [...links].map(l => {
    const id = (l.getAttribute('href') || '').replace('#', '');
    return document.getElementById(id);
  }).filter(Boolean);

  main.addEventListener('scroll', () => {
    const threshold = main.clientHeight * 0.4;
    let current = sectionList[0]?.id || '';
    sectionList.forEach(sec => {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= threshold) current = sec.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === '#' + current);
    });
  }, { passive: true });
})();

// ─── Scroll Progress Bar ───
(() => {
  const bar = document.getElementById('scrollProgress');
  const main = document.getElementById('mainContent');
  if (!bar || !main) return;

  main.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = main;
    const pct = (scrollTop / (scrollHeight - clientHeight)) * 100;
    bar.style.width = pct + '%';
  }, { passive: true });
})();

// ─── Floating avatar: smoothly interpolates between Home and About ───
(() => {
  const main = document.getElementById('mainContent');
  const floatingAvatar = document.getElementById('floatingAvatar');
  const homeSection = document.getElementById('home');
  const aboutSection = document.getElementById('about');
  if (!main || !floatingAvatar || !homeSection || !aboutSection) return;

  const homePlaceholder = document.getElementById('heroAvatarWrap')?.querySelector('.avatarRingPlaceholder');
  const aboutPlaceholder = document.getElementById('aboutAvatarPlaceholder');
  if (!homePlaceholder || !aboutPlaceholder) return;

  // Disable CSS transition — we interpolate manually each frame
  floatingAvatar.style.transition = 'none';
  floatingAvatar.style.opacity = '1';

  function lerp(a, b, t) { return a + (b - a) * t; }

  function update() {
    const homeRect = homeSection.getBoundingClientRect();
    const aboutRect = aboutSection.getBoundingClientRect();
    const vh = main.clientHeight;

    // progress: 0 = fully on home, 1 = fully on about
    const progress = Math.max(0, Math.min(1, -homeRect.top / vh));

    const hRect = homePlaceholder.getBoundingClientRect();
    const aRect = aboutPlaceholder.getBoundingClientRect();

    const top    = lerp(hRect.top,    aRect.top,    progress);
    const left   = lerp(hRect.left,   aRect.left,   progress);
    const width  = lerp(hRect.width,  aRect.width,  progress);
    const height = lerp(hRect.height, aRect.height, progress);

    floatingAvatar.style.top    = top + 'px';
    floatingAvatar.style.left   = left + 'px';
    floatingAvatar.style.width  = width + 'px';
    floatingAvatar.style.height = height + 'px';

    // Hide when scrolled past About
    const pastAbout = aboutRect.bottom < 0;
    const beforeHome = homeRect.top > vh;
    floatingAvatar.style.opacity = (pastAbout || beforeHome) ? '0' : '1';

    requestAnimationFrame(update);
  }

  // Set initial position instantly
  const hRect = homePlaceholder.getBoundingClientRect();
  floatingAvatar.style.top    = hRect.top + 'px';
  floatingAvatar.style.left   = hRect.left + 'px';
  floatingAvatar.style.width  = hRect.width + 'px';
  floatingAvatar.style.height = hRect.height + 'px';

  requestAnimationFrame(update);
})();

// -----------------------------
// Mobile header buttons (moved out of inline script for CSP)
// -----------------------------
(() => {
  on($('trailheadBtnMobile'), 'click', () => openModal('trailheadBackdrop'));
  on($('certBtnMobile'), 'click', () => openModal('certBackdrop'));

  const tmMobile = $('themeToggleMobile');
  on(tmMobile, 'click', () => {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    const iconMobile = $('themeIconMobile');
    if (iconMobile) {
      iconMobile.classList.remove('theme-spinning');
      void iconMobile.offsetWidth;
      iconMobile.classList.add('theme-spinning');
      on(iconMobile, 'animationend', () => iconMobile.classList.remove('theme-spinning'), { once: true });
    }
  });
})();

// -----------------------------
// Modal triggers (data-open-modal) + contact form binding
// -----------------------------
(() => {
  document.querySelectorAll('[data-open-modal]').forEach((el) => {
    on(el, 'click', () => openModal(el.getAttribute('data-open-modal')));
  });
  on($('contactForm'), 'submit', handleWebToLead);
})();
