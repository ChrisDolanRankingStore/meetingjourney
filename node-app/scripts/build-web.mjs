import { cpSync, mkdirSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const nodeAppDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const webDir = resolve(nodeAppDir, '..', 'src', 'MeetingJourney.Web');
const distDir = join(webDir, 'dist');
const publicDir = join(nodeAppDir, 'public');
const npm = process.platform === 'win32' ? process.env.ComSpec : 'npm';
const npmArgs = process.platform === 'win32'
  ? ['/d', '/s', '/c']
  : [];

const runNpm = (args) => {
  const command = process.platform === 'win32' ? `npm.cmd ${args.join(' ')}` : args;
  execFileSync(npm, process.platform === 'win32' ? [...npmArgs, command] : command, {
    cwd: webDir,
    stdio: 'inherit'
  });
};

runNpm(['ci']);
await import('./prepare-assets.mjs');
await import('./public-pages.mjs');
runNpm(['run', 'build']);

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });

console.log(`Copied web client to ${publicDir}`);

const chunks = readdirSync(join(publicDir, 'assets')).filter(name => /\.(js|css)$/.test(name)).map(name => '/assets/' + name);
const workerPath = join(publicDir, 'sw.js');
writeFileSync(workerPath, readFileSync(workerPath, 'utf8').replace('/*BUILD_ASSETS*/[]', JSON.stringify(chunks)));

// The original artwork stays in source; the runnable package uses compact derivatives.
const artDir = join(publicDir, 'assets');
for (const name of readdirSync(artDir)) if (name.endsWith('.png')) rmSync(join(artDir, name));
const oldPortraits = join(artDir, 'characters');
if (existsSync(oldPortraits)) for (const name of readdirSync(oldPortraits)) if (name.endsWith('.png')) rmSync(join(oldPortraits, name));
