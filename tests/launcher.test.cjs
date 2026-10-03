const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { spawn, execFileSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(condition) {
  const started = Date.now();
  while (!condition()) { if (Date.now() - started > 10000) throw new Error('Timed out'); await pause(30); }
}
function run(command, args, options) {
  const process = spawn(command, args, options);
  let output = '';
  process.stdout.on('data', chunk => output += chunk);
  process.stderr.on('data', chunk => output += chunk);
  const done = new Promise(resolve => process.once('close', (code, signal) => resolve({ code, signal, output })));
  return { process, done, output: () => output };
}
async function freePort() {
  const server = http.createServer(); server.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  const port = server.address().port; await new Promise(resolve => server.close(resolve)); return port;
}
function get(port, endpoint) {
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${endpoint}`, response => {
      response.resume(); response.once('end', () => resolve(response));
    }).on('error', reject);
  });
}

test('cached frontend build is invalidated when the radar provider or its attribution changes', () => {
  const env = { ...process.env };
  for (const key of Object.keys(env)) if (key.startsWith('VITE_')) delete env[key];
  const fingerprint = overrides => execFileSync(process.execPath, ['scripts/build-fingerprint.cjs'], {
    cwd: root, env: { ...env, ...overrides }, encoding: 'utf8',
  });
  const original = fingerprint({});
  for (const key of ['VITE_RADAR_BASEMAP_URL', 'VITE_RADAR_BASEMAP_ATTRIBUTION', 'VITE_RADAR_BASEMAP_ATTRIBUTION_URL']) {
    assert.notEqual(fingerprint({ [key]: 'custom-provider' }), original);
  }
  assert.equal(fingerprint({ PORT: '3999' }), original);
});

test('server logs requests, permits map referrers and fails clearly on an occupied port', async t => {
  const port = await freePort();
  const options = { cwd: root, env: { ...process.env, PORT: String(port), SERVE_DIST: '1' }, stdio: ['ignore','pipe','pipe'] };
  const mockedRadar = `const https=require('node:https');const {EventEmitter}=require('node:events');
    https.request=(_options,callback)=>{const req=new EventEmitter();req.setTimeout=()=>{};req.destroy=()=>{};
      req.end=()=>{const response=require('node:stream').Readable.from(['tile denied']);
        response.statusCode=403;response.headers={'content-type':'image/png'};callback(response);};return req;};
    require('./server/proxy.cjs');`;
  const server = run(process.execPath, ['-e',mockedRadar], options);
  t.after(async () => { server.process.kill('SIGTERM'); await server.done; });
  await until(() => server.output().includes('API running'));
  assert.equal((await get(port, '/')).headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal((await get(port, '/api/headlines?sources=')).headers['referrer-policy'], 'no-referrer');
  await until(() => server.output().includes('[API] GET /api/headlines 200'));
  const deniedTile = await get(port,'/api/radar/tile?url=https%3A%2F%2Ftilecache.rainviewer.com%2Ftile.png');
  assert.equal(deniedTile.statusCode,403); assert.equal(deniedTile.headers['cache-control'],'no-store');
  assert.equal((await get(port,'/api/radar/tile?url=https%3A%2F%2Ftilecache.rainviewer.com%3A8443%2Ftile.png')).statusCode,403);
  const collision = await run(process.execPath, ['server/proxy.cjs'], options).done;
  assert.equal(collision.code, 1); assert.match(collision.output, /EADDRINUSE/);
  assert.doesNotMatch(collision.output, /API running/);
});

test('launcher stays attached, protects its symlink from duplicate starts and stops its child on Ctrl+C', async t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bnn-launcher-'));
  const envDir = path.join(directory, '.blakenewsnow-venv');
  fs.mkdirSync(path.join(directory, 'scripts')); fs.mkdirSync(path.join(directory, 'server'));
  fs.mkdirSync(path.join(directory, 'dist')); fs.mkdirSync(path.join(envDir, 'node_modules/.bin'), { recursive: true });
  for (const file of ['blakenewsnow','scripts/build-fingerprint.cjs']) fs.copyFileSync(path.join(root,file),path.join(directory,file));
  fs.writeFileSync(path.join(directory, 'package.json'), '{"name":"launcher-fixture","private":true}');
  fs.writeFileSync(path.join(directory, 'package-lock.json'), '{"lockfileVersion":3}');
  fs.writeFileSync(path.join(directory, 'vite.config.ts'), 'export default {}');
  fs.writeFileSync(path.join(directory, 'dist/index.html'), 'fixture');
  fs.writeFileSync(path.join(directory, 'server/proxy.cjs'), `const http=require('http');
    const server=http.createServer((_req,res)=>{console.log('[API] GET /health 200');res.end('ok');});
    server.listen(process.env.PORT,()=>console.log('FIXTURE_READY'));
    process.once('SIGTERM',()=>server.close(()=>process.exit(0)));`);
  for (const bin of ['concurrently','vite']) fs.writeFileSync(path.join(envDir, 'node_modules/.bin', bin), '#!/bin/sh\nexit 1', { mode: 0o755 });
  const hash = file => crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,file))).digest('hex');
  fs.writeFileSync(path.join(envDir,'.state'), `node=${process.version}\nnpm=${execFileSync('npm',['--version'],{encoding:'utf8'}).trim()}\nplatform=${process.platform}/${process.arch}\npackage=${hash('package.json')}\nlock=${hash('package-lock.json')}\n`);
  fs.writeFileSync(path.join(envDir,'.build-state'),execFileSync(process.execPath,[path.join(directory,'scripts/build-fingerprint.cjs')]));
  const port = await freePort();
  const options = { cwd: directory, env: { ...process.env, PORT: String(port), BLAKENEWSNOW_ENV_DIR: envDir, BLAKENEWSNOW_MODE:'production', BLAKENEWSNOW_OPEN_BROWSER:'0' }, detached: true, stdio:['ignore','pipe','pipe'] };
  const launcher = run('bash',['./blakenewsnow'], options);
  t.after(async () => { launcher.process.kill('SIGTERM'); await launcher.done; fs.rmSync(directory,{recursive:true,force:true}); });
  await until(() => launcher.output().includes('FIXTURE_READY'));
  const link = path.join(directory,'node_modules');
  const owner = fs.readFileSync(path.join(directory,'.blakenewsnow-run/pid'),'utf8');
  assert.equal(Number(owner.trim()),launcher.process.pid);
  await get(port,'/health');
  await until(() => launcher.output().includes('[API] GET /health'));
  const duplicate = await run('bash',['./blakenewsnow'],options).done;
  assert.equal(duplicate.code,1); assert.match(duplicate.output,/already running or starting/);
  assert.equal(fs.readlinkSync(link),path.join(envDir,'node_modules'));
  assert.equal(fs.readFileSync(path.join(directory,'.blakenewsnow-run/pid'),'utf8'),owner);
  process.kill(-launcher.process.pid,'SIGINT');
  const stopped = await launcher.done;
  assert.equal(stopped.code,130);
  assert.equal(fs.existsSync(link),false); assert.equal(fs.existsSync(path.join(directory,'.blakenewsnow-run')),false);
  await assert.rejects(get(port,'/health'),/ECONNREFUSED/);
  // An occupied standalone port must fail before any shared link is changed.
  fs.symlinkSync(path.join(envDir,'node_modules'),link);
  const occupied = http.createServer().listen(port);
  await new Promise(resolve=>occupied.once('listening',resolve));
  try {
    const collision = await run('bash',['./blakenewsnow'],options).done;
    assert.equal(collision.code,1); assert.match(collision.output,/cannot use port.*EADDRINUSE/);
    assert.equal(fs.readlinkSync(link),path.join(envDir,'node_modules'));
    assert.equal(fs.existsSync(path.join(directory,'.blakenewsnow-run')),false);
  } finally { await new Promise(resolve=>occupied.close(resolve)); }
});
