// Кроссплатформенный запуск Expo с отключённой телеметрией (Windows/macOS/Linux).
const { spawn } = require('node:child_process');

const expoCli = require.resolve('expo/bin/cli');
const child = spawn(process.execPath, [expoCli, 'start', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_NO_TELEMETRY: '1' },
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 1);
  }
});
