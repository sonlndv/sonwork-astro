import routes from './legacy-routes.json' with { type: 'json' };

const normalized = path => path.length > 1 ? path.replace(/\/$/, '') : path;
const exact = new Map(routes.filter(r => !r.path.endsWith('*')).map(r => [normalized(r.path), r]));
const patterns = routes.filter(r => r.path.endsWith('*')).sort((a, b) => b.path.length - a.path.length);
const gone = request => new Response(request.method === 'HEAD' ? null : 'Gone. This legacy endpoint or asset has been retired.', {
  status: 410, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' },
});
function redirect(request, target, privateQuery = false) {
  const url = new URL(target, request.url);
  if (!privateQuery) url.search = new URL(request.url).search;
  return new Response(null, { status: 301, headers: {
    location: url.href,
    ...(privateQuery ? { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } : {}),
  } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalized(url.pathname);
    // Strip the complete query before a private legacy link reaches any new page.
    if (path === '/api/unsubscribe') return redirect(request, '/subscribe', true);
    if (path === '/book' || path === '/book/status') return redirect(request, '/about', true);
    if (path === '/api' || path.startsWith('/api/') || ['/404', '/404.html'].includes(path)) return gone(request);

    // The assets binding applies _redirects and HTML normalization. Real current
    // assets take precedence over retired patterns (especially new _astro hashes).
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const route = exact.get(path) ?? patterns.find(r => url.pathname.startsWith(r.path.slice(0, -1)));
    if (route?.status === 301) return redirect(request, route.target);
    if (route?.status === 410) return gone(request);
    // With asset-first routing, missing paths must reach this Worker rather
    // than being consumed by an asset 404 fallback. Fetch the error document
    // through the binding (not this router), then retain a real HTTP 404.
    const errorPage = await env.ASSETS.fetch(new Request(new URL('/404', request.url), {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
    }));
    if (!errorPage.ok) return response;
    const headers = new Headers(errorPage.headers);
    headers.set('cache-control', 'no-store');
    return new Response(errorPage.body, { status: 404, headers });
  },
};
