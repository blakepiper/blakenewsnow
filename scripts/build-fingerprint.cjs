const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const hash = crypto.createHash('sha256');
function add(relative) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) return;
  if (fs.statSync(file).isDirectory()) {
    for (const child of fs.readdirSync(file).sort()) add(path.join(relative, child));
  } else { hash.update(relative); hash.update(fs.readFileSync(file)); }
}
for (const entry of ['scripts/compress-assets.cjs', 'scripts/build-fingerprint.cjs', 'src', 'shared', 'public', 'index.html', 'vite.config.ts', 'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'package.json', 'package-lock.json', '.env', '.env.local', '.env.production', '.env.production.local']) add(entry);
hash.update(process.versions.node);
// Vite embeds these values in the bundle. A changed provider or attribution must
// invalidate the launcher's cached build just like a changed API URL.
for (const key of Object.keys(process.env).filter(key => key.startsWith('VITE_')).sort()) {
  hash.update(key); hash.update(process.env[key]);
}
process.stdout.write(hash.digest('hex'));
