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
  initPageTransitions();
  initBarAnimations();
  initCinematicScroll();
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
    
    // Redirect CTAs to dashboard for logged in users
    document.querySelectorAll('.js-cta').forEach(el => {
      el.setAttribute('href', 'pages/dashboard.html');
      if (el.textContent.includes('Start Building') || el.textContent.includes('Get Started')) {
        el.innerHTML = 'Go to Dashboard <i class="fa-solid fa-arrow-right"></i>';
      }
    });

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
        el.textContent = `₹${value}`;
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
  const camera = new THREE.PerspectiveCamera(45, hero.offsetWidth / hero.offsetHeight, 0.1, 1000);
  camera.position.set(0, 4, 25);
  camera.lookAt(0, 1, 0);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(hero.offsetWidth, hero.offsetHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00f2fe, 2.0);
  dirLight.position.set(10, 15, 10);
  scene.add(dirLight);

  const pointLight = new THREE.PointLight(0x38bdf8, 2.5, 50);
  pointLight.position.set(-10, -5, 5);
  scene.add(pointLight);

  // 1. Crystal Glass Resume Page
  const resumeGeo = new THREE.BoxGeometry(6.5, 9, 0.15);
  const resumeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    transmission: 0.9,
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    ior: 1.5,
    side: THREE.DoubleSide
  });
  const resumeMesh = new THREE.Mesh(resumeGeo, resumeMat);
  resumeMesh.position.set(0, 1.5, 0);
  scene.add(resumeMesh);

  // Lines on resume
  const textGroup = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const lineWidth = i === 0 ? 3.5 : 4.5 - (i % 2) * 1.5;
    const lineGeo = new THREE.BoxGeometry(lineWidth, 0.18, 0.05);
    const lineMat = new THREE.MeshBasicMaterial({ color: i === 0 ? 0x00f2fe : 0x38bdf8, transparent: true, opacity: 0.75 });
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.position.set(-2.2 + lineWidth / 2, 3 - i * 0.95, 0.1);
    textGroup.add(lineMesh);
  }
  resumeMesh.add(textGroup);

  // 2. Floating AI Particles
  const particlesCount = 70;
  const particlesGeo = new THREE.BufferGeometry();
  const posArray = new Float32Array(particlesCount * 3);
  for(let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 45;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
  const particlesMat = new THREE.PointsMaterial({
    size: 0.35,
    color: 0x00f2fe,
    transparent: true,
    opacity: 0.8
  });
  const points = new THREE.Points(particlesGeo, particlesMat);
  scene.add(points);

  // 3. ATS Rings
  const ringGeo = new THREE.RingGeometry(7.0, 7.15, 48);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.3 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2.2;
  ring.position.set(0, 1.5, 0);
  scene.add(ring);

  // 4. Undulating Water Surface
  const waterGeo = new THREE.PlaneGeometry(80, 80, 20, 20);
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x07152b,
    transparent: true,
    opacity: 0.8,
    roughness: 0.18,
    metalness: 0.85,
    transmission: 0.55,
    ior: 1.333,
    side: THREE.DoubleSide
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -5.5;
  scene.add(water);

  // Animation Loop
  let mouseX = 0;
  let mouseY = 0;
  let scrollY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX - window.innerWidth / 2) * 0.002;
    mouseY = (e.clientY - window.innerHeight / 2) * 0.002;
  });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
  });

  const clock = new THREE.Clock();
  let animId;

  const tick = () => {
    const elapsedTime = clock.getElapsedTime();

    // Float resume
    resumeMesh.rotation.y = elapsedTime * 0.18 + mouseX * 0.4;
    resumeMesh.rotation.x = Math.sin(elapsedTime * 0.4) * 0.12 + mouseY * 0.4;
    resumeMesh.position.y = 1.5 + Math.sin(elapsedTime * 1.3) * 0.35;

    // Animate rings
    ring.rotation.z = -elapsedTime * 0.12;
    ring.position.y = 1.5 + Math.sin(elapsedTime * 1.3) * 0.35;

    // Water wave vertices animation
    const pos = waterGeo.attributes.position;
    for(let i = 0; i < pos.count; i++) {
      const u = pos.getX(i);
      const v = pos.getY(i);
      const zval = Math.sin(u * 0.15 + elapsedTime) * 0.18 + Math.cos(v * 0.12 + elapsedTime) * 0.18;
      pos.setZ(i, zval);
    }
    pos.needsUpdate = true;

    // Rotate points
    points.rotation.y = elapsedTime * 0.04;

    // Parallax camera
    camera.position.x += (mouseX * 6 - camera.position.x) * 0.05;
    camera.position.y += (-mouseY * 4 + 4 - camera.position.y) * 0.05;
    camera.position.y -= (scrollY * 0.015 - scrollY * 0.01) * 0.02;

    renderer.render(scene, camera);
    animId = window.requestAnimationFrame(tick);
  };
  tick();

  window.addEventListener('resize', () => {
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

/* ─────────────────────────────────────────────────────────────
   CINEMATIC SCROLL & 12-STAGE CAREER JOURNEY EXPERIENCE
───────────────────────────────────────────────────────────── */
function initCinematicScroll() {
  const track = document.getElementById('cinematicJourneyTrack');
  const anchor = document.getElementById('worldResumeAnchor');
  const heroSection = document.getElementById('cinematic-section');
  const heroContents = document.querySelectorAll('.cinematic-content');
  
  if (!track && !heroSection) return;

  // Handles original top hero scroll interactions
  if (heroSection && heroContents.length) {
    const sheet = document.getElementById('stageResumeSheet');

    function handleHeroScroll() {
      const rect = heroSection.getBoundingClientRect();
      const scrollableDistance = rect.height - window.innerHeight;
      if (scrollableDistance <= 0) return;
      let progress = Math.max(0, Math.min(1, -rect.top / scrollableDistance));

      const frameFloat = progress * 11;
      const frame = Math.min(11, Math.floor(frameFloat));
      const narrativeStep = Math.min(5, Math.floor(frame / 2));

      heroContents.forEach((content, index) => {
        content.classList.remove('active', 'exit-up', 'exit-down');
        if (index === narrativeStep) content.classList.add('active');
        else if (index < narrativeStep) content.classList.add('exit-up');
        else content.classList.add('exit-down');
      });

      if (sheet) {
        const rotY = -18 + progress * 18;
        const rotX = 12 - progress * 12;
        const transZ = 10 + progress * 110;
        const scale = 0.75 + progress * 0.40;
        sheet.style.transform = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateZ(${transZ.toFixed(1)}px)`;
      }
    }
    window.addEventListener('scroll', () => requestAnimationFrame(handleHeroScroll), { passive: true });
    handleHeroScroll();
  }

  // Pinned Product-First Cinematic Scroll Track Engine (The Watch Inspired)
  if (track && anchor) {
    const atsCard = document.getElementById('worldAtsCard');
    const aiCard = document.getElementById('worldAiCard');
    const jobCard = document.getElementById('worldJobCard');
    const versionBranch = document.getElementById('worldVersionBranch');
    const intelCard = document.getElementById('worldIntelCard');
    const laser = document.getElementById('worldScanLaser');
    const wSkill1 = document.getElementById('wSkillAi1');
    const sceneBadge = document.getElementById('editorialSceneBadge');
    const heroSheet = document.getElementById('stageResumeSheet');

    const scenes = [
      'SCENE 01 • CAREER IDENTITY',
      'SCENE 02 • RESUME FORMATION',
      'SCENE 03 • ATS STRUCTURAL X-RAY',
      'SCENE 04 • AI QUANTIFIED REWRITE',
      'SCENE 05 • TARGET JOB ALIGNMENT',
      'SCENE 06 • SPATIAL RESUME BRANCHING',
      'SCENE 07 • CAREER INTELLIGENCE',
      'SCENE 08 • TEMPLATE ENGINE',
      'SCENE 09 • CAREER WORKSPACE RESOLUTION'
    ];

    function handleJourneyScroll() {
      const rect = track.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      if (scrollable <= 0) return;
      let progress = Math.max(0, Math.min(1, -rect.top / scrollable));

      // Dynamic Editorial Scene Badge
      if (sceneBadge) {
        const sceneIndex = Math.min(scenes.length - 1, Math.floor(progress * scenes.length));
        sceneBadge.textContent = scenes[sceneIndex];
      }

      // Multi-Axis Spatial Camera Move derived from continuous master progress
      // Phase 1 (0.00-0.20): Push in & level Y rotation (-18deg -> -6deg)
      // Phase 2 (0.20-0.45): ATS close approach & level X rotation (10deg -> 2deg)
      // Phase 3 (0.45-0.70): Pull back for Job Match & Branching (scale 0.85 -> 1.05)
      // Phase 4 (0.70-1.00): Elevated perspective for Intelligence & Workspace resolution
      let rotY = -18 + progress * 18;
      let rotX = 10 - progress * 10;
      let scale = 0.75 + progress * 0.35;
      let transZ = -40 + progress * 160;

      if (progress >= 0.20 && progress < 0.50) {
        // Close approach & focus shift
        rotY = -6 + (progress - 0.20) * 10;
        rotX = 4 - (progress - 0.20) * 8;
        scale = 0.88 + (progress - 0.20) * 0.30;
      } else if (progress >= 0.50 && progress < 0.80) {
        // Wide reveal & spatial branching
        rotY = 0 + (progress - 0.50) * -12;
        rotX = 0 + (progress - 0.50) * 6;
        scale = 1.02 - (progress - 0.50) * 0.15;
      } else if (progress >= 0.80) {
        // Final Workspace resolution
        rotY = -3.6 + (progress - 0.80) * 3.6;
        rotX = 1.8 - (progress - 0.80) * 1.8;
        scale = 0.97 + (progress - 0.80) * 0.13;
      }

      const transformStr = `rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)}) translateZ(${transZ.toFixed(1)}px)`;
      
      anchor.style.transform = transformStr;
      if (heroSheet) heroSheet.style.transform = transformStr;

      // Overlapping Scene Transformations
      // Scene 03: ATS Structural X-Ray (Laser sweep & Score reveal)
      const atsActive = progress >= 0.18 && progress <= 0.42;
      if (laser) {
        laser.style.opacity = atsActive ? '1' : '0';
        if (atsActive) {
          const yPos = ((progress - 0.18) / 0.24) * 520;
          laser.style.transform = `translateY(${yPos}px)`;
        }
      }
      if (atsCard) {
        const opacity = Math.max(0, Math.min(1, (progress - 0.16) / 0.10 - (progress > 0.40 ? (progress - 0.40) / 0.10 : 0)));
        atsCard.style.opacity = opacity.toFixed(2);
        atsCard.style.transform = `translate3d(${(1 - opacity) * 40}px, 0, 40px)`;
      }

      // Scene 04: AI Quantified Rewrite
      if (aiCard) {
        const opacity = Math.max(0, Math.min(1, (progress - 0.30) / 0.10 - (progress > 0.52 ? (progress - 0.52) / 0.10 : 0)));
        aiCard.style.opacity = opacity.toFixed(2);
        aiCard.style.transform = `translate3d(${(1 - opacity) * -40}px, 0, 50px)`;
      }
      if (wSkill1) wSkill1.style.display = progress >= 0.34 ? 'inline-flex' : 'none';

      // Scene 05: Target Job Alignment
      if (jobCard) {
        const opacity = Math.max(0, Math.min(1, (progress - 0.44) / 0.10 - (progress > 0.65 ? (progress - 0.65) / 0.10 : 0)));
        jobCard.style.opacity = opacity.toFixed(2);
        jobCard.style.transform = `translate3d(${(1 - opacity) * -40}px, 0, 35px)`;
      }

      // Scene 06: Spatial Resume Branching
      if (versionBranch) {
        const branchingActive = progress >= 0.58 && progress <= 0.84;
        const opacity = Math.max(0, Math.min(1, (progress - 0.58) / 0.10 - (progress > 0.78 ? (progress - 0.78) / 0.10 : 0)));
        versionBranch.style.opacity = opacity.toFixed(2);
        versionBranch.style.transform = branchingActive ? `translateZ(${(opacity * 20).toFixed(1)}px)` : 'translateZ(-100px)';
      }

      // Scene 07 & 09: Career Intelligence & Workspace Resolution
      if (intelCard) {
        const opacity = Math.max(0, Math.min(1, (progress - 0.74) / 0.10));
        intelCard.style.opacity = opacity.toFixed(2);
        intelCard.style.transform = `translate3d(${(1 - opacity) * 40}px, 0, 45px)`;
      }
    }

    window.addEventListener('scroll', () => requestAnimationFrame(handleJourneyScroll), { passive: true });
    handleJourneyScroll();
  }
}



