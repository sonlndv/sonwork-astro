(() => {
  // Existing eligibility owner, connected to the one mountains.js progress frame.
  // Mist has a genuine finite CSS completion. No interval, recurring delay, polling or rAF.
  const scene = document.querySelector('.mtn-scene');
  const mist = scene && scene.querySelector('.mtn-mist');
  const ribbon = mist && mist.querySelector('.mtn-mist-ribbon');
  const landscape = window.sonworkLandscape;
  if (!scene || !mist || !ribbon || !landscape) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  // The Pause control is gone (Son-approved 2026-11-03); drop the stale stored preference once.
  try { localStorage.removeItem('sonwork-atmosphere'); }
  catch { /* Storage may be denied; nothing depends on it. */ }
  // Only Build and Writing carry the arrival and greeting mist; Home and the calm routes keep a clear sky.
  const expressive = scene.dataset.route === 'index';
  let running = false;
  let passes = 0;
  let active = null;
  const canRun = () => !reduce.matches && !forced.matches && !document.hidden;
  const reading = () => {
    const focus = document.activeElement;
    return !!focus && !!focus.closest('main') && focus.matches(':focus-visible');
  };
  const canAnswer = () => expressive && canRun() && landscape.isActive() && scrollY <= 8 && !reading();
  function paint() {
    mist.dataset.state = running ? 'running' : 'idle';
    mist.dataset.passes = String(passes);
  }
  function cancel() {
    if (!running && !active) return;
    const effect = active;
    active = null;
    running = false;
    mist.removeAttribute('data-run');
    effect?.cancel();
    paint();
  }
  function start(source) {
    if (running || !canAnswer()) return;
    mist.dataset.source = source;
    mist.setAttribute('data-run', '');
    const effect = ribbon.getAnimations().find(animation => animation instanceof CSSAnimation && animation.animationName === 'mtn-mist-pass');
    if (!effect) { mist.removeAttribute('data-run'); return; }
    active = effect;
    running = true;
    passes += 1;
    if (source === 'greeting') mist.dataset.greetings = String(Number(mist.dataset.greetings || 0) + 1);
    paint();
    // Compare the actual producer's effect identity: a late cancelled old pass cannot end a new one.
    const finish = () => { if (active === effect) cancel(); };
    effect.addEventListener('finish', finish, { once: true });
    effect.addEventListener('cancel', finish, { once: true });
  }
  landscape.connect({
    canRun, canAnswer, cancel, paint,
    arrival() {
      if (!canAnswer()) return;
      start('ambient'); // one earned arrival, never a permanent idle recurrence
      landscape.auroraAnswer();
    },
  });
  document.addEventListener('sonwork:greet', () => {
    if (!canAnswer()) return;
    document.dispatchEvent(new CustomEvent('sonwork:ridge-answer'));
    if (!running) start('greeting'); // an active pass is neither restarted nor recounted
  });
  paint();
})();
