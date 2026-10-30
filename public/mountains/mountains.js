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
  const cameraKeys = ['fx', 'fy', 'nx', 'ny', 'ax', 'ay', 'ak', 'sx', 'sy'];
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
      knots = values.map((value, i) => ({ y: value, p: [0, 0.48, 0.82, 0.94, 1][i] }));
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
    geometry = { span, height, width, reader, knots, projectTop, projectLeft, big, generation: ++generation };
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
  function paintProgress(y) {
    progress = position(y);
    scene.style.setProperty('--sv-progress', progress.toFixed(5));
    scene.dataset.progress = progress.toFixed(5);
    scene.dataset.geometry = String(geometry.generation);
    scene.toggleAttribute('data-big', geometry.big);
    // Same native progress and eligibility as the ridges; no independent cloud/sky scheduler.
    scene.style.setProperty('--sv-cloud-travel', (reduce.matches || mode === 'calm' ? 0.52 :
      mode === 'index' ? 0.32 + 0.2 * progress : clamp(progress / 0.82)).toFixed(5));
  }
  function phrase() {
    if (phraseDone || !section) return;
    phraseDone = true;
    if (!eligible() || section.contains(document.activeElement)) return;
    section.dataset.mtn = 'go';
  }
  function frame() {
    raf = 0;
    // Paused/reduced/hidden: nothing moves or replays; the composition stays as last painted.
    if (!eligible()) return;
    if (dirty || !geometry) measure();
    const y = scrollY;
    // All geometry reads above precede this frame's scene writes.
    paintProgress(y);
    if (pointer) {
      const x = clamp(pointer[0] / geometry.width * 2 - 1, -1, 1);
      const py = clamp(pointer[1] / geometry.height * 2 - 1, -1, 1);
      pointer = null;
      camera = true;
      scene.setAttribute('data-cam', '');
      // One viewpoint: far/near terrain, then sky as counter-offsets on the far plane (aurora farther, stars farthest).
      [-3 * x, -py, -9 * x, -3 * py, 1.2 * x, 0.5 * py, 0.5 * x, 2 * x, 0.7 * py].forEach((value, i) => scene.style.setProperty('--mtn-' + cameraKeys[i], i < 4 ? value + 'px' : value.toFixed(2)));
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
      if (mode === 'calm' || !eligible() || scrollY > 8 || nav?.type === 'back_forward') {
        scene.dataset.arrival = 'static';
      } else if (continuous) scene.dataset.arrival = 'continuous';
      else {
        scene.dataset.arrival = 'first';
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
    if (intro && event.animationName === 'mtn-near-in') finishIntro(true);
    else if (trace && event.animationName === 'mtn-rim-hello' && event.target.closest('.mtn-near')) clearTrace();
  });
  document.addEventListener('sonwork:ridge-answer', answer);
  document.addEventListener('sonwork:atmosphere', refresh);
  const passive = { passive: true, capture: true };
  addEventListener('pointerdown', () => { clearCamera(); finishIntro(); clearTrace(); clearPhrase(); }, passive);
  addEventListener('keydown', () => { clearCamera(); finishIntro(); clearTrace(); clearPhrase(); }, passive);
  ['wheel', 'touchstart'].forEach(type => addEventListener(type, interrupt, passive));
  addEventListener('focusin', event => {
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
  addEventListener('blur', cancelEffects);
  fine.addEventListener('change', clearCamera);
  addEventListener('scroll', () => { interrupt(); ask(); }, { passive: true });
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
  const recolor = () => { clearCamera(); invalidate(); };
  new MutationObserver(recolor).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', recolor);
  reduce.addEventListener('change', refresh);
  forced.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  addEventListener('pagehide', () => { away = true; stop(); });
  addEventListener('pageshow', event => {
    away = false;
    if (event.persisted || scrollY > 8) cancelEffects();
    invalidate();
  });
  addEventListener('popstate', () => { cancelEffects(); invalidate(); });
  addEventListener('hashchange', () => { cancelEffects(); invalidate(); });
})();
