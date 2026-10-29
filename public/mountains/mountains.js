(() => {
  // One event-driven landscape frame. atmosphere.js supplies the sole eligibility/preference
  // policy after this deferred renderer loads; finite effects never schedule another scroll driver.
  const scene = document.querySelector('.mtn-scene');
  if (!scene) return;
  const doc = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const daylight = matchMedia('(prefers-color-scheme: light)');
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
  const sketch = scene.querySelector('.sv-constellation-path');
  const guide = scene.querySelector('.sv-constellation-guide');
  const sky = scene.querySelector('.sv-constellation');
  // Sample owned SVG geometry once, before any scene writes. Frames interpolate this small table.
  const sketchLength = sketch ? sketch.getTotalLength() : 0;
  const starRoute = sketch ? Array.from({ length: 65 }, (_, i) => {
    const p = sketch.getPointAtLength(sketchLength * i / 64);
    return { x: p.x, y: p.y };
  }) : null;
  const cameraKeys = ['fx', 'fy', 'nx', 'ny'];
  const auroras = new Set();
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
  const clearAurora = () => {
    for (const animation of [...auroras]) animation.cancel();
    auroras.clear();
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
    clearAurora();
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
    const height = window.visualViewport?.height || innerHeight;
    const width = window.visualViewport?.width || innerWidth;
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const reader = headerBottom + Math.max(0, height - headerBottom) * 0.45 + (window.visualViewport?.offsetTop || 0);
    const span = Math.max(0, doc.scrollHeight - innerHeight);
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
    const big = parseFloat(getComputedStyle(doc).fontSize) > 20;
    const heading = document.querySelector('h1');
    let glyphs = null;
    if (heading) {
      const range = document.createRange();
      range.selectNodeContents(heading);
      glyphs = range.getBoundingClientRect();
    }
    let skySmall = mode === 'calm' || big || width < 360 || height < 700 ||
      (width < 900 && glyphs && glyphs.right > width - 118);
    const skyTopFor = small => small ? headerBottom + 5 :
      // Document-owned: the heading's position at scroll 0, never its current scrolled position.
      Math.max(headerBottom + 14, (glyphs ? glyphs.top + y : headerBottom + 42) - 20);
    // The fixed drawing owns one sky pocket. Fit it, then read the painted box and the actual
    // glyph/control rectangles that can ever cross it, so frames only compare numbers.
    const fit = small => {
      scene.toggleAttribute('data-sky-detail', !small);
      scene.style.setProperty('--sv-sky-top', skyTopFor(small).toFixed(2) + 'px');
      return skyRects(y);
    };
    let sky = fit(skySmall);
    // A full drawing with no calm room beside the opening copy becomes the small summit.
    if (!skySmall && sky && clearance(sky, 0) < 1) {
      skySmall = true;
      sky = fit(true);
    }
    geometry = { span, height, width, reader, knots, projectTop, projectLeft,
      big, skySmall, skyTop: skyTopFor(skySmall), sky, generation: ++generation };
    dirty = false;
  }
  function skyRects(y) {
    const box = sky && sky.getBoundingClientRect();
    if (!box || !box.width || !box.height) return null;
    const area = { l: box.left - 10, r: box.right + 10, t: box.top - 8, b: box.bottom + 8 };
    const rects = [];
    const skip = node => !node || !!node.closest('.site-header, .mtn-scene, .companion, script, style, noscript');
    const take = r => {
      if (r.width > 0 && r.height > 0 && r.right > area.l && r.left < area.r) rects.push({ t: r.top + y, b: r.bottom + y });
    };
    const range = document.createRange();
    for (const root of [main, footer]) {
      if (!root) continue;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.nodeValue.trim() || skip(node.parentElement)) continue;
        range.selectNodeContents(node);
        for (const r of range.getClientRects()) take(r);
      }
      root.querySelectorAll('a, button, input, select, textarea, summary').forEach(node => {
        if (!skip(node)) take(node.getBoundingClientRect());
      });
    }
    return { area, rects };
  }
  // 0 when any painted glyph/control is within the pocket at this scroll, 1 once it is 28px clear.
  function clearance(box, scroll) {
    let gap = Infinity;
    for (const r of box.rects) gap = Math.min(gap, Math.max(r.t - scroll - box.area.b, box.area.t - (r.b - scroll)));
    return clamp(gap / 28);
  }
  function position(y) {
    if (!geometry.span || mode === 'calm') return 0;
    const knots = geometry.knots;
    for (let i = 1; i < knots.length; i++) {
      if (y <= knots[i].y) {
        const a = knots[i - 1], b = knots[i];
        return a.p + (b.p - a.p) * clamp((y - a.y) / Math.max(0.001, b.y - a.y));
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
    // Same native progress and eligibility as the ridges; no independent star/cloud scheduler.
    const staticSky = reduce.matches || geometry.skySmall || mode === 'calm';
    const step = staticSky ? 1 : mode === 'index' ? 0.35 + 0.25 * progress : clamp(progress / 0.48);
    const alpha = staticSky ? 0.86 : mode === 'index' ? 0.6 : 1 - clamp((progress - 0.26) / 0.36);
    scene.toggleAttribute('data-sky-detail', !geometry.skySmall);
    scene.style.setProperty('--sv-sky-top', geometry.skyTop.toFixed(2) + 'px');
    scene.style.setProperty('--sv-sketch', step.toFixed(5));
    scene.style.setProperty('--sv-sky-alpha', alpha.toFixed(5));
    scene.style.setProperty('--sv-yield', (geometry.sky ? clearance(geometry.sky, y) : 1).toFixed(3));
    scene.style.setProperty('--sv-cloud-travel', (reduce.matches || mode === 'calm' ? 0.52 :
      mode === 'index' ? 0.32 + 0.2 * progress : clamp(progress / 0.82)).toFixed(5));
    if (guide && starRoute) {
      const at = step * 64, lower = Math.floor(at), a = starRoute[lower], b = starRoute[Math.min(64, lower + 1)];
      guide.setAttribute('cx', (a.x + (b.x - a.x) * (at - lower)).toFixed(3));
      guide.setAttribute('cy', (a.y + (b.y - a.y) * (at - lower)).toFixed(3));
    }
  }
  function phrase() {
    if (phraseDone || !section) return;
    phraseDone = true;
    if (!eligible() || section.contains(document.activeElement)) return;
    section.dataset.mtn = 'go';
  }
  function frame() {
    raf = 0;
    if (!eligible()) {
      // Paused/reduced/hidden: nothing moves or replays, but the static drawing must still
      // yield to copy after a scroll, font load, zoom or text enlargement.
      if (policy && !away && !document.hidden) {
        if (dirty || !geometry) measure();
        scene.style.setProperty('--sv-yield', (geometry.sky ? clearance(geometry.sky, scrollY) : 1).toFixed(3));
      }
      return;
    }
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
      [-3 * x, -py, -9 * x, -3 * py].forEach((value, i) => scene.style.setProperty('--mtn-' + cameraKeys[i], value + 'px'));
    }
    if (landed || (y > 0 && geometry.projectLeft < 88 && geometry.projectTop - y <= geometry.reader)) phrase();
    landed = false;
  }
  function ask() {
    // One-shot per event; the fixed sky must follow native scroll on every page, in any state.
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
  function auroraAnswer() {
    clearAurora();
    const dark = doc.dataset.theme === 'dark' || (doc.dataset.theme !== 'light' && !daylight.matches);
    if (!eligible() || mode === 'calm' || !dark) return;
    // A bounded browser-owned effect, admitted by the same policy as mist/rims. No JS tick.
    const layers = [...scene.querySelectorAll('.mtn-sky-art')].map(art => {
      const style = getComputedStyle(art);
      return { art, opacity: Number(style.opacity), visible: style.display !== 'none' };
    });
    layers.forEach(({ art, opacity, visible }) => {
      if (!visible || typeof art.animate !== 'function') return;
      const animation = art.animate([
        { transform: 'translate3d(0,0,0)', opacity },
        { transform: 'translate3d(8px,-3px,0)', opacity: opacity * 0.82, offset: 0.5 },
        { transform: 'translate3d(0,0,0)', opacity },
      ], { duration: 1400, easing: 'cubic-bezier(0.16,1,0.3,1)', iterations: 1 });
      auroras.add(animation);
      animation.oncancel = () => auroras.delete(animation);
      animation.onfinish = () => { auroras.delete(animation); animation.cancel(); };
    });
  }
  function answer() {
    if (!eligible() || !policy.canAnswer()) return;
    finishIntro();
    if (!trace && rims.length) {
      trace = true;
      rims.forEach(rim => rim.setAttribute('pathLength', 1));
      scene.setAttribute('data-trace', '');
    }
    auroraAnswer();
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
    auroraAnswer,
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
  new MutationObserver(() => { clearAurora(); invalidate(); }).observe(doc, { attributes: true, attributeFilter: ['data-theme'] });
  daylight.addEventListener('change', () => { clearAurora(); invalidate(); });
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
