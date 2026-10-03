import { existsSync } from 'node:fs';
export function loadEnv() {
  if (existsSync('.env')) process.loadEnvFile('.env');
}
export function argument(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
