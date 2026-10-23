import { cpSync, mkdirSync, rmSync } from 'node:fs';
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
runNpm(['run', 'build']);

rmSync(publicDir, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
cpSync(distDir, publicDir, { recursive: true });

console.log(`Copied web client to ${publicDir}`);
