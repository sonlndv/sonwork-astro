import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');

test('calendar secret is exposed only to the main-only native deploy action', () => {
  const [validation, deployment] = workflow.split('\n  deploy:\n');
  assert.doesNotMatch(validation, /SONWORK_GITHUB_CALENDAR_TOKEN|GITHUB_CALENDAR_TOKEN/);
  assert.match(deployment, /needs: test/);
  assert.match(deployment, /if: github.ref == 'refs\/heads\/main'/);
  assert.match(deployment, /cancel-in-progress: false/);
  const action = deployment.split('      - name: Deploy the verified bundle without rebuilding\n')[1].split('      - name:')[0];
  assert.match(action, /if: steps.current.outputs.deploy == 'true'/);
  assert.match(action, /uses: cloudflare\/wrangler-action@9acf94ace14e7dc412b076f2c5c20b8ce93c79cd # reviewed v3/);
  assert.match(action, /preCommands: wrangler secret list > \/dev\/null/);
  assert.match(action, /secrets: GITHUB_CALENDAR_TOKEN/);
  assert.match(action, /GITHUB_CALENDAR_TOKEN: \$\{\{ secrets.SONWORK_GITHUB_CALENDAR_TOKEN \}\}/);
  assert.match(action, /apiToken: \$\{\{ secrets.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(action, /accountId: \$\{\{ secrets.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(action, /workingDirectory: \$\{\{ runner.temp \}\}\/wrangler-deploy/);
  assert.match(action, /command: deploy --no-bundle --config \$\{\{ runner.temp \}\}\/sonwork-production\/wrangler.json/);
  assert.equal((workflow.match(/secrets.SONWORK_GITHUB_CALENDAR_TOKEN/g) ?? []).length, 1);
});

test('current-main gate prepares the isolated secret target from the verified artifact', () => {
  assert.match(workflow, /name: Prepare isolated calendar secret target\n        if: steps.current.outputs.deploy == 'true'\n        run: node scripts\/prepare-calendar-secret-upload.mjs "\$RUNNER_TEMP\/sonwork-production" "\$GITHUB_SHA" "\$RUNNER_TEMP\/wrangler-deploy"/);
  assert.match(workflow, /name: Recheck immutable deployment artifact/);
  assert.match(workflow, /git ls-remote --exit-code origin refs\/heads\/main/);
  assert.match(workflow, /node scripts\/verify-release.mjs https:\/\/sonwork.org "\$GITHUB_SHA"/);
});

function directory(t) {
  const root = mkdtempSync(join(tmpdir(), 'sonwork-integration-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('publication scope refuses silent private-source deletion and explicit public leakage', async t => {
  const { publicationScope, PRIVATE_DRAFT_PATHS, PUBLIC_SCOPE_FILE, PUBLIC_SCOPE } = await import('../../scripts/publication-scope.mjs');
  const root = directory(t);
  assert.throws(() => publicationScope(root), /Private draft source must be preserved/);
  for (const path of PRIVATE_DRAFT_PATHS) { mkdirSync(join(root, path, '..'), { recursive: true }); writeFileSync(join(root, path), '---\ndraft: true\n---\nFixture only.\n'); }
  assert.equal(publicationScope(root).isPublicProjection, false);
  writeFileSync(join(root, PUBLIC_SCOPE_FILE), JSON.stringify(PUBLIC_SCOPE));
  assert.throws(() => publicationScope(root), /Public projection must exclude private draft source/);
  for (const path of PRIVATE_DRAFT_PATHS) rmSync(join(root, path));
  assert.equal(publicationScope(root).isPublicProjection, true);
  writeFileSync(join(root, PUBLIC_SCOPE_FILE), JSON.stringify({ ...PUBLIC_SCOPE, excludedPrivateDrafts: [] }));
  assert.throws(() => publicationScope(root), /Invalid public-source declaration/);
});

test('projection plan excludes exactly the two private MDX files and preserves public draft posts', async () => {
  const { projectionPlan, fullSHA } = await import('../../scripts/prepare-public-source.mjs');
  const { PRIVATE_DRAFT_PATHS, PUBLIC_SCOPE_FILE } = await import('../../scripts/publication-scope.mjs');
  const paths = [...PRIVATE_DRAFT_PATHS, 'src/content/posts/already-public.mdx', 'docs/GITHUB-CALENDAR-API.md', 'THIRD-PARTY-NOTICES.md'];
  const entries = paths.map(path => ({ path, mode: '100644', bytes: Buffer.from(`Fixture: ${path}`) }));
  const plan = projectionPlan(entries);
  assert.deepEqual(plan.excluded, PRIVATE_DRAFT_PATHS);
  assert.deepEqual([...plan.files.keys()].sort(), [...paths.filter(path => !PRIVATE_DRAFT_PATHS.includes(path)), PUBLIC_SCOPE_FILE].sort());
  assert.deepEqual(plan.files.get('src/content/posts/already-public.mdx').bytes, entries[2].bytes);
  assert.throws(() => fullSHA('prefix-' + 'a'.repeat(40)), /Full source SHA/);
  assert.throws(() => fullSHA('a'.repeat(39)), /Full source SHA/);
  assert.throws(() => projectionPlan(entries.filter(entry => entry.path !== PRIVATE_DRAFT_PATHS[0])), /Private source inventory/);
  assert.throws(() => projectionPlan([...entries, { path: '../escape', mode: '100644', bytes: Buffer.from('fixture') }]), /Unsafe source path/);
  assert.throws(() => projectionPlan(entries.map(entry => ({ ...entry, mode: '120000' }))), /Regular source files/);
  assert.throws(() => projectionPlan([...entries, { path: '.env', mode: '100644', bytes: Buffer.from('synthetic') }]), /Unreviewed private configuration/);
  const variant = Buffer.from('# Public API documentation\n');
  const withDocs = projectionPlan(entries, new Map([['docs/GITHUB-CALENDAR-API.md', variant]]));
  assert.deepEqual(withDocs.files.get('docs/GITHUB-CALENDAR-API.md').bytes, variant);
  assert.equal(withDocs.declaredVariants.length, 1);
  assert.throws(() => projectionPlan(entries, new Map([['src/content/posts/already-public.mdx', variant]])), /Only existing documentation/);
  assert.throws(() => projectionPlan(entries, new Map([['docs/GITHUB-CALENDAR-API.md', Buffer.from('kanban://fixture')]])), /administrative data/);
});

function artifact(t, configOverride = {}) {
  const root = directory(t); const directoryPath = join(root, 'artifact');
  mkdirSync(join(directoryPath, 'dist'), { recursive: true }); mkdirSync(join(directoryPath, 'worker'));
  const sha = '1'.repeat(40);
  const config = { name: 'sonwork', compatibility_date: '2025-02-07', keep_vars: true, main: './worker/index.js', no_bundle: true, assets: { directory: './dist' }, ...configOverride };
  const files = { 'dist/index.html': 'Fixture only', 'dist/release.json': JSON.stringify({ gitSHA: sha }), 'worker/index.js': 'export default {};', 'wrangler.json': JSON.stringify(config) };
  for (const [path, content] of Object.entries(files)) writeFileSync(join(directoryPath, path), content);
  writeFileSync(join(directoryPath, 'artifact.json'), JSON.stringify({ gitSHA: sha, wranglerVersion: '4.151.1', files: Object.fromEntries(Object.entries(files).map(([path, content]) => [path, createHash('sha256').update(content).digest('hex')])) }));
  return { root, directoryPath, sha, config };
}

test('secret uploader derives only the Worker name/date and leaves verified bytes intact', async t => {
  const { prepareSecretUpload } = await import('../../scripts/prepare-calendar-secret-upload.mjs');
  const { verifyArtifact } = await import('../../scripts/release-artifact.mjs');
  const fixture = artifact(t); const target = join(fixture.root, 'uploader');
  prepareSecretUpload(fixture.directoryPath, fixture.sha, target);
  assert.deepEqual(JSON.parse(readFileSync(join(target, 'wrangler.json'), 'utf8')), { name: 'sonwork', compatibility_date: fixture.config.compatibility_date });
  assert.equal(verifyArtifact(fixture.directoryPath, fixture.sha).gitSHA, fixture.sha);
  assert.throws(() => prepareSecretUpload(fixture.directoryPath, fixture.sha, target), /must not already exist/);
});

test('secret uploader rejects wrong Worker, stale/tampered artifact and output inside artifact', async t => {
  const { prepareSecretUpload } = await import('../../scripts/prepare-calendar-secret-upload.mjs');
  const wrong = artifact(t, { name: 'unrelated-worker' });
  assert.throws(() => prepareSecretUpload(wrong.directoryPath, wrong.sha, join(wrong.root, 'wrong')), /Only the approved sonwork Worker/);
  const fixture = artifact(t);
  assert.throws(() => prepareSecretUpload(fixture.directoryPath, '2'.repeat(40), join(fixture.root, 'stale')), /source SHA differs/);
  assert.throws(() => prepareSecretUpload(fixture.directoryPath, fixture.sha, join(fixture.directoryPath, 'uploader')), /separate/);
  writeFileSync(join(fixture.directoryPath, 'dist/index.html'), 'Tampered fixture');
  assert.throws(() => prepareSecretUpload(fixture.directoryPath, fixture.sha, join(fixture.root, 'tampered')), /Artifact bytes differ/);
  assert.equal(existsSync(join(fixture.root, 'tampered')), false);
});

test('real locked Wrangler resolves the thin config and preserves other secrets across repeated synthetic stdin uploads', { timeout: 60000 }, async t => {
  const { createServer } = await import('node:http');
  const { spawn } = await import('node:child_process');
  const { once } = await import('node:events');
  const { prepareSecretUpload } = await import('../../scripts/prepare-calendar-secret-upload.mjs');
  const fixture = artifact(t); const cwd = join(fixture.root, 'native-uploader');
  prepareSecretUpload(fixture.directoryPath, fixture.sha, cwd);
  const requests = []; let missing = false;
  const secret = 'SYNTHETIC_CALENDAR_INPUT_NOT_A_CREDENTIAL';
  const state = { OTHER_SECRET: 'SYNTHETIC_EXISTING_VALUE' };
  const server = createServer(async (request, response) => {
    let body = ''; for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, path: request.url, body, contentType: request.headers['content-type'] });
    response.setHeader('Content-Type', 'application/json');
    if (missing) { response.statusCode = 404; response.end(JSON.stringify({ success: false, errors: [{ code: 10007, message: 'Synthetic worker missing' }] })); return; }
    if (request.method === 'GET' && request.url === '/client/v4/accounts/fixture/workers/scripts/sonwork/secrets') {
      response.end(JSON.stringify({ success: true, errors: [], messages: [], result: [{ name: 'OTHER_SECRET', type: 'secret_text' }] }));
    } else if (request.method === 'PATCH' && request.url === '/client/v4/accounts/fixture/workers/scripts/sonwork/secrets-bulk') {
      for (const [key, value] of Object.entries(JSON.parse(body).secrets)) state[key] = value.text;
      response.end(JSON.stringify({ success: true, errors: [], messages: [], result: {} }));
    } else { response.statusCode = 500; response.end(JSON.stringify({ success: false, errors: [{ message: 'Unexpected synthetic endpoint' }] })); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolveClose => server.close(resolveClose)));
  const env = { PATH: process.env.PATH, HOME: fixture.root, TMPDIR: fixture.root, XDG_CONFIG_HOME: fixture.root, XDG_CACHE_HOME: fixture.root, CI: 'true', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false', CLOUDFLARE_API_TOKEN: 'SYNTHETIC_API_AUTH_NOT_A_CREDENTIAL', CLOUDFLARE_ACCOUNT_ID: 'fixture', CLOUDFLARE_API_BASE_URL: `http://127.0.0.1:${server.address().port}/client/v4` };
  async function run(args, input) {
    const child = spawn(process.execPath, [resolve('node_modules/wrangler/wrangler-dist/cli.js'), ...args], { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], timeout: 20000 });
    let output = ''; child.stdout.on('data', chunk => output += chunk); child.stderr.on('data', chunk => output += chunk);
    if (input) child.stdin.end(input); else child.stdin.end();
    const [code] = await once(child, 'exit');
    assert.ok(!output.includes(secret), 'Native output must not print the synthetic credential');
    return { code, output };
  }
  const listed = await run(['secret', 'list']); assert.equal(listed.code, 0, listed.output);
  const uploaded = await run(['secret', 'bulk'], JSON.stringify({ GITHUB_CALENDAR_TOKEN: secret })); assert.equal(uploaded.code, 0, uploaded.output);
  const repeated = await run(['secret', 'bulk'], JSON.stringify({ GITHUB_CALENDAR_TOKEN: secret })); assert.equal(repeated.code, 0, repeated.output);
  for (const request of requests) {
    assert.ok(!request.path.includes(secret), 'Native requests must not expose the synthetic credential in a URL');
    if (request.method === 'GET') {
      assert.equal(request.body, '', 'Read-only probes must not send secret payloads');
      continue;
    }
    assert.equal(request.method, 'PATCH', `Unexpected native mutation: ${request.method} ${request.path}`);
    assert.equal(request.path, '/client/v4/accounts/fixture/workers/scripts/sonwork/secrets-bulk');
    assert.deepEqual(JSON.parse(request.body), { secrets: { GITHUB_CALENDAR_TOKEN: { name: 'GITHUB_CALENDAR_TOKEN', text: secret, type: 'secret_text' } } });
    assert.equal(request.contentType, 'application/merge-patch+json');
  }
  assert.deepEqual(state, { OTHER_SECRET: 'SYNTHETIC_EXISTING_VALUE', GITHUB_CALENDAR_TOKEN: secret });
  const beforeAbsent = requests.length;
  missing = true;
  const absent = await run(['secret', 'list']); assert.notEqual(absent.code, 0, 'Read-only precommand must fail before any upload/create when Worker is absent');
  assert.ok(requests.slice(beforeAbsent).every(request => request.method === 'GET'));
});
