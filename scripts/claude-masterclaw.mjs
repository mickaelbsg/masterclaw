import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const port = process.env.PORT || '3100';
const baseUrl = process.env.MASTERCLAW_BASE_URL || `http://localhost:${port}`;

const child = spawn('claude', args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    ANTHROPIC_BASE_URL: baseUrl,
    ANTHROPIC_AUTH_TOKEN: process.env.ANTHROPIC_AUTH_TOKEN || 'masterclaw',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || ''
  }
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('Falha ao iniciar Claude Code. Verifique se o CLI `claude` está instalado no PATH.');
  console.error(err.message);
  process.exit(1);
});
