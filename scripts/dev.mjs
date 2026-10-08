// Development: the API server (with reload on change) and Vite, side by side.
import { spawn } from 'node:child_process';

const api = process.env.API_PORT ?? '3001';
const procs = [
  spawn('node', ['--watch', 'server/index.ts'], { stdio: 'inherit', env: { ...process.env, PORT: api } }),
  spawn('npx', ['vite'], { stdio: 'inherit', env: { ...process.env, API_PORT: api } }),
];
const stop = () => procs.forEach((p) => p.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
procs.forEach((p) => p.on('exit', (code) => (stop(), process.exit(code ?? 0))));
