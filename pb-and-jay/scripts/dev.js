import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const isWindows = process.platform === 'win32';

function run(name, command, args) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
  });

  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${name}] exited with code ${code}`);
      if (name === 'api') {
        console.error('Frontend will still run, but AI DM replies need the API server on port 3001.');
        return;
      }
      process.exit(code);
    }
  });

  return child;
}

console.log('Starting PB & Jay...\n');
console.log('  Frontend: http://localhost:5173');
console.log('  API:      http://localhost:3001\n');

const vite = run('vite', isWindows ? 'npx' : 'npx', ['vite']);
const api = run('api', isWindows ? 'node' : 'node', ['server/index.js']);

function shutdown() {
  vite.kill();
  api.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
