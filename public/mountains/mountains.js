(() => {
  // One event-driven landscape frame. atmosphere.js supplies the sole eligibility/preference
  // policy after this deferred renderer loads; finite effects never schedule another scroll driver.
  // The night sky lives inside the far-ridge SVGs (see mountain-scene.html) and is posed purely by
  // CSS from --sv-progress, so this frame has no sky geometry of its own.
  const scene = document.querySelector('.mtn-scene');
  if (!scene) return;
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const mode = scene.dataset.mode || 'calm';
  const main = document.querySelector('main');
  const header = document.querySelector('.site-header');
  const footer = document.querySelector('.site-footer');
  const about = document.querySelector('.front-about');
  const projects = document.getElementById('home-projects');
  const contact = document.getElementById('home-contact');
  const ending = document.getElementById('home-newsletter');
  const section = projects && projects.closest('section');
  const list = section && section.querySelector('.build-list');
  const mount = document.querySelector('.companion');
  const rims = scene.querySelectorAll('.mtn-rim');
  // The last ten are the Home sky layers (dust, mid stars/far clouds, bright stars, sun, near clouds).
  const cameraKeys = ['fx', 'fy', 'nx', 'ny', 'ax', 'ay', 'ak', 'sx', 'sy', 'dx', 'dy', 'mx', 'my', 'bx', 'by', 'ux', 'uy', 'kx', 'ky'];
  // Stable references: the scene box is the LARGE viewport tall, the far layer is the SMALL viewport
  // (svh) + 720px. Neither follows transient browser-bar / visualViewport heights.
  const farLayer = scene.querySelector('.mtn-far');
  let policy = null;
  let raf = 0;
  let dirty = true;
  let away = false;
  let intro = false;
  let trace = false;
  let camera = false;
  let pointer = null;
  let phraseDone = false;
  let landed = false;
  let progress = 0;
  let generation = 0;
  let geometry = null;
  const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
  // Progress at the entry, Projects, Contact, ending and bottom landmarks.
  const LANDMARKS = [0, 0.48, 0.82, 0.94, 1];
  const smooth = t => t * t * (3 - 2 * t);
  // Redundant same-value style writes are skipped (they dirtied the whole inherited scene tree every frame).
  const written = {};
  const put = (name, value) => {
    if (written[name] === value) return;
    written[name] = value;
    scene.style.setProperty(name, value);
  };
  let meteorTimer = 0;
  let meteorCycle = 0;
  let blurred = false;
  let touches = 0;
  const heldPointers = new Set();
  const heldKeys = new Set();
  const shots = [];
  // Home real sky: a fixed illustrative Orion/Taurus J2000 field (not the current sky, location or time),
  // projected ONCE from the same-origin catalogue into each variant. `hush` rectangles are heading/prose
  // areas where stars keep their true place but are quieted. Core fallback stars live in the markup.
  const SKY = {
    wide: { sel: '.mtn-wide', ra0: 335, dec0: -5, cx: 1130, cy: -50, scale: 850, x: [-100, 1700], y: [-280, 380], grow: 1,
      hush: [[285, -118, 610, -55], [285, -32, 1020, 24], [285, 26, 760, 56], [285, 78, 870, 100], [285, 118, 930, 400], [285, 270, 1310, 700]] },
    tall: { sel: '.mtn-tall', ra0: 335, dec0: -5, cx: 320, cy: -25, scale: 360, x: [-20, 420], y: [-125, 180], grow: 1.15,
      hush: [[5, -55, 265, 3], [5, 30, 145, 50], [-20, 68, 420, 200]] },
  };
  // The seven true Aquarius core members read slightly clearer (point radius x1.18, base opacity x1.35 capped .90, before quieting).
  const HINT = new Set([110395, 110960, 111497, 110672, 109074, 106278, 113136]);
  const tint = bv => (bv < 0.15 ? '#cfe0ff' : bv < 0.55 ? '#f4f6ff' : bv < 0.9 ? '#ffeacf' : '#ffc99a');
  function buildSky(rows) {
    const rad = Math.PI / 180;
    Object.values(SKY).forEach(p => {
      const host = scene.querySelector(p.sel + ' .sv-hs-night');
      if (!host) return;
      const d0 = p.dec0 * rad;
      const pts = [];
      rows.forEach(r => {
        const dec = r[2] * rad, dra = (r[1] - p.ra0) * rad;
        const den = Math.sin(d0) * Math.sin(dec) + Math.cos(d0) * Math.cos(dec) * Math.cos(dra);
        if (den <= 0.15) return;
        const x = p.cx - p.scale * Math.cos(dec) * Math.sin(dra) / den;
        const y = p.cy - p.scale * (Math.cos(d0) * Math.sin(dec) - Math.sin(d0) * Math.cos(dec) * Math.cos(dra)) / den;
        if (x < p.x[0] || x > p.x[1] || y < p.y[0] || y > p.y[1]) return;
        pts.push([x, y, r[3], r[4], r[0]]);
      });
      pts.sort((a, b) => a[2] - b[2]);
      const NS = 'http://www.w3.org/2000/svg';
      const group = document.createElementNS(NS, 'g');
      group.setAttribute('class', 'sv-hs-sky sv-hs-full');
      pts.slice(0, 600).forEach(([x, y, mag, bv, hip]) => {
        const quiet = p.hush.some(h => x >= h[0] && x <= h[2] && y >= h[1] && y <= h[3]);
        const c = document.createElementNS(NS, 'circle');
        c.setAttribute('data-hip', String(hip));
        c.setAttribute('cx', x.toFixed(2));
        c.setAttribute('cy', y.toFixed(2));
        c.setAttribute('r', (Math.max(0.4, (0.45 + (6 - mag) * 0.28) * p.grow) * (HINT.has(hip) ? 1.18 : 1) * (quiet ? 0.8 : 1)).toFixed(2));
        c.setAttribute('fill', tint(bv));
        c.setAttribute('opacity', (Math.min(HINT.has(hip) ? 0.9 : 1, Math.max(0.32, 0.3 + (6 - mag) * 0.14) * (HINT.has(hip) ? 1.35 : 1)) * (quiet ? 0.38 : 1)).toFixed(2));
        group.appendChild(c);
      });
      host.appendChild(group);
    });
    scene.dataset.sky = 'full';
  }
  function loadSky() {
    if (typeof fetch !== 'function') return; // the shared world carries the real catalogue field on every route
    fetch('/mountains/home-star-catalog.json', { credentials: 'same-origin' })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('catalog'))))
      .then(data => {
        const list = Array.isArray(data) ? data : Object.values(data || {}).find(v => Array.isArray(v) && Array.isArray(v[0]));
        const rows = (list || []).filter(r => Array.isArray(r) && r.length >= 5 && r.slice(0, 5).every(Number.isFinite));
        if (rows.length > 100) buildSky(rows);
      })
      .catch(() => { /* The static core stars in the markup remain. */ });
  }
  // One finite cloud-opening moment (CSS-driven, data-moment=run) that any yield settles into its end pose.
  // Yielding freezes each VISIBLE bank at its currently painted translate (read before the marker changes) and
  // stops the meteor at once; banks of a hidden variant simply take the composed end pose. No timer, no restart.
  const momentDone = () => {
    if (scene.dataset.moment !== 'run') return;
    const frozen = Array.from(scene.querySelectorAll('.sv-hs-bank'), bank => [bank, bank.getClientRects().length ? getComputedStyle(bank).translate : '']);
    scene.dataset.moment = 'done';
    frozen.forEach(([bank, value]) => { if (value && value !== 'none') bank.style.translate = value; });
  };
  // Recurring night meteors (Son-requested): one shot every ~7-11s of quiet, every third cycle a short 3-shot shower.
  // Sparse timer + finite WAAPI clones of the original trail; nothing is pending or alive while ineligible.
  const visibleMeteor = () => Array.from(scene.querySelectorAll('.sv-hs-meteor')).find(m => m.parentNode.getClientRects().length);
  // Input-hot-path predicate: theme, policy, held input and focus only; no layout/geometry reads here.
  const lightQuery = matchMedia('(prefers-color-scheme: light)');
  const isNight = () => (doc.dataset.theme === 'dark' ? true : doc.dataset.theme === 'light' ? false : !lightQuery.matches);
  const isHeld = () => heldPointers.size > 0 || touches > 0 || heldKeys.size > 0;
  // Only an interactive control with visible keyboard focus counts; the focused MAIN/BODY reading container does not.
  const meaningfulFocus = () => {
    const el = document.activeElement;
    if (!el || el === document.body || el === main || !el.matches) return false;
    return el.matches(':focus-visible') && el.matches('a[href], button, input, select, textarea, summary, [contenteditable], [tabindex]:not([tabindex="-1"])');
  };
  const meteorOk = () => (mode === 'home' || mode === 'index') && !!policy && eligible() && !blurred && document.hasFocus() && !isHeld() && isNight() && !document.hidden &&
    !forced.matches && !reduce.matches && typeof Element.prototype.animate === 'function' && !meaningfulFocus();
  function scheduleMeteor(ms) {
    clearTimeout(meteorTimer);
    meteorTimer = 0;
    if (meteorOk()) meteorTimer = setTimeout(fireMeteor, ms);
  }
  function meteorStop(rearm = true) {
    clearTimeout(meteorTimer);
    meteorTimer = 0;
    shots.splice(0).forEach(shot => { shot.anim.cancel(); shot.el.remove(); });
    if (rearm) scheduleMeteor(1800);
  }
  function fireMeteor() {
    meteorTimer = 0;
    if (!meteorOk()) return;
    if (scene.dataset.moment === 'run') { scheduleMeteor(1500); return; }
    const base = visibleMeteor();
    const tpl = base && base.firstElementChild;
    const at = tpl && /translate\(\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(tpl.getAttribute('transform') || '');
    if (!at) { scheduleMeteor(9000); return; }
    const style = getComputedStyle(base);
    const mx = parseFloat(style.getPropertyValue('--hs-mx')) || -320;
    const my = parseFloat(style.getPropertyValue('--hs-my')) || 120;
    const wide = !!base.closest('.mtn-wide');
    meteorCycle += 1;
    const count = meteorCycle % 3 === 0 ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      el.setAttribute('class', 'sv-hs-shot');
      const clone = tpl.cloneNode(true);
      // Safe open-sky lanes only: start shifts stay in the upper-right pocket, away from the H1 and prose.
      const jx = -Math.random() * (wide ? 220 : 55);
      const jy = Math.random() * (wide ? 40 : 8);
      clone.setAttribute('transform', `translate(${(Number(at[1]) + jx).toFixed(1)} ${(Number(at[2]) + jy).toFixed(1)})`);
      el.appendChild(clone);
      base.parentNode.appendChild(el);
      const k = 0.8 + Math.random() * 0.4;
      let anim;
      try {
        anim = el.animate([
          { opacity: 0, translate: '0px 0px' },
          { opacity: 1, offset: 0.12 },
          { opacity: 1, offset: 0.72 },
          { opacity: 0, translate: `${(mx * k).toFixed(1)}px ${(my * k).toFixed(1)}px` },
        ], { duration: 1100 + Math.random() * 400, delay: i * 330 + Math.random() * 120, easing: 'cubic-bezier(0.3, 0, 0.5, 1)', fill: 'both' });
      } catch { el.remove(); return; } // unsupported: the static sky stays, nothing pending
      const shot = { el, anim };
      shots.push(shot);
      anim.onfinish = () => { el.remove(); const at2 = shots.indexOf(shot); if (at2 >= 0) shots.splice(at2, 1); };
    }
    scheduleMeteor(7000 + Math.random() * 4000);
  }
  const eligible = () => !!policy && !away && policy.canRun();
  const clearPhrase = () => section && section.removeAttribute('data-mtn');
  const clearCamera = () => {
    pointer = null;
    if (!camera) return;
    camera = false;
    scene.removeAttribute('data-cam');
    cameraKeys.forEach(key => scene.style.removeProperty('--mtn-' + key));
  };
  const solidRims = () => rims.forEach(rim => rim.removeAttribute('pathLength'));
  const finishIntro = (completed = false) => {
    if (!intro) return;
    intro = false;
    scene.removeAttribute('data-intro');
    solidRims();
    if (completed && eligible()) policy.arrival();
  };
  const clearTrace = () => {
    trace = false;
    scene.removeAttribute('data-trace');
    if (!intro) solidRims();
  };
  const interrupt = () => {
    meteorStop();
    momentDone();
    clearCamera();
    finishIntro();
    clearTrace();
    policy?.cancel();
  };
  const cancelEffects = () => {
    interrupt();
    clearPhrase();
    landed = false;
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    cancelEffects();
    // Deliberately retain --sv-progress: Pause freezes the painted journey composition.
  };

  // Geometry reads are confined to invalidation. The artwork has no influence on page height.
  function measure() {
    const y = scrollY;
    // Layout sizes (offset*) ignore transforms and the visual viewport, so a collapsing toolbar cannot
    // move the landmarks. Real resize, rotation, font and zoom changes still change them and invalidate.
    const large = scene.offsetHeight || innerHeight;
    const small = farLayer && farLayer.offsetHeight > 720 ? farLayer.offsetHeight - 720 : large;
    const height = large;
    const width = scene.offsetWidth || innerWidth;
    const headerBottom = header ? header.offsetHeight : 0;
    const reader = headerBottom + Math.max(0, small - headerBottom) * 0.45;
    // Measured against the large viewport so the final scroll position (bars collapsed) reaches 1.
    const span = Math.max(0, doc.scrollHeight - large);
    const top = node => node ? node.getBoundingClientRect().top + y : span + reader;
    let knots = [{ y: 0, p: 0 }, { y: span, p: 1 }];
    let projectTop = Infinity;
    let projectLeft = Infinity;
    if (mode === 'home' && about && projects && contact) {
      const lead = about.getBoundingClientRect();
      const project = projects.getBoundingClientRect();
      const box = section.getBoundingClientRect();
      projectTop = project.top + y;
      projectLeft = box.left;
      const values = [0,
        clamp(Math.max(projectTop, lead.bottom + y) - reader, 0, span),
        clamp(top(contact) - reader, 0, span),
        clamp(top(ending || footer) - reader, 0, span), span];
      // Short documents may put several landmarks inside one viewport. Keep their order in
      // the EXISTING scroll span, rather than dropping stages or fabricating scenic padding.
      const gap = Math.min(48, span / 20);
      for (let i = 1; i < values.length - 1; i++) values[i] = Math.max(values[i], values[i - 1] + gap);
      for (let i = values.length - 2; i > 0; i--) values[i] = Math.min(values[i], values[i + 1] - gap);
      knots = values.map((value, i) => ({ y: value, p: LANDMARKS[i] }));
    }
    // Monotone cubic Hermite (PCHIP) tangents: continuous slope at every landmark, no overshoot.
    const gaps = [], rates = [];
    for (let i = 0; i < knots.length - 1; i++) {
      gaps[i] = Math.max(0.001, knots[i + 1].y - knots[i].y);
      rates[i] = (knots[i + 1].p - knots[i].p) / gaps[i];
    }
    knots[0].m = rates[0];
    knots[knots.length - 1].m = rates[rates.length - 1];
    for (let i = 1; i < knots.length - 1; i++) {
      if (rates[i - 1] * rates[i] <= 0) { knots[i].m = 0; continue; }
      const w1 = 2 * gaps[i] + gaps[i - 1], w2 = gaps[i] + 2 * gaps[i - 1];
      knots[i].m = (w1 + w2) / (w1 / rates[i - 1] + w2 / rates[i]);
    }
    const big = parseFloat(getComputedStyle(doc).fontSize) > 20;
    const sig = [span, height, width, big, ...knots.map(k => Math.round(k.y))].join('|');
    geometry = { span, height, width, reader, knots, projectTop, projectLeft, big, sig, generation: ++generation };
    dirty = false;
  }
  function position(y) {
    if (!geometry.span || mode === 'calm') return 0;
    const knots = geometry.knots;
    if (y <= knots[0].y) return knots[0].p;
    for (let i = 1; i < knots.length; i++) {
      if (y <= knots[i].y) {
        const a = knots[i - 1], b = knots[i];
        const h = Math.max(0.001, b.y - a.y);
        const t = clamp((y - a.y) / h), t2 = t * t, t3 = t2 * t;
        return clamp((2 * t3 - 3 * t2 + 1) * a.p + (t3 - 2 * t2 + t) * h * a.m +
          (-2 * t3 + 3 * t2) * b.p + (t3 - t2) * h * b.m);
      }
    }
    return 1;
  }
  // `y` is the real scroll position (semantic progress for policy/landmarks/lifecycle); `scenicY` is the
  // Home-only followed position that drives ONLY --sv-scene/--sv-settle/--sv-hs.
  function paintProgress(y, scenicY = y) {
    progress = position(y);
    const scenic = scenicY === y ? progress : position(scenicY);
    put('--sv-progress', progress.toFixed(5));
    if (scene.dataset.progress !== progress.toFixed(5)) scene.dataset.progress = progress.toFixed(5);
    if (scene.dataset.geometry !== String(geometry.generation)) scene.dataset.geometry = String(geometry.generation);
    if (scene.hasAttribute('data-big') !== geometry.big) scene.toggleAttribute('data-big', geometry.big);
    // Home: the bounded scenic composition opens fully by the Projects landmark and then holds;
    // a short settle follows Contact. Progress itself keeps advancing for lifecycle consumers.
    // Short or tall documents can pin the Projects knot a few dozen px from the top; only then, spread the
    // scenic opening over a fraction of the EXISTING span (semantic landmarks and page height are untouched).
    // Desktop (>=900px) uses most of the existing span; narrower widths keep the source1 phone rule.
    const want = geometry ? (geometry.width >= 900 ? Math.min(geometry.span * 0.75, geometry.height) : Math.min(geometry.span * 0.4, geometry.height * 0.6)) : 0;
    const stretched = mode === 'home' && geometry && geometry.knots[1].y < want;
    const arrive = mode !== 'home' ? 0 : stretched ? smooth(clamp(scenicY / want)) : smooth(clamp(scenic / LANDMARKS[1]));
    if (mode === 'home') {
      put('--sv-scene', arrive.toFixed(5));
      put('--sv-hs', arrive.toFixed(5)); // sky travel; CSS holds 0.75 without script and under reduced motion
      put('--sv-settle', smooth(clamp((scenic - LANDMARKS[2]) / (1 - LANDMARKS[2]))).toFixed(5));
    }
    // Same native progress and eligibility as the ridges; no independent cloud/sky scheduler.
    put('--sv-cloud-travel', (reduce.matches || mode === 'calm' ? 0.52 :
      mode === 'index' ? 0.32 + 0.2 * progress : 0.2 + 0.32 * arrive).toFixed(5));
  }
  function phrase() {
    if (phraseDone || !section) return;
    phraseDone = true;
    if (!eligible() || section.contains(document.activeElement)) return;
    section.dataset.mtn = 'go';
  }
  function frame(now = performance.now()) {
    raf = 0;
    // Paused/reduced/hidden: nothing moves or replays; the composition stays as last painted.
    if (!eligible()) return;
    const wasDirty = dirty || !geometry;
    if (wasDirty) measure();
    const y = scrollY;
    // The scenery follows the browser's own continuous scroll in this one coalesced frame (no second smoothing layer).
    // All geometry reads above precede this frame's scene writes.
    paintProgress(y);
    if (pointer) {
      const x = clamp(pointer[0] / geometry.width * 2 - 1, -1, 1);
      const py = clamp(pointer[1] / geometry.height * 2 - 1, -1, 1);
      pointer = null;
      camera = true;
      scene.setAttribute('data-cam', '');
      // One viewpoint: far/near terrain, then sky as counter-offsets on the far plane (aurora farther, stars farthest).
      // Home sky layers sit inside the far plane (already -3x, -py), so their own offsets compensate it:
      // net dust -x, mid stars -1.5x, bright -2x, sun -1.5x (all farther than the mountains), near clouds -12x.
      [-3 * x, -py, -9 * x, -3 * py, 1.2 * x, 0.5 * py, 0.5 * x, 2 * x, 0.7 * py,
        2 * x, 0.6 * py, 1.5 * x, 0.5 * py, x, 0.3 * py, 1.5 * x, 0.5 * py, -9 * x, -2.5 * py].forEach((value, i) => scene.style.setProperty('--mtn-' + cameraKeys[i], i < 4 ? value + 'px' : value.toFixed(2)));
    }
    if (landed || (y > 0 && geometry.projectLeft < 88 && geometry.projectTop - y <= geometry.reader)) phrase();
    landed = false;
  }
  function ask() {
    // One-shot per event; the fixed world must follow native scroll on every page, in any state.
    if (!raf && policy && !away && !document.hidden) raf = requestAnimationFrame(frame);
  }
  function invalidate() {
    dirty = true;
    ask();
  }
  function refresh() {
    stop();
    policy?.paint();
    dirty = true;
    ask();
    if (!eligible() && geometry && geometry.projectTop - scrollY <= geometry.reader) phraseDone = true;
  }
  function answer() {
    if (!eligible() || !policy.canAnswer()) return;
    finishIntro();
    if (!trace && rims.length) {
      trace = true;
      rims.forEach(rim => rim.setAttribute('pathLength', 1));
      scene.setAttribute('data-trace', '');
    }
  }

  // This is the existing renderer's connection to the existing atmosphere policy, not another
  // controller. It is installed before atmosphere.js by BaseLayout's unchanged defer order.
  window.sonworkLandscape = {
    connect(owner) {
      if (policy) return;
      policy = owner;
      measure();
      // Retire the old short-span additive offsets without touching the T03 artwork interface.
      scene.style.setProperty('--mtn-far-y', '0px');
      scene.style.setProperty('--mtn-near-y', '0px');
      paintProgress(scrollY);
      const nav = performance.getEntriesByType('navigation')[0];
      let continuous = false;
      try {
        continuous = !!document.referrer && new URL(document.referrer).origin === location.origin && nav?.type === 'navigate';
      } catch { /* An unavailable referrer simply has no continuity evidence. */ }
      loadSky();
      scheduleMeteor(9000); // after the original arrival shot (2.6s + 1.3s) has finished
      if (mode === 'calm' || !eligible() || scrollY > 8 || nav?.type === 'back_forward') {
        scene.dataset.arrival = 'static';
        scene.dataset.moment = 'done';
      } else if (continuous) {
        scene.dataset.arrival = 'continuous';
        scene.dataset.moment = 'done';
      } else {
        scene.dataset.arrival = 'first';
        scene.dataset.moment = mode === 'home' ? 'run' : 'done'; // only Home plays the finite opening, once; never restarted by resume, restore or theme
        intro = true;
        rims.forEach(rim => rim.setAttribute('pathLength', 1));
        scene.setAttribute('data-intro', '');
      }
      if (!eligible()) phraseDone = true;
    },
    // The sky has no hello response; atmosphere.js still calls this after the arrival.
    auroraAnswer() {},
    isActive: eligible,
  };

  if (mount) new MutationObserver(() => {
    landed = eligible() && mount.dataset.perch === 'build' && !mount.hasAttribute('data-moving');
    if (landed) ask();
  }).observe(mount, { attributes: true, attributeFilter: ['data-perch', 'data-moving'] });
  if (list) list.addEventListener('animationend', event => {
    if (event.animationName === 'mtn-settle' && event.target.matches(':last-child')) clearPhrase();
  });
  scene.addEventListener('animationend', event => {
    // Night has no clouds (hidden), so its finite moment ends with the one meteor; day ends with the bank drift.
    // The meteor ends the moment only inside the ACTIVE night group (hidden children can still report an end).
    const night = event.animationName === 'sv-hs-meteor' ? event.target.closest('.sv-hs-night') : null;
    if (event.animationName === 'sv-hs-drift-a' || (night && night.getClientRects().length)) momentDone();
    else if (intro && event.animationName === 'mtn-near-in') finishIntro(true);
    else if (trace && event.animationName === 'mtn-rim-hello' && event.target.closest('.mtn-near')) clearTrace();
  });
  document.addEventListener('sonwork:ridge-answer', answer);
  document.addEventListener('sonwork:atmosphere', refresh);
  const passive = { passive: true, capture: true };
  // Held-input membership (pointer ids, remaining touches, keys); each release rearms once idle and eligible.
  addEventListener('touchstart', event => { touches = event.touches.length; }, passive);
  ['touchend', 'touchcancel'].forEach(type => addEventListener(type, event => { touches = event.touches.length; scheduleMeteor(1800); }, passive));
  ['pointerup', 'pointercancel'].forEach(type => addEventListener(type, event => { heldPointers.delete(event.pointerId); scheduleMeteor(1800); }, passive));
  addEventListener('keyup', event => { heldKeys.delete(event.code); scheduleMeteor(1800); }, passive);
  addEventListener('focusout', () => scheduleMeteor(1800), passive);
  addEventListener('focus', () => { blurred = false; heldKeys.clear(); heldPointers.clear(); touches = 0; scheduleMeteor(1800); });
  addEventListener('pointerdown', event => { heldPointers.add(event.pointerId); meteorStop(false); momentDone(); clearCamera(); finishIntro(); clearTrace(); clearPhrase(); }, passive);
  addEventListener('keydown', event => { heldKeys.add(event.code); meteorStop(false); momentDone(); clearCamera(); finishIntro(); clearTrace(); clearPhrase(); }, passive);
  ['wheel', 'touchstart'].forEach(type => addEventListener(type, interrupt, passive));
  addEventListener('focusin', event => {
    meteorStop();
    momentDone();
    clearCamera(); finishIntro(); clearTrace(); clearPhrase();
    if (!(event.target instanceof Element) || !event.target.closest('.companion')) policy?.cancel();
  });
  addEventListener('pointermove', event => {
    if (!eligible() || mode === 'calm' || intro || !fine.matches || !event.isTrusted || event.pointerType !== 'mouse' || document.activeElement?.matches(':focus-visible')) {
      clearCamera(); return;
    }
    pointer = [event.clientX, event.clientY];
    ask();
  }, { passive: true });
  document.addEventListener('pointerout', event => { if (!event.relatedTarget) clearCamera(); });
  addEventListener('blur', () => {
    blurred = true; // owned shots/timers are cleared unconditionally; no rearm until window focus returns
    heldKeys.clear(); heldPointers.clear(); touches = 0;
    cancelEffects();
    meteorStop(false);
  });
  fine.addEventListener('change', clearCamera);
  addEventListener('scroll', () => {
    interrupt();
    ask();
  }, { passive: true });
  const viewportGeometry = () => {
    const viewport = window.visualViewport;
    return [innerWidth, innerHeight, viewport?.width ?? innerWidth, viewport?.height ?? innerHeight,
      viewport?.offsetLeft ?? 0, viewport?.offsetTop ?? 0, viewport?.scale ?? 1];
  };
  let lastViewport = viewportGeometry();
  const resize = () => {
    const next = viewportGeometry();
    // Initial mobile notifications can repeat the exact geometry. They invalidate measurements,
    // but only a real resize/zoom/keyboard change consumes an unfinished arrival or response.
    if (next.some((value, index) => value !== lastViewport[index])) cancelEffects();
    lastViewport = next;
    invalidate();
  };
  addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('resize', resize, { passive: true });
  window.visualViewport?.addEventListener('scroll', invalidate, { passive: true });
  document.addEventListener('toggle', invalidate, true);
  document.fonts?.ready.then(invalidate);
  document.fonts?.addEventListener('loadingdone', invalidate);
  if ('ResizeObserver' in window) {
    const sizes = new ResizeObserver(invalidate);
    [main, header, footer, about].forEach(node => { if (node) sizes.observe(node); });
  }
  const recolor = () => { clearCamera(); meteorStop(); invalidate(); };
  new MutationObserver(recolor).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', recolor);
  reduce.addEventListener('change', refresh);
  forced.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  addEventListener('pagehide', () => { away = true; heldKeys.clear(); heldPointers.clear(); touches = 0; stop(); meteorStop(false); });
  addEventListener('pageshow', event => {
    away = false;
    blurred = false;
    if (event.persisted) scheduleMeteor(1800); // initial load keeps the already-armed first sequence
    if (event.persisted || scrollY > 8) cancelEffects();
    invalidate();
  });
  addEventListener('popstate', () => { cancelEffects(); invalidate(); });
  addEventListener('hashchange', () => { cancelEffects(); invalidate(); });
})();
