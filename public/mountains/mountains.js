(() => {
  // Scroll depth, one build phrase, one rim arrival at scroll 0, then fine-mouse depth. One rAF, no timers.
  const s = document.querySelector('.mtn-scene');
  if (!s) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const doc = document.documentElement;
  const sec = document.querySelector('.front-projects');
  const head = sec && sec.querySelector('.section-head');
  const list = sec && sec.querySelector('.build-list');
  const btn = document.querySelector('.companion');
  const rims = s.querySelectorAll('.mtn-rim');
  const FAR = 24, NEAR0 = 72, NEAR1 = -48, CAM = ['fx', 'fy', 'nx', 'ny'];
  let raf = 0, done = reduce.matches || document.hidden, intro = 0, cam = 0, pt = 0;
  const passed = () => !!head && head.getBoundingClientRect().top <= innerHeight * 0.5;
  const v = (k, n) => s.style.setProperty('--mtn-' + k, n + 'px');
  const unit = (n, m) => Math.max(-1, Math.min(1, (n / m) * 2 - 1));
  const set = (far, near) => (v('far-y', far), v('near-y', near));
  const big = () => s.toggleAttribute('data-big', parseFloat(getComputedStyle(doc).fontSize) > 20);
  const calm = () => sec && sec.removeAttribute('data-mtn');
  // Intro and camera off at once: neutral, no transition tail, no stale pointer.
  const rest = () => {
    pt = 0;
    if (!intro && !cam) return;
    intro = cam = 0;
    s.removeAttribute('data-intro');
    s.removeAttribute('data-cam');
    rims.forEach((r) => r.removeAttribute('pathLength'));
    CAM.forEach((k) => s.style.removeProperty('--mtn-' + k));
  };
  const skip = () => (pt = 0, intro || rest());
  const fire = () => {
    if (done || !sec) return;
    done = true; // one play per lifecycle
    if (reduce.matches || document.hidden || sec.contains(document.activeElement)) return;
    sec.dataset.mtn = 'go';
  };
  const frame = () => {
    raf = 0;
    if (reduce.matches || document.hidden) return set(0, NEAR0);
    const span = doc.scrollHeight - innerHeight;
    const p = span > 0 ? Math.max(0, Math.min(1, scrollY / span)) : 0;
    set(FAR * p, NEAR0 + (NEAR1 - NEAR0) * p);
    if (pt) {
      const a = unit(pt[0], innerWidth), b = unit(pt[1], innerHeight);
      pt = 0;
      cam = 1;
      s.setAttribute('data-cam', '');
      [-3 * a, -b, -9 * a, -3 * b].forEach((n, i) => v(CAM[i], n));
    }
    // Compact: Mount cannot perch beside the builds (88px test as companion.js); only after a real scroll.
    if (!done && scrollY > 0 && sec.getBoundingClientRect().left < 88 && passed()) fire();
  };
  const ask = () => {
    if (!raf && !reduce.matches && !document.hidden) raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    rest();
    set(0, NEAR0);
    calm();
    if (passed()) done = true;
  };
  const arrived = () => btn.dataset.perch === 'build' && !btn.hasAttribute('data-moving') && fire();
  if (btn) new MutationObserver(arrived).observe(btn, { attributes: true, attributeFilter: ['data-perch', 'data-moving'] });
  if (list) list.addEventListener('animationend', (e) => e.animationName === 'mtn-settle' && e.target.matches(':last-child') && calm());
  s.addEventListener('animationend', (e) => intro && e.animationName === 'mtn-near-in' && rest());
  const act = { passive: true, capture: true };
  addEventListener('pointerdown', () => (calm(), rest()), act);
  ['keydown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, rest, act));
  addEventListener('focusin', () => (calm(), rest()));
  addEventListener('pointermove', (e) => {
    if (intro || reduce.matches || document.hidden || !e.isTrusted || e.pointerType !== 'mouse' || !fine.matches || (document.activeElement || doc).matches(':focus-visible')) return skip();
    pt = [e.clientX, e.clientY];
    ask();
  }, { passive: true });
  document.addEventListener('pointerout', (e) => e.relatedTarget || rest());
  addEventListener('blur', rest);
  fine.addEventListener('change', rest);
  addEventListener('scroll', () => (rest(), ask()), { passive: true });
  addEventListener('resize', () => {
    rest();
    big();
    ask();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : ask()));
  addEventListener('pagehide', stop);
  reduce.addEventListener('change', () => (reduce.matches ? stop() : ask()));
  // Arrival only at initial scroll 0, never reduced/hidden; rims get a temporary normalized dash.
  if (!scrollY && !reduce.matches && !document.hidden) {
    intro = 1;
    rims.forEach((r) => r.setAttribute('pathLength', 1));
    s.setAttribute('data-intro', '');
  }
  big();
  ask();
})();
