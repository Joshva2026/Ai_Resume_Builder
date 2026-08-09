/**
 * MAIN.JS — Landing page interactions + animations
 */

document.addEventListener('DOMContentLoaded', () => {
  initScrollProgress();
  initStickyNav();
  initMobileMenu();
  initFaqAccordion();
  initPricingToggle();
  initHeroGauge();
  initNewsletterForm();
  initCtaConfig();
  initScrollReveal();
  initCounterAnimation();
  initParticles();
  initPageTransitions();
  initBarAnimations();
  checkAuthState();
  if (window.AOS) AOS.init({ once: true, duration: 600, easing: 'ease-out-cubic' });
});

/* ─────────────────────────────────────────────────────────────
   AUTH STATE CHECK
───────────────────────────────────────────────────────────── */
function checkAuthState() {
  if (typeof ApiService === 'undefined') return;
  
  const isAuthenticated = ApiService.isAuthenticated();
  const user = ApiService.getUser();
  
  const guestDesktops = document.getElementById('navGuestActions');
  const userDesktops = document.getElementById('navUserActions');
  const guestMobiles = document.getElementById('mobileGuestActions');
  const userMobiles = document.getElementById('mobileUserActions');
  
  if (isAuthenticated && user) {
    if (guestDesktops) guestDesktops.style.display = 'none';
    if (userDesktops) {
      userDesktops.style.display = 'flex';
      const nameEl = document.getElementById('navUserName');
      if (nameEl) nameEl.textContent = `Welcome, ${user.firstName || user.email.split('@')[0]}`;
    }
    
    if (guestMobiles) guestMobiles.style.display = 'none';
    if (userMobiles) {
      userMobiles.style.display = 'flex';
      const mobileNameEl = document.getElementById('mobileUserName');
      if (mobileNameEl) mobileNameEl.textContent = `Welcome, ${user.firstName || user.email.split('@')[0]}`;
    }
    
    // Bind logout buttons
    document.getElementById('navLogoutBtn')?.addEventListener('click', () => handleLogout());
    document.getElementById('mobileLogoutBtn')?.addEventListener('click', () => handleLogout());
  }
}

async function handleLogout() {
  try {
    await ApiService.auth.logout();
    window.location.reload();
  } catch (err) {
    console.error('Logout failed', err);
    ApiService.clearTokens();
    window.location.reload();
  }
}

/* ─────────────────────────────────────────────────────────────
   SCROLL PROGRESS BAR
───────────────────────────────────────────────────────────── */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = pct + '%';
  }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   STICKY NAV
───────────────────────────────────────────────────────────── */
function initStickyNav() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* ─────────────────────────────────────────────────────────────
   MOBILE MENU
───────────────────────────────────────────────────────────── */
function initMobileMenu() {
  const toggle = document.getElementById('navToggle');
  const close  = document.getElementById('navClose');
  const menu   = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  const open = () => {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };
  const shut = () => {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  toggle.addEventListener('click', open);
  close?.addEventListener('click', shut);
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', shut));
}

/* ─────────────────────────────────────────────────────────────
   FAQ ACCORDION
───────────────────────────────────────────────────────────── */
function initFaqAccordion() {
  document.querySelectorAll('.faq-item .faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.faq-item').forEach(i => i.classList.remove('is-open'));
      if (!wasOpen) item.classList.add('is-open');
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   PRICING TOGGLE
───────────────────────────────────────────────────────────── */
function initPricingToggle() {
  const toggle = document.getElementById('pricingToggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const annual = toggle.classList.toggle('is-annual');
    document.querySelectorAll('.price-amount .num[data-monthly]').forEach(el => {
      const value = annual ? el.dataset.annual : el.dataset.monthly;
      el.style.transition = 'transform 0.2s, opacity 0.2s';
      el.style.opacity = '0';
      el.style.transform = 'translateY(-8px)';
      setTimeout(() => {
        el.textContent = `$${value}`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, 180);
    });
  });
}

/* ─────────────────────────────────────────────────────────────
   HERO GAUGE ARC ANIMATION
───────────────────────────────────────────────────────────── */
function initHeroGauge() {
  const arc = document.getElementById('gaugeArc');
  if (!arc) return;
  const full   = 251;
  const target = full * (1 - 0.92); // 92/100
  arc.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)';
  arc.style.strokeDashoffset = full;
  requestAnimationFrame(() => {
    setTimeout(() => { arc.style.strokeDashoffset = target; }, 400);
  });
}

/* ─────────────────────────────────────────────────────────────
   SCORE BAR ANIMATIONS (triggered when hero visible)
───────────────────────────────────────────────────────────── */
function initBarAnimations() {
  const bars = document.querySelectorAll('.score-row .bar > span');
  if (!bars.length) return;

  const widths = [];
  bars.forEach(bar => widths.push(bar.style.width));
  bars.forEach(bar => { bar.style.width = '0%'; bar.style.transition = 'none'; });

  setTimeout(() => {
    bars.forEach((bar, i) => {
      bar.style.transition = 'width 1.2s cubic-bezier(0.16,1,0.3,1)';
      bar.style.transitionDelay = `${0.8 + i * 0.12}s`;
      bar.style.width = widths[i];
    });
  }, 200);
}

/* ─────────────────────────────────────────────────────────────
   NEWSLETTER FORM
───────────────────────────────────────────────────────────── */
function initNewsletterForm() {
  const form = document.getElementById('newsletterForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.textContent = 'Subscribed ✓';
    btn.disabled = true;
    btn.style.background = 'var(--score-high)';
    showToast('You\'re subscribed! 🎉', 'success');
    form.reset();
    setTimeout(() => {
      btn.textContent = 'Subscribe';
      btn.disabled = false;
      btn.style.background = '';
    }, 3000);
  });
}

/* ─────────────────────────────────────────────────────────────
   CTA CONFIG
───────────────────────────────────────────────────────────── */
function initCtaConfig() {
  const CTA_TARGETS = {
    nav_get_started: 'pages/register.html',
    hero_build_resume: 'pages/register.html',
    pricing_free: 'pages/register.html',
    pricing_pro: 'pages/register.html',
  };

  document.querySelectorAll('.js-cta').forEach(el => {
    const key = el.dataset.cta;
    if (key && CTA_TARGETS[key]) el.setAttribute('href', CTA_TARGETS[key]);
  });
}

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL — IntersectionObserver
───────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const revealEls   = document.querySelectorAll('[data-reveal]');
  const revealGroups = document.querySelectorAll('[data-reveal-group]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => observer.observe(el));
  revealGroups.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────────────────
   COUNTER ANIMATION — stats section
───────────────────────────────────────────────────────────── */
function initCounterAnimation() {
  const statEls = document.querySelectorAll('[data-count]');
  if (!statEls.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el     = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const decimals = (target % 1 !== 0) ? 1 : 0;
        el.classList.add('counted');
        animateCounter(el, 0, target, 1800, decimals, suffix);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => observer.observe(el));
}

function animateCounter(el, from, to, duration, decimals, suffix) {
  const start = performance.now();
  function step(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out
    const eased = 1 - Math.pow(1 - progress, 3);
    const value  = from + (to - from) * eased;
    el.textContent = value.toFixed(decimals) + suffix;
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = to.toFixed(decimals) + suffix;
  }
  requestAnimationFrame(step);
}

/* ─────────────────────────────────────────────────────────────
   HERO 3D SCENE (Three.js)
───────────────────────────────────────────────────────────── */
function initParticles() {
  const hero = document.querySelector('.hero');
  const canvas = document.getElementById('heroCanvas');
  if (!hero || !canvas || !window.THREE) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, hero.offsetWidth / hero.offsetHeight, 0.1, 1000);
  camera.position.z = 30;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(hero.offsetWidth, hero.offsetHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles
  const geometry = new THREE.BufferGeometry();
  const particlesCount = 400;
  const posArray = new Float32Array(particlesCount * 3);

  for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 120;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const material = new THREE.PointsMaterial({
    size: 0.6,
    color: 0x6c5cff,
    transparent: true,
    opacity: 0.8
  });

  const particlesMesh = new THREE.Points(geometry, material);
  scene.add(particlesMesh);

  // Connecting lines
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8b7dff, transparent: true, opacity: 0.15 });
  const linesMesh = new THREE.LineSegments(geometry, lineMaterial);
  scene.add(linesMesh);

  // Animation Loop
  let mouseX = 0;
  let mouseY = 0;
  let targetX = 0;
  let targetY = 0;
  let scrollY = 0;
  
  const windowHalfX = window.innerWidth / 2;
  const windowHalfY = window.innerHeight / 2;
  
  document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX - windowHalfX);
    mouseY = (event.clientY - windowHalfY);
  });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  });

  const clock = new THREE.Clock();
  let animId;

  const tick = () => {
    targetX = mouseX * 0.001;
    targetY = mouseY * 0.001;

    particlesMesh.rotation.y += 0.05 * (targetX - particlesMesh.rotation.y);
    particlesMesh.rotation.x += 0.05 * (targetY - particlesMesh.rotation.x);
    particlesMesh.rotation.z += 0.002;
    
    linesMesh.rotation.y = particlesMesh.rotation.y;
    linesMesh.rotation.x = particlesMesh.rotation.x;
    linesMesh.rotation.z = particlesMesh.rotation.z;

    // Parallax scroll effect
    camera.position.y = -scrollY * 0.015;

    renderer.render(scene, camera);
    animId = window.requestAnimationFrame(tick);
  };
  tick();

  window.addEventListener('resize', () => {
    if (!hero) return;
    camera.aspect = hero.offsetWidth / hero.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(hero.offsetWidth, hero.offsetHeight);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else tick();
  });
}

/* ─────────────────────────────────────────────────────────────
   PAGE TRANSITIONS
───────────────────────────────────────────────────────────── */
function initPageTransitions() {
  // Fade-in on load
  document.body.style.opacity = '0';
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.4s ease';
    document.body.style.opacity = '1';
  });

  // Fade-out on link click (same origin only)
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:') ||
      link.target === '_blank'
    ) return;

    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
    } catch { return; }

    e.preventDefault();
    document.body.style.transition = 'opacity 0.25s ease';
    document.body.style.opacity = '0';
    setTimeout(() => { location.href = href; }, 260);
  });
}

/* ─────────────────────────────────────────────────────────────
   TOAST UTILITY
───────────────────────────────────────────────────────────── */
function showToast(message, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle'}"></i> ${message}`;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 350);
  }, 3500);
}

// Expose globally
window.showToast = showToast;
